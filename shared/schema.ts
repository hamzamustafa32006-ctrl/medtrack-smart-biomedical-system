// Maintenance Alert App - Database Schema
// Reference: javascript_log_in_with_replit and javascript_database blueprints

import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  decimal,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================
// Session & User Tables (Required for Replit Auth)
// ============================================

// Session storage table - MANDATORY for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// User storage table - MANDATORY for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { length: 50 }).notNull().default("technician"), // admin, supervisor, technician, viewer
  phone: varchar("phone", { length: 50 }),
  notificationPreferences: jsonb("notification_preferences").default({"email": true, "inApp": true, "sms": false}),
  timezone: varchar("timezone", { length: 100 }).default("Asia/Kuwait"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// ============================================
// Facilities & Locations
// ============================================

export const facilities = pgTable("facilities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }), // Short identifier like "BLDG-A"
  address: text("address"),
  contactPerson: varchar("contact_person", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const facilitiesRelations = relations(facilities, ({ one, many }) => ({
  user: one(users, {
    fields: [facilities.userId],
    references: [users.id],
  }),
  locations: many(locations),
  equipment: many(equipment),
}));

export const insertFacilitySchema = createInsertSchema(facilities).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFacility = z.infer<typeof insertFacilitySchema>;
export type Facility = typeof facilities.$inferSelect;

export const locations = pgTable("locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  facilityId: varchar("facility_id")
    .notNull()
    .references(() => facilities.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  floor: varchar("floor", { length: 50 }),
  room: varchar("room", { length: 50 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const locationsRelations = relations(locations, ({ one, many }) => ({
  facility: one(facilities, {
    fields: [locations.facilityId],
    references: [facilities.id],
  }),
  equipment: many(equipment),
}));

export const insertLocationSchema = createInsertSchema(locations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type Location = typeof locations.$inferSelect;

// ============================================
// Vendors Table
// ============================================

export const vendors = pgTable("vendors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  contact: varchar("contact", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const vendorsRelations = relations(vendors, ({ one, many }) => ({
  user: one(users, {
    fields: [vendors.userId],
    references: [users.id],
  }),
  equipment: many(equipment),
}));

export const insertVendorSchema = createInsertSchema(vendors).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Vendor = typeof vendors.$inferSelect;

// ============================================
// Equipment Table
// ============================================

// Equipment status enum - matches database values
export const equipmentStatusEnum = z.enum(["Active", "Under Maintenance", "Decommissioned", "Pending Installation"]);
export type EquipmentStatus = z.infer<typeof equipmentStatusEnum>;

// Equipment criticality enum
export const equipmentCriticalityEnum = z.enum(["Low", "Medium", "High"]);
export type EquipmentCriticality = z.infer<typeof equipmentCriticalityEnum>;

export const equipment = pgTable("equipment", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  facilityId: varchar("facility_id").references(() => facilities.id, { onDelete: "set null" }),
  locationId: varchar("location_id").references(() => locations.id, { onDelete: "set null" }),
  vendorId: varchar("vendor_id").references(() => vendors.id, { onDelete: "set null" }),
  name: varchar("name", { length: 255 }).notNull(),
  equipmentId: varchar("equipment_id", { length: 100 }), // Custom ID like EQ-001, auto-generated
  location: varchar("location", { length: 255 }), // Legacy field for backward compatibility
  type: varchar("type", { length: 100 }),
  manufacturer: varchar("manufacturer", { length: 255 }),
  model: varchar("model", { length: 255 }),
  serial: varchar("serial", { length: 255 }),
  status: varchar("status", { length: 50 }).notNull().default("Active"), // Active, Under Maintenance, Decommissioned, Pending Installation
  criticality: varchar("criticality", { length: 50 }).default("Medium"), // Low, Medium, High
  barcode: varchar("barcode", { length: 100 }),
  installDate: timestamp("install_date"),
  purchaseDate: timestamp("purchase_date"),
  warrantyExpiryDate: timestamp("warranty_expiry_date"),
  maintenanceFrequencyDays: integer("maintenance_frequency_days"), // How often maintenance is needed
  lastMaintenanceDate: timestamp("last_maintenance_date"),
  nextDueDate: timestamp("next_due_date"), // Next maintenance due date (can be computed or manually set)
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("equipment_user_idx").on(table.userId),
  index("equipment_facility_idx").on(table.facilityId),
  index("equipment_vendor_idx").on(table.vendorId),
  index("equipment_status_idx").on(table.status),
]);

export const equipmentRelations = relations(equipment, ({ one, many }) => ({
  user: one(users, {
    fields: [equipment.userId],
    references: [users.id],
  }),
  facility: one(facilities, {
    fields: [equipment.facilityId],
    references: [facilities.id],
  }),
  location: one(locations, {
    fields: [equipment.locationId],
    references: [locations.id],
  }),
  vendor: one(vendors, {
    fields: [equipment.vendorId],
    references: [vendors.id],
  }),
  contracts: many(contracts),
  maintenanceRecords: many(maintenanceRecords),
  maintenancePlans: many(maintenancePlans),
  maintenanceTasks: many(maintenanceTasks),
}));

export const insertEquipmentSchema = createInsertSchema(equipment).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  status: equipmentStatusEnum.optional(),
  criticality: equipmentCriticalityEnum.optional(),
});

export type InsertEquipment = z.infer<typeof insertEquipmentSchema>;
export type Equipment = typeof equipment.$inferSelect;

// ============================================
// Contracts Table
// ============================================

export const contracts = pgTable("contracts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  equipmentId: varchar("equipment_id")
    .notNull()
    .references(() => equipment.id, { onDelete: "cascade" }),
  vendorName: varchar("vendor_name", { length: 255 }).notNull(),
  vendorContact: varchar("vendor_contact", { length: 255 }),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  contractType: varchar("contract_type", { length: 100 }), // e.g., "Maintenance", "Warranty", "Service"
  notes: text("notes"),
  alertThresholdDays: integer("alert_threshold_days").notNull().default(30), // Alert X days before expiry
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const contractsRelations = relations(contracts, ({ one }) => ({
  user: one(users, {
    fields: [contracts.userId],
    references: [users.id],
  }),
  equipment: one(equipment, {
    fields: [contracts.equipmentId],
    references: [equipment.id],
  }),
}));

export const insertContractSchema = createInsertSchema(contracts).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contracts.$inferSelect;

// ============================================
// Maintenance Records Table
// ============================================

export const maintenanceRecords = pgTable("maintenance_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  equipmentId: varchar("equipment_id")
    .notNull()
    .references(() => equipment.id, { onDelete: "cascade" }),
  maintenanceDate: timestamp("maintenance_date").notNull(),
  maintenanceType: varchar("maintenance_type", { length: 100 }), // e.g., "Preventive", "Corrective", "Inspection"
  description: text("description"),
  performedBy: varchar("performed_by", { length: 255 }),
  completed: boolean("completed").notNull().default(true),
  nextScheduledDate: timestamp("next_scheduled_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const maintenanceRecordsRelations = relations(maintenanceRecords, ({ one }) => ({
  user: one(users, {
    fields: [maintenanceRecords.userId],
    references: [users.id],
  }),
  equipment: one(equipment, {
    fields: [maintenanceRecords.equipmentId],
    references: [equipment.id],
  }),
}));

export const insertMaintenanceRecordSchema = createInsertSchema(maintenanceRecords).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMaintenanceRecord = z.infer<typeof insertMaintenanceRecordSchema>;
export type MaintenanceRecord = typeof maintenanceRecords.$inferSelect;

// ============================================
// Maintenance Plans Table
// ============================================

export const maintenancePlans = pgTable("maintenance_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  equipmentId: varchar("equipment_id")
    .notNull()
    .references(() => equipment.id, { onDelete: "cascade" }),
  frequencyDays: integer("frequency_days").notNull(), // How often maintenance occurs (e.g., 30 for monthly)
  bufferDays: integer("buffer_days").notNull().default(5), // Alert X days before due
  policy: varchar("policy", { length: 50 }).notNull().default("PM"), // PM, Calibration, Safety
  checklistJson: jsonb("checklist_json"), // Steps for technician
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("maintenance_plans_equipment_idx").on(table.equipmentId),
  index("maintenance_plans_active_idx").on(table.active),
]);

export const maintenancePlansRelations = relations(maintenancePlans, ({ one, many }) => ({
  equipment: one(equipment, {
    fields: [maintenancePlans.equipmentId],
    references: [equipment.id],
  }),
  tasks: many(maintenanceTasks),
}));

export const insertMaintenancePlanSchema = createInsertSchema(maintenancePlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMaintenancePlan = z.infer<typeof insertMaintenancePlanSchema>;
export type MaintenancePlan = typeof maintenancePlans.$inferSelect;

// ============================================
// Maintenance Tasks Table
// ============================================

export const maintenanceTasks = pgTable("maintenance_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  planId: varchar("plan_id")
    .notNull()
    .references(() => maintenancePlans.id, { onDelete: "cascade" }),
  equipmentId: varchar("equipment_id")
    .notNull()
    .references(() => equipment.id, { onDelete: "cascade" }),
  dueDate: timestamp("due_date").notNull(),
  windowEndDate: timestamp("window_end_date"), // Last acceptable date
  generatedReason: varchar("generated_reason", { length: 255 }), // "Scheduled", "Manual", "Overdue rollover"
  status: varchar("status", { length: 50 }).notNull().default("open"), // open, due_today, overdue, completed, cancelled
  assignedTo: varchar("assigned_to").references(() => users.id, { onDelete: "set null" }),
  priority: varchar("priority", { length: 50 }).notNull().default("medium"), // low, medium, high, urgent
  completedAt: timestamp("completed_at"),
  completedBy: varchar("completed_by").references(() => users.id, { onDelete: "set null" }),
  completionNotes: text("completion_notes"),
  checklistResult: jsonb("checklist_result"), // Completed checklist with results
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("maintenance_tasks_plan_idx").on(table.planId),
  index("maintenance_tasks_equipment_idx").on(table.equipmentId),
  index("maintenance_tasks_status_idx").on(table.status),
  index("maintenance_tasks_due_date_idx").on(table.dueDate),
  index("maintenance_tasks_assigned_idx").on(table.assignedTo),
]);

export const maintenanceTasksRelations = relations(maintenanceTasks, ({ one, many }) => ({
  plan: one(maintenancePlans, {
    fields: [maintenanceTasks.planId],
    references: [maintenancePlans.id],
  }),
  equipment: one(equipment, {
    fields: [maintenanceTasks.equipmentId],
    references: [equipment.id],
  }),
  assignedToUser: one(users, {
    fields: [maintenanceTasks.assignedTo],
    references: [users.id],
  }),
  completedByUser: one(users, {
    fields: [maintenanceTasks.completedBy],
    references: [users.id],
  }),
  alerts: many(alerts),
}));

export const insertMaintenanceTaskSchema = createInsertSchema(maintenanceTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMaintenanceTask = z.infer<typeof insertMaintenanceTaskSchema>;
export type MaintenanceTask = typeof maintenanceTasks.$inferSelect;

// ============================================
// Alerts Table
// ============================================

export const alerts = pgTable("alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  entityType: varchar("entity_type", { length: 50 }).notNull(), // "task", "contract", "equipment"
  entityId: varchar("entity_id").notNull(), // ID of related entity
  facilityId: varchar("facility_id").references(() => facilities.id, { onDelete: "cascade" }), // Context: which facility
  locationId: varchar("location_id").references(() => locations.id, { onDelete: "set null" }), // Context: which location
  severity: varchar("severity", { length: 50 }).notNull().default("info"), // info, warning, critical
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("open"), // open, acknowledged, snoozed, resolved, escalated
  acknowledgedBy: varchar("acknowledged_by").references(() => users.id, { onDelete: "set null" }), // Who acknowledged
  acknowledgedAt: timestamp("acknowledged_at"), // When acknowledged
  resolvedAt: timestamp("resolved_at"), // When resolved
  firstTriggeredAt: timestamp("first_triggered_at").defaultNow(),
  lastSentAt: timestamp("last_sent_at"),
  nextRetryAt: timestamp("next_retry_at"),
  snoozedUntil: timestamp("snoozed_until"),
  escalationLevel: integer("escalation_level").notNull().default(0), // 0=initial, 1=T+3, 2=T+7, etc.
  channelsJson: jsonb("channels_json").default({"email": true, "inApp": true}), // Which channels to use
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("alerts_user_idx").on(table.userId),
  index("alerts_entity_idx").on(table.entityType, table.entityId),
  index("alerts_status_idx").on(table.status),
  index("alerts_severity_idx").on(table.severity),
  index("alerts_facility_idx").on(table.facilityId),
]);

export const alertsRelations = relations(alerts, ({ one, many }) => ({
  user: one(users, {
    fields: [alerts.userId],
    references: [users.id],
  }),
  facility: one(facilities, {
    fields: [alerts.facilityId],
    references: [facilities.id],
  }),
  location: one(locations, {
    fields: [alerts.locationId],
    references: [locations.id],
  }),
  acknowledgedByUser: one(users, {
    fields: [alerts.acknowledgedBy],
    references: [users.id],
  }),
  notificationLogs: many(notificationLogs),
}));

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alerts.$inferSelect;

// ============================================
// Notification Logs Table
// ============================================

export const notificationLogs = pgTable("notification_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  alertId: varchar("alert_id")
    .notNull()
    .references(() => alerts.id, { onDelete: "cascade" }),
  channel: varchar("channel", { length: 50 }).notNull(), // email, sms, whatsapp, in_app, push
  recipient: varchar("recipient", { length: 255 }).notNull(), // Email address, phone number, user ID
  providerMessageId: varchar("provider_message_id", { length: 255 }), // External provider's message ID
  status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, sent, delivered, failed, bounced
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  failedAt: timestamp("failed_at"),
  errorMessage: text("error_message"),
  responseJson: jsonb("response_json"), // Full provider response
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("notification_logs_alert_idx").on(table.alertId),
  index("notification_logs_channel_idx").on(table.channel),
  index("notification_logs_status_idx").on(table.status),
]);

export const notificationLogsRelations = relations(notificationLogs, ({ one }) => ({
  alert: one(alerts, {
    fields: [notificationLogs.alertId],
    references: [alerts.id],
  }),
}));

export const insertNotificationLogSchema = createInsertSchema(notificationLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertNotificationLog = z.infer<typeof insertNotificationLogSchema>;
export type NotificationLog = typeof notificationLogs.$inferSelect;

// ============================================
// Audit Logs Table
// ============================================

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 50 }).notNull(), // create, update, delete, complete, import, export
  entityType: varchar("entity_type", { length: 50 }).notNull(), // equipment, task, plan, contract, etc.
  entityId: varchar("entity_id").notNull(),
  beforeJson: jsonb("before_json"), // State before change
  afterJson: jsonb("after_json"), // State after change
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("audit_logs_user_idx").on(table.userId),
  index("audit_logs_entity_idx").on(table.entityType, table.entityId),
  index("audit_logs_action_idx").on(table.action),
  index("audit_logs_created_idx").on(table.createdAt),
]);

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
