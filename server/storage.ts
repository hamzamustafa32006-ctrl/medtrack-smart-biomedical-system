// Reference: javascript_database and javascript_log_in_with_replit blueprints
import {
  users,
  equipment,
  contracts,
  maintenanceRecords,
  facilities,
  locations,
  vendors,
  maintenancePlans,
  maintenanceTasks,
  maintenanceSchedules,
  alerts,
  notificationLogs,
  auditLogs,
  rolesPermissions,
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
  type Vendor,
  type InsertVendor,
  type MaintenancePlan,
  type InsertMaintenancePlan,
  type MaintenanceTask,
  type InsertMaintenanceTask,
  type MaintenanceSchedule,
  type InsertMaintenanceSchedule,
  type Alert,
  type InsertAlert,
  type NotificationLog,
  type InsertNotificationLog,
  type AuditLog,
  type InsertAuditLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lte, or, ne, sql } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (MANDATORY for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  hasPermission(role: string, permission: string): Promise<boolean>;
  
  // Facility operations
  getFacilities(userId: string): Promise<Facility[]>;
  getFacilityById(id: string, userId: string): Promise<Facility | undefined>;
  createFacility(data: InsertFacility, userId: string): Promise<Facility>;
  updateFacility(id: string, data: Partial<InsertFacility>, userId: string): Promise<Facility | undefined>;
  deleteFacility(id: string, userId: string): Promise<boolean>;
  
  // Location operations
  getAllLocations(userId: string): Promise<Location[]>;
  getLocations(facilityId: string, userId?: string): Promise<Location[]>;
  getLocationById(id: string, userId?: string): Promise<Location | undefined>;
  createLocation(data: InsertLocation, userId: string): Promise<Location>;
  updateLocation(id: string, data: Partial<InsertLocation>, userId: string): Promise<Location | undefined>;
  deleteLocation(id: string, userId: string): Promise<boolean>;
  
  // Vendor operations
  getVendors(userId: string): Promise<Vendor[]>;
  getVendorById(id: string, userId: string): Promise<Vendor | undefined>;
  createVendor(data: InsertVendor, userId: string): Promise<Vendor>;
  updateVendor(id: string, data: Partial<InsertVendor>, userId: string): Promise<Vendor | undefined>;
  deleteVendor(id: string, userId: string): Promise<boolean>;
  
  // Equipment operations
  getEquipment(userId: string): Promise<Equipment[]>;
  getEquipmentWithDetails(userId: string): Promise<any[]>;
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
  getMaintenanceRecordsWithDetails(userId: string, filters?: { 
    q?: string;
    equipmentId?: string; 
    status?: string | string[]; 
    maintenanceType?: string | string[];
    technicianId?: string;
    costMin?: number;
    costMax?: number;
    dateFrom?: Date;
    dateTo?: Date;
    sort?: string;
    order?: 'asc' | 'desc';
    page?: number;
    pageSize?: number;
  }): Promise<{ meta: any; data: any[] }>;
  getMaintenanceRecordById(id: string, userId: string): Promise<MaintenanceRecord | undefined>;
  createMaintenanceRecord(data: InsertMaintenanceRecord, userId: string): Promise<MaintenanceRecord>;
  updateMaintenanceRecord(id: string, data: Partial<InsertMaintenanceRecord>, userId: string): Promise<MaintenanceRecord | undefined>;
  completeMaintenanceRecord(id: string, userId: string, verifiedBy?: string): Promise<MaintenanceRecord | undefined>;
  
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
  getAlertsWithDetails(userId: string, filters?: { status?: string; severity?: string; facilityId?: string; startDate?: Date; endDate?: Date }): Promise<any[]>;
  getUnreadAlertCount(userId: string): Promise<number>;
  getAlertById(id: string, userId: string): Promise<Alert | undefined>;
  createAlert(data: InsertAlert, userId: string): Promise<Alert>;
  updateAlert(id: string, data: Partial<InsertAlert>, userId: string): Promise<Alert | undefined>;
  acknowledgeAlert(id: string, userId: string): Promise<Alert | undefined>;
  snoozeAlert(id: string, userId: string, snoozedUntil: Date): Promise<Alert | undefined>;
  resolveAlert(id: string, userId: string): Promise<Alert | undefined>;
  escalateAlert(id: string, userId: string): Promise<Alert | undefined>;
  
  // Notification log operations
  getNotificationLogs(userId: string, alertId?: string): Promise<NotificationLog[]>;
  createNotificationLog(data: InsertNotificationLog, userId: string): Promise<NotificationLog>;
  updateNotificationLog(id: string, data: Partial<InsertNotificationLog>, userId: string): Promise<NotificationLog | undefined>;
  
  // Audit log operations
  getAuditLogs(requestingUserId: string, filters?: { userId?: string; entityType?: string; entityId?: string }): Promise<AuditLog[]>;
  createAuditLog(data: InsertAuditLog): Promise<AuditLog>;
  
  // Maintenance schedule operations
  getMaintenanceSchedules(userId: string, filters?: { status?: string; equipmentId?: string }): Promise<MaintenanceSchedule[]>;
  getMaintenanceSchedulesWithDetails(userId: string, filters?: { status?: string; equipmentId?: string }): Promise<any[]>;
  getMaintenanceScheduleById(id: string, userId: string): Promise<MaintenanceSchedule | undefined>;
  createMaintenanceSchedule(data: InsertMaintenanceSchedule, userId: string): Promise<MaintenanceSchedule>;
  updateMaintenanceSchedule(id: string, data: Partial<InsertMaintenanceSchedule>, userId: string): Promise<MaintenanceSchedule | undefined>;
  completeMaintenanceSchedule(id: string, userId: string, completionNotes?: string): Promise<MaintenanceSchedule | undefined>;
  assignMaintenanceSchedule(id: string, assignedTo: string, userId: string): Promise<MaintenanceSchedule | undefined>;
  
  // Analytics operations
  getAnalyticsSummary(userId: string): Promise<{
    total: number;
    overdue: number;
    critical: number;
    upcoming: number;
    healthy: number;
    resolved_this_week: number;
    due_next_7d: number;
  }>;

  // Equipment Alerts operations
  getEquipmentAlertsSummary(userId: string): Promise<{
    critical: number;
    medium: number;
    good: number;
  }>;
  getEquipmentAlertsOverview(userId: string, limit: number): Promise<{
    critical: { count: number; items: Equipment[] };
    medium: { count: number; items: Equipment[] };
    good: { count: number; items: Equipment[] };
  }>;
}

