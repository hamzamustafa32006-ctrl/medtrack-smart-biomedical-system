import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Settings, Calendar, Clock, Package, Wrench, AlertTriangle, Building2, MapPin, Search, ArrowUpDown, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { differenceInDays } from "date-fns";
import { formatDate } from "@/lib/dateUtils";
import type { Equipment, Contract, Facility, Location, EquipmentStatus, EquipmentCriticality } from "@shared/schema";
import { insertEquipmentSchema, insertContractSchema, insertLocationSchema, type InsertEquipment, type InsertContract, type InsertLocation } from "@shared/schema";
import { z } from "zod";
import { isUnauthorizedError } from "@/lib/authUtils";

const equipmentFormSchema = insertEquipmentSchema.extend({
  maintenanceFrequencyDays: z.coerce.number().int().positive().optional().nullable(),
  lastMaintenanceDate: z.string().optional().nullable(),
});

const contractFormSchema = insertContractSchema.extend({
  startDate: z.string(),
  endDate: z.string(),
  alertThresholdDays: z.coerce.number().int().positive().default(30),
});

// insertLocationSchema already omits id, createdAt, updatedAt
const locationFormSchema = insertLocationSchema;

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

type SortField = "name" | "type" | "facility" | "status" | "criticality" | "nextMaintenance" | "installDate";
type SortDirection = "asc" | "desc";

