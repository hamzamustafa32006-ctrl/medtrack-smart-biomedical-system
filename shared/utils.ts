// Shared utilities for Task Generation Engine

import { differenceInDays } from "date-fns";

// Task Status Constants
export const TaskStatus = {
  OPEN: "open",
  DUE_TODAY: "due_today",
  OVERDUE: "overdue",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export type TaskStatusType = typeof TaskStatus[keyof typeof TaskStatus];

// Alert Severity Constants
export const AlertSeverity = {
  INFO: "info",
  WARNING: "warning",
  CRITICAL: "critical",
} as const;

export type AlertSeverityType = typeof AlertSeverity[keyof typeof AlertSeverity];

// Task Priority Constants
export const TaskPriority = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  URGENT: "urgent",
} as const;

export type TaskPriorityType = typeof TaskPriority[keyof typeof TaskPriority];

// Alert Status Constants
export const AlertStatus = {
  OPEN: "open",
  ACKNOWLEDGED: "acknowledged",
  SNOOZED: "snoozed",
  RESOLVED: "resolved",
} as const;

export type AlertStatusType = typeof AlertStatus[keyof typeof AlertStatus];

// Escalation Thresholds
export const ESCALATION_THRESHOLDS = {
  LEVEL_1: 3, // T+3 days overdue
  LEVEL_2: 7, // T+7 days overdue
};

/**
 * Calculate task status based on due date and completion state
 * @param dueDate - The task's due date
 * @param completedAt - When the task was completed (if any)
 * @param snoozedUntil - Snooze end date (if any)
 * @returns Calculated task status
 */
export function calculateTaskStatus(
  dueDate: Date,
  completedAt?: Date | null,
  snoozedUntil?: Date | null
): TaskStatusType {
  if (completedAt) {
    return TaskStatus.COMPLETED;
  }

  const now = new Date();

  // If snoozed and snooze is still active, treat as open
  if (snoozedUntil && snoozedUntil > now) {
    return TaskStatus.OPEN;
  }

  const daysUntilDue = differenceInDays(dueDate, now);

  if (daysUntilDue < 0) {
    return TaskStatus.OVERDUE;
  } else if (daysUntilDue === 0) {
    return TaskStatus.DUE_TODAY;
  } else {
    return TaskStatus.OPEN;
  }
}

/**
 * Calculate alert severity based on task status and days overdue
 * @param taskStatus - Current task status
 * @param dueDate - The task's due date
 * @returns Alert severity level
 */
export function calculateAlertSeverity(
  taskStatus: TaskStatusType,
  dueDate: Date
): AlertSeverityType {
  if (taskStatus === TaskStatus.DUE_TODAY) {
    return AlertSeverity.WARNING;
  }

  if (taskStatus === TaskStatus.OVERDUE) {
    const daysOverdue = Math.abs(differenceInDays(dueDate, new Date()));
    
    if (daysOverdue >= ESCALATION_THRESHOLDS.LEVEL_1) {
      return AlertSeverity.CRITICAL;
    } else {
      return AlertSeverity.WARNING;
    }
  }

  return AlertSeverity.INFO;
}

/**
 * Calculate escalation level based on days overdue
 * @param dueDate - The task's due date
 * @returns Escalation level (0=initial, 1=T+3, 2=T+7)
 */
export function calculateEscalationLevel(dueDate: Date): number {
  const now = new Date();
  const daysOverdue = differenceInDays(now, dueDate);

  if (daysOverdue < 0) {
    return 0; // Not yet due
  }

  if (daysOverdue >= ESCALATION_THRESHOLDS.LEVEL_2) {
    return 2; // T+7 or more
  } else if (daysOverdue >= ESCALATION_THRESHOLDS.LEVEL_1) {
    return 1; // T+3 to T+6
  } else {
    return 0; // T+0 to T+2
  }
}

/**
 * Calculate next due date from last maintenance date and frequency
 * @param lastMaintenanceDate - Date of last maintenance
 * @param frequencyDays - Maintenance frequency in days
 * @returns Next due date
 */
export function calculateNextDueDate(
  lastMaintenanceDate: Date,
  frequencyDays: number
): Date {
  const nextDue = new Date(lastMaintenanceDate);
  nextDue.setDate(nextDue.getDate() + frequencyDays);
  return nextDue;
}

/**
 * Calculate window end date (last acceptable date) based on buffer days
 * @param dueDate - The ideal due date
 * @param bufferDays - Number of buffer days allowed
 * @returns Window end date
 */
export function calculateWindowEndDate(
  dueDate: Date,
  bufferDays: number
): Date {
  const windowEnd = new Date(dueDate);
  windowEnd.setDate(windowEnd.getDate() + bufferDays);
  return windowEnd;
}
