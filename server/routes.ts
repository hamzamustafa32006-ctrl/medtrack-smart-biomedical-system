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
  insertMaintenanceTaskSchema,
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
  // Equipment routes
  // ============================================

  // Get all equipment for user
  app.get("/api/equipment", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const equipment = await storage.getEquipment(userId);
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

  const httpServer = createServer(app);
  return httpServer;
}
