import { useQuery } from '@tanstack/react-query';

export type MaintenanceFilters = {
  q?: string;
  status?: string[];
  maintenanceType?: string[];
  equipmentId?: string;
  technicianId?: string;
  costMin?: number;
  costMax?: number;
  dateFrom?: string;
  dateTo?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
};

export type MaintenanceRecord = {
  id: string;
  equipmentId: string;
  equipmentName: string | null;
  equipmentSerial: string | null;
  equipmentType: string | null;
  facilityName: string | null;
  maintenanceType: string;
  maintenanceDate: string;
  startDate: string | null;
  endDate: string | null;
  status: string;
  verificationStatus: string;
  description: string | null;
  actionsTaken: string | null;
  partsUsed: string | null;
  performedBy: string | null;
  technicianId: string | null;
  cost: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  completed: boolean;
  nextScheduledDate: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
};

export type MaintenanceResponse = {
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    sort: string;
    order: string;
  };
  data: MaintenanceRecord[];
};

const buildQueryString = (filters: MaintenanceFilters): string => {
  const params = new URLSearchParams();
  
  if (filters.q) params.set('q', filters.q);
  
  // Multi-value filters (join with comma)
  if (filters.status?.length) {
    params.set('status', filters.status.join(','));
  }
  if (filters.maintenanceType?.length) {
    params.set('maintenanceType', filters.maintenanceType.join(','));
  }
  
  // Single value filters
  if (filters.equipmentId) params.set('equipmentId', filters.equipmentId);
  if (filters.technicianId) params.set('technicianId', filters.technicianId);
  
  // Cost range
  if (filters.costMin !== undefined) params.set('costMin', filters.costMin.toString());
  if (filters.costMax !== undefined) params.set('costMax', filters.costMax.toString());
  
  // Date range
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  
  // Sorting
  if (filters.sort) params.set('sort', filters.sort);
  if (filters.order) params.set('order', filters.order);
  
  // Pagination
  if (filters.page) params.set('page', filters.page.toString());
  if (filters.pageSize) params.set('pageSize', filters.pageSize.toString());
  
  return params.toString();
};

export function useMaintenance(filters: MaintenanceFilters = { page: 1, pageSize: 20 }) {
  const queryString = buildQueryString(filters);
  
  return useQuery<MaintenanceResponse>({
    queryKey: ['/api/maintenance-records/details', queryString],
    queryFn: async () => {
      const url = `/api/maintenance-records/details${queryString ? `?${queryString}` : ''}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) {
        throw new Error('Failed to fetch maintenance records');
      }
      return res.json();
    },
    staleTime: 15000,
  });
}
