import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Settings, Calendar, Clock, Package, Wrench, AlertTriangle, Building2, MapPin, Search, ArrowUpDown, ChevronDown, ChevronUp, FileText, QrCode, LayoutGrid, LayoutList, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { differenceInDays } from "date-fns";
import { formatDate } from "@/lib/dateUtils";
import { QRCodeSVG } from "qrcode.react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import type { Equipment, Contract, Facility, EquipmentStatus, EquipmentCriticality, MaintenanceRecord } from "@shared/schema";
import { insertEquipmentSchemaBase, insertContractSchemaBase, type InsertEquipment, type InsertContract } from "@shared/schema";
import { z } from "zod";
import { isUnauthorizedError } from "@/lib/authUtils";

const equipmentFormSchema = insertEquipmentSchemaBase.extend({
  maintenanceFrequencyDays: z.coerce.number().int().positive().optional().nullable(),
  lastMaintenanceDate: z.string().optional().nullable(),
});

const contractFormSchema = insertContractSchemaBase.extend({
  startDate: z.string(),
  endDate: z.string(),
  alertThresholdDays: z.coerce.number().int().positive().default(30),
});

// Helper component: Status Badge with color coding
function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", className: string }> = {
    "Active": { variant: "outline", className: "border-green-600 text-green-700 dark:text-green-400" },
    "Under Maintenance": { variant: "secondary", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
    "Overdue": { variant: "destructive", className: "" },
    "Decommissioned": { variant: "secondary", className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
    "Pending Installation": { variant: "outline", className: "" },
  };
  const config = variants[status] || variants["Active"];
  return <Badge variant={config.variant} className={config.className} data-testid={`badge-status-${status.toLowerCase().replace(" ", "-")}`}>{status}</Badge>;
}

// Helper component: Criticality Badge with color coding
function CriticalityBadge({ criticality }: { criticality: string | null }) {
  if (!criticality) return null;
  const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", className: string }> = {
    "High": { variant: "destructive", className: "" },
    "Medium": { variant: "secondary", className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
    "Low": { variant: "outline", className: "border-green-600 text-green-700 dark:text-green-400" },
  };
  const config = variants[criticality] || variants["Medium"];
  return <Badge variant={config.variant} className={config.className} data-testid={`badge-criticality-${criticality.toLowerCase()}`}>{criticality}</Badge>;
}

// Helper component: Condition Badge with color coding
function ConditionBadge({ condition }: { condition: string | null }) {
  if (!condition) return null;
  const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", className: string }> = {
    "Excellent": { variant: "outline", className: "border-green-600 text-green-700 dark:text-green-400" },
    "Good": { variant: "outline", className: "border-blue-600 text-blue-700 dark:text-blue-400" },
    "Needs Repair": { variant: "secondary", className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
    "Critical": { variant: "destructive", className: "" },
  };
  const config = variants[condition] || variants["Good"];
  return <Badge variant={config.variant} className={config.className} data-testid={`badge-condition-${condition.toLowerCase().replace(" ", "-")}`}>{condition}</Badge>;
}

// Helper component: Info Item for displaying label-value pairs
function InfoItem({ label, value, icon: Icon, testId }: { label: string; value: React.ReactNode; icon?: any; testId?: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {Icon && <Icon className="w-3.5 h-3.5" />}
        <span>{label}</span>
      </div>
      <div className="text-sm font-medium" data-testid={testId}>{value}</div>
    </div>
  );
}

type SortField = "name" | "type" | "facility" | "status" | "criticality" | "nextMaintenance" | "installDate";
type SortDirection = "asc" | "desc";

