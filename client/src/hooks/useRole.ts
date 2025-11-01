import { useAuth } from "./useAuth";

/**
 * Hook to check if user has a specific role
 */
export function useRole(role: string | string[]): boolean {
  const { user } = useAuth();
  
  if (!user?.role) return false;
  
  if (Array.isArray(role)) {
    return role.includes(user.role);
  }
  
  return user.role === role;
}

/**
 * Hook to check if user is admin
 */
export function useIsAdmin(): boolean {
  return useRole('admin');
}

/**
 * Hook to check if user is supervisor
 */
export function useIsSupervisor(): boolean {
  return useRole('supervisor');
}

/**
 * Hook to check if user is technician
 */
export function useIsTechnician(): boolean {
  return useRole('technician');
}

/**
 * Hook to check if user can approve maintenance (admin or supervisor)
 */
export function useCanApproveMaintenance(): boolean {
  return useRole(['admin', 'supervisor']);
}

/**
 * Hook to get current user role
 */
export function useCurrentRole(): string | undefined {
  const { user } = useAuth();
  return user?.role;
}
