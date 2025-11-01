import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

/**
 * Authorization middleware - checks if user has required permission
 * Usage: router.post('/endpoint', requirePermission('edit_all'), handler)
 */
export function requirePermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ 
          error: "Unauthorized", 
          message: "You must be logged in to perform this action" 
        });
      }

      const hasPermission = await checkPermission(userId, permission);
      
      if (!hasPermission) {
        return res.status(403).json({ 
          error: "Forbidden", 
          message: `You do not have permission to ${permission}` 
        });
      }

      next();
    } catch (error) {
      console.error("[authorize] Error checking permission:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}

/**
 * Check if user has a specific permission based on their role
 */
export async function checkPermission(userId: string, permission: string): Promise<boolean> {
  try {
    const user = await storage.getUserById(userId);
    if (!user) return false;

    const hasPermission = await storage.hasPermission(user.role, permission);
    return hasPermission;
  } catch (error) {
    console.error("[checkPermission] Error:", error);
    return false;
  }
}

/**
 * Check if user has any of the specified roles
 */
export function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ 
          error: "Unauthorized", 
          message: "You must be logged in" 
        });
      }

      const user = await storage.getUserById(userId);
      
      if (!user || !roles.includes(user.role)) {
        return res.status(403).json({ 
          error: "Forbidden", 
          message: `Required role: ${roles.join(' or ')}` 
        });
      }

      next();
    } catch (error) {
      console.error("[requireRole] Error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}

/**
 * Check if user is admin
 */
export const requireAdmin = requireRole('admin');

/**
 * Check if user can approve maintenance (admin or supervisor)
 */
export const canApproveMaintenance = requirePermission('approve_maintenance');
