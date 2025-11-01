// Reference: javascript_log_in_with_replit blueprint
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
  insertEquipmentSchema,
  insertContractSchema,
  insertMaintenanceRecordSchema,
  insertFacilitySchema,
  insertLocationSchema,
  insertVendorSchema,
  insertMaintenanceTaskSchema,
  insertMaintenanceScheduleSchema,
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // ============================================
  // Auth middleware
  // ============================================
  await setupAuth(app);

  // ============================================
  // Auth routes
  // ============================================
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // ============================================
  // Vendor routes
  // ============================================

  app.get("/api/vendors", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const vendors = await storage.getVendors(userId);
      res.json(vendors);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      res.status(500).json({ message: "Failed to fetch vendors" });
    }
  });

  app.get("/api/vendors/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const vendor = await storage.getVendorById(id, userId);
      
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }
      
      res.json(vendor);
    } catch (error) {
      console.error("Error fetching vendor:", error);
      res.status(500).json({ message: "Failed to fetch vendor" });
    }
  });

  app.post("/api/vendors", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertVendorSchema.parse(req.body);
      const vendor = await storage.createVendor(data, userId);
      res.status(201).json(vendor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating vendor:", error);
      res.status(500).json({ message: "Failed to create vendor" });
    }
  });

  app.patch("/api/vendors/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const data = insertVendorSchema.partial().parse(req.body);
      const vendor = await storage.updateVendor(id, data, userId);
      
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }
      
      res.json(vendor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating vendor:", error);
      res.status(500).json({ message: "Failed to update vendor" });
    }
  });

  app.delete("/api/vendors/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const success = await storage.deleteVendor(id, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Vendor not found" });
      }
      
      res.json({ message: "Vendor deleted successfully" });
    } catch (error) {
      console.error("Error deleting vendor:", error);
      res.status(500).json({ message: "Failed to delete vendor" });
    }
  });

  // ============================================
  // Equipment routes
  // ============================================

  // Get all equipment for user (with joined details)
  app.get("/api/equipment", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const equipment = await storage.getEquipmentWithDetails(userId);
      res.json(equipment);
    } catch (error) {
      console.error("Error fetching equipment:", error);
      res.status(500).json({ message: "Failed to fetch equipment" });
    }
  });

  // Create new equipment
  app.post("/api/equipment", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertEquipmentSchema.parse(req.body);
      const equipment = await storage.createEquipment(data, userId);
      res.status(201).json(equipment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating equipment:", error);
      res.status(500).json({ message: "Failed to create equipment" });
    }
  });

  // Update equipment
  app.patch("/api/equipment/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const data = insertEquipmentSchema.partial().parse(req.body);
      const equipment = await storage.updateEquipment(id, data, userId);
      
      if (!equipment) {
        return res.status(404).json({ message: "Equipment not found" });
      }
      
      res.json(equipment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating equipment:", error);
      res.status(500).json({ message: "Failed to update equipment" });
    }
  });

  // ============================================
  // Contract routes
  // ============================================

  // Get all contracts for user
  app.get("/api/contracts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const contracts = await storage.getContracts(userId);
      res.json(contracts);
    } catch (error) {
      console.error("Error fetching contracts:", error);
      res.status(500).json({ message: "Failed to fetch contracts" });
    }
  });

  // Create new contract
  app.post("/api/contracts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertContractSchema.parse(req.body);
      const contract = await storage.createContract(data, userId);
      res.status(201).json(contract);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating contract:", error);
      res.status(500).json({ message: "Failed to create contract" });
    }
  });

  // ============================================
  // Maintenance record routes
  // ============================================

  // Get all maintenance records for user
  app.get("/api/maintenance-records", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const records = await storage.getMaintenanceRecords(userId);
      res.json(records);
    } catch (error) {
      console.error("Error fetching maintenance records:", error);
      res.status(500).json({ message: "Failed to fetch maintenance records" });
    }
  });

  // Create new maintenance record
  app.post("/api/maintenance-records", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertMaintenanceRecordSchema.parse(req.body);
      const record = await storage.createMaintenanceRecord(data, userId);
      res.status(201).json(record);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating maintenance record:", error);
      res.status(500).json({ message: "Failed to create maintenance record" });
    }
  });

  // ============================================
  // Facility routes
  // ============================================

  // Get all facilities for user
  app.get("/api/facilities", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const facilities = await storage.getFacilities(userId);
      res.json(facilities);
    } catch (error) {
      console.error("Error fetching facilities:", error);
      res.status(500).json({ message: "Failed to fetch facilities" });
    }
  });

  // Get facility by ID
  app.get("/api/facilities/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const facility = await storage.getFacilityById(id, userId);
      
      if (!facility) {
        return res.status(404).json({ message: "Facility not found" });
      }
      
      res.json(facility);
    } catch (error) {
      console.error("Error fetching facility:", error);
      res.status(500).json({ message: "Failed to fetch facility" });
    }
  });

  // Create new facility
  app.post("/api/facilities", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertFacilitySchema.parse(req.body);
      const facility = await storage.createFacility(data, userId);
      res.status(201).json(facility);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating facility:", error);
      res.status(500).json({ message: "Failed to create facility" });
    }
  });

  // Update facility
  app.patch("/api/facilities/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const data = insertFacilitySchema.partial().parse(req.body);
      const facility = await storage.updateFacility(id, data, userId);
      
      if (!facility) {
        return res.status(404).json({ message: "Facility not found" });
      }
      
      res.json(facility);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating facility:", error);
      res.status(500).json({ message: "Failed to update facility" });
    }
  });

  // Delete facility
  app.delete("/api/facilities/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const success = await storage.deleteFacility(id, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Facility not found" });
      }
      
      res.json({ message: "Facility deleted successfully" });
    } catch (error) {
      console.error("Error deleting facility:", error);
      res.status(500).json({ message: "Failed to delete facility" });
    }
  });

  // ============================================
  // Location routes
  // ============================================

  // Get all locations for user (across all facilities)
  app.get("/api/locations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const locations = await storage.getAllLocations(userId);
      res.json(locations);
    } catch (error) {
      console.error("Error fetching all locations:", error);
      res.status(500).json({ message: "Failed to fetch locations" });
    }
  });

  // Get locations for a facility
  app.get("/api/facilities/:facilityId/locations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { facilityId } = req.params;
      const locations = await storage.getLocations(facilityId, userId);
      res.json(locations);
    } catch (error) {
      console.error("Error fetching locations:", error);
      res.status(500).json({ message: "Failed to fetch locations" });
    }
  });

  // Create new location
  app.post("/api/facilities/:facilityId/locations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { facilityId } = req.params;
      const data = insertLocationSchema.parse({
        ...req.body,
        facilityId
      });
      const location = await storage.createLocation(data, userId);
      res.status(201).json(location);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating location:", error);
      res.status(500).json({ message: "Failed to create location" });
    }
  });

  // Update location
  app.patch("/api/locations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const data = insertLocationSchema.partial().parse(req.body);
      const location = await storage.updateLocation(id, data, userId);
      
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }
      
      res.json(location);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating location:", error);
      res.status(500).json({ message: "Failed to update location" });
    }
  });

  // Delete location
  app.delete("/api/locations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const success = await storage.deleteLocation(id, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Location not found" });
      }
      
      res.json({ message: "Location deleted successfully" });
    } catch (error) {
      console.error("Error deleting location:", error);
      res.status(500).json({ message: "Failed to delete location" });
    }
  });

  // ============================================
  // Maintenance Plans routes
  // ============================================

  // Get all maintenance plans
  app.get("/api/maintenance-plans", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { equipmentId } = req.query;
      const plans = await storage.getMaintenancePlans(userId, equipmentId);
      res.json(plans);
    } catch (error) {
      console.error("Error fetching maintenance plans:", error);
      res.status(500).json({ message: "Failed to fetch maintenance plans" });
    }
  });

  // Get maintenance plan by ID
  app.get("/api/maintenance-plans/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const plan = await storage.getMaintenancePlanById(id, userId);
      
      if (!plan) {
        return res.status(404).json({ message: "Maintenance plan not found" });
      }
      
      res.json(plan);
    } catch (error) {
      console.error("Error fetching maintenance plan:", error);
      res.status(500).json({ message: "Failed to fetch maintenance plan" });
    }
  });

  // ============================================
  // Maintenance Tasks routes (Task 3.1)
  // ============================================

  // Get all tasks with detailed information (joined data)
  app.get("/api/maintenance-tasks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { status, equipmentId, facilityId, locationId } = req.query;
      const tasks = await storage.getMaintenanceTasksWithDetails(userId, {
        status,
        equipmentId,
        facilityId,
        locationId,
      });
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching maintenance tasks:", error);
      res.status(500).json({ message: "Failed to fetch maintenance tasks" });
    }
  });

  // Get task by ID with detailed information
  app.get("/api/maintenance-tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const task = await storage.getMaintenanceTaskWithDetails(id, userId);
      
      if (!task) {
        return res.status(404).json({ message: "Maintenance task not found" });
      }
      
      res.json(task);
    } catch (error) {
      console.error("Error fetching maintenance task:", error);
      res.status(500).json({ message: "Failed to fetch maintenance task" });
    }
  });

  // Update task (status, notes, checklist, assignment)
  app.patch("/api/maintenance-tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const data = insertMaintenanceTaskSchema.partial().parse(req.body);
      const task = await storage.updateMaintenanceTask(id, data, userId);
      
      if (!task) {
        return res.status(404).json({ message: "Maintenance task not found" });
      }
      
      res.json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating maintenance task:", error);
      res.status(500).json({ message: "Failed to update maintenance task" });
    }
  });

  // Generate/refresh maintenance tasks from plans
  app.post("/api/maintenance-tasks/generate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { generateMaintenanceTasks } = await import("./taskGenerationService");
      const result = await generateMaintenanceTasks(userId);
      
      res.json({
        message: "Task generation completed",
        generated: result.generated,
        updated: result.updated,
        errors: result.errors,
      });
    } catch (error) {
      console.error("Error generating maintenance tasks:", error);
      res.status(500).json({ message: "Failed to generate tasks" });
    }
  });

  // ============================================
  // Alert routes
  // ============================================

  // Get all alerts with detailed information (joined facility/location data)
  app.get("/api/alerts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { status, severity, facilityId, startDate, endDate } = req.query;
      
      const filters: any = {};
      if (status) filters.status = status;
      if (severity) filters.severity = severity;
      if (facilityId) filters.facilityId = facilityId;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      
      const alerts = await storage.getAlertsWithDetails(userId, filters);
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      res.status(500).json({ message: "Failed to fetch alerts" });
    }
  });

  // Get unread alert count
  app.get("/api/alerts/unread-count", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const count = await storage.getUnreadAlertCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread alert count:", error);
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  // Get equipment dashboard summary (maintenance status counts by color)
  app.get("/api/equipment/dashboard-summary", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { db } = await import("./db");
      const { equipment } = await import("@shared/schema");
      const { eq, sql } = await import("drizzle-orm");
      
      const [summary] = await db
        .select({
          total: sql<number>`COUNT(*)::int`,
          critical: sql<number>`COUNT(*) FILTER (WHERE ${equipment.statusColor} = 'red')::int`,
          warning: sql<number>`COUNT(*) FILTER (WHERE ${equipment.statusColor} = 'orange')::int`,
          ok: sql<number>`COUNT(*) FILTER (WHERE ${equipment.statusColor} = 'green')::int`,
          overdue: sql<number>`COUNT(*) FILTER (WHERE ${equipment.isOverdue} = true)::int`,
          urgent: sql<number>`COUNT(*) FILTER (WHERE ${equipment.priority} = 'Urgent')::int`,
        })
        .from(equipment)
        .where(eq(equipment.userId, userId));
      
      res.json(summary);
    } catch (error) {
      console.error("Error fetching equipment dashboard summary:", error);
      res.status(500).json({ message: "Failed to fetch dashboard summary" });
    }
  });

  // Enhanced analytics endpoint with additional metrics
  app.get("/api/analytics/summary", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const summary = await storage.getAnalyticsSummary(userId);
      res.json(summary);
    } catch (error) {
      console.error("Error fetching analytics summary:", error);
      res.status(500).json({ message: "Failed to fetch analytics summary" });
    }
  });

  // ============================================
  // Maintenance Schedule routes
  // ============================================

  app.get("/api/maintenance-schedules", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { status, equipmentId } = req.query;
      
      const schedules = await storage.getMaintenanceSchedulesWithDetails(
        userId,
        { status: status as string, equipmentId: equipmentId as string }
      );
      
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching maintenance schedules:", error);
      res.status(500).json({ message: "Failed to fetch maintenance schedules" });
    }
  });

  app.get("/api/maintenance-schedules/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      const schedule = await storage.getMaintenanceScheduleById(id, userId);
      if (!schedule) {
        return res.status(404).json({ message: "Maintenance schedule not found" });
      }
      
      res.json(schedule);
    } catch (error) {
      console.error("Error fetching maintenance schedule:", error);
      res.status(500).json({ message: "Failed to fetch maintenance schedule" });
    }
  });

  app.post("/api/maintenance-schedules", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertMaintenanceScheduleSchema.parse(req.body);
      
      const schedule = await storage.createMaintenanceSchedule(data, userId);
      res.status(201).json(schedule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating maintenance schedule:", error);
      res.status(500).json({ message: "Failed to create maintenance schedule" });
    }
  });

  app.patch("/api/maintenance-schedules/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const data = insertMaintenanceScheduleSchema.partial().parse(req.body);
      
      const schedule = await storage.updateMaintenanceSchedule(id, data, userId);
      if (!schedule) {
        return res.status(404).json({ message: "Maintenance schedule not found" });
      }
      
      res.json(schedule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating maintenance schedule:", error);
      res.status(500).json({ message: "Failed to update maintenance schedule" });
    }
  });

  app.post("/api/maintenance-schedules/:id/complete", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const { notes } = req.body;
      
      const schedule = await storage.completeMaintenanceSchedule(id, userId, notes);
      if (!schedule) {
        return res.status(404).json({ message: "Maintenance schedule not found" });
      }
      
      res.json(schedule);
    } catch (error) {
      console.error("Error completing maintenance schedule:", error);
      res.status(500).json({ message: "Failed to complete maintenance schedule" });
    }
  });

  app.post("/api/maintenance-schedules/:id/assign", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const { assignedTo } = req.body;
      
      if (!assignedTo) {
        return res.status(400).json({ message: "assignedTo is required" });
      }
      
      const schedule = await storage.assignMaintenanceSchedule(id, assignedTo, userId);
      if (!schedule) {
        return res.status(404).json({ message: "Maintenance schedule not found" });
      }
      
      res.json(schedule);
    } catch (error) {
      console.error("Error assigning maintenance schedule:", error);
      res.status(500).json({ message: "Failed to assign maintenance schedule" });
    }
  });

  // Real-time analytics stream using Server-Sent Events (SSE)
  app.get("/api/analytics/stream", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    
    // Set SSE headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    });

    let lastHash: string | null = null;
    let closed = false;

    // Clean up on client disconnect
    req.on("close", () => {
      closed = true;
      if (intervalId) clearInterval(intervalId);
    });

    // Helper to hash payload for change detection
    const crypto = await import("crypto");
    function hashPayload(obj: any): string {
      return crypto.createHash("sha1").update(JSON.stringify(obj)).digest("hex");
    }

    // Push analytics data if changed
    async function pushUpdate() {
      if (closed) return;
      
      try {
        const data = await storage.getAnalyticsSummary(userId);
        const hash = hashPayload(data);
        
        // Only send if data has changed
        if (hash !== lastHash) {
          lastHash = hash;
          res.write(`event: analytics\n`);
          res.write(`data: ${JSON.stringify(data)}\n\n`);
        }
      } catch (error) {
        console.error("SSE push error:", error);
        res.write(`event: error\ndata: "analytics_failed"\n\n`);
      }
    }

    // Send initial snapshot immediately
    await pushUpdate();

    // Poll for updates every 5 seconds
    const intervalId = setInterval(() => {
      if (!closed) pushUpdate();
    }, 5000);
  });

  // Widget script that auto-creates analytics dashboard counters
  app.get("/widgets/analytics-summary.js", isAuthenticated, async (req: any, res) => {
    res.type("application/javascript");
    try {
      const userId = req.user.claims.sub;
      const summary = await storage.getAnalyticsSummary(userId);

      // Ensure all values default to 0 if undefined
      const safeData = {
        total: summary.total || 0,
        overdue: summary.overdue || 0,
        critical: summary.critical || 0,
        upcoming: summary.upcoming || 0,
        healthy: summary.healthy || 0,
        resolved_this_week: summary.resolved_this_week || 0,
        due_next_7d: summary.due_next_7d || 0,
      };

      res.send(`
(function(){
  const data = ${JSON.stringify(safeData)};

  function ensureBox(id, label, border){
    var el = document.getElementById(id);
    if(!el){
      var wrap = document.getElementById('alert-counters');
      if(!wrap){
        wrap = document.createElement('div');
        wrap.id = 'alert-counters';
        wrap.style.display='flex';
        wrap.style.gap='12px';
        wrap.style.margin='8px 0 16px';
        wrap.style.flexWrap='wrap';
        (document.querySelector('[data-dashboard-header]') || document.body).prepend(wrap);
      }
      var box = document.createElement('div');
      box.style.padding='8px 12px';
      box.style.border='1px solid ' + (border||'#e5e7eb');
      box.style.borderRadius='8px';
      box.style.fontFamily='system-ui, sans-serif';
      var name = document.createElement('div');
      name.style.fontSize='12px';
      name.style.opacity='0.75';
      name.textContent = label;
      var val = document.createElement('div');
      val.id = id;
      val.style.fontSize='20px';
      val.style.fontWeight='600';
      box.appendChild(name);
      box.appendChild(val);
      wrap.appendChild(box);
      el = val;
    }
    return el;
  }

  function set(id, label, value, color){
    try {
      var b = ensureBox(id, label, color);
      b.textContent = (value !== undefined && value !== null) ? value : 0;
    } catch (err) {
      console.error('Failed to set counter:', id, err);
    }
  }

  set('critical-count', 'Critical', data.critical, '#fca5a5');
  set('upcoming-count', 'Upcoming', data.upcoming, '#fdba74');
  set('resolved-count', 'Resolved (7d)', data.resolved_this_week, '#86efac');
  set('overdue-count', 'Overdue', data.overdue, '#fecaca');
  set('total-count', 'Total', data.total, '#cbd5e1');
  set('due7d-count', 'Due Next 7d', data.due_next_7d, '#fde68a');
})();
      `);
    } catch (error) {
      console.error("Error generating analytics widget:", error);
      res.send(`console.error('Analytics summary widget failed. Please check server logs.');`);
    }
  });

  // Real-time widget with live updates via SSE
  app.get("/widgets/analytics-live.js", (req: any, res) => {
    res.type("application/javascript");
    res.send(`
(function(){
  function setText(id, val){
    var el = document.getElementById(id);
    if (el) el.textContent = (val !== undefined && val !== null) ? val : 0;
  }

  function render(d){
    setText('critical-count', d.critical);
    setText('upcoming-count', d.upcoming);
    setText('resolved-count', d.resolved_this_week);
    setText('overdue-count', d.overdue);
    setText('total-count', d.total);
    setText('due7d-count', d.due_next_7d);
  }

  function ensureBox(id, label, border){
    var el = document.getElementById(id);
    if(!el){
      var wrap = document.getElementById('alert-counters');
      if(!wrap){
        wrap = document.createElement('div');
        wrap.id = 'alert-counters';
        wrap.style.display='flex';
        wrap.style.gap='12px';
        wrap.style.margin='8px 0 16px';
        wrap.style.flexWrap='wrap';
        (document.querySelector('[data-dashboard-header]') || document.body).prepend(wrap);
      }
      var box = document.createElement('div');
      box.style.padding='8px 12px';
      box.style.border='1px solid ' + (border||'#e5e7eb');
      box.style.borderRadius='8px';
      box.style.fontFamily='system-ui, sans-serif';
      var name = document.createElement('div');
      name.style.fontSize='12px';
      name.style.opacity='0.75';
      name.textContent = label;
      var val = document.createElement('div');
      val.id = id;
      val.style.fontSize='20px';
      val.style.fontWeight='600';
      box.appendChild(name);
      box.appendChild(val);
      wrap.appendChild(box);
    }
  }

  // Auto-create counter boxes
  ensureBox('critical-count', 'Critical', '#fca5a5');
  ensureBox('upcoming-count', 'Upcoming', '#fdba74');
  ensureBox('resolved-count', 'Resolved (7d)', '#86efac');
  ensureBox('overdue-count', 'Overdue', '#fecaca');
  ensureBox('total-count', 'Total', '#cbd5e1');
  ensureBox('due7d-count', 'Due Next 7d', '#fde68a');

  // Use EventSource for real-time updates, fallback to polling
  if ('EventSource' in window){
    var es = new EventSource('/api/analytics/stream');
    es.addEventListener('analytics', function(ev){
      try { 
        render(JSON.parse(ev.data)); 
      } catch(e){
        console.error('Failed to parse analytics data:', e);
      }
    });
    es.addEventListener('error', function(){
      console.error('Analytics stream connection error');
    });
    es.onerror = function(){
      // Silently handle connection issues
    };
  } else {
    // Fallback: poll the REST API every 5 seconds
    function pollAnalytics(){
      fetch('/api/analytics/summary')
        .then(r => r.json())
        .then(render)
        .catch(err => console.error('Analytics fetch failed:', err));
    }
    pollAnalytics();
    setInterval(pollAnalytics, 5000);
  }
})();
    `);
  });

  // Get alert by ID
  app.get("/api/alerts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const alert = await storage.getAlertById(id, userId);
      
      if (!alert) {
        return res.status(404).json({ message: "Alert not found" });
      }
      
      res.json(alert);
    } catch (error) {
      console.error("Error fetching alert:", error);
      res.status(500).json({ message: "Failed to fetch alert" });
    }
  });

  // Acknowledge alert
  app.patch("/api/alerts/:id/acknowledge", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const alert = await storage.acknowledgeAlert(id, userId);
      
      if (!alert) {
        return res.status(404).json({ message: "Alert not found" });
      }
      
      res.json(alert);
    } catch (error) {
      console.error("Error acknowledging alert:", error);
      res.status(500).json({ message: "Failed to acknowledge alert" });
    }
  });

  // Resolve alert
  app.patch("/api/alerts/:id/resolve", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const alert = await storage.resolveAlert(id, userId);
      
      if (!alert) {
        return res.status(404).json({ message: "Alert not found" });
      }
      
      res.json(alert);
    } catch (error) {
      console.error("Error resolving alert:", error);
      res.status(500).json({ message: "Failed to resolve alert" });
    }
  });

  // Escalate alert
  app.patch("/api/alerts/:id/escalate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const alert = await storage.escalateAlert(id, userId);
      
      if (!alert) {
        return res.status(404).json({ message: "Alert not found" });
      }
      
      res.json(alert);
    } catch (error) {
      console.error("Error escalating alert:", error);
      res.status(500).json({ message: "Failed to escalate alert" });
    }
  });

  // Generate maintenance alerts (manual trigger or can be called by cron)
  app.post("/api/alerts/generate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { generateMaintenanceAlerts } = await import("./alertService");
      
      // Generate alerts for this user only
      const result = await generateMaintenanceAlerts(userId);
      
      res.json({
        success: true,
        message: `Alert generation complete: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped`,
        ...result,
      });
    } catch (error) {
      console.error("Error generating alerts:", error);
      res.status(500).json({ message: "Failed to generate alerts" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