export default function EquipmentPage() {
  const { toast } = useToast();
  const [equipmentDialogOpen, setEquipmentDialogOpen] = useState(false);
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [facilityFilter, setFacilityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [maintenanceStatusFilter, setMaintenanceStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const { data: equipment, isLoading } = useQuery<Equipment[]>({
    queryKey: ["/api/equipment"],
    staleTime: 0, // Always refetch fresh data on mount
  });

  const { data: contracts } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
    staleTime: 0,
  });

  const { data: facilities } = useQuery<Facility[]>({
    queryKey: ["/api/facilities"],
    staleTime: 0,
  });

  // Fetch maintenance records for selected equipment
  const { data: maintenanceRecords } = useQuery<MaintenanceRecord[]>({
    queryKey: ["/api/maintenance-records"],
    enabled: !!selectedEquipment,
    staleTime: 0,
  });

  const equipmentForm = useForm<z.infer<typeof equipmentFormSchema>>({
    resolver: zodResolver(equipmentFormSchema),
    defaultValues: {
      name: "",
      equipmentId: "",
      facilityName: "",
      location: "",
      type: "",
      maintenanceFrequencyDays: null,
      lastMaintenanceDate: null,
      notes: "",
    },
  });


  const contractForm = useForm<z.infer<typeof contractFormSchema>>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      equipmentId: "",
      contractNumber: "",
      vendorName: "",
      vendorContact: "",
      startDate: "",
      endDate: "",
      contractType: "Service",
      status: "Active",
      autoRenew: false,
      notes: "",
      alertThresholdDays: 30,
    },
  });

  const createEquipmentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof equipmentFormSchema>) => {
      const payload = {
        ...data,
        lastMaintenanceDate: data.lastMaintenanceDate ? new Date(data.lastMaintenanceDate).toISOString() : null,
      };
      return await apiRequest("POST", "/api/equipment", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      setEquipmentDialogOpen(false);
      equipmentForm.reset();
      toast({
        title: "Success",
        description: "Equipment added successfully",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to add equipment",
        variant: "destructive",
      });
    },
  });

  const createContractMutation = useMutation({
    mutationFn: async (data: z.infer<typeof contractFormSchema>) => {
      const payload = {
        ...data,
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
      };
      return await apiRequest("POST", "/api/contracts", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      setContractDialogOpen(false);
      contractForm.reset();
      toast({
        title: "Success",
        description: "Contract added successfully",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to add contract",
        variant: "destructive",
      });
    },
  });


  const getEquipmentContracts = (equipmentId: string) => {
    return contracts?.filter((c) => c.equipmentId === equipmentId) || [];
  };

  const getNextMaintenanceDate = (equip: Equipment) => {
    if (!equip.lastMaintenanceDate || !equip.maintenanceFrequencyDays) return null;
    const lastDate = new Date(equip.lastMaintenanceDate);
    const nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + equip.maintenanceFrequencyDays);
    return nextDate;
  };

  const openContractDialog = (equip: Equipment) => {
    setSelectedEquipment(equip);
    contractForm.setValue("equipmentId", equip.id);
    setContractDialogOpen(true);
  };

  // Calculate dashboard stats
  const totalEquipment = equipment?.length || 0;
  const underMaintenanceCount = equipment ? equipment.filter((e: any) => e.status === 'Under Maintenance').length : 0;
  const underMaintenancePercent = totalEquipment > 0 ? Math.round((underMaintenanceCount / totalEquipment) * 100) : 0;
  const overdueCount = equipment ? equipment.filter((e: any) => e.isOverdue === true).length : 0;
  const overduePercent = totalEquipment > 0 ? Math.round((overdueCount / totalEquipment) * 100) : 0;
  const uniqueFacilities = equipment ? new Set(equipment.filter((e: any) => e.facilityId).map((e: any) => e.facilityId)) : new Set();
  const facilitiesCount = uniqueFacilities.size;
  const uniqueLocations = equipment ? new Set(equipment.filter((e: any) => e.locationId).map((e: any) => e.locationId)) : new Set();
  const locationsCount = uniqueLocations.size;

  // Filter and sort equipment
  const filteredAndSortedEquipment = useMemo(() => {
    if (!equipment) return [];

    let filtered = equipment.filter((equip) => {
      const matchesSearch = !searchQuery || 
        equip.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (equip.equipmentId?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (equip.type?.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesFacility = facilityFilter === "all" || equip.facilityId === facilityFilter;
      const matchesStatus = statusFilter === "all" || equip.status === statusFilter;

      // Maintenance status filter
      let matchesMaintenanceStatus = true;
      if (maintenanceStatusFilter !== "all") {
        const today = new Date();
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(today.getDate() + 7);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 7);

        if (maintenanceStatusFilter === "overdue") {
          matchesMaintenanceStatus = equip.isOverdue === true;
        } else if (maintenanceStatusFilter === "upcoming") {
          const nextDue = equip.nextDueDate ? new Date(equip.nextDueDate) : null;
          matchesMaintenanceStatus = !equip.isOverdue && nextDue !== null && nextDue < sevenDaysFromNow;
        } else if (maintenanceStatusFilter === "resolved") {
          const lastMaintenance = equip.lastMaintenanceDate ? new Date(equip.lastMaintenanceDate) : null;
          matchesMaintenanceStatus = lastMaintenance !== null && lastMaintenance >= sevenDaysAgo;
        } else if (maintenanceStatusFilter === "critical") {
          matchesMaintenanceStatus = equip.statusColor === "red";
        }
      }

      return matchesSearch && matchesFacility && matchesStatus && matchesMaintenanceStatus;
    });

    // Only sort if a sort field is selected
    if (sortField) {
      filtered.sort((a, b) => {
        let comparison = 0;

        switch (sortField) {
          case "name":
            comparison = (a.name || "").localeCompare(b.name || "");
            break;
          case "type":
            comparison = (a.type || "").localeCompare(b.type || "");
            break;
          case "facility": {
            const facilityA = facilities?.find(f => f.id === a.facilityId)?.name || "";
            const facilityB = facilities?.find(f => f.id === b.facilityId)?.name || "";
            comparison = facilityA.localeCompare(facilityB);
            break;
          }
          case "status":
            comparison = (a.status || "").localeCompare(b.status || "");
            break;
          case "criticality":
            const criticalityOrder: Record<string, number> = { "High": 3, "Medium": 2, "Low": 1 };
            comparison = (criticalityOrder[a.criticality || "Medium"] || 0) - (criticalityOrder[b.criticality || "Medium"] || 0);
            break;
          case "nextMaintenance": {
            const nextA = getNextMaintenanceDate(a);
            const nextB = getNextMaintenanceDate(b);
            if (!nextA && !nextB) comparison = 0;
            else if (!nextA) comparison = 1;
            else if (!nextB) comparison = -1;
            else comparison = nextA.getTime() - nextB.getTime();
            break;
          }
          case "installDate": {
            const dateA = a.installDate ? new Date(a.installDate).getTime() : 0;
            const dateB = b.installDate ? new Date(b.installDate).getTime() : 0;
            comparison = dateA - dateB;
            break;
          }
        }

        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return filtered;
  }, [equipment, facilities, searchQuery, facilityFilter, statusFilter, maintenanceStatusFilter, sortField, sortDirection]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Fetch enhanced equipment details with alerts and maintenance records
  const { data: equipmentDetails, refetch: refetchDetails } = useQuery<any>({
    queryKey: ["/api/equipment", selectedEquipment?.id, "details"],
    enabled: !!selectedEquipment?.id,
    staleTime: 0,
  });

  const openDetailDrawer = (equip: Equipment) => {
    setSelectedEquipment(equip);
    setDetailDrawerOpen(true);
  };

  return (
    <div className="min-h-full bg-background">
      <div className="border-b bg-card px-6 py-4">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Equipment</h1>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Dashboard Stats */}
        {!isLoading && equipment && equipment.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            <Card data-testid="stat-total-equipment">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Equipment</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="value-total-equipment">{totalEquipment}</div>
              </CardContent>
            </Card>

            <Card data-testid="stat-under-maintenance">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Under Maintenance</CardTitle>
                <Wrench className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="value-under-maintenance">{underMaintenancePercent}%</div>
                <p className="text-xs text-muted-foreground">{underMaintenanceCount} of {totalEquipment}</p>
              </CardContent>
            </Card>

            <Card data-testid="stat-overdue">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                <AlertTriangle className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-warning" data-testid="value-overdue">{overduePercent}%</div>
                <p className="text-xs text-muted-foreground">{overdueCount} of {totalEquipment}</p>
              </CardContent>
            </Card>

            <Card data-testid="stat-facilities">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Facilities</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="value-facilities">{facilitiesCount}</div>
                <p className="text-xs text-muted-foreground">Covered</p>
              </CardContent>
            </Card>

            <Card data-testid="stat-locations">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Locations</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="value-locations">{locationsCount}</div>
                <p className="text-xs text-muted-foreground">In use</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Equipment Visualizations */}
        {!isLoading && equipment && equipment.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Equipment by Status</CardTitle>
                <CardDescription>Distribution across all statuses</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={(() => {
                        const statusCounts: Record<string, number> = {};
                        equipment.forEach((eq) => {
                          const status = eq.status || "Unknown";
                          statusCounts[status] = (statusCounts[status] || 0) + 1;
                        });
                        return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
                      })()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {(() => {
                        const colors: Record<string, string> = {
                          "Active": "#22c55e",
                          "Under Maintenance": "#f59e0b",
                          "Decommissioned": "#9ca3af",
                          "Pending Installation": "#3b82f6",
                        };
                        const statusCounts: Record<string, number> = {};
                        equipment.forEach((eq) => {
                          const status = eq.status || "Unknown";
                          statusCounts[status] = (statusCounts[status] || 0) + 1;
                        });
                        return Object.keys(statusCounts).map((status, index) => (
                          <Cell key={`cell-${index}`} fill={colors[status] || "#9ca3af"} />
                        ));
                      })()}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Equipment by Condition</CardTitle>
                <CardDescription>Condition distribution overview</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={(() => {
                      const conditionCounts: Record<string, number> = {};
                      equipment.forEach((eq) => {
                        const condition = eq.condition || "Unknown";
                        conditionCounts[condition] = (conditionCounts[condition] || 0) + 1;
                      });
                      return Object.entries(conditionCounts).map(([name, count]) => ({ name, count }));
                    })()}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#0057B7" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Your Equipment</h2>
          <Dialog open={equipmentDialogOpen} onOpenChange={setEquipmentDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-equipment">
                <Plus className="w-4 h-4 mr-2" />
                Add Equipment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Equipment</DialogTitle>
                <DialogDescription>
                  Add equipment to track maintenance schedules and contracts.
                </DialogDescription>
              </DialogHeader>
              <Form {...equipmentForm}>
                <form onSubmit={equipmentForm.handleSubmit((data) => createEquipmentMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={equipmentForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Equipment Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., MRI Scanner A" data-testid="input-equipment-name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={equipmentForm.control}
                    name="equipmentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Equipment ID</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., EQ-001" data-testid="input-equipment-id" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormDescription>Auto-generated if left blank</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={equipmentForm.control}
                    name="facilityName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Facility</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., ASU Hospital, Main Building" data-testid="input-facility-name" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormDescription>Enter facility name or location identifier</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={equipmentForm.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Radiology Dept., Room B12" data-testid="input-location" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormDescription>Specific location, room, or department</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={equipmentForm.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type/Category</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Diagnostic Equipment" data-testid="input-type" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={equipmentForm.control}
                    name="maintenanceFrequencyDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maintenance Frequency (days)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 90" data-testid="input-frequency" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormDescription>How often maintenance is required</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={equipmentForm.control}
                    name="lastMaintenanceDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Maintenance Date</FormLabel>
                        <FormControl>
                          <Input type="date" data-testid="input-last-maintenance" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={equipmentForm.control}
                    name="imageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Image URL</FormLabel>
                        <FormControl>
                          <Input type="url" placeholder="https://example.com/image.jpg" data-testid="input-image-url" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormDescription>Equipment photo or image URL</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={equipmentForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Additional notes..." data-testid="input-notes" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-2 justify-end pt-4">
                    <Button type="button" variant="outline" onClick={() => setEquipmentDialogOpen(false)} data-testid="button-cancel">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createEquipmentMutation.isPending} data-testid="button-save-equipment">
                      {createEquipmentMutation.isPending ? "Saving..." : "Add Equipment"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

        </div>

        {/* Search and Filters */}
        {!isLoading && equipment && equipment.length > 0 && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search equipment by name, ID, or type..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-equipment"
                  />
                </div>
                <Select value={facilityFilter} onValueChange={setFacilityFilter}>
                  <SelectTrigger className="w-full md:w-[200px]" data-testid="select-filter-facility">
                    <SelectValue placeholder="All Facilities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Facilities</SelectItem>
                    {facilities?.map((facility) => (
                      <SelectItem key={facility.id} value={facility.id}>
                        {facility.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-[200px]" data-testid="select-filter-status">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Under Maintenance">Under Maintenance</SelectItem>
                    <SelectItem value="Decommissioned">Decommissioned</SelectItem>
                    <SelectItem value="Pending Installation">Pending Installation</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={maintenanceStatusFilter} onValueChange={setMaintenanceStatusFilter}>
                  <SelectTrigger className="w-full md:w-[200px]" data-testid="select-filter-maintenance-status">
                    <SelectValue placeholder="Maintenance Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Equipment</SelectItem>
                    <SelectItem value="overdue">🔴 Overdue</SelectItem>
                    <SelectItem value="upcoming">⚠️ Due Soon (7 days)</SelectItem>
                    <SelectItem value="resolved">✅ Recently Serviced</SelectItem>
                    <SelectItem value="critical">🚨 Critical Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : !equipment || equipment.length === 0 ? (
          <Card>
            <CardHeader className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Settings className="w-8 h-8 text-muted-foreground" />
              </div>
              <CardTitle>No Equipment Yet</CardTitle>
              <CardDescription className="max-w-md mx-auto">
                Start by adding your first piece of equipment to track maintenance schedules and contracts.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : filteredAndSortedEquipment.length === 0 ? (
          <Card>
            <CardHeader className="text-center py-12">
              <CardTitle>No matching equipment</CardTitle>
              <CardDescription>
                Try adjusting your filters or search query.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            {/* View Toggle */}
            <div className="flex justify-end mb-4">
              <div className="flex gap-2 border rounded-md p-1">
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  data-testid="button-view-list"
                >
                  <LayoutList className="w-4 h-4 mr-2" />
                  List
                </Button>
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  data-testid="button-view-grid"
                >
                  <LayoutGrid className="w-4 h-4 mr-2" />
                  Grid
                </Button>
              </div>
            </div>

            {viewMode === "list" ? (
              <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">
                      <Button variant="ghost" size="sm" onClick={() => toggleSort("name")} className="hover-elevate active-elevate-2" data-testid="button-sort-name">
                        Equipment Name
                        {sortField === "name" && (sortDirection === "asc" ? <ChevronUp className="ml-1 w-4 h-4" /> : <ChevronDown className="ml-1 w-4 h-4" />)}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => toggleSort("type")} className="hover-elevate active-elevate-2" data-testid="button-sort-type">
                        Type
                        {sortField === "type" && (sortDirection === "asc" ? <ChevronUp className="ml-1 w-4 h-4" /> : <ChevronDown className="ml-1 w-4 h-4" />)}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => toggleSort("facility")} className="hover-elevate active-elevate-2" data-testid="button-sort-facility">
                        Facility
                        {sortField === "facility" && (sortDirection === "asc" ? <ChevronUp className="ml-1 w-4 h-4" /> : <ChevronDown className="ml-1 w-4 h-4" />)}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => toggleSort("status")} className="hover-elevate active-elevate-2" data-testid="button-sort-status">
                        Status
                        {sortField === "status" && (sortDirection === "asc" ? <ChevronUp className="ml-1 w-4 h-4" /> : <ChevronDown className="ml-1 w-4 h-4" />)}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => toggleSort("criticality")} className="hover-elevate active-elevate-2" data-testid="button-sort-criticality">
                        Criticality
                        {sortField === "criticality" && (sortDirection === "asc" ? <ChevronUp className="ml-1 w-4 h-4" /> : <ChevronDown className="ml-1 w-4 h-4" />)}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => toggleSort("installDate")} className="hover-elevate active-elevate-2" data-testid="button-sort-install-date">
                        Install Date
                        {sortField === "installDate" && (sortDirection === "asc" ? <ChevronUp className="ml-1 w-4 h-4" /> : <ChevronDown className="ml-1 w-4 h-4" />)}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => toggleSort("nextMaintenance")} className="hover-elevate active-elevate-2" data-testid="button-sort-next-maintenance">
                        Next Maintenance
                        {sortField === "nextMaintenance" && (sortDirection === "asc" ? <ChevronUp className="ml-1 w-4 h-4" /> : <ChevronDown className="ml-1 w-4 h-4" />)}
                      </Button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedEquipment.map((equip) => {
                    const facility = facilities?.find(f => f.id === equip.facilityId);
                    const nextMaintenance = getNextMaintenanceDate(equip);
                    const daysUntilMaintenance = nextMaintenance ? differenceInDays(nextMaintenance, new Date()) : null;

                    return (
                      <TableRow
                        key={equip.id}
                        className="cursor-pointer hover-elevate"
                        onClick={() => openDetailDrawer(equip)}
                        data-testid={`row-equipment-${equip.id}`}
                      >
                        <TableCell className="font-medium">
                          <div>
                            <div data-testid={`text-equipment-name-${equip.id}`}>{equip.name}</div>
                            {equip.equipmentId && (
                              <div className="text-sm text-muted-foreground" data-testid={`text-equipment-id-${equip.id}`}>
                                ID: {equip.equipmentId}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell data-testid={`text-equipment-type-${equip.id}`}>
                          {equip.type || "—"}
                        </TableCell>
                        <TableCell data-testid={`text-equipment-facility-${equip.id}`}>
                          {facility?.name || "—"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={equip.status} />
                        </TableCell>
                        <TableCell>
                          <CriticalityBadge criticality={equip.criticality} />
                        </TableCell>
                        <TableCell data-testid={`text-equipment-install-date-${equip.id}`}>
                          {equip.installDate ? formatDate(new Date(equip.installDate)) : "—"}
                        </TableCell>
                        <TableCell data-testid={`text-equipment-next-maintenance-${equip.id}`}>
                          {nextMaintenance ? (
                            <div>
                              <div>{formatDate(nextMaintenance)}</div>
                              {daysUntilMaintenance !== null && (
                                <div className={`text-xs ${daysUntilMaintenance < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                                  {daysUntilMaintenance < 0 ? `${Math.abs(daysUntilMaintenance)}d overdue` : `in ${daysUntilMaintenance}d`}
                                </div>
                              )}
                            </div>
                          ) : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAndSortedEquipment.map((equip) => {
                  const facility = facilities?.find((f) => f.id === equip.facilityId);
                  const nextMaintenance = getNextMaintenanceDate(equip);
                  const daysUntilMaintenance = nextMaintenance ? differenceInDays(nextMaintenance, new Date()) : null;
                  
                  return (
                    <Card 
                      key={equip.id} 
                      className="hover-elevate active-elevate-2 cursor-pointer transition-all"
                      onClick={() => openDetailDrawer(equip)}
                      data-testid={`card-equipment-${equip.id}`}
                    >
                      <CardHeader className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-lg line-clamp-1" data-testid={`text-equipment-name-${equip.id}`}>
                            {equip.name}
                          </CardTitle>
                          <div className="flex gap-1 flex-wrap justify-end">
                            <StatusBadge status={equip.status} />
                          </div>
                        </div>
                        {equip.type && (
                          <p className="text-sm text-muted-foreground line-clamp-1" data-testid={`text-equipment-type-${equip.id}`}>
                            {equip.type}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <CriticalityBadge criticality={equip.criticality} />
                          {equip.condition && <ConditionBadge condition={equip.condition} />}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {facility && (
                          <div className="flex items-center gap-2 text-sm">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{facility.name}</span>
                          </div>
                        )}
                        {equip.department && (
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{equip.department}</span>
                          </div>
                        )}
                        {equip.installDate && (
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Installed</p>
                              <p className="font-medium">{formatDate(new Date(equip.installDate))}</p>
                            </div>
                          </div>
                        )}
                        {nextMaintenance && (
                          <div className="flex items-center gap-2 text-sm">
                            <Wrench className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Next Maintenance</p>
                              <p className={`font-medium ${daysUntilMaintenance! < 0 ? "text-destructive" : daysUntilMaintenance! <= 7 ? "text-orange-600" : ""}`}>
                                {formatDate(nextMaintenance)}
                                {daysUntilMaintenance !== null && (
                                  <span className="text-xs ml-2">
                                    {daysUntilMaintenance < 0 ? `(${Math.abs(daysUntilMaintenance)}d overdue)` : `(in ${daysUntilMaintenance}d)`}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Contract Dialog */}
      <Dialog open={contractDialogOpen} onOpenChange={setContractDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Contract</DialogTitle>
            <DialogDescription>
              {selectedEquipment && `Add a contract for ${selectedEquipment.name}`}
            </DialogDescription>
          </DialogHeader>
          <Form {...contractForm}>
            <form onSubmit={contractForm.handleSubmit((data) => createContractMutation.mutate(data))} className="space-y-4">
              <FormField
                control={contractForm.control}
                name="vendorName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., ABC Medical Services" data-testid="input-vendor-name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={contractForm.control}
                name="vendorContact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor Contact</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., contact@vendor.com" data-testid="input-vendor-contact" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={contractForm.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date *</FormLabel>
                      <FormControl>
                        <Input type="date" data-testid="input-start-date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={contractForm.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date *</FormLabel>
                      <FormControl>
                        <Input type="date" data-testid="input-end-date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={contractForm.control}
                name="contractType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contract Type</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Maintenance" data-testid="input-contract-type" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={contractForm.control}
                name="alertThresholdDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alert Threshold (days before expiry)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="30" data-testid="input-alert-threshold" {...field} />
                    </FormControl>
                    <FormDescription>Get notified this many days before contract expires</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={contractForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Additional notes..." data-testid="input-contract-notes" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => setContractDialogOpen(false)} data-testid="button-cancel-contract">
                  Cancel
                </Button>
                <Button type="submit" disabled={createContractMutation.isPending} data-testid="button-save-contract">
                  {createContractMutation.isPending ? "Saving..." : "Add Contract"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Equipment Detail Drawer */}
      <Sheet open={detailDrawerOpen} onOpenChange={setDetailDrawerOpen}>
        <SheetContent className="sm:max-w-[700px] overflow-y-auto" data-testid="sheet-equipment-detail">
          {selectedEquipment && (
            <>
              {/* Header Section */}
              <SheetHeader className="space-y-4 pb-6 border-b">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <SheetTitle className="text-2xl font-bold mb-2" data-testid="text-detail-equipment-name">
                      {selectedEquipment.name}
                    </SheetTitle>
                    <p className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                      {selectedEquipment.type && <span data-testid="text-detail-equipment-type">{selectedEquipment.type}</span>}
                      {selectedEquipment.manufacturer && (
                        <>
                          <span>•</span>
                          <span>{selectedEquipment.manufacturer}</span>
                        </>
                      )}
                      {selectedEquipment.model && (
                        <>
                          <span>•</span>
                          <span>{selectedEquipment.model}</span>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <StatusBadge status={selectedEquipment.status} />
                    <CriticalityBadge criticality={selectedEquipment.criticality} />
                  </div>
                </div>
              </SheetHeader>

              {/* Tabbed Content */}
              <Tabs defaultValue="overview" className="mt-6">
                <TabsList className="grid w-full grid-cols-4 mb-6">
                  <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
                  <TabsTrigger value="maintenance" data-testid="tab-maintenance">Maintenance</TabsTrigger>
                  <TabsTrigger value="location" data-testid="tab-location">Location</TabsTrigger>
                  <TabsTrigger value="history" data-testid="tab-history">History</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    {selectedEquipment.equipmentId && (
                      <InfoItem label="Equipment ID" value={selectedEquipment.equipmentId} icon={FileText} testId="text-detail-equipment-id" />
                    )}
                    {selectedEquipment.serial && (
                      <InfoItem label="Serial Number" value={selectedEquipment.serial} icon={Package} testId="text-detail-serial" />
                    )}
                    {selectedEquipment.criticality && (
                      <InfoItem label="Criticality" value={<CriticalityBadge criticality={selectedEquipment.criticality} />} icon={AlertTriangle} />
                    )}
                    {selectedEquipment.condition && (
                      <InfoItem label="Condition" value={<ConditionBadge condition={selectedEquipment.condition} />} testId="text-detail-condition" />
                    )}
                    {selectedEquipment.department && (
                      <InfoItem label="Department" value={selectedEquipment.department} testId="text-detail-department" />
                    )}
                    {selectedEquipment.installDate && (
                      <InfoItem label="Install Date" value={formatDate(new Date(selectedEquipment.installDate))} icon={Calendar} testId="text-detail-install-date" />
                    )}
                    {selectedEquipment.purchaseDate && (
                      <InfoItem label="Purchase Date" value={formatDate(new Date(selectedEquipment.purchaseDate))} icon={Calendar} testId="text-detail-purchase-date" />
                    )}
                    {selectedEquipment.warrantyExpiryDate && (
                      <InfoItem label="Warranty Expiry" value={formatDate(new Date(selectedEquipment.warrantyExpiryDate))} icon={Clock} testId="text-detail-warranty-expiry" />
                    )}
                    {selectedEquipment.calibrationRequired && (
                      <InfoItem label="Calibration Required" value="Yes" testId="text-detail-calibration-required" />
                    )}
                    {selectedEquipment.calibrationDate && (
                      <InfoItem label="Last Calibration" value={formatDate(new Date(selectedEquipment.calibrationDate))} icon={Calendar} testId="text-detail-calibration-date" />
                    )}
                    {selectedEquipment.usageHours !== null && selectedEquipment.usageHours !== undefined && (
                      <InfoItem label="Usage Hours" value={`${selectedEquipment.usageHours} hrs`} icon={Clock} testId="text-detail-usage-hours" />
                    )}
                    {selectedEquipment.barcode && (
                      <InfoItem label="Barcode" value={selectedEquipment.barcode} testId="text-detail-barcode" />
                    )}
                  </div>

                  {/* QR Code Section */}
                  {selectedEquipment.equipmentId && (
                    <div>
                      <h3 className="text-sm font-semibold mb-3 text-foreground flex items-center gap-2">
                        <QrCode className="w-4 h-4" />
                        Equipment QR Code
                      </h3>
                      <Card className="p-6 flex items-center justify-center">
                        <div className="text-center space-y-3">
                          <QRCodeSVG 
                            value={selectedEquipment.equipmentId} 
                            size={128}
                            level="H"
                            includeMargin={true}
                            data-testid="qr-code-equipment"
                          />
                          <p className="text-xs text-muted-foreground">Scan to view equipment details</p>
                        </div>
                      </Card>
                    </div>
                  )}

                  {/* Service Contracts */}
                  {contracts && getEquipmentContracts(selectedEquipment.id).length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-3 text-foreground">Service Contracts</h3>
                      <div className="space-y-3">
                        {getEquipmentContracts(selectedEquipment.id).map((contract) => (
                          <Card key={contract.id} className="p-4">
                            <div className="space-y-1">
                              <div className="font-medium" data-testid={`text-contract-vendor-${contract.id}`}>
                                {contract.vendorName}
                              </div>
                              {contract.contractType && (
                                <div className="text-sm text-muted-foreground">{contract.contractType}</div>
                              )}
                              <div className="text-xs text-muted-foreground">
                                {formatDate(new Date(contract.startDate))} - {formatDate(new Date(contract.endDate))}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedEquipment.notes && (
                    <div>
                      <h3 className="text-sm font-semibold mb-3 text-foreground">Notes</h3>
                      <Card className="p-4">
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap" data-testid="text-detail-notes">
                          {selectedEquipment.notes}
                        </p>
                      </Card>
                    </div>
                  )}
                </TabsContent>

                {/* Maintenance & Alerts Tab */}
                <TabsContent value="maintenance" className="space-y-4">
                  {(() => {
                    const currentEquipment = equipmentDetails || selectedEquipment;
                    const nextDate = getNextMaintenanceDate(currentEquipment);
                    const daysUntil = nextDate ? differenceInDays(nextDate, new Date()) : null;
                    const lastDate = currentEquipment.lastMaintenanceDate ? new Date(currentEquipment.lastMaintenanceDate) : null;
                    
                    let progressPercentage = 0;
                    if (currentEquipment.maintenanceFrequencyDays && lastDate && nextDate) {
                      const totalCycleDays = differenceInDays(nextDate, lastDate);
                      const daysPassed = differenceInDays(new Date(), lastDate);
                      progressPercentage = Math.min(Math.max((daysPassed / totalCycleDays) * 100, 0), 100);
                    }
                    
                    return (
                      <>
                        {/* Maintenance Schedule Card with Progress */}
                        {nextDate && (
                          <Card className="p-4">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-sm font-semibold flex items-center gap-2">
                                <Wrench className="w-4 h-4" />
                                Maintenance Schedule
                              </h3>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => refetchDetails()}
                                data-testid="button-refresh-details"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </Button>
                            </div>
                            
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                {lastDate && (
                                  <div>
                                    <div className="text-xs text-muted-foreground mb-1">Last Maintenance</div>
                                    <div className="text-sm font-medium" data-testid="text-detail-last-maintenance">
                                      {formatDate(lastDate)}
                                    </div>
                                  </div>
                                )}
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1">Next Due</div>
                                  <div className="text-sm font-medium" data-testid="text-detail-next-maintenance">
                                    {formatDate(nextDate)}
                                  </div>
                                </div>
                              </div>
                              
                              {currentEquipment.maintenanceFrequencyDays && (
                                <>
                                  <div>
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="text-xs text-muted-foreground">Progress to Next Maintenance</div>
                                      <div className={`text-xs font-medium ${daysUntil! < 0 ? "text-destructive" : daysUntil! <= 7 ? "text-orange-600" : "text-muted-foreground"}`}>
                                        {daysUntil! < 0 ? `${Math.abs(daysUntil!)} days overdue` : `${daysUntil} days remaining`}
                                      </div>
                                    </div>
                                    <Progress 
                                      value={progressPercentage} 
                                      className="h-2"
                                      data-testid="progress-maintenance"
                                    />
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Frequency: Every {currentEquipment.maintenanceFrequencyDays} days
                                  </div>
                                </>
                              )}
                            </div>
                          </Card>
                        )}

                        {/* Active Alerts Card */}
                        <Card className="p-4">
                          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            Active Alerts
                          </h3>
                          {equipmentDetails?.alerts && equipmentDetails.alerts.length > 0 ? (
                            <div className="space-y-2">
                              {equipmentDetails.alerts.map((alert: any) => (
                                <div 
                                  key={alert.id}
                                  className={`p-3 border-l-4 rounded-md ${
                                    alert.severity === 'critical' 
                                      ? 'bg-red-50 dark:bg-red-950/20 border-red-500' 
                                      : alert.severity === 'warning'
                                      ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-500'
                                      : 'bg-blue-50 dark:bg-blue-950/20 border-blue-500'
                                  }`}
                                  data-testid={`alert-${alert.id}`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                      <div className="font-medium text-sm">{alert.title}</div>
                                      <div className="text-xs text-muted-foreground mt-1">{alert.message}</div>
                                    </div>
                                    <Badge 
                                      variant={alert.severity === 'critical' ? 'destructive' : alert.severity === 'warning' ? 'secondary' : 'outline'}
                                      className="capitalize text-xs"
                                    >
                                      {alert.severity}
                                    </Badge>
                                  </div>
                                  {alert.createdAt && (
                                    <div className="text-xs text-muted-foreground mt-2">
                                      {formatDate(new Date(alert.createdAt))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                              <span>No active alerts</span>
                            </div>
                          )}
                        </Card>
                      </>
                    );
                  })()}
                </TabsContent>

                {/* Location & Facility Tab */}
                <TabsContent value="location" className="space-y-4">
                  <Card className="p-4">
                    <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Facility & Location Information
                    </h3>
                    <div className="space-y-3">
                      {selectedEquipment.facilityName && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Facility</div>
                          <div className="text-sm font-medium" data-testid="text-detail-facility">
                            {selectedEquipment.facilityName}
                          </div>
                        </div>
                      )}
                      {selectedEquipment.location && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Location</div>
                          <div className="text-sm font-medium" data-testid="text-detail-location">
                            {selectedEquipment.location}
                          </div>
                        </div>
                      )}
                      {selectedEquipment.department && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Department</div>
                          <div className="text-sm font-medium" data-testid="text-detail-department">
                            {selectedEquipment.department}
                          </div>
                        </div>
                      )}
                      {!selectedEquipment.facilityName && !selectedEquipment.location && !selectedEquipment.department && (
                        <p className="text-sm text-muted-foreground">No facility or location information provided</p>
                      )}
                    </div>
                  </Card>
                </TabsContent>

                {/* History Tab */}
                <TabsContent value="history" className="space-y-4">
                  {/* Maintenance History Table */}
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold">Maintenance History</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => refetchDetails()}
                        data-testid="button-refresh-history"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    {equipmentDetails?.maintenanceRecords && equipmentDetails.maintenanceRecords.length > 0 ? (
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Date</TableHead>
                              <TableHead className="text-xs">Type</TableHead>
                              <TableHead className="text-xs">Status</TableHead>
                              <TableHead className="text-xs">Technician</TableHead>
                              <TableHead className="text-xs">Cost</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {equipmentDetails.maintenanceRecords.map((record: any) => (
                              <TableRow key={record.id} className="hover-elevate">
                                <TableCell className="text-sm">
                                  {record.createdAt ? formatDate(new Date(record.createdAt)) : '—'}
                                </TableCell>
                                <TableCell className="text-sm">
                                  <Badge variant="outline" className="text-xs">
                                    {record.maintenanceType || 'General'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm">
                                  {record.status === 'Completed' ? (
                                    <div className="flex items-center gap-1 text-green-600">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span className="text-xs">Completed</span>
                                    </div>
                                  ) : record.status === 'In Progress' ? (
                                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 text-xs">
                                      In Progress
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-xs">
                                      {record.status}
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {record.technician?.email ? (
                                    <div>
                                      <div className="font-medium">
                                        {record.technician.email.split('@')[0]}
                                      </div>
                                    </div>
                                  ) : '—'}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {record.cost ? `${record.cost} KWD` : '—'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <FileText className="w-8 h-8 opacity-50" />
                          <p className="text-sm">No maintenance records available</p>
                        </div>
                      </div>
                    )}
                  </Card>

                  {/* Equipment Notes */}
                  {selectedEquipment.notes && (
                    <Card className="p-4">
                      <h3 className="text-sm font-semibold mb-3">Equipment Notes</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap" data-testid="text-detail-notes">
                        {selectedEquipment.notes}
                      </p>
                    </Card>
                  )}

                  {/* Quick Actions */}
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDetailDrawerOpen(false);
                        openContractDialog(selectedEquipment);
                      }}
                      className="w-full"
                      data-testid="button-add-contract-from-detail"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Service Contract
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
