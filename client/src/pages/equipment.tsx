import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Settings, Calendar, Clock, Package, Wrench, AlertTriangle, Building2, MapPin } from "lucide-react";
import { differenceInDays } from "date-fns";
import { formatDate } from "@/lib/dateUtils";
import type { Equipment, Contract, Facility, Location } from "@shared/schema";
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

export default function EquipmentPage() {
  const { toast } = useToast();
  const [equipmentDialogOpen, setEquipmentDialogOpen] = useState(false);
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);

  const { data: equipment, isLoading } = useQuery<Equipment[]>({
    queryKey: ["/api/equipment"],
  });

  const { data: contracts } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
  });

  const { data: facilities } = useQuery<Facility[]>({
    queryKey: ["/api/facilities"],
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
        ) : (
          <div className="space-y-4">
            {equipment.map((equip) => {
              const equipContracts = getEquipmentContracts(equip.id);
              const nextMaintenance = getNextMaintenanceDate(equip);
              const daysUntilMaintenance = nextMaintenance ? differenceInDays(nextMaintenance, new Date()) : null;
              const facility = facilities?.find(f => f.id === equip.facilityId);

              return (
                <Card key={equip.id} data-testid={`equipment-card-${equip.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base">{equip.name}</CardTitle>
                        <CardDescription>
                          {equip.equipmentId && `ID: ${equip.equipmentId}`}
                          {facility && ` • ${facility.name}`}
                        </CardDescription>
                      </div>
                      {equip.type && (
                        <Badge variant="secondary">{equip.type}</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {nextMaintenance && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Next maintenance:</span>
                        <span className={`font-medium ${daysUntilMaintenance !== null && daysUntilMaintenance < 0 ? "text-warning" : ""}`}>
                          {formatDate(nextMaintenance)}
                          {daysUntilMaintenance !== null && (
                            <span className="text-muted-foreground ml-1">
                              ({daysUntilMaintenance < 0 ? "overdue" : `in ${daysUntilMaintenance} days`})
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                    {equipContracts.length > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {equipContracts.length} contract{equipContracts.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    )}
                    <div className="pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openContractDialog(equip)}
                        data-testid={`button-add-contract-${equip.id}`}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Contract
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
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
    </div>
  );
}
