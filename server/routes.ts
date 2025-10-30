// Reference: javascript_log_in_with_replit blueprint
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
  insertEquipmentSchema,
  insertContractSchema,
  insertMaintenanceRecordSchema,
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

  const httpServer = createServer(app);
  return httpServer;
}
