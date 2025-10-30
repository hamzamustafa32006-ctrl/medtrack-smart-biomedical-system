// Reference: javascript_database and javascript_log_in_with_replit blueprints
import {
  users,
  equipment,
  contracts,
  maintenanceRecords,
  type User,
  type UpsertUser,
  type Equipment,
  type InsertEquipment,
  type Contract,
  type InsertContract,
  type MaintenanceRecord,
  type InsertMaintenanceRecord,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (MANDATORY for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Equipment operations
  getEquipment(userId: string): Promise<Equipment[]>;
  getEquipmentById(id: string, userId: string): Promise<Equipment | undefined>;
  createEquipment(data: InsertEquipment, userId: string): Promise<Equipment>;
  updateEquipment(id: string, data: Partial<InsertEquipment>, userId: string): Promise<Equipment | undefined>;
  
  // Contract operations
  getContracts(userId: string): Promise<Contract[]>;
  getContractById(id: string, userId: string): Promise<Contract | undefined>;
  createContract(data: InsertContract, userId: string): Promise<Contract>;
  
  // Maintenance record operations
  getMaintenanceRecords(userId: string): Promise<MaintenanceRecord[]>;
  createMaintenanceRecord(data: InsertMaintenanceRecord, userId: string): Promise<MaintenanceRecord>;
}

export class DatabaseStorage implements IStorage {
  // ============================================
  // User operations (MANDATORY for Replit Auth)
  // ============================================

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // ============================================
  // Equipment operations
  // ============================================

  async getEquipment(userId: string): Promise<Equipment[]> {
    return await db
      .select()
      .from(equipment)
      .where(eq(equipment.userId, userId))
      .orderBy(desc(equipment.createdAt));
  }

  async getEquipmentById(id: string, userId: string): Promise<Equipment | undefined> {
    const [equip] = await db
      .select()
      .from(equipment)
      .where(and(eq(equipment.id, id), eq(equipment.userId, userId)));
    return equip;
  }

  async createEquipment(data: InsertEquipment, userId: string): Promise<Equipment> {
    const [equip] = await db
      .insert(equipment)
      .values({ ...data, userId })
      .returning();
    return equip;
  }

  async updateEquipment(
    id: string,
    data: Partial<InsertEquipment>,
    userId: string
  ): Promise<Equipment | undefined> {
    const [equip] = await db
      .update(equipment)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(equipment.id, id), eq(equipment.userId, userId)))
      .returning();
    return equip;
  }

  // ============================================
  // Contract operations
  // ============================================

  async getContracts(userId: string): Promise<Contract[]> {
    return await db
      .select()
      .from(contracts)
      .where(eq(contracts.userId, userId))
      .orderBy(desc(contracts.endDate));
  }

  async getContractById(id: string, userId: string): Promise<Contract | undefined> {
    const [contract] = await db
      .select()
      .from(contracts)
      .where(and(eq(contracts.id, id), eq(contracts.userId, userId)));
    return contract;
  }

  async createContract(data: InsertContract, userId: string): Promise<Contract> {
    const [contract] = await db
      .insert(contracts)
      .values({ ...data, userId })
      .returning();
    return contract;
  }

  // ============================================
  // Maintenance record operations
  // ============================================

  async getMaintenanceRecords(userId: string): Promise<MaintenanceRecord[]> {
    return await db
      .select()
      .from(maintenanceRecords)
      .where(eq(maintenanceRecords.userId, userId))
      .orderBy(desc(maintenanceRecords.maintenanceDate));
  }

  async createMaintenanceRecord(
    data: InsertMaintenanceRecord,
    userId: string
  ): Promise<MaintenanceRecord> {
    const [record] = await db
      .insert(maintenanceRecords)
      .values({ ...data, userId })
      .returning();

    // Update equipment's last maintenance date if this is the most recent
    if (record.completed && record.maintenanceDate) {
      const equip = await this.getEquipmentById(record.equipmentId, userId);
      if (equip) {
        const shouldUpdate = !equip.lastMaintenanceDate || 
          new Date(record.maintenanceDate) > new Date(equip.lastMaintenanceDate);
        
        if (shouldUpdate) {
          await this.updateEquipment(
            record.equipmentId,
            { lastMaintenanceDate: record.maintenanceDate },
            userId
          );
        }
      }
    }

    return record;
  }
}

export const storage = new DatabaseStorage();
