// Reference: javascript_database and javascript_log_in_with_replit blueprints
import {
  users,
  equipment,
  contracts,
  maintenanceRecords,
  facilities,
  locations,
  maintenancePlans,
  maintenanceTasks,
  alerts,
  notificationLogs,
  auditLogs,
  type User,
  type UpsertUser,
  type Equipment,
  type InsertEquipment,
  type Contract,
  type InsertContract,
  type MaintenanceRecord,
  type InsertMaintenanceRecord,
  type Facility,
  type InsertFacility,
  type Location,
  type InsertLocation,
  type MaintenancePlan,
  type InsertMaintenancePlan,
  type MaintenanceTask,
  type InsertMaintenanceTask,
  type Alert,
  type InsertAlert,
  type NotificationLog,
  type InsertNotificationLog,
  type AuditLog,
  type InsertAuditLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lte } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (MANDATORY for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Facility operations
  getFacilities(userId: string): Promise<Facility[]>;
  getFacilityById(id: string, userId: string): Promise<Facility | undefined>;
  createFacility(data: InsertFacility, userId: string): Promise<Facility>;
  updateFacility(id: string, data: Partial<InsertFacility>, userId: string): Promise<Facility | undefined>;
  deleteFacility(id: string, userId: string): Promise<boolean>;
  
  // Location operations
  getLocations(facilityId: string, userId?: string): Promise<Location[]>;
  getLocationById(id: string, userId?: string): Promise<Location | undefined>;
  createLocation(data: InsertLocation, userId: string): Promise<Location>;
  updateLocation(id: string, data: Partial<InsertLocation>, userId: string): Promise<Location | undefined>;
  deleteLocation(id: string, userId: string): Promise<boolean>;
  
  // Equipment operations
  getEquipment(userId: string): Promise<Equipment[]>;
  getEquipmentById(id: string, userId: string): Promise<Equipment | undefined>;
  createEquipment(data: InsertEquipment, userId: string): Promise<Equipment>;
  updateEquipment(id: string, data: Partial<InsertEquipment>, userId: string): Promise<Equipment | undefined>;
  getNextEquipmentNumber(userId: string): Promise<number>;
  
  // Contract operations
  getContracts(userId: string): Promise<Contract[]>;
  getContractById(id: string, userId: string): Promise<Contract | undefined>;
  createContract(data: InsertContract, userId: string): Promise<Contract>;
  updateContract(id: string, data: Partial<InsertContract>, userId: string): Promise<Contract | undefined>;
  
  // Maintenance record operations
  getMaintenanceRecords(userId: string): Promise<MaintenanceRecord[]>;
  createMaintenanceRecord(data: InsertMaintenanceRecord, userId: string): Promise<MaintenanceRecord>;
  
  // Maintenance plan operations
  getMaintenancePlans(userId: string, equipmentId?: string): Promise<MaintenancePlan[]>;
  getMaintenancePlanById(id: string, userId?: string): Promise<MaintenancePlan | undefined>;
  createMaintenancePlan(data: InsertMaintenancePlan, userId: string): Promise<MaintenancePlan>;
  updateMaintenancePlan(id: string, data: Partial<InsertMaintenancePlan>, userId: string): Promise<MaintenancePlan | undefined>;
  
  // Maintenance task operations
  getMaintenanceTasks(userId: string, filters?: { status?: string; equipmentId?: string }): Promise<MaintenanceTask[]>;
  getMaintenanceTasksWithDetails(userId: string, filters?: { status?: string; equipmentId?: string; facilityId?: string; locationId?: string }): Promise<any[]>;
  getMaintenanceTaskById(id: string, userId?: string): Promise<MaintenanceTask | undefined>;
  getMaintenanceTaskWithDetails(id: string, userId: string): Promise<any | undefined>;
  createMaintenanceTask(data: InsertMaintenanceTask, userId: string): Promise<MaintenanceTask>;
  updateMaintenanceTask(id: string, data: Partial<InsertMaintenanceTask>, userId: string): Promise<MaintenanceTask | undefined>;
  completeMaintenanceTask(id: string, completedBy: string, notes: string, userId: string, checklistResult?: any): Promise<MaintenanceTask | undefined>;
  
  // Alert operations
  getAlerts(userId: string, filters?: { status?: string; severity?: string }): Promise<Alert[]>;
  getAlertById(id: string, userId: string): Promise<Alert | undefined>;
  createAlert(data: InsertAlert, userId: string): Promise<Alert>;
  updateAlert(id: string, data: Partial<InsertAlert>, userId: string): Promise<Alert | undefined>;
  acknowledgeAlert(id: string, userId: string): Promise<Alert | undefined>;
  snoozeAlert(id: string, userId: string, snoozedUntil: Date): Promise<Alert | undefined>;
  resolveAlert(id: string, userId: string): Promise<Alert | undefined>;
  
  // Notification log operations
  getNotificationLogs(userId: string, alertId?: string): Promise<NotificationLog[]>;
  createNotificationLog(data: InsertNotificationLog, userId: string): Promise<NotificationLog>;
  updateNotificationLog(id: string, data: Partial<InsertNotificationLog>, userId: string): Promise<NotificationLog | undefined>;
  
  // Audit log operations
  getAuditLogs(requestingUserId: string, filters?: { userId?: string; entityType?: string; entityId?: string }): Promise<AuditLog[]>;
  createAuditLog(data: InsertAuditLog): Promise<AuditLog>;
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
  // Facility operations
  // ============================================

  async getFacilities(userId: string): Promise<Facility[]> {
    return await db
      .select()
      .from(facilities)
      .where(eq(facilities.userId, userId))
      .orderBy(desc(facilities.createdAt));
  }

  async getFacilityById(id: string, userId: string): Promise<Facility | undefined> {
    const [facility] = await db
      .select()
      .from(facilities)
      .where(and(eq(facilities.id, id), eq(facilities.userId, userId)));
    return facility;
  }

  async createFacility(data: InsertFacility, userId: string): Promise<Facility> {
    const [facility] = await db
      .insert(facilities)
      .values({ ...data, userId })
      .returning();
    return facility;
  }

  async updateFacility(
    id: string,
    data: Partial<InsertFacility>,
    userId: string
  ): Promise<Facility | undefined> {
    const [facility] = await db
      .update(facilities)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(facilities.id, id), eq(facilities.userId, userId)))
      .returning();
    return facility;
  }

  async deleteFacility(id: string, userId: string): Promise<boolean> {
    // Verify ownership
    const facility = await this.getFacilityById(id, userId);
    if (!facility) return false;

    // Delete facility (cascade will handle locations via ON DELETE CASCADE)
    // Use .returning() to verify deletion actually occurred
    const result = await db
      .delete(facilities)
      .where(and(eq(facilities.id, id), eq(facilities.userId, userId)))
      .returning({ id: facilities.id });
    
    // Check if any rows were actually deleted
    return result.length > 0;
  }

  // ============================================
  // Location operations
  // ============================================

  async getLocations(facilityId: string, userId?: string): Promise<Location[]> {
    // Verify user owns the facility if userId is provided
    if (userId) {
      const facility = await this.getFacilityById(facilityId, userId);
      if (!facility) return [];
    }
    
    return await db
      .select()
      .from(locations)
      .where(eq(locations.facilityId, facilityId))
      .orderBy(desc(locations.createdAt));
  }

  async getLocationById(id: string, userId?: string): Promise<Location | undefined> {
    if (!userId) {
      // If no userId provided, just fetch by ID (for internal use only)
      const [location] = await db
        .select()
        .from(locations)
        .where(eq(locations.id, id));
      return location;
    }
    
    // Enforce ownership by joining with facilities table
    const [result] = await db
      .select({
        location: locations,
      })
      .from(locations)
      .innerJoin(facilities, eq(locations.facilityId, facilities.id))
      .where(and(
        eq(locations.id, id),
        eq(facilities.userId, userId)
      ));
    
    return result?.location;
  }

  async createLocation(data: InsertLocation, userId: string): Promise<Location> {
    // Verify user owns the facility
    const facility = await this.getFacilityById(data.facilityId, userId);
    if (!facility) {
      throw new Error('Facility not found or access denied');
    }
    
    const [location] = await db
      .insert(locations)
      .values(data)
      .returning();
    return location;
  }

  async updateLocation(
    id: string,
    data: Partial<InsertLocation>,
    userId: string
  ): Promise<Location | undefined> {
    // Verify user owns the location's facility
    const existing = await this.getLocationById(id, userId);
    if (!existing) return undefined;
    
    // If changing facilityId, verify user owns the new facility
    if (data.facilityId && data.facilityId !== existing.facilityId) {
      const newFacility = await this.getFacilityById(data.facilityId, userId);
      if (!newFacility) {
        throw new Error('New facility not found or access denied');
      }
    }
    
    const [location] = await db
      .update(locations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(locations.id, id))
      .returning();
    return location;
  }

  async deleteLocation(id: string, userId: string): Promise<boolean> {
    // Verify user owns the location (through its facility)
    const location = await this.getLocationById(id, userId);
    if (!location) return false;

    // Delete location
    // Use .returning() to verify deletion actually occurred
    const result = await db
      .delete(locations)
      .where(eq(locations.id, id))
      .returning({ id: locations.id });
    
    // Check if any rows were actually deleted
    return result.length > 0;
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
    // Verify ownership of facility if provided
    if (data.facilityId) {
      const facility = await this.getFacilityById(data.facilityId, userId);
      if (!facility) {
        throw new Error('Facility not found or access denied');
      }
    }
    
    // Verify ownership of location if provided
    if (data.locationId) {
      const location = await this.getLocationById(data.locationId, userId);
      if (!location) {
        throw new Error('Location not found or access denied');
      }
    }
    
    // Auto-generate equipment ID if not provided
    let equipmentId = data.equipmentId;
    if (!equipmentId) {
      const nextNumber = await this.getNextEquipmentNumber(userId);
      equipmentId = `EQ-${nextNumber.toString().padStart(3, '0')}`;
    }
    
    const [equip] = await db
      .insert(equipment)
      .values({ ...data, equipmentId, userId })
      .returning();
    return equip;
  }

  async updateEquipment(
    id: string,
    data: Partial<InsertEquipment>,
    userId: string
  ): Promise<Equipment | undefined> {
    // Get existing equipment to verify ownership
    const existing = await this.getEquipmentById(id, userId);
    if (!existing) return undefined;
    
    // If changing facilityId, verify user owns the new facility
    if (data.facilityId && data.facilityId !== existing.facilityId) {
      const newFacility = await this.getFacilityById(data.facilityId, userId);
      if (!newFacility) {
        throw new Error('New facility not found or access denied');
      }
    }
    
    // If changing locationId, verify user owns the new location
    if (data.locationId && data.locationId !== existing.locationId) {
      const newLocation = await this.getLocationById(data.locationId, userId);
      if (!newLocation) {
        throw new Error('New location not found or access denied');
      }
    }
    
    const [equip] = await db
      .update(equipment)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(equipment.id, id), eq(equipment.userId, userId)))
      .returning();
    return equip;
  }

  async getNextEquipmentNumber(userId: string): Promise<number> {
    const userEquipment = await db
      .select()
      .from(equipment)
      .where(eq(equipment.userId, userId));
    
    const maxNumber = userEquipment.reduce((max, equip) => {
      if (equip.equipmentId) {
        const match = equip.equipmentId.match(/EQ-(\d+)/);
        if (match) {
          const num = parseInt(match[1]);
          return num > max ? num : max;
        }
      }
      return max;
    }, 0);
    
    return maxNumber + 1;
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
    // Verify equipment belongs to user
    const equipment = await this.getEquipmentById(data.equipmentId, userId);
    if (!equipment) {
      throw new Error('Equipment not found or access denied');
    }
    
    const [contract] = await db
      .insert(contracts)
      .values({ ...data, userId })
      .returning();
    return contract;
  }

  async updateContract(
    id: string,
    data: Partial<InsertContract>,
    userId: string
  ): Promise<Contract | undefined> {
    // Verify user owns the contract
    const existing = await this.getContractById(id, userId);
    if (!existing) return undefined;
    
    // If changing equipmentId, verify user owns the new equipment
    if (data.equipmentId && data.equipmentId !== existing.equipmentId) {
      const newEquipment = await this.getEquipmentById(data.equipmentId, userId);
      if (!newEquipment) {
        throw new Error('New equipment not found or access denied');
      }
    }
    
    const [contract] = await db
      .update(contracts)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(contracts.id, id), eq(contracts.userId, userId)))
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
    // Verify equipment belongs to user BEFORE inserting
    const equipment = await this.getEquipmentById(data.equipmentId, userId);
    if (!equipment) {
      throw new Error('Equipment not found or access denied');
    }
    
    const [record] = await db
      .insert(maintenanceRecords)
      .values({ ...data, userId })
      .returning();

    // Update equipment's last maintenance date if this is the most recent
    if (record.completed && record.maintenanceDate) {
      const shouldUpdate = !equipment.lastMaintenanceDate || 
        new Date(record.maintenanceDate) > new Date(equipment.lastMaintenanceDate);
      
      if (shouldUpdate) {
        await this.updateEquipment(
          record.equipmentId,
          { lastMaintenanceDate: record.maintenanceDate },
          userId
        );
      }
    }

    return record;
  }

  // ============================================
  // Maintenance plan operations
  // ============================================

  async getMaintenancePlans(userId: string, equipmentId?: string): Promise<MaintenancePlan[]> {
    // Get all user's equipment first to verify ownership
    const userEquipment = await this.getEquipment(userId);
    const equipmentIds = userEquipment.map(e => e.id);
    
    if (equipmentIds.length === 0) return [];

    if (equipmentId) {
      // Verify this equipment belongs to the user
      if (!equipmentIds.includes(equipmentId)) return [];
      
      return await db
        .select()
        .from(maintenancePlans)
        .where(eq(maintenancePlans.equipmentId, equipmentId))
        .orderBy(desc(maintenancePlans.createdAt));
    }

    // Get plans only for user's equipment
    const plans = await db
      .select()
      .from(maintenancePlans)
      .where(eq(maintenancePlans.active, true))
      .orderBy(desc(maintenancePlans.createdAt));
    
    // Filter to only plans for this user's equipment
    return plans.filter(plan => equipmentIds.includes(plan.equipmentId));
  }

  async getMaintenancePlanById(id: string, userId?: string): Promise<MaintenancePlan | undefined> {
    const [plan] = await db
      .select()
      .from(maintenancePlans)
      .where(eq(maintenancePlans.id, id));
    
    // Verify user owns the equipment this plan belongs to
    if (plan && userId) {
      const equipment = await this.getEquipmentById(plan.equipmentId, userId);
      if (!equipment) return undefined;
    }
    
    return plan;
  }

  async createMaintenancePlan(data: InsertMaintenancePlan, userId: string): Promise<MaintenancePlan> {
    // Verify equipment belongs to user
    const equipment = await this.getEquipmentById(data.equipmentId, userId);
    if (!equipment) {
      throw new Error('Equipment not found or access denied');
    }
    
    const [plan] = await db
      .insert(maintenancePlans)
      .values(data)
      .returning();
    return plan;
  }

  async updateMaintenancePlan(
    id: string,
    data: Partial<InsertMaintenancePlan>,
    userId: string
  ): Promise<MaintenancePlan | undefined> {
    // Verify user owns the plan's equipment
    const existing = await this.getMaintenancePlanById(id, userId);
    if (!existing) return undefined;
    
    // If changing equipmentId, verify user owns the new equipment
    if (data.equipmentId && data.equipmentId !== existing.equipmentId) {
      const newEquipment = await this.getEquipmentById(data.equipmentId, userId);
      if (!newEquipment) {
        throw new Error('New equipment not found or access denied');
      }
    }
    
    const [plan] = await db
      .update(maintenancePlans)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(maintenancePlans.id, id))
      .returning();
    return plan;
  }

  // ============================================
  // Maintenance task operations
  // ============================================

  async getMaintenanceTasks(
    userId: string,
    filters?: { status?: string; equipmentId?: string }
  ): Promise<MaintenanceTask[]> {
    const userEquipment = await this.getEquipment(userId);
    const equipmentIds = userEquipment.map(e => e.id);
    
    if (equipmentIds.length === 0) return [];

    // Verify equipment ownership if filtering by specific equipment
    if (filters?.equipmentId && !equipmentIds.includes(filters.equipmentId)) {
      return [];
    }

    // Get tasks only for user's equipment
    const tasks = await db
      .select()
      .from(maintenanceTasks)
      .orderBy(desc(maintenanceTasks.dueDate));
    
    // Filter to only tasks for user's equipment
    let filteredTasks = tasks.filter(task => equipmentIds.includes(task.equipmentId));

    // Apply additional filters
    if (filters?.equipmentId) {
      filteredTasks = filteredTasks.filter(task => task.equipmentId === filters.equipmentId);
    }

    if (filters?.status) {
      filteredTasks = filteredTasks.filter(task => task.status === filters.status);
    }

    return filteredTasks;
  }

  async getMaintenanceTasksWithDetails(
    userId: string,
    filters?: { status?: string; equipmentId?: string; facilityId?: string; locationId?: string }
  ): Promise<any[]> {
    // Use INNER JOIN with facilities to enforce ownership
    const tasks = await db
      .select({
        id: maintenanceTasks.id,
        equipmentId: maintenanceTasks.equipmentId,
        planId: maintenanceTasks.planId,
        dueDate: maintenanceTasks.dueDate,
        status: maintenanceTasks.status,
        priority: maintenanceTasks.priority,
        assignedTo: maintenanceTasks.assignedTo,
        completedAt: maintenanceTasks.completedAt,
        completedBy: maintenanceTasks.completedBy,
        checklistResult: maintenanceTasks.checklistResult,
        windowEndDate: maintenanceTasks.windowEndDate,
        createdAt: maintenanceTasks.createdAt,
        updatedAt: maintenanceTasks.updatedAt,
        equipmentName: equipment.name,
        equipmentIdCode: equipment.equipmentId,
        equipmentType: equipment.type,
        equipmentCriticality: equipment.criticality,
        facilityId: facilities.id,
        facilityName: facilities.name,
        facilityCode: facilities.code,
        locationId: locations.id,
        locationName: locations.name,
        planFrequencyDays: maintenancePlans.frequencyDays,
        planBufferDays: maintenancePlans.bufferDays,
        planChecklistJson: maintenancePlans.checklistJson,
        planPolicy: maintenancePlans.policy,
        assignedToUserEmail: users.email,
        assignedToUserFirstName: users.firstName,
        assignedToUserLastName: users.lastName,
      })
      .from(maintenanceTasks)
      .innerJoin(equipment, eq(maintenanceTasks.equipmentId, equipment.id))
      .innerJoin(facilities, eq(equipment.facilityId, facilities.id))
      .innerJoin(maintenancePlans, eq(maintenanceTasks.planId, maintenancePlans.id))
      .leftJoin(locations, eq(equipment.locationId, locations.id))
      .leftJoin(users, eq(maintenanceTasks.assignedTo, users.id))
      .where(eq(facilities.userId, userId))
      .orderBy(desc(maintenanceTasks.dueDate));

    // Apply filters
    let filteredTasks = tasks;

    if (filters?.status) {
      filteredTasks = filteredTasks.filter(task => task.status === filters.status);
    }

    if (filters?.equipmentId) {
      filteredTasks = filteredTasks.filter(task => task.equipmentId === filters.equipmentId);
    }

    if (filters?.facilityId) {
      filteredTasks = filteredTasks.filter(task => task.facilityId === filters.facilityId);
    }

    if (filters?.locationId) {
      filteredTasks = filteredTasks.filter(task => task.locationId === filters.locationId);
    }

    return filteredTasks;
  }

  async getMaintenanceTaskWithDetails(id: string, userId: string): Promise<any | undefined> {
    // Use INNER JOIN with facilities to enforce ownership
    const [task] = await db
      .select({
        id: maintenanceTasks.id,
        equipmentId: maintenanceTasks.equipmentId,
        planId: maintenanceTasks.planId,
        dueDate: maintenanceTasks.dueDate,
        status: maintenanceTasks.status,
        priority: maintenanceTasks.priority,
        assignedTo: maintenanceTasks.assignedTo,
        completedAt: maintenanceTasks.completedAt,
        completedBy: maintenanceTasks.completedBy,
        checklistResult: maintenanceTasks.checklistResult,
        windowEndDate: maintenanceTasks.windowEndDate,
        createdAt: maintenanceTasks.createdAt,
        updatedAt: maintenanceTasks.updatedAt,
        equipmentName: equipment.name,
        equipmentIdCode: equipment.equipmentId,
        equipmentType: equipment.type,
        equipmentSerialNumber: equipment.serial,
        equipmentManufacturer: equipment.manufacturer,
        equipmentModel: equipment.model,
        equipmentCriticality: equipment.criticality,
        equipmentStatus: equipment.status,
        facilityId: facilities.id,
        facilityName: facilities.name,
        facilityCode: facilities.code,
        facilityAddress: facilities.address,
        locationId: locations.id,
        locationName: locations.name,
        locationFloor: locations.floor,
        locationRoom: locations.room,
        planFrequencyDays: maintenancePlans.frequencyDays,
        planBufferDays: maintenancePlans.bufferDays,
        planChecklistJson: maintenancePlans.checklistJson,
        planPolicy: maintenancePlans.policy,
        assignedToUserEmail: users.email,
        assignedToUserFirstName: users.firstName,
        assignedToUserLastName: users.lastName,
      })
      .from(maintenanceTasks)
      .innerJoin(equipment, eq(maintenanceTasks.equipmentId, equipment.id))
      .innerJoin(facilities, eq(equipment.facilityId, facilities.id))
      .innerJoin(maintenancePlans, eq(maintenanceTasks.planId, maintenancePlans.id))
      .leftJoin(locations, eq(equipment.locationId, locations.id))
      .leftJoin(users, eq(maintenanceTasks.assignedTo, users.id))
      .where(and(
        eq(maintenanceTasks.id, id),
        eq(facilities.userId, userId)
      ));

    return task;
  }

  async getMaintenanceTaskById(id: string, userId?: string): Promise<MaintenanceTask | undefined> {
    const [task] = await db
      .select()
      .from(maintenanceTasks)
      .where(eq(maintenanceTasks.id, id));
    
    // Verify user owns the equipment this task belongs to
    if (task && userId) {
      const equipment = await this.getEquipmentById(task.equipmentId, userId);
      if (!equipment) return undefined;
    }
    
    return task;
  }

  async createMaintenanceTask(data: InsertMaintenanceTask, userId: string): Promise<MaintenanceTask> {
    // Verify equipment belongs to user
    const equipment = await this.getEquipmentById(data.equipmentId, userId);
    if (!equipment) {
      throw new Error('Equipment not found or access denied');
    }
    
    // Verify plan belongs to user (through equipment ownership)
    const plan = await this.getMaintenancePlanById(data.planId, userId);
    if (!plan) {
      throw new Error('Maintenance plan not found or access denied');
    }
    
    const [task] = await db
      .insert(maintenanceTasks)
      .values(data)
      .returning();
    return task;
  }

  async updateMaintenanceTask(
    id: string,
    data: Partial<InsertMaintenanceTask>,
    userId: string
  ): Promise<MaintenanceTask | undefined> {
    // Verify user owns the task's equipment
    const existing = await this.getMaintenanceTaskById(id, userId);
    if (!existing) return undefined;
    
    // If changing equipmentId, verify user owns the new equipment
    if (data.equipmentId && data.equipmentId !== existing.equipmentId) {
      const newEquipment = await this.getEquipmentById(data.equipmentId, userId);
      if (!newEquipment) {
        throw new Error('New equipment not found or access denied');
      }
    }
    
    // If changing planId, verify user owns the new plan
    if (data.planId && data.planId !== existing.planId) {
      const newPlan = await this.getMaintenancePlanById(data.planId, userId);
      if (!newPlan) {
        throw new Error('New maintenance plan not found or access denied');
      }
    }
    
    const [task] = await db
      .update(maintenanceTasks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(maintenanceTasks.id, id))
      .returning();
    return task;
  }

  async completeMaintenanceTask(
    id: string,
    completedBy: string,
    notes: string,
    userId: string,
    checklistResult?: any
  ): Promise<MaintenanceTask | undefined> {
    // Verify user owns the task
    const existing = await this.getMaintenanceTaskById(id, userId);
    if (!existing) return undefined;
    
    const [task] = await db
      .update(maintenanceTasks)
      .set({
        status: 'completed',
        completedAt: new Date(),
        completedBy,
        completionNotes: notes,
        checklistResult,
        updatedAt: new Date(),
      })
      .where(eq(maintenanceTasks.id, id))
      .returning();
    return task;
  }

  // ============================================
  // Alert operations
  // ============================================

  async getAlerts(
    userId: string,
    filters?: { status?: string; severity?: string }
  ): Promise<Alert[]> {
    const conditions = [eq(alerts.userId, userId)];

    if (filters?.status) {
      conditions.push(eq(alerts.status, filters.status));
    }

    if (filters?.severity) {
      conditions.push(eq(alerts.severity, filters.severity));
    }

    return await db
      .select()
      .from(alerts)
      .where(and(...conditions))
      .orderBy(desc(alerts.createdAt));
  }

  async getAlertById(id: string, userId: string): Promise<Alert | undefined> {
    const [alert] = await db
      .select()
      .from(alerts)
      .where(and(eq(alerts.id, id), eq(alerts.userId, userId)));
    return alert;
  }

  async createAlert(data: InsertAlert, userId: string): Promise<Alert> {
    // Verify the userId in data matches the caller
    if (data.userId !== userId) {
      throw new Error('Cannot create alerts for other users');
    }
    
    // Alerts use entityType and entityId for references (not direct foreign keys)
    // Ownership validation happens at the entity level (task, equipment, contract)
    
    const [alert] = await db
      .insert(alerts)
      .values(data)
      .returning();
    return alert;
  }

  async updateAlert(
    id: string,
    data: Partial<InsertAlert>,
    userId: string
  ): Promise<Alert | undefined> {
    // Verify user owns the alert
    const existing = await this.getAlertById(id, userId);
    if (!existing) return undefined;
    
    // Alerts use entityType and entityId for references (not direct foreign keys)
    // Ownership validation happens at the entity level (task, equipment, contract)
    
    const [alert] = await db
      .update(alerts)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(alerts.id, id), eq(alerts.userId, userId)))
      .returning();
    return alert;
  }

  async acknowledgeAlert(id: string, userId: string): Promise<Alert | undefined> {
    const [alert] = await db
      .update(alerts)
      .set({ status: 'acknowledged', updatedAt: new Date() })
      .where(and(eq(alerts.id, id), eq(alerts.userId, userId)))
      .returning();
    return alert;
  }

  async snoozeAlert(
    id: string,
    userId: string,
    snoozedUntil: Date
  ): Promise<Alert | undefined> {
    const [alert] = await db
      .update(alerts)
      .set({ 
        status: 'snoozed', 
        snoozedUntil, 
        updatedAt: new Date() 
      })
      .where(and(eq(alerts.id, id), eq(alerts.userId, userId)))
      .returning();
    return alert;
  }

  async resolveAlert(id: string, userId: string): Promise<Alert | undefined> {
    const [alert] = await db
      .update(alerts)
      .set({ status: 'resolved', updatedAt: new Date() })
      .where(and(eq(alerts.id, id), eq(alerts.userId, userId)))
      .returning();
    return alert;
  }

  // ============================================
  // Notification log operations
  // ============================================

  async getNotificationLogs(userId: string, alertId?: string): Promise<NotificationLog[]> {
    if (alertId) {
      // Verify user owns the alert
      const alert = await this.getAlertById(alertId, userId);
      if (!alert) return [];
      
      return await db
        .select()
        .from(notificationLogs)
        .where(eq(notificationLogs.alertId, alertId))
        .orderBy(desc(notificationLogs.createdAt));
    }

    // Get all alerts for user and then their notification logs
    const userAlerts = await this.getAlerts(userId);
    const alertIds = userAlerts.map(a => a.id);
    
    if (alertIds.length === 0) return [];
    
    const logs = await db
      .select()
      .from(notificationLogs)
      .orderBy(desc(notificationLogs.createdAt));
    
    // Filter to only logs for user's alerts
    return logs.filter(log => alertIds.includes(log.alertId));
  }

  async createNotificationLog(data: InsertNotificationLog, userId: string): Promise<NotificationLog> {
    // Verify user owns the alert
    const alert = await this.getAlertById(data.alertId, userId);
    if (!alert) {
      throw new Error('Alert not found or access denied');
    }
    
    const [log] = await db
      .insert(notificationLogs)
      .values(data)
      .returning();
    return log;
  }

  async updateNotificationLog(
    id: string,
    data: Partial<InsertNotificationLog>,
    userId: string
  ): Promise<NotificationLog | undefined> {
    // Get existing log
    const [existing] = await db
      .select()
      .from(notificationLogs)
      .where(eq(notificationLogs.id, id));
    
    if (!existing) return undefined;
    
    // Verify user owns the alert this log belongs to
    const alert = await this.getAlertById(existing.alertId, userId);
    if (!alert) return undefined;
    
    const [log] = await db
      .update(notificationLogs)
      .set(data)
      .where(eq(notificationLogs.id, id))
      .returning();
    return log;
  }

  // ============================================
  // Audit log operations
  // ============================================

  async getAuditLogs(
    requestingUserId: string,
    filters?: { userId?: string; entityType?: string; entityId?: string }
  ): Promise<AuditLog[]> {
    // Users can only see their own audit logs unless they have admin role
    // For now, enforce user can only see their own logs
    const conditions = [eq(auditLogs.userId, requestingUserId)];

    if (filters?.entityType) {
      conditions.push(eq(auditLogs.entityType, filters.entityType));
    }

    if (filters?.entityId) {
      conditions.push(eq(auditLogs.entityId, filters.entityId));
    }

    return await db
      .select()
      .from(auditLogs)
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt));
  }

  async createAuditLog(data: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db
      .insert(auditLogs)
      .values(data)
      .returning();
    return log;
  }
}

export const storage = new DatabaseStorage();
