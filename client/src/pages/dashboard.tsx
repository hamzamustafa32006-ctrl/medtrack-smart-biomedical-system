import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Wrench,
  TrendingUp,
  Package,
  Loader2,
} from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { Equipment } from "@shared/schema";
import { formatDate } from "@/lib/dateUtils";

type FilterState = {
  maintenanceStatus: string;
  equipmentStatus: string;
  facility: string;
  search: string;
};

const MAINTENANCE_STATUSES = [
  { label: "All Equipment", value: "all" },
  { label: "🔴 Overdue", value: "overdue" },
  { label: "⚠️ Due Soon (7 days)", value: "upcoming" },
  { label: "✅ Recently Serviced", value: "resolved" },
  { label: "🚨 Critical Priority", value: "critical" },
];

const EQUIPMENT_STATUSES = [
  { label: "All Status", value: "all" },
  { label: "Active", value: "Active" },
  { label: "Pending Inspection", value: "Pending Inspection" },
  { label: "Under Maintenance", value: "Under Maintenance" },
  { label: "Decommissioned", value: "Decommissioned" },
];

const COLORS = {
  red: "#ef4444",
  orange: "#FF6D00",
  green: "#22c55e",
  blue: "#0057B7",
  gray: "#6b7280",
};

export default function Dashboard() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [facilities, setFacilities] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    maintenanceStatus: "all",
    equipmentStatus: "all",
    facility: "all-facilities",
    search: "",
  });

  // Debounce timer for search
  const [searchDebounce, setSearchDebounce] = useState<NodeJS.Timeout | null>(null);

  // Fetch facilities on mount
  useEffect(() => {
    fetch("/api/facilities")
      .then((r) => r.json())
      .then((data) => setFacilities(Array.isArray(data) ? data : []))
      .catch(() => setFacilities([]));
  }, []);

  // Fetch equipment data
  const fetchEquipment = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (filters.maintenanceStatus && filters.maintenanceStatus !== "all") {
        params.append("status", filters.maintenanceStatus);
      }
      
      if (filters.search.trim()) {
        params.append("q", filters.search.trim());
      }
      
      if (filters.equipmentStatus && filters.equipmentStatus !== "all") {
        params.append("equipmentStatus", filters.equipmentStatus);
      }
      
      if (filters.facility && filters.facility !== "all-facilities") {
        params.append("facilityId", filters.facility);
      }

      const endpoint = (filters.maintenanceStatus && filters.maintenanceStatus !== "all") || filters.search.trim()
        ? `/api/equipment/status?${params.toString()}`
        : `/api/equipment?${params.toString()}`;

      const res = await fetch(endpoint);
      const data = await res.json();
      
      const items = Array.isArray(data) ? data : data.items || [];
      setEquipment(items);
    } catch (e) {
      console.error("Failed to fetch equipment:", e);
      setEquipment([]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch when filters change (except search which is debounced)
  useEffect(() => {
    fetchEquipment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.maintenanceStatus, filters.equipmentStatus, filters.facility]);

  // Debounced search
  useEffect(() => {
    if (searchDebounce) {
      clearTimeout(searchDebounce);
    }
    
    const timer = setTimeout(() => {
      fetchEquipment();
    }, 300);
    
    setSearchDebounce(timer);
    
    return () => {
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search]);

  // Calculate KPI metrics
  const metrics = useMemo(() => {
    const total = equipment.length;
    const active = equipment.filter((e) => e.status === "Active").length;
    const overdue = equipment.filter((e) => e.isOverdue).length;
    const critical = equipment.filter((e) => e.statusColor === "red").length;
    const underMaintenance = equipment.filter((e) => e.status === "Under Maintenance").length;
    const upcoming = equipment.filter((e) => {
      if (!e.nextDueDate || e.isOverdue) return false;
      const daysUntilDue = Math.ceil((new Date(e.nextDueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return daysUntilDue >= 0 && daysUntilDue <= 7;
    }).length;

    return { total, active, overdue, critical, underMaintenance, upcoming };
  }, [equipment]);

  // Status distribution for pie chart
  const statusDistribution = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    equipment.forEach((e) => {
      statusCounts[e.status || "Unknown"] = (statusCounts[e.status || "Unknown"] || 0) + 1;
    });
    
    return Object.entries(statusCounts).map(([name, value]) => ({
      name,
      value,
    }));
  }, [equipment]);

  // Status color distribution
  const colorDistribution = useMemo(() => {
    const red = equipment.filter((e) => e.statusColor === "red").length;
    const orange = equipment.filter((e) => e.statusColor === "orange").length;
    const green = equipment.filter((e) => e.statusColor === "green").length;
    
    return [
      { name: "Critical (Red)", value: red, color: COLORS.red },
      { name: "Warning (Orange)", value: orange, color: COLORS.orange },
      { name: "Good (Green)", value: green, color: COLORS.green },
    ].filter(item => item.value > 0);
  }, [equipment]);

  // Facility distribution for bar chart
  const facilityDistribution = useMemo(() => {
    const facilityCounts: Record<string, number> = {};
    equipment.forEach((e) => {
      const facName = (e as any).facilityName || "Unknown";
      facilityCounts[facName] = (facilityCounts[facName] || 0) + 1;
    });
    
    return Object.entries(facilityCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [equipment]);

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setFilters({
      maintenanceStatus: "all",
      equipmentStatus: "all",
      facility: "all-facilities",
      search: "",
    });
  };

  return (
    <div className="min-h-full bg-background">
      <div className="border-b bg-card px-6 py-4">
        <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">
          Equipment Analytics Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Real-time monitoring and analytics for all equipment
        </p>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Filter Panel */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filters & Search</CardTitle>
            <CardDescription>Filter equipment by status, facility, or search</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-3">
              {/* Maintenance Status Filter */}
              <Select
                value={filters.maintenanceStatus}
                onValueChange={(value) => handleFilterChange("maintenanceStatus", value)}
              >
                <SelectTrigger className="w-[200px]" data-testid="select-maintenance-status">
                  <SelectValue placeholder="Maintenance Status" />
                </SelectTrigger>
                <SelectContent>
                  {MAINTENANCE_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Equipment Status Filter */}
              <Select
                value={filters.equipmentStatus}
                onValueChange={(value) => handleFilterChange("equipmentStatus", value)}
              >
                <SelectTrigger className="w-[180px]" data-testid="select-equipment-status">
                  <SelectValue placeholder="Equipment Status" />
                </SelectTrigger>
                <SelectContent>
                  {EQUIPMENT_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Facility Filter */}
              <Select
                value={filters.facility}
                onValueChange={(value) => handleFilterChange("facility", value)}
              >
                <SelectTrigger className="w-[180px]" data-testid="select-facility">
                  <SelectValue placeholder="All Facilities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-facilities">All Facilities</SelectItem>
                  {facilities.map((fac) => (
                    <SelectItem key={fac.id} value={fac.id}>
                      {fac.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Search Input */}
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search name, ID, serial, model..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>

              {/* Reset Button */}
              <Button onClick={handleReset} variant="outline" data-testid="button-reset">
                Reset
              </Button>

              {/* Refresh Button */}
              <Button
                onClick={fetchEquipment}
                disabled={loading}
                variant="default"
                data-testid="button-refresh"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Refresh"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* KPI Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-md flex items-center justify-center flex-shrink-0">
                  <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="metric-total">
                    {loading ? <Skeleton className="h-8 w-12" /> : metrics.total}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Equipment</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-md flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="metric-active">
                    {loading ? <Skeleton className="h-8 w-12" /> : metrics.active}
                  </p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-md flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid="metric-overdue">
                    {loading ? <Skeleton className="h-8 w-12" /> : metrics.overdue}
                  </p>
                  <p className="text-xs text-muted-foreground">Overdue</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-md flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid="metric-critical">
                    {loading ? <Skeleton className="h-8 w-12" /> : metrics.critical}
                  </p>
                  <p className="text-xs text-muted-foreground">Critical</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/20 rounded-md flex items-center justify-center flex-shrink-0">
                  <Wrench className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400" data-testid="metric-under-maintenance">
                    {loading ? <Skeleton className="h-8 w-12" /> : metrics.underMaintenance}
                  </p>
                  <p className="text-xs text-muted-foreground">Under Maintenance</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/20 rounded-md flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400" data-testid="metric-upcoming">
                    {loading ? <Skeleton className="h-8 w-12" /> : metrics.upcoming}
                  </p>
                  <p className="text-xs text-muted-foreground">Due Soon (7d)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Status Distribution Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Equipment Status Distribution</CardTitle>
              <CardDescription>Breakdown by operational status</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : statusDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.name === "Active"
                              ? COLORS.green
                              : entry.name === "Under Maintenance"
                              ? COLORS.orange
                              : entry.name === "Decommissioned"
                              ? COLORS.gray
                              : COLORS.blue
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Maintenance Priority Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Priority</CardTitle>
              <CardDescription>Status color distribution</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : colorDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={colorDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {colorDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Facility Distribution Bar Chart */}
        {facilityDistribution.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Equipment by Facility</CardTitle>
              <CardDescription>Distribution across top facilities</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={facilityDistribution}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill={COLORS.blue} name="Equipment Count" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}

        {/* Equipment Table */}
        <Card>
          <CardHeader>
            <CardTitle>Equipment List</CardTitle>
            <CardDescription>
              Showing {equipment.length} equipment{equipment.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : equipment.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No equipment found matching your filters</p>
                <Button onClick={handleReset} variant="outline" className="mt-4">
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium text-sm">Name</th>
                      <th className="text-left p-3 font-medium text-sm">ID</th>
                      <th className="text-left p-3 font-medium text-sm">Status</th>
                      <th className="text-left p-3 font-medium text-sm">Priority</th>
                      <th className="text-left p-3 font-medium text-sm">Next Due</th>
                      <th className="text-left p-3 font-medium text-sm">Facility</th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipment.map((item) => (
                      <tr key={item.id} className="border-b hover-elevate" data-testid={`equipment-row-${item.id}`}>
                        <td className="p-3 text-sm font-medium">{item.name}</td>
                        <td className="p-3 text-sm text-muted-foreground">{item.equipmentId || "—"}</td>
                        <td className="p-3 text-sm">
                          <Badge variant="outline">{item.status}</Badge>
                        </td>
                        <td className="p-3 text-sm">
                          <Badge
                            variant="outline"
                            className={
                              item.statusColor === "red"
                                ? "border-red-500 text-red-600"
                                : item.statusColor === "orange"
                                ? "border-orange-500 text-orange-600"
                                : "border-green-500 text-green-600"
                            }
                          >
                            {item.statusColor === "red"
                              ? "Critical"
                              : item.statusColor === "orange"
                              ? "Warning"
                              : "Good"}
                          </Badge>
                        </td>
                        <td className="p-3 text-sm">
                          {item.nextDueDate ? (
                            <span className={item.isOverdue ? "text-red-600 font-semibold" : ""}>
                              {formatDate(item.nextDueDate)}
                              {item.isOverdue && " (Overdue)"}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {(item as any).facilityName || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
