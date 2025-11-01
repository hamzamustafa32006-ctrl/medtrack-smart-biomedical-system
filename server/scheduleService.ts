// Schedule Status Update Service
// Automatically updates maintenance schedule statuses based on due dates

import { db } from "./db";
import { eq, and, lte, sql } from "drizzle-orm";
import { maintenanceSchedules, alerts } from "@shared/schema";

interface ScheduleUpdateResult {
  updated: number;
  alertsCreated: number;
  skipped: number;
  errors: string[];
}

/**
 * Main schedule status update function
 * Scans all schedules and updates status to "Overdue" if past due date
 */
export async function updateScheduleStatuses(userId?: string): Promise<ScheduleUpdateResult> {
  const result: ScheduleUpdateResult = {
    updated: 0,
    alertsCreated: 0,
    skipped: 0,
    errors: [],
  };

  try {
    // Build where conditions
    const whereConditions = [];
    if (userId) {
      whereConditions.push(eq(maintenanceSchedules.userId, userId));
    }

    // Query all schedules that are not completed
    const scheduleList = await db
      .select({
        id: maintenanceSchedules.id,
        userId: maintenanceSchedules.userId,
        equipmentId: maintenanceSchedules.equipmentId,
        maintenanceType: maintenanceSchedules.maintenanceType,
        status: maintenanceSchedules.status,
        priority: maintenanceSchedules.priority,
        nextDueDate: maintenanceSchedules.nextDueDate,
        assignedTo: maintenanceSchedules.assignedTo,
      })
      .from(maintenanceSchedules)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of day

    for (const schedule of scheduleList) {
      try {
        const dueDate = new Date(schedule.nextDueDate);
        dueDate.setHours(0, 0, 0, 0);
        
        const daysUntilDue = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        // Update status to Overdue if past due date and currently Scheduled
        if (daysUntilDue < 0 && schedule.status === "Scheduled") {
          await db
            .update(maintenanceSchedules)
            .set({
              status: "Overdue",
              updatedAt: new Date(),
            })
            .where(eq(maintenanceSchedules.id, schedule.id));
          
          result.updated++;
          
          // Create critical alert for overdue maintenance schedule
          const daysOverdue = Math.abs(daysUntilDue);
          try {
            await db
              .insert(alerts)
              .values({
                userId: schedule.userId,
                entityType: 'maintenance_schedule',
                entityId: schedule.id,
                severity: 'critical',
                title: `Overdue Maintenance: ${schedule.maintenanceType}`,
                message: `Maintenance schedule is ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue. Immediate action required.`,
                status: 'open',
                firstTriggeredAt: new Date(),
                escalationLevel: 0,
              })
              .onConflictDoUpdate({
                target: [alerts.entityType, alerts.entityId, alerts.userId],
                targetWhere: sql`status IN ('open', 'escalated')`,
                set: {
                  severity: 'critical',
                  title: `Overdue Maintenance: ${schedule.maintenanceType}`,
                  message: `Maintenance schedule is ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue. Immediate action required.`,
                  updatedAt: new Date(),
                },
              });
            
            result.alertsCreated++;
          } catch (alertError) {
            result.errors.push(`Failed to create alert for schedule ${schedule.id}: ${alertError}`);
          }
        } else if (daysUntilDue >= 0 && daysUntilDue <= 7 && schedule.status === "Scheduled") {
          // Create warning alert for upcoming maintenance (1-7 days)
          try {
            await db
              .insert(alerts)
              .values({
                userId: schedule.userId,
                entityType: 'maintenance_schedule',
                entityId: schedule.id,
                severity: 'warning',
                title: `Maintenance Due Soon: ${schedule.maintenanceType}`,
                message: `Maintenance schedule is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}. Please schedule maintenance.`,
                status: 'open',
                firstTriggeredAt: new Date(),
                escalationLevel: 0,
              })
              .onConflictDoUpdate({
                target: [alerts.entityType, alerts.entityId, alerts.userId],
                targetWhere: sql`status IN ('open', 'escalated')`,
                set: {
                  severity: 'warning',
                  title: `Maintenance Due Soon: ${schedule.maintenanceType}`,
                  message: `Maintenance schedule is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}. Please schedule maintenance.`,
                  updatedAt: new Date(),
                },
              });
            
            result.alertsCreated++;
          } catch (alertError) {
            result.errors.push(`Failed to create alert for schedule ${schedule.id}: ${alertError}`);
          }
        } else {
          result.skipped++;
        }
      } catch (scheduleError) {
        result.errors.push(`Failed to process schedule ${schedule.id}: ${scheduleError}`);
      }
    }
  } catch (error) {
    result.errors.push(`Fatal error in schedule status update: ${error}`);
  }

  return result;
}
