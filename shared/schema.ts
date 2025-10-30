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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// ============================================
// Equipment Table
// ============================================

export const equipment = pgTable("equipment", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  equipmentId: varchar("equipment_id", { length: 100 }), // Optional custom ID
  location: varchar("location", { length: 255 }),
  type: varchar("type", { length: 100 }),
  maintenanceFrequencyDays: integer("maintenance_frequency_days"), // How often maintenance is needed
  lastMaintenanceDate: timestamp("last_maintenance_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const equipmentRelations = relations(equipment, ({ one, many }) => ({
  user: one(users, {
    fields: [equipment.userId],
    references: [users.id],
  }),
  contracts: many(contracts),
  maintenanceRecords: many(maintenanceRecords),
}));

export const insertEquipmentSchema = createInsertSchema(equipment).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
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
