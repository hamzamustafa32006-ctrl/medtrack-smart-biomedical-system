import { db } from "./db";
import { rolesPermissions } from "@shared/schema";
import { sql } from "drizzle-orm";

/**
 * Seed default role permissions
 * This runs automatically on server startup
 */
export async function seedDefaultPermissions() {
  try {
    console.log("[SEED] Checking roles_permissions table...");
    
    const existingPermissions = await db.select().from(rolesPermissions).limit(1);
    
    if (existingPermissions.length > 0) {
      console.log("[SEED] Permissions already seeded, skipping");
      return;
    }

    console.log("[SEED] Seeding default permissions...");
    
    const permissions = [
      // Admin permissions
      { role: 'admin', permission: 'view_all', description: 'View all data and reports' },
      { role: 'admin', permission: 'edit_all', description: 'Create, update, and delete all records' },
      { role: 'admin', permission: 'approve_maintenance', description: 'Approve and verify maintenance records' },
      { role: 'admin', permission: 'manage_users', description: 'Manage user accounts and roles' },
      { role: 'admin', permission: 'export_reports', description: 'Export data and generate reports' },
      
      // Supervisor permissions
      { role: 'supervisor', permission: 'view_all', description: 'View all data and reports' },
      { role: 'supervisor', permission: 'approve_maintenance', description: 'Approve and verify maintenance records' },
      { role: 'supervisor', permission: 'view_reports', description: 'View analytics and reports' },
      
      // Technician permissions
      { role: 'technician', permission: 'view_assigned', description: 'View assigned equipment and tasks' },
      { role: 'technician', permission: 'update_tasks', description: 'Update maintenance records and tasks' },
      { role: 'technician', permission: 'create_alerts', description: 'Create maintenance alerts' },
      
      // Viewer permissions
      { role: 'viewer', permission: 'view_dashboard', description: 'View dashboard and analytics' },
      { role: 'viewer', permission: 'view_equipment', description: 'View equipment list' },
    ];

    await db.insert(rolesPermissions).values(permissions).onConflictDoNothing();
    
    console.log(`[SEED] ✅ Seeded ${permissions.length} default permissions`);
  } catch (error) {
    console.error("[SEED] Error seeding permissions:", error);
    // Don't throw - server should continue even if seed fails
  }
}
