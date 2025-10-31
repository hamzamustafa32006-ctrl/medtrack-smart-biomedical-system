// Alert Generation Service
// Automatically scans equipment and generates maintenance alerts

import { db } from "./db";
import { eq, and, isNull, lte } from "drizzle-orm";
import { equipment, alerts, facilities, locations } from "@shared/schema";

interface AlertGenerationResult {
  created: number;
  skipped: number;
  errors: string[];
}

/**
 * Main alert generation function
 * Scans all equipment with nextDueDate and creates alerts as needed
 */
export async function generateMaintenanceAlerts(userId?: string): Promise<AlertGenerationResult> {
  const result: AlertGenerationResult = {
    created: 0,
    skipped: 0,
    errors: [],
  };

  try {
    // Build where conditions properly
    const whereConditions = [eq(equipment.status, 'Active')];
    if (userId) {
      whereConditions.push(eq(equipment.userId, userId));
    }

    // Query all equipment with nextDueDate set (not decommissioned)
    const equipmentList = await db
      .select({
        id: equipment.id,
        userId: equipment.userId,
        name: equipment.name,
        equipmentId: equipment.equipmentId,
        facilityId: equipment.facilityId,
        locationId: equipment.locationId,
        status: equipment.status,
        nextDueDate: equipment.nextDueDate,
      })
      .from(equipment)
      .where(and(...whereConditions));

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of day

    for (const equip of equipmentList) {
      // Skip if no due date
      if (!equip.nextDueDate) {
        result.skipped++;
        continue;
      }

      const dueDate = new Date(equip.nextDueDate);
      dueDate.setHours(0, 0, 0, 0);
      
      const daysUntilDue = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      let severity: 'info' | 'warning' | 'critical' | null = null;
      let title = '';
      let message = '';

      // Determine alert severity and message
      // Simplified to match original spec: only 7-day warning and overdue critical
      if (daysUntilDue <= 0) {
        // Overdue or due today - Critical
        severity = 'critical';
        const daysOverdue = Math.abs(daysUntilDue);
        if (daysUntilDue === 0) {
          title = `Maintenance Due Today: ${equip.name}`;
          message = `${equip.name} (${equip.equipmentId || 'N/A'}) maintenance is due today. Immediate attention required.`;
        } else {
          title = `Overdue Maintenance: ${equip.name}`;
          message = `${equip.name} (${equip.equipmentId || 'N/A'}) maintenance is ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue. Immediate action required.`;
        }
      } else if (daysUntilDue === 7) {
        // 7 days until due - Warning
        severity = 'warning';
        title = `Maintenance Due Soon: ${equip.name}`;
        message = `${equip.name} (${equip.equipmentId || 'N/A'}) maintenance is due in 7 days. Please schedule maintenance.`;
      }

      // Skip if no alert needed
      if (!severity) {
        result.skipped++;
        continue;
      }

      // Check for existing open alert for this equipment
      const [existingAlert] = await db
        .select()
        .from(alerts)
        .where(
          and(
            eq(alerts.entityType, 'equipment'),
            eq(alerts.entityId, equip.id),
            eq(alerts.status, 'open'),
            eq(alerts.severity, severity)
          )
        )
        .limit(1);

      if (existingAlert) {
        // Update existing alert if message has changed (e.g., "due today" → "overdue")
        if (existingAlert.title !== title || existingAlert.message !== message) {
          try {
            await db
              .update(alerts)
              .set({
                title,
                message,
                updatedAt: new Date(),
              })
              .where(eq(alerts.id, existingAlert.id));
            
            result.skipped++; // Count as skipped (not created)
          } catch (error) {
            result.errors.push(`Failed to update alert for ${equip.name}: ${error}`);
          }
        } else {
          // Alert exists and message is same, skip
          result.skipped++;
        }
        continue;
      }

      // Create new alert
      try {
        await db.insert(alerts).values({
          userId: equip.userId,
          entityType: 'equipment',
          entityId: equip.id,
          facilityId: equip.facilityId,
          locationId: equip.locationId,
          severity,
          title,
          message,
          status: 'open',
          firstTriggeredAt: new Date(),
          escalationLevel: 0,
        });

        result.created++;
      } catch (error) {
        result.errors.push(`Failed to create alert for ${equip.name}: ${error}`);
      }
    }
  } catch (error) {
    result.errors.push(`Alert generation failed: ${error}`);
  }

  return result;
}

/**
 * Auto-resolve alerts when equipment maintenance is completed
 * Called after a maintenance task is completed
 */
export async function autoResolveEquipmentAlerts(
  equipmentId: string,
  userId: string
): Promise<number> {
  try {
    // Find all open alerts for this equipment
    const result = await db
      .update(alerts)
      .set({
        status: 'resolved',
        resolvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(alerts.entityType, 'equipment'),
          eq(alerts.entityId, equipmentId),
          eq(alerts.userId, userId),
          eq(alerts.status, 'open')
        )
      )
      .returning({ id: alerts.id });

    return result.length;
  } catch (error) {
    console.error('Failed to auto-resolve alerts:', error);
    return 0;
  }
}

/**
 * Auto-resolve alerts when a maintenance task is completed
 */
export async function autoResolveTaskAlerts(
  taskId: string,
  userId: string
): Promise<number> {
  try {
    const result = await db
      .update(alerts)
      .set({
        status: 'resolved',
        resolvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(alerts.entityType, 'task'),
          eq(alerts.entityId, taskId),
          eq(alerts.userId, userId),
          eq(alerts.status, 'open')
        )
      )
      .returning({ id: alerts.id });

    return result.length;
  } catch (error) {
    console.error('Failed to auto-resolve task alerts:', error);
    return 0;
  }
}