export default function EquipmentPage() {
  const { toast } = useToast();
  const [equipmentDialogOpen, setEquipmentDialogOpen] = useState(false);
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [facilityFilter, setFacilityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

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

  const equipmentForm = useForm<z.infer<typeof equipmentFormSchema>>({
    resolver: zodResolver(equipmentFormSchema),
    defaultValues: {
      name: "",
      equipmentId: "",
      facilityId: "",
      locationId: "",
      type: "",
      maintenanceFrequencyDays: null,
      lastMaintenanceDate: null,
      notes: "",
    },
  });

  const selectedFacilityId = equipmentForm.watch("facilityId");

  const { data: locations } = useQuery<Location[]>({
    queryKey: ["/api/facilities", selectedFacilityId, "locations"],
    enabled: !!selectedFacilityId,
  });

  const locationForm = useForm<z.infer<typeof locationFormSchema>>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: {
      facilityId: "",
      name: "",
      floor: "",
      room: "",
      notes: "",
    },
  });

  // Clear location selection when facility changes (but not on initial render)
  const prevFacilityIdRef = useRef<string | null | undefined>();
  useEffect(() => {
    if (prevFacilityIdRef.current !== undefined && prevFacilityIdRef.current !== selectedFacilityId) {
      equipmentForm.setValue("locationId", "");
    }
    prevFacilityIdRef.current = selectedFacilityId;
  }, [selectedFacilityId, equipmentForm]);

  const contractForm = useForm<z.infer<typeof contractFormSchema>>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      equipmentId: "",
      vendorName: "",
      vendorContact: "",
      startDate: "",
      endDate: "",
      contractType: "",
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

  const createLocationMutation = useMutation<Location, Error, z.infer<typeof locationFormSchema>>({
    mutationFn: async (data: z.infer<typeof locationFormSchema>) => {
      return (await apiRequest("POST", `/api/facilities/${data.facilityId}/locations`, data)) as unknown as Location;
    },
    onSuccess: (newLocation, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/facilities", variables.facilityId, "locations"] });
      setLocationDialogOpen(false);
      locationForm.reset();
      // Auto-select the newly created location
      equipmentForm.setValue("locationId", newLocation.id);
      toast({
        title: "Success",
        description: "Location added successfully",
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
        description: "Failed to add location",
        variant: "destructive",
      });
    },
  });

  const openLocationDialog = () => {
    if (!selectedFacilityId) {
      toast({
        title: "Select Facility First",
        description: "Please select a facility before adding a location",
        variant: "destructive",
      });
      return;
    }
    locationForm.setValue("facilityId", selectedFacilityId);
    setLocationDialogOpen(true);
  };

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

      return matchesSearch && matchesFacility && matchesStatus;
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
  }, [equipment, facilities, searchQuery, facilityFilter, statusFilter, sortField, sortDirection]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

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
                    name="facilityId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Facility *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || undefined}>
                          <FormControl>
                            <SelectTrigger data-testid="select-facility">
                              <SelectValue placeholder="Select facility" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {!facilities || facilities.length === 0 ? (
                              <SelectItem value="no-facilities" disabled>No facilities available</SelectItem>
                            ) : (
                              facilities.map((facility) => (
                                <SelectItem key={facility.id} value={facility.id} data-testid={`facility-option-${facility.id}`}>
                                  {facility.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={equipmentForm.control}
                    name="locationId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location *</FormLabel>
                        <div className="flex gap-2">
                          <Select onValueChange={field.onChange} value={field.value || undefined} disabled={!selectedFacilityId}>
                            <FormControl>
                              <SelectTrigger data-testid="select-location" className="flex-1">
                                <SelectValue placeholder={selectedFacilityId ? "Select location" : "Select facility first"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {!locations || locations.length === 0 ? (
                                <SelectItem value="no-locations" disabled>No locations available</SelectItem>
                              ) : (
                                locations.map((location) => (
                                  <SelectItem key={location.id} value={location.id} data-testid={`location-option-${location.id}`}>
                                    {location.name}
                                    {location.floor && ` — Floor ${location.floor}`}
                                    {location.room && ` (${location.room})`}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={openLocationDialog}
                            disabled={!selectedFacilityId}
                            data-testid="button-add-location"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add
                          </Button>
                        </div>
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

          {/* Inline Add Location Dialog */}
          <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Location</DialogTitle>
                <DialogDescription>
                  Add a location within the selected facility.
                </DialogDescription>
              </DialogHeader>
              <Form {...locationForm}>
                <form onSubmit={locationForm.handleSubmit((data) => createLocationMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={locationForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Radiology Department" data-testid="input-location-name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={locationForm.control}
                    name="floor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Floor</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 2" data-testid="input-floor" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={locationForm.control}
                    name="room"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Room</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., B-12" data-testid="input-room" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={locationForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Additional notes..." data-testid="input-location-notes" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-2 justify-end pt-4">
                    <Button type="button" variant="outline" onClick={() => setLocationDialogOpen(false)} data-testid="button-cancel-location">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createLocationMutation.isPending} data-testid="button-save-location">
                      {createLocationMutation.isPending ? "Saving..." : "Add Location"}
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
        <SheetContent className="sm:max-w-[600px] overflow-y-auto" data-testid="sheet-equipment-detail">
          {selectedEquipment && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center justify-between gap-4">
                  <span data-testid="text-detail-equipment-name">{selectedEquipment.name}</span>
                  <div className="flex gap-2">
                    <StatusBadge status={selectedEquipment.status} />
                    <CriticalityBadge criticality={selectedEquipment.criticality} />
                  </div>
                </SheetTitle>
                <SheetDescription data-testid="text-detail-equipment-type">
                  {selectedEquipment.type || "Equipment Details"}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Identification Section */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 text-foreground">Identification</h3>
                  <div className="space-y-2 text-sm">
                    {selectedEquipment.equipmentId && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Equipment ID:</span>
                        <span className="font-medium" data-testid="text-detail-equipment-id">{selectedEquipment.equipmentId}</span>
                      </div>
                    )}
                    {selectedEquipment.manufacturer && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Manufacturer:</span>
                        <span className="font-medium" data-testid="text-detail-manufacturer">{selectedEquipment.manufacturer}</span>
                      </div>
                    )}
                    {selectedEquipment.model && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Model:</span>
                        <span className="font-medium" data-testid="text-detail-model">{selectedEquipment.model}</span>
                      </div>
                    )}
                    {selectedEquipment.serial && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Serial:</span>
                        <span className="font-medium" data-testid="text-detail-serial">{selectedEquipment.serial}</span>
                      </div>
                    )}
                    {selectedEquipment.barcode && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Barcode:</span>
                        <span className="font-medium" data-testid="text-detail-barcode">{selectedEquipment.barcode}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Location Section */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 text-foreground">Location</h3>
                  <div className="space-y-2 text-sm">
                    {selectedEquipment.facilityId && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Facility:</span>
                        <span className="font-medium" data-testid="text-detail-facility">
                          {facilities?.find(f => f.id === selectedEquipment.facilityId)?.name || "—"}
                        </span>
                      </div>
                    )}
                    {selectedEquipment.locationId && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Location:</span>
                        <span className="font-medium" data-testid="text-detail-location">
                          {(() => {
                            const loc = locations?.find(l => l.id === selectedEquipment.locationId);
                            if (!loc) return "—";
                            const parts = [loc.name];
                            if (loc.floor) parts.push(`Floor ${loc.floor}`);
                            if (loc.room) parts.push(`Room ${loc.room}`);
                            return parts.join(", ");
                          })()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dates Section */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 text-foreground">Important Dates</h3>
                  <div className="space-y-2 text-sm">
                    {selectedEquipment.installDate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Install Date:</span>
                        <span className="font-medium" data-testid="text-detail-install-date">
                          {formatDate(new Date(selectedEquipment.installDate))}
                        </span>
                      </div>
                    )}
                    {selectedEquipment.purchaseDate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Purchase Date:</span>
                        <span className="font-medium" data-testid="text-detail-purchase-date">
                          {formatDate(new Date(selectedEquipment.purchaseDate))}
                        </span>
                      </div>
                    )}
                    {selectedEquipment.warrantyExpiryDate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Warranty Expiry:</span>
                        <span className="font-medium" data-testid="text-detail-warranty-expiry">
                          {formatDate(new Date(selectedEquipment.warrantyExpiryDate))}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Maintenance Section */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 text-foreground">Maintenance Schedule</h3>
                  <div className="space-y-2 text-sm">
                    {selectedEquipment.maintenanceFrequencyDays && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Frequency:</span>
                        <span className="font-medium" data-testid="text-detail-frequency">
                          Every {selectedEquipment.maintenanceFrequencyDays} days
                        </span>
                      </div>
                    )}
                    {selectedEquipment.lastMaintenanceDate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Maintenance:</span>
                        <span className="font-medium" data-testid="text-detail-last-maintenance">
                          {formatDate(new Date(selectedEquipment.lastMaintenanceDate))}
                        </span>
                      </div>
                    )}
                    {(() => {
                      const nextDate = getNextMaintenanceDate(selectedEquipment);
                      if (!nextDate) return null;
                      const daysUntil = differenceInDays(nextDate, new Date());
                      return (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Next Maintenance:</span>
                          <div className="text-right">
                            <div className="font-medium" data-testid="text-detail-next-maintenance">
                              {formatDate(nextDate)}
                            </div>
                            <div className={`text-xs ${daysUntil < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                              {daysUntil < 0 ? `${Math.abs(daysUntil)} days overdue` : `in ${daysUntil} days`}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Contracts Section */}
                {contracts && getEquipmentContracts(selectedEquipment.id).length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3 text-foreground">Service Contracts</h3>
                    <div className="space-y-3">
                      {getEquipmentContracts(selectedEquipment.id).map((contract) => (
                        <Card key={contract.id} className="p-3">
                          <div className="space-y-1 text-sm">
                            <div className="font-medium" data-testid={`text-contract-vendor-${contract.id}`}>
                              {contract.vendorName}
                            </div>
                            {contract.contractType && (
                              <div className="text-muted-foreground">{contract.contractType}</div>
                            )}
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>
                                {formatDate(new Date(contract.startDate))} - {formatDate(new Date(contract.endDate))}
                              </span>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes Section */}
                {selectedEquipment.notes && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3 text-foreground">Notes</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap" data-testid="text-detail-notes">
                      {selectedEquipment.notes}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-4 border-t">
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
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
