// Task Generation Service
// Handles automatic task generation, status updates, and escalation logic

import { storage } from "./storage";
import type { MaintenancePlan, Equipment, MaintenanceTask } from "@shared/schema";
import {
  calculateTaskStatus,
  calculateAlertSeverity,
  calculateEscalationLevel,
  calculateNextDueDate,
  calculateWindowEndDate,
  TaskStatus,
} from "@shared/utils";

interface TaskGenerationResult {
  generated: number;
  updated: number;
  errors: string[];
}

/**
 * Generate maintenance tasks from plans for all user equipment
 * Only generates one open task per plan at a time
 * @param userId - The user ID to generate tasks for
 * @returns Generation result with counts and errors
 */
export async function generateMaintenanceTasks(userId: string): Promise<TaskGenerationResult> {
  const result: TaskGenerationResult = {
    generated: 0,
    updated: 0,
    errors: [],
  };

  try {
    // Get all user's equipment
    const equipment = await storage.getEquipment(userId);
    
    if (equipment.length === 0) {
      return result;
    }

    for (const equip of equipment) {
      try {
        // Check if equipment has a maintenance plan
        const plans = await storage.getMaintenancePlans(userId, equip.id);
        
        if (plans.length === 0) {
          // Equipment has no plan - check if it has frequency configured
          if (equip.maintenanceFrequencyDays && equip.lastMaintenanceDate) {
            // Create synthetic plan for this equipment
            await createSyntheticTaskFromEquipment(equip, userId, result);
          }
          continue;
        }

        // Process each active plan
        for (const plan of plans.filter(p => p.active)) {
          await processMaintenancePlan(plan, equip, userId, result);
        }
      } catch (error) {
        result.errors.push(`Error processing equipment ${equip.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return result;
  } catch (error) {
    result.errors.push(`Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
}

/**
 * Process a single maintenance plan and generate tasks if needed
 */
async function processMaintenancePlan(
  plan: MaintenancePlan,
  equip: Equipment,
  userId: string,
  result: TaskGenerationResult
): Promise<void> {
  // Check if there's already an open task for this plan
  const existingTasks = await storage.getMaintenanceTasks(userId, {
    equipmentId: equip.id,
  });

  // Filter to tasks for this specific plan that aren't completed/cancelled
  const planTasks = existingTasks.filter(
    t => t.planId === plan.id && 
         t.status !== TaskStatus.COMPLETED && 
         t.status !== TaskStatus.CANCELLED
  );

  if (planTasks.length > 0) {
    // Update status of existing tasks
    for (const task of planTasks) {
      await updateTaskStatus(task, userId, result);
    }
    return;
  }

  // No open task exists - generate a new one
  const dueDate = calculateNextDueDate(
    equip.lastMaintenanceDate || new Date(),
    plan.frequencyDays
  );

  const windowEndDate = calculateWindowEndDate(dueDate, plan.bufferDays);

  try {
    await storage.createMaintenanceTask(
      {
        planId: plan.id,
        equipmentId: equip.id,
        dueDate,
        windowEndDate,
        generatedReason: "Scheduled",
        status: calculateTaskStatus(dueDate, null, null),
        priority: "medium",
      },
      userId
    );
    result.generated++;
  } catch (error) {
    result.errors.push(`Failed to create task for ${equip.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create a synthetic task for equipment without a formal plan
 */
async function createSyntheticTaskFromEquipment(
  equip: Equipment,
  userId: string,
  result: TaskGenerationResult
): Promise<void> {
  if (!equip.maintenanceFrequencyDays || !equip.lastMaintenanceDate) {
    return;
  }

  // First, create a maintenance plan for this equipment
  try {
    const plan = await storage.createMaintenancePlan(
      {
        equipmentId: equip.id,
        frequencyDays: equip.maintenanceFrequencyDays,
        bufferDays: 5, // Default buffer
        policy: "PM",
        active: true,
      },
      userId
    );

    // Now create the task
    const dueDate = calculateNextDueDate(
      equip.lastMaintenanceDate,
      equip.maintenanceFrequencyDays
    );

    const windowEndDate = calculateWindowEndDate(dueDate, 5);

    await storage.createMaintenanceTask(
      {
        planId: plan.id,
        equipmentId: equip.id,
        dueDate,
        windowEndDate,
        generatedReason: "Auto-generated from equipment settings",
        status: calculateTaskStatus(dueDate, null, null),
        priority: "medium",
      },
      userId
    );
    result.generated++;
  } catch (error) {
    result.errors.push(`Failed to create synthetic task for ${equip.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Update task status based on current date and generate alerts if needed
 * ALWAYS updates alerts to ensure escalation levels update correctly
 */
async function updateTaskStatus(
  task: MaintenanceTask,
  userId: string,
  result: TaskGenerationResult
): Promise<void> {
  // Task snooze is tracked at alert level, so we don't pass snoozedUntil here
  const newStatus = calculateTaskStatus(task.dueDate, task.completedAt, null);

  let statusChanged = false;
  if (newStatus !== task.status) {
    try {
      await storage.updateMaintenanceTask(task.id, { status: newStatus }, userId);
      result.updated++;
      statusChanged = true;
    } catch (error) {
      result.errors.push(`Failed to update task status: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return;
    }
  }

  // ALWAYS sync alert, even if status didn't change
  // This ensures escalation levels update correctly (e.g., OVERDUE → CRITICAL at T+3)
  try {
    await syncTaskAlert(task.id, newStatus as typeof TaskStatus[keyof typeof TaskStatus], task.dueDate, userId);
    if (!statusChanged) {
      // Alert was updated but task status stayed the same (escalation update)
      result.updated++;
    }
  } catch (error) {
    result.errors.push(`Failed to update task alert: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create or update alert for a maintenance task
 */
async function syncTaskAlert(
  taskId: string,
  taskStatus: typeof TaskStatus[keyof typeof TaskStatus],
  dueDate: Date,
  userId: string
): Promise<void> {
  const severity = calculateAlertSeverity(taskStatus, dueDate);
  const escalationLevel = calculateEscalationLevel(dueDate);

  // Check if alert already exists for this task
  const allAlerts = await storage.getAlerts(userId);
  const existingAlerts = allAlerts.filter(a => a.entityType === "task" && a.entityId === taskId);

  if (existingAlerts.length > 0) {
    // Update existing alert
    const alert = existingAlerts[0];
    await storage.updateAlert(
      alert.id,
      {
        severity,
        escalationLevel,
        status: taskStatus === TaskStatus.COMPLETED ? "resolved" : "open",
      },
      userId
    );
  } else {
    // Create new alert
    await storage.createAlert(
      {
        userId,
        entityType: "task",
        entityId: taskId,
        severity,
        title: `Maintenance ${taskStatus === TaskStatus.OVERDUE ? 'Overdue' : 'Due'}`,
        message: `Task is ${taskStatus}`,
        status: "open",
        escalationLevel,
        channelsJson: { email: true, inApp: true },
      },
      userId
    );
  }
}

/**
 * Snooze a maintenance task until a specific date
 * Snooze is tracked at the alert level, not task level
 */
export async function snoozeMaintenanceTask(
  taskId: string,
  snoozedUntil: Date,
  userId: string
): Promise<void> {
  const task = await storage.getMaintenanceTaskById(taskId, userId);
  
  if (!task) {
    throw new Error('Task not found or access denied');
  }

  // Snooze all associated alerts (snooze is tracked at alert level)
  const allAlerts = await storage.getAlerts(userId);
  const taskAlerts = allAlerts.filter(a => a.entityType === "task" && a.entityId === taskId);
  
  for (const alert of taskAlerts) {
    await storage.snoozeAlert(alert.id, userId, snoozedUntil);
  }
}
