import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";

interface RequireRoleProps {
  role: string | string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Component that conditionally renders children based on user role
 * Usage: <RequireRole role="admin">Admin only content</RequireRole>
 */
export function RequireRole({ role, children, fallback = null }: RequireRoleProps) {
  const hasRole = useRole(role);
  
  if (!hasRole) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

/**
 * Component that only renders for admins
 */
export function AdminOnly({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return <RequireRole role="admin" fallback={fallback}>{children}</RequireRole>;
}

/**
 * Component that only renders for supervisors
 */
export function SupervisorOnly({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return <RequireRole role="supervisor" fallback={fallback}>{children}</RequireRole>;
}

/**
 * Component that only renders for technicians
 */
export function TechnicianOnly({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return <RequireRole role="technician" fallback={fallback}>{children}</RequireRole>;
}

/**
 * Component that renders for users who can approve maintenance (admin or supervisor)
 */
export function CanApproveMaintenance({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return <RequireRole role={["admin", "supervisor"]} fallback={fallback}>{children}</RequireRole>;
}

/**
 * Component that renders different content based on role
 */
interface RoleSwitchProps {
  admin?: React.ReactNode;
  supervisor?: React.ReactNode;
  technician?: React.ReactNode;
  viewer?: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleSwitch({ admin, supervisor, technician, viewer, fallback }: RoleSwitchProps) {
  const { user } = useAuth();
  
  if (!user?.role) {
    return <>{fallback}</>;
  }
  
  switch (user.role) {
    case 'admin':
      return <>{admin || fallback}</>;
    case 'supervisor':
      return <>{supervisor || fallback}</>;
    case 'technician':
      return <>{technician || fallback}</>;
    case 'viewer':
      return <>{viewer || fallback}</>;
    default:
      return <>{fallback}</>;
  }
}
