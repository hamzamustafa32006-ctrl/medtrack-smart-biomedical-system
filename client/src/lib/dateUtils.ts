import { format as dateFnsFormat, parseISO } from "date-fns";
import { toZonedTime } from "date-fns-tz";

// Default timezone for the application (Kuwait)
export const DEFAULT_TIMEZONE = "Asia/Kuwait";

/**
 * Format a date in dd/mm/yyyy format (Kuwait standard)
 * @param date - Date object, ISO string, or timestamp
 * @param timezone - Timezone to use (defaults to Asia/Kuwait)
 * @returns Formatted date string in dd/mm/yyyy format
 */
export function formatDate(
  date: Date | string | number,
  timezone: string = DEFAULT_TIMEZONE
): string {
  const dateObj = typeof date === "string" ? parseISO(date) : new Date(date);
  const zonedDate = toZonedTime(dateObj, timezone);
  return dateFnsFormat(zonedDate, "dd/MM/yyyy");
}

/**
 * Format a date with time in dd/mm/yyyy HH:mm format (Kuwait standard)
 * @param date - Date object, ISO string, or timestamp
 * @param timezone - Timezone to use (defaults to Asia/Kuwait)
 * @returns Formatted datetime string
 */
export function formatDateTime(
  date: Date | string | number,
  timezone: string = DEFAULT_TIMEZONE
): string {
  const dateObj = typeof date === "string" ? parseISO(date) : new Date(date);
  const zonedDate = toZonedTime(dateObj, timezone);
  return dateFnsFormat(zonedDate, "dd/MM/yyyy HH:mm");
}

/**
 * Format a date in a human-readable format (e.g., "15 Jan 2024")
 * @param date - Date object, ISO string, or timestamp
 * @param timezone - Timezone to use (defaults to Asia/Kuwait)
 * @returns Formatted date string
 */
export function formatDateHuman(
  date: Date | string | number,
  timezone: string = DEFAULT_TIMEZONE
): string {
  const dateObj = typeof date === "string" ? parseISO(date) : new Date(date);
  const zonedDate = toZonedTime(dateObj, timezone);
  return dateFnsFormat(zonedDate, "d MMM yyyy");
}

/**
 * Format a date in a compact format (e.g., "15 Jan")
 * @param date - Date object, ISO string, or timestamp
 * @param timezone - Timezone to use (defaults to Asia/Kuwait)
 * @returns Formatted date string without year
 */
export function formatDateCompact(
  date: Date | string | number,
  timezone: string = DEFAULT_TIMEZONE
): string {
  const dateObj = typeof date === "string" ? parseISO(date) : new Date(date);
  const zonedDate = toZonedTime(dateObj, timezone);
  return dateFnsFormat(zonedDate, "d MMM");
}
