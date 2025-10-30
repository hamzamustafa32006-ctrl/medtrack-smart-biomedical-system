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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, History as HistoryIcon, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import type { MaintenanceRecord, Equipment } from "@shared/schema";
import { insertMaintenanceRecordSchema, type InsertMaintenanceRecord } from "@shared/schema";
import { z } from "zod";
import { isUnauthorizedError } from "@/lib/authUtils";

const maintenanceFormSchema = insertMaintenanceRecordSchema.extend({
  maintenanceDate: z.string(),
  nextScheduledDate: z.string().optional().nullable(),
});

export default function HistoryPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: records, isLoading: recordsLoading } = useQuery<MaintenanceRecord[]>({
    queryKey: ["/api/maintenance-records"],
  });

  const { data: equipment, isLoading: equipmentLoading } = useQuery<Equipment[]>({
    queryKey: ["/api/equipment"],
  });

  const isLoading = recordsLoading || equipmentLoading;

  const form = useForm<z.infer<typeof maintenanceFormSchema>>({
    resolver: zodResolver(maintenanceFormSchema),
    defaultValues: {
      equipmentId: "",
      maintenanceDate: new Date().toISOString().split("T")[0],
      maintenanceType: "",
      description: "",
      performedBy: "",
      completed: true,
      nextScheduledDate: null,
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof maintenanceFormSchema>) => {
      const payload = {
        ...data,
        maintenanceDate: new Date(data.maintenanceDate).toISOString(),
        nextScheduledDate: data.nextScheduledDate ? new Date(data.nextScheduledDate).toISOString() : null,
      };
      return await apiRequest("POST", "/api/maintenance-records", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      setDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Maintenance record added successfully",
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
        description: "Failed to add maintenance record",
        variant: "destructive",
      });
    },
  });

  const getEquipmentName = (equipmentId: string) => {
    return equipment?.find((e) => e.id === equipmentId)?.name || "Unknown Equipment";
  };

  // Sort records by date (most recent first)
  const sortedRecords = records ? [...records].sort((a, b) => 
    new Date(b.maintenanceDate).getTime() - new Date(a.maintenanceDate).getTime()
  ) : [];

  return (
    <div className="min-h-full bg-background">
      <div className="border-b bg-card px-6 py-4">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Maintenance History</h1>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Maintenance Log</h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-record">
                <Plus className="w-4 h-4 mr-2" />
                Log Maintenance
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Log Maintenance Record</DialogTitle>
                <DialogDescription>
                  Record completed maintenance or schedule future work.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="equipmentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Equipment *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-equipment">
                              <SelectValue placeholder="Select equipment" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {equipment?.map((equip) => (
                              <SelectItem key={equip.id} value={equip.id}>
                                {equip.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="maintenanceDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maintenance Date *</FormLabel>
                        <FormControl>
                          <Input type="date" data-testid="input-maintenance-date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="maintenanceType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maintenance Type</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Preventive, Corrective" data-testid="input-maintenance-type" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="What was done?" data-testid="input-description" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="performedBy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Performed By</FormLabel>
                        <FormControl>
                          <Input placeholder="Technician name" data-testid="input-performed-by" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nextScheduledDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Next Scheduled Date</FormLabel>
                        <FormControl>
                          <Input type="date" data-testid="input-next-scheduled" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormDescription>When is the next maintenance due?</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Additional notes..." data-testid="input-record-notes" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-2 justify-end pt-4">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-record">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending} data-testid="button-save-record">
                      {createMutation.isPending ? "Saving..." : "Save Record"}
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
        ) : !sortedRecords || sortedRecords.length === 0 ? (
          <Card>
            <CardHeader className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <HistoryIcon className="w-8 h-8 text-muted-foreground" />
              </div>
              <CardTitle>No Maintenance Records</CardTitle>
              <CardDescription className="max-w-md mx-auto">
                Start logging maintenance activities to track your equipment service history.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="space-y-4">
            {sortedRecords.map((record) => (
              <Card key={record.id} data-testid={`record-card-${record.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-base">
                          {getEquipmentName(record.equipmentId)}
                        </CardTitle>
                        {record.completed && (
                          <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                      <CardDescription>
                        {format(new Date(record.maintenanceDate), "MMMM d, yyyy")}
                        {record.maintenanceType && ` • ${record.maintenanceType}`}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {record.description && (
                    <p className="text-sm">{record.description}</p>
                  )}
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {record.performedBy && (
                      <div>
                        <span className="font-medium">Performed by:</span> {record.performedBy}
                      </div>
                    )}
                    {record.nextScheduledDate && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>Next: {format(new Date(record.nextScheduledDate), "MMM d, yyyy")}</span>
                      </div>
                    )}
                  </div>
                  {record.notes && (
                    <p className="text-sm text-muted-foreground pt-2 border-t">
                      {record.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