export class DatabaseStorage implements IStorage {
  // ============================================
  // User operations (MANDATORY for Replit Auth)
  // ============================================

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.getUser(id);
  }

  async hasPermission(role: string, permission: string): Promise<boolean> {
    const [result] = await db
      .select()
      .from(rolesPermissions)
      .where(and(
        eq(rolesPermissions.role, role),
        eq(rolesPermissions.permission, permission)
      ))
      .limit(1);
    
    return !!result;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Handle both ID and email conflicts
    // First, try to insert. If conflict on ID, update. If conflict on email, update that user.
    try {
      // In development mode, make all new users admins for easier testing
      const isDev = process.env.NODE_ENV === 'development';
      const insertData = {
        ...userData,
        role: isDev ? 'admin' : (userData.role || 'technician'),
      };
      
      const [user] = await db
        .insert(users)
        .values(insertData)
        .onConflictDoUpdate({
          target: users.id,
          set: {
            ...userData,
            updatedAt: new Date(),
            // Don't override role on update
          },
        })
        .returning();
      return user;
    } catch (error: any) {
      // If email conflict, find user by email and update
      if (error?.message?.includes('users_email_unique')) {
        // Find existing user by email
        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.email, userData.email!));
        
        if (existingUser) {
          // Update existing user with new data (including new ID if changed)
          const [updatedUser] = await db
            .update(users)
            .set({
              ...userData,
              updatedAt: new Date(),
            })
            .where(eq(users.email, userData.email!))
            .returning();
          return updatedUser;
        }
      }
      throw error;
    }
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

  async getAllLocations(userId: string): Promise<Location[]> {
    // Get all locations across all facilities owned by the user
    return await db
      .select({ 
        id: locations.id,
        name: locations.name,
        facilityId: locations.facilityId,
        floor: locations.floor,
        room: locations.room,
        notes: locations.notes,
        createdAt: locations.createdAt,
        updatedAt: locations.updatedAt,
      })
      .from(locations)
      .innerJoin(facilities, eq(facilities.id, locations.facilityId))
      .where(eq(facilities.userId, userId))
      .orderBy(desc(locations.createdAt));
  }

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
  // Vendor operations
  // ============================================

  async getVendors(userId: string): Promise<Vendor[]> {
    return await db
      .select()
      .from(vendors)
      .where(eq(vendors.userId, userId))
      .orderBy(vendors.name);
  }

  async getVendorById(id: string, userId: string): Promise<Vendor | undefined> {
    const [vendor] = await db
      .select()
      .from(vendors)
      .where(and(eq(vendors.id, id), eq(vendors.userId, userId)));
    return vendor;
  }

  async createVendor(data: InsertVendor, userId: string): Promise<Vendor> {
    const [vendor] = await db
      .insert(vendors)
      .values({ ...data, userId })
      .returning();
    return vendor;
  }

  async updateVendor(
    id: string,
    data: Partial<InsertVendor>,
    userId: string
  ): Promise<Vendor | undefined> {
    const existing = await this.getVendorById(id, userId);
    if (!existing) return undefined;

    const [vendor] = await db
      .update(vendors)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(vendors.id, id))
      .returning();
    return vendor;
  }

  async deleteVendor(id: string, userId: string): Promise<boolean> {
    const vendor = await this.getVendorById(id, userId);
    if (!vendor) return false;

    const result = await db
      .delete(vendors)
      .where(eq(vendors.id, id))
      .returning({ id: vendors.id });
    
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

  async getEquipmentWithDetails(userId: string): Promise<any[]> {
    const result = await db
      .select({
        id: equipment.id,
        userId: equipment.userId,
        equipmentId: equipment.equipmentId,
        name: equipment.name,
        facilityName: equipment.facilityName,
        location: equipment.location,
        type: equipment.type,
        manufacturer: equipment.manufacturer,
        model: equipment.model,
        serial: equipment.serial,
        barcode: equipment.barcode,
        status: equipment.status,
        criticality: equipment.criticality,
        condition: equipment.condition,
        department: equipment.department,
        imageUrl: equipment.imageUrl,
        calibrationRequired: equipment.calibrationRequired,
        calibrationDate: equipment.calibrationDate,
        usageHours: equipment.usageHours,
        installDate: equipment.installDate,
        purchaseDate: equipment.purchaseDate,
        warrantyExpiryDate: equipment.warrantyExpiryDate,
        nextDueDate: equipment.nextDueDate,
        maintenanceFrequencyDays: equipment.maintenanceFrequencyDays,
        lastMaintenanceDate: equipment.lastMaintenanceDate,
        notes: equipment.notes,
        createdAt: equipment.createdAt,
        updatedAt: equipment.updatedAt,
        facilityId: equipment.facilityId,
        locationId: equipment.locationId,
        vendorId: equipment.vendorId,
        facility: {
          id: facilities.id,
          name: facilities.name,
          code: facilities.code,
        },
        locationDetails: {
          id: locations.id,
          name: locations.name,
          floor: locations.floor,
        },
        vendor: {
          id: vendors.id,
          name: vendors.name,
          contact: vendors.contact,
        },
      })
      .from(equipment)
      .leftJoin(facilities, eq(equipment.facilityId, facilities.id))
      .leftJoin(locations, eq(equipment.locationId, locations.id))
      .leftJoin(vendors, eq(equipment.vendorId, vendors.id))
      .where(eq(equipment.userId, userId))
      .orderBy(desc(equipment.createdAt));

    const now = new Date();
    return result.map(row => ({
      ...row,
      isOverdue: row.nextDueDate ? row.nextDueDate < now : false,
    }));
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
    
    // Set start date if not provided
    const recordData = {
      ...data,
      userId,
      startDate: data.startDate || new Date(),
    };
    
    const [record] = await db
      .insert(maintenanceRecords)
      .values(recordData)
      .returning();

    // Update equipment status to "Under Maintenance" if record is in progress
    if (record.status === 'In Progress') {
      await this.updateEquipment(
        record.equipmentId,
        { status: 'Under Maintenance' },
        userId
      );
    }

    // Update equipment's last maintenance date if completed
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

  async getMaintenanceRecordsWithDetails(
    userId: string,
    filters?: { 
      q?: string;
      equipmentId?: string; 
      status?: string | string[]; 
      maintenanceType?: string | string[];
      technicianId?: string;
      costMin?: number;
      costMax?: number;
      dateFrom?: Date;
      dateTo?: Date;
      sort?: string;
      order?: 'asc' | 'desc';
      page?: number;
      pageSize?: number;
    }
  ): Promise<{ meta: any; data: any[] }> {
    // Build where conditions
    const conditions: any[] = [eq(maintenanceRecords.userId, userId)];
    
    // Search query (equipment name, serial, technician)
    if (filters?.q) {
      const searchPattern = `%${filters.q}%`;
      conditions.push(
        or(
          sql`${equipment.name} ILIKE ${searchPattern}`,
          sql`${equipment.serial} ILIKE ${searchPattern}`,
          sql`${maintenanceRecords.performedBy} ILIKE ${searchPattern}`
        )
      );
    }
    
    // Multi-value filters
    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        conditions.push(inArray(maintenanceRecords.status, filters.status));
      } else {
        conditions.push(eq(maintenanceRecords.status, filters.status));
      }
    }
    
    if (filters?.maintenanceType) {
      if (Array.isArray(filters.maintenanceType)) {
        conditions.push(inArray(maintenanceRecords.maintenanceType, filters.maintenanceType));
      } else {
        conditions.push(eq(maintenanceRecords.maintenanceType, filters.maintenanceType));
      }
    }
    
    // Single value filters
    if (filters?.equipmentId) {
      conditions.push(eq(maintenanceRecords.equipmentId, filters.equipmentId));
    }
    if (filters?.technicianId) {
      conditions.push(eq(maintenanceRecords.technicianId, filters.technicianId));
    }
    
    // Cost range
    if (filters?.costMin !== undefined && filters?.costMax !== undefined) {
      conditions.push(
        and(
          gte(maintenanceRecords.cost, filters.costMin.toString()),
          lte(maintenanceRecords.cost, filters.costMax.toString())
        )
      );
    } else if (filters?.costMin !== undefined) {
      conditions.push(gte(maintenanceRecords.cost, filters.costMin.toString()));
    } else if (filters?.costMax !== undefined) {
      conditions.push(lte(maintenanceRecords.cost, filters.costMax.toString()));
    }
    
    // Date range
    if (filters?.dateFrom && filters?.dateTo) {
      conditions.push(
        and(
          gte(maintenanceRecords.maintenanceDate, filters.dateFrom),
          lte(maintenanceRecords.maintenanceDate, filters.dateTo)
        )
      );
    } else if (filters?.dateFrom) {
      conditions.push(gte(maintenanceRecords.maintenanceDate, filters.dateFrom));
    } else if (filters?.dateTo) {
      conditions.push(lte(maintenanceRecords.maintenanceDate, filters.dateTo));
    }

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(maintenanceRecords)
      .leftJoin(equipment, eq(maintenanceRecords.equipmentId, equipment.id))
      .leftJoin(facilities, eq(equipment.facilityId, facilities.id))
      .where(and(...conditions));

    // Determine sort column
    const sortColumn = 
      filters?.sort === 'cost' ? maintenanceRecords.cost :
      filters?.sort === 'status' ? maintenanceRecords.status :
      filters?.sort === 'maintenanceType' ? maintenanceRecords.maintenanceType :
      filters?.sort === 'equipmentName' ? equipment.name :
      maintenanceRecords.maintenanceDate;
    
    const orderFn = filters?.order === 'asc' ? asc : desc;
    
    // Pagination
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    const records = await db
      .select({
        id: maintenanceRecords.id,
        equipmentId: maintenanceRecords.equipmentId,
        technicianId: maintenanceRecords.technicianId,
        maintenanceDate: maintenanceRecords.maintenanceDate,
        startDate: maintenanceRecords.startDate,
        endDate: maintenanceRecords.endDate,
        maintenanceType: maintenanceRecords.maintenanceType,
        description: maintenanceRecords.description,
        actionsTaken: maintenanceRecords.actionsTaken,
        partsUsed: maintenanceRecords.partsUsed,
        performedBy: maintenanceRecords.performedBy,
        cost: maintenanceRecords.cost,
        status: maintenanceRecords.status,
        verificationStatus: maintenanceRecords.verificationStatus,
        verifiedBy: maintenanceRecords.verifiedBy,
        verifiedAt: maintenanceRecords.verifiedAt,
        completed: maintenanceRecords.completed,
        nextScheduledDate: maintenanceRecords.nextScheduledDate,
        notes: maintenanceRecords.notes,
        createdAt: maintenanceRecords.createdAt,
        updatedAt: maintenanceRecords.updatedAt,
        equipmentName: equipment.name,
        equipmentSerial: equipment.serial,
        equipmentType: equipment.type,
        facilityName: facilities.name,
      })
      .from(maintenanceRecords)
      .leftJoin(equipment, eq(maintenanceRecords.equipmentId, equipment.id))
      .leftJoin(facilities, eq(equipment.facilityId, facilities.id))
      .where(and(...conditions))
      .orderBy(orderFn(sortColumn))
      .limit(pageSize)
      .offset(offset);

    return {
      meta: {
        page,
        pageSize,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / pageSize) || 1,
        sort: filters?.sort || 'maintenanceDate',
        order: filters?.order || 'desc',
      },
      data: records,
    };
  }

  async getMaintenanceRecordById(
    id: string,
    userId: string
  ): Promise<MaintenanceRecord | undefined> {
    const [record] = await db
      .select()
      .from(maintenanceRecords)
      .where(and(eq(maintenanceRecords.id, id), eq(maintenanceRecords.userId, userId)));
    return record;
  }

  async updateMaintenanceRecord(
    id: string,
    data: Partial<InsertMaintenanceRecord>,
    userId: string
  ): Promise<MaintenanceRecord | undefined> {
    // Verify user owns the record
    const existing = await this.getMaintenanceRecordById(id, userId);
    if (!existing) return undefined;

    const [record] = await db
      .update(maintenanceRecords)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(maintenanceRecords.id, id), eq(maintenanceRecords.userId, userId)))
      .returning();
    
    return record;
  }

  async completeMaintenanceRecord(
    id: string,
    userId: string,
    verifiedBy?: string
  ): Promise<MaintenanceRecord | undefined> {
    // Verify user owns the record
    const existing = await this.getMaintenanceRecordById(id, userId);
    if (!existing) return undefined;

    // Get equipment details for auto-rescheduling
    const equipment = await this.getEquipmentById(existing.equipmentId, userId);
    if (!equipment) {
      throw new Error('Equipment not found');
    }

    const now = new Date();
    
    // Calculate next scheduled date based on equipment's maintenance frequency
    let nextScheduledDate = existing.nextScheduledDate;
    if (equipment.maintenanceFrequencyDays && !nextScheduledDate) {
      const daysToAdd = equipment.maintenanceFrequencyDays;
      nextScheduledDate = new Date(now);
      nextScheduledDate.setDate(nextScheduledDate.getDate() + daysToAdd);
    }

    // Update the maintenance record to completed
    const [record] = await db
      .update(maintenanceRecords)
      .set({
        status: 'Completed',
        completed: true,
        endDate: now,
        verificationStatus: verifiedBy ? 'Verified' : 'Pending',
        verifiedBy: verifiedBy || null,
        verifiedAt: verifiedBy ? now : null,
        nextScheduledDate,
        updatedAt: now,
      })
      .where(and(eq(maintenanceRecords.id, id), eq(maintenanceRecords.userId, userId)))
      .returning();

    // Update equipment status and dates
    await this.updateEquipment(
      existing.equipmentId,
      {
        status: 'Active',
        lastMaintenanceDate: now,
        nextDueDate: nextScheduledDate || equipment.nextDueDate,
      },
      userId
    );

    // Auto-resolve any open alerts for this equipment
    await db
      .update(alerts)
      .set({
        status: 'Resolved',
        resolvedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(alerts.entityType, 'equipment'),
          eq(alerts.entityId, existing.equipmentId),
          eq(alerts.userId, userId),
          eq(alerts.status, 'Open')
        )
      );

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

    // Auto-resolve related alerts
    const { autoResolveTaskAlerts, autoResolveEquipmentAlerts } = await import("./alertService");
    await autoResolveTaskAlerts(task.id, userId);
    await autoResolveEquipmentAlerts(task.equipmentId, userId);

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
      .set({ 
        status: 'acknowledged', 
        acknowledgedBy: userId,
        acknowledgedAt: new Date(),
        updatedAt: new Date() 
      })
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
      .set({ 
        status: 'resolved', 
        resolvedAt: new Date(),
        updatedAt: new Date() 
      })
      .where(and(eq(alerts.id, id), eq(alerts.userId, userId)))
      .returning();
    return alert;
  }

  async escalateAlert(id: string, userId: string): Promise<Alert | undefined> {
    const existing = await this.getAlertById(id, userId);
    if (!existing) return undefined;

    const [alert] = await db
      .update(alerts)
      .set({ 
        status: 'escalated',
        escalationLevel: existing.escalationLevel + 1,
        updatedAt: new Date() 
      })
      .where(and(eq(alerts.id, id), eq(alerts.userId, userId)))
      .returning();
    return alert;
  }

  async getAlertsWithDetails(
    userId: string,
    filters?: { status?: string; severity?: string; facilityId?: string; startDate?: Date; endDate?: Date }
  ): Promise<any[]> {
    const alertsData = await db
      .select({
        id: alerts.id,
        userId: alerts.userId,
        entityType: alerts.entityType,
        entityId: alerts.entityId,
        severity: alerts.severity,
        title: alerts.title,
        message: alerts.message,
        status: alerts.status,
        acknowledgedBy: alerts.acknowledgedBy,
        acknowledgedAt: alerts.acknowledgedAt,
        resolvedAt: alerts.resolvedAt,
        firstTriggeredAt: alerts.firstTriggeredAt,
        escalationLevel: alerts.escalationLevel,
        createdAt: alerts.createdAt,
        facilityId: facilities.id,
        facilityName: facilities.name,
        facilityCode: facilities.code,
        locationId: locations.id,
        locationName: locations.name,
        acknowledgedByUserFirstName: users.firstName,
        acknowledgedByUserLastName: users.lastName,
        equipmentId: equipment.id,
        equipmentName: equipment.name,
        equipmentIdCode: equipment.equipmentId,
        equipmentType: equipment.type,
        equipmentNextDueDate: equipment.nextDueDate,
        taskId: maintenanceTasks.id,
        taskDueDate: maintenanceTasks.dueDate,
        taskStatus: maintenanceTasks.status,
        taskPriority: maintenanceTasks.priority,
        contractId: contracts.id,
        contractVendorName: contracts.vendorName,
        contractEndDate: contracts.endDate,
        contractType: contracts.contractType,
      })
      .from(alerts)
      .leftJoin(facilities, eq(alerts.facilityId, facilities.id))
      .leftJoin(locations, eq(alerts.locationId, locations.id))
      .leftJoin(users, eq(alerts.acknowledgedBy, users.id))
      .leftJoin(equipment, eq(alerts.entityId, equipment.id))
      .leftJoin(maintenanceTasks, eq(alerts.entityId, maintenanceTasks.id))
      .leftJoin(contracts, eq(alerts.entityId, contracts.id))
      .where(eq(alerts.userId, userId))
      .orderBy(desc(alerts.createdAt));

    // Apply filters
    let filteredAlerts = alertsData;

    if (filters?.status) {
      filteredAlerts = filteredAlerts.filter(alert => alert.status === filters.status);
    }

    if (filters?.severity) {
      filteredAlerts = filteredAlerts.filter(alert => alert.severity === filters.severity);
    }

    if (filters?.facilityId) {
      filteredAlerts = filteredAlerts.filter(alert => alert.facilityId === filters.facilityId);
    }

    if (filters?.startDate) {
      filteredAlerts = filteredAlerts.filter(alert => 
        alert.createdAt && new Date(alert.createdAt) >= filters.startDate!
      );
    }

    if (filters?.endDate) {
      filteredAlerts = filteredAlerts.filter(alert => 
        alert.createdAt && new Date(alert.createdAt) <= filters.endDate!
      );
    }

    return filteredAlerts;
  }

  async getUnreadAlertCount(userId: string): Promise<number> {
    const unreadAlerts = await db
      .select()
      .from(alerts)
      .where(and(
        eq(alerts.userId, userId),
        eq(alerts.status, 'open')
      ));
    
    return unreadAlerts.length;
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

  // ============================================
  // Maintenance schedule operations
  // ============================================

  async getMaintenanceSchedules(
    userId: string,
    filters?: { status?: string; equipmentId?: string }
  ): Promise<MaintenanceSchedule[]> {
    const conditions = [eq(maintenanceSchedules.userId, userId)];
    
    if (filters?.status) {
      conditions.push(eq(maintenanceSchedules.status, filters.status));
    }
    if (filters?.equipmentId) {
      conditions.push(eq(maintenanceSchedules.equipmentId, filters.equipmentId));
    }
    
    return await db
      .select()
      .from(maintenanceSchedules)
      .where(and(...conditions))
      .orderBy(maintenanceSchedules.nextDueDate);
  }

  async getMaintenanceSchedulesWithDetails(
    userId: string,
    filters?: { status?: string; equipmentId?: string }
  ): Promise<any[]> {
    const conditions = [eq(maintenanceSchedules.userId, userId)];
    
    if (filters?.status) {
      conditions.push(eq(maintenanceSchedules.status, filters.status));
    }
    if (filters?.equipmentId) {
      conditions.push(eq(maintenanceSchedules.equipmentId, filters.equipmentId));
    }
    
    return await db
      .select({
        schedule: maintenanceSchedules,
        equipment: equipment,
      })
      .from(maintenanceSchedules)
      .leftJoin(equipment, eq(maintenanceSchedules.equipmentId, equipment.id))
      .where(and(...conditions))
      .orderBy(maintenanceSchedules.nextDueDate);
  }

  async getMaintenanceScheduleById(
    id: string,
    userId: string
  ): Promise<MaintenanceSchedule | undefined> {
    const [schedule] = await db
      .select()
      .from(maintenanceSchedules)
      .where(and(
        eq(maintenanceSchedules.id, id),
        eq(maintenanceSchedules.userId, userId)
      ));
    return schedule;
  }

  async createMaintenanceSchedule(
    data: InsertMaintenanceSchedule,
    userId: string
  ): Promise<MaintenanceSchedule> {
    const [schedule] = await db
      .insert(maintenanceSchedules)
      .values({ ...data, userId })
      .returning();
    return schedule;
  }

  async updateMaintenanceSchedule(
    id: string,
    data: Partial<InsertMaintenanceSchedule>,
    userId: string
  ): Promise<MaintenanceSchedule | undefined> {
    const existing = await this.getMaintenanceScheduleById(id, userId);
    if (!existing) return undefined;
    
    const [updated] = await db
      .update(maintenanceSchedules)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(maintenanceSchedules.id, id))
      .returning();
    return updated;
  }

  async completeMaintenanceSchedule(
    id: string,
    userId: string,
    completionNotes?: string
  ): Promise<MaintenanceSchedule | undefined> {
    const existing = await this.getMaintenanceScheduleById(id, userId);
    if (!existing) return undefined;
    
    const today = new Date();
    const nextDueDate = new Date(today);
    nextDueDate.setDate(nextDueDate.getDate() + existing.frequencyDays);
    
    // Update schedule: mark as completed and generate next cycle
    const [updated] = await db
      .update(maintenanceSchedules)
      .set({
        lastMaintenanceDate: today,
        nextDueDate: nextDueDate,
        status: "Scheduled",
        notes: completionNotes || existing.notes,
        updatedAt: new Date(),
      })
      .where(eq(maintenanceSchedules.id, id))
      .returning();
    
    // Also update the equipment's last maintenance date (with user scoping)
    await db
      .update(equipment)
      .set({
        lastMaintenanceDate: today,
        nextDueDate: nextDueDate,
        updatedAt: new Date(),
      })
      .where(and(
        eq(equipment.id, existing.equipmentId),
        eq(equipment.userId, userId)
      ));
    
    return updated;
  }

  async assignMaintenanceSchedule(
    id: string,
    assignedTo: string,
    userId: string
  ): Promise<MaintenanceSchedule | undefined> {
    const existing = await this.getMaintenanceScheduleById(id, userId);
    if (!existing) return undefined;
    
    const [updated] = await db
      .update(maintenanceSchedules)
      .set({ assignedTo, updatedAt: new Date() })
      .where(eq(maintenanceSchedules.id, id))
      .returning();
    return updated;
  }

  // ============================================
  // Analytics operations
  // ============================================

  async getAnalyticsSummary(userId: string): Promise<{
    total: number;
    overdue: number;
    critical: number;
    upcoming: number;
    healthy: number;
    resolved_this_week: number;
    due_next_7d: number;
  }> {
    const [summary] = await db
      .select({
        total: sql<number>`COUNT(*)::int`,
        overdue: sql<number>`COUNT(*) FILTER (WHERE ${equipment.isOverdue} = true)::int`,
        critical: sql<number>`COUNT(*) FILTER (WHERE ${equipment.statusColor} = 'red')::int`,
        upcoming: sql<number>`COUNT(*) FILTER (WHERE ${equipment.statusColor} = 'orange')::int`,
        healthy: sql<number>`COUNT(*) FILTER (WHERE ${equipment.statusColor} = 'green')::int`,
        resolved_this_week: sql<number>`COUNT(*) FILTER (
          WHERE COALESCE(${equipment.lastMaintenanceDate}, DATE '1900-01-01') >= CURRENT_DATE - INTERVAL '7 days'
        )::int`,
        due_next_7d: sql<number>`COUNT(*) FILTER (
          WHERE ${equipment.nextDueDate} >= CURRENT_DATE 
            AND ${equipment.nextDueDate} < CURRENT_DATE + INTERVAL '7 days'
        )::int`,
      })
      .from(equipment)
      .where(eq(equipment.userId, userId));
    
    return summary;
  }

  // ============================================
  // Equipment Alerts operations
  // ============================================

  async getEquipmentAlertsSummary(userId: string): Promise<{
    critical: number;
    medium: number;
    good: number;
  }> {
    const [counts] = await db
      .select({
        critical: sql<number>`COUNT(*) FILTER (
          WHERE ${equipment.statusColor} = 'red' 
            OR ${equipment.isOverdue} = true
            OR ${equipment.status} = 'Decommissioned'
        )::int`,
        medium: sql<number>`COUNT(*) FILTER (
          WHERE (${equipment.statusColor} = 'orange' OR ${equipment.priority} = 'Urgent')
            AND ${equipment.statusColor} != 'red'
            AND ${equipment.isOverdue} IS NOT true
            AND ${equipment.status} != 'Decommissioned'
        )::int`,
        good: sql<number>`COUNT(*) FILTER (
          WHERE ${equipment.statusColor} = 'green'
            AND ${equipment.status} = 'Active'
            AND ${equipment.isOverdue} IS NOT true
        )::int`,
      })
      .from(equipment)
      .where(eq(equipment.userId, userId));
    
    return counts;
  }

  async getEquipmentAlertsOverview(userId: string, limit: number): Promise<{
    critical: { count: number; items: Equipment[] };
    medium: { count: number; items: Equipment[] };
    good: { count: number; items: Equipment[] };
  }> {
    // Get critical equipment
    const criticalItems = await db
      .select()
      .from(equipment)
      .where(
        and(
          eq(equipment.userId, userId),
          or(
            eq(equipment.statusColor, 'red'),
            eq(equipment.isOverdue, true),
            eq(equipment.status, 'Decommissioned')
          )
        )
      )
      .orderBy(desc(equipment.isOverdue), equipment.nextDueDate)
      .limit(limit);

    // Get medium priority equipment (excluding critical items)
    const mediumItems = await db
      .select()
      .from(equipment)
      .where(
        and(
          eq(equipment.userId, userId),
          or(
            eq(equipment.statusColor, 'orange'),
            eq(equipment.priority, 'Urgent')
          ),
          ne(equipment.statusColor, 'red'),
          ne(equipment.status, 'Decommissioned'),
          or(
            eq(equipment.isOverdue, false),
            sql`${equipment.isOverdue} IS NULL`
          )
        )
      )
      .orderBy(equipment.nextDueDate)
      .limit(limit);

    // Get good/healthy equipment (excluding critical and medium)
    const goodItems = await db
      .select()
      .from(equipment)
      .where(
        and(
          eq(equipment.userId, userId),
          eq(equipment.statusColor, 'green'),
          eq(equipment.status, 'Active'),
          or(
            eq(equipment.isOverdue, false),
            sql`${equipment.isOverdue} IS NULL`
          )
        )
      )
      .orderBy(equipment.name)
      .limit(limit);

    return {
      critical: { count: criticalItems.length, items: criticalItems },
      medium: { count: mediumItems.length, items: mediumItems },
      good: { count: goodItems.length, items: goodItems },
    };
  }
}

export const storage = new DatabaseStorage();
