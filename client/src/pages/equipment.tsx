import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Settings, Calendar, Clock } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import type { Equipment, Contract } from "@shared/schema";
import { insertEquipmentSchema, insertContractSchema, type InsertEquipment, type InsertContract } from "@shared/schema";
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

export default function EquipmentPage() {
  const { toast } = useToast();
  const [equipmentDialogOpen, setEquipmentDialogOpen] = useState(false);
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);

  const { data: equipment, isLoading } = useQuery<Equipment[]>({
    queryKey: ["/api/equipment"],
  });

  const { data: contracts } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
  });

  const equipmentForm = useForm<z.infer<typeof equipmentFormSchema>>({
    resolver: zodResolver(equipmentFormSchema),
    defaultValues: {
      name: "",
      equipmentId: "",
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

  return (
    <div className="min-h-full bg-background">
      <div className="border-b bg-card px-6 py-4">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Equipment</h1>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
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
                          <Input placeholder="e.g., Building A, Floor 2" data-testid="input-location" {...field} value={field.value || ""} />
                        </FormControl>
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

              return (
                <Card key={equip.id} data-testid={`equipment-card-${equip.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base">{equip.name}</CardTitle>
                        <CardDescription>
                          {equip.equipmentId && `ID: ${equip.equipmentId}`}
                          {equip.location && ` • ${equip.location}`}
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
                          {format(nextMaintenance, "MMM d, yyyy")}
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
