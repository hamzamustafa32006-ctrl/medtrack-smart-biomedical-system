import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Filter, Search, Eye, CheckCircle, Edit, Clock, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { MaintenanceRecordForm } from "@/components/maintenance-record-form";
import { format } from "date-fns";

type MaintenanceRecord = {
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
  cost: string | null;
  notes: string | null;
  createdAt: string;
};

export default function MaintenancePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: records = [], isLoading } = useQuery<MaintenanceRecord[]>({
    queryKey: ["/api/maintenance-records/details", { status: statusFilter !== "all" ? statusFilter : undefined, maintenanceType: typeFilter !== "all" ? typeFilter : undefined }],
  });

  const completeMutation = useMutation({
    mutationFn: async (recordId: string) => {
      return await apiRequest("PATCH", `/api/maintenance-records/${recordId}/complete`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-records/details"] });
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      toast({
        title: "Success",
        description: "Maintenance record marked as completed",
      });
      setSelectedRecord(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete maintenance record",
        variant: "destructive",
      });
    },
  });

  const filteredRecords = records.filter((record) => {
    const matchesSearch = 
      record.equipmentName?.toLowerCase()?.includes(searchQuery.toLowerCase()) ||
      record.equipmentSerial?.toLowerCase()?.includes(searchQuery.toLowerCase()) ||
      record.performedBy?.toLowerCase()?.includes(searchQuery.toLowerCase()) ||
      record.description?.toLowerCase()?.includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Completed": return "default";
      case "In Progress": return "secondary";
      case "Pending Verification": return "outline";
      default: return "secondary";
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "Preventive": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "Corrective": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "Calibration": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "Inspection": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "Emergency": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Maintenance Records</h1>
          <p className="text-muted-foreground mt-1">Track and manage all equipment maintenance activities</p>
        </div>
        
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-maintenance" className="gap-2">
              <Plus className="w-4 h-4" />
              Log Maintenance
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Log Maintenance Record</DialogTitle>
            </DialogHeader>
            <MaintenanceRecordForm onSuccess={() => setAddDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search equipment, technician, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-maintenance"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Pending Verification">Pending Verification</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-type-filter">
                <SelectValue placeholder="Filter by Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Preventive">Preventive</SelectItem>
                <SelectItem value="Corrective">Corrective</SelectItem>
                <SelectItem value="Calibration">Calibration</SelectItem>
                <SelectItem value="Inspection">Inspection</SelectItem>
                <SelectItem value="Emergency">Emergency</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-lg font-semibold text-foreground">No Maintenance Records</h3>
              <p className="text-muted-foreground mt-1">
                {searchQuery || statusFilter !== "all" || typeFilter !== "all"
                  ? "No records match your filters"
                  : "Start by logging your first maintenance activity"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Technician</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cost (KWD)</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.id} data-testid={`row-maintenance-${record.id}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground" data-testid={`text-equipment-name-${record.id}`}>
                            {record.equipmentName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {record.equipmentSerial && `SN: ${record.equipmentSerial}`}
                            {record.facilityName && ` • ${record.facilityName}`}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getTypeBadgeColor(record.maintenanceType)} no-default-hover-elevate`}>
                          {record.maintenanceType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-foreground">
                          {format(new Date(record.maintenanceDate), "dd/MM/yyyy")}
                        </p>
                        {record.endDate && (
                          <p className="text-xs text-muted-foreground">
                            Completed: {format(new Date(record.endDate), "dd/MM/yyyy")}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-foreground">{record.performedBy || "—"}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(record.status)}>
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium text-foreground">
                          {record.cost ? parseFloat(record.cost).toFixed(2) : "—"}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedRecord(record)}
                          data-testid={`button-view-${record.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedRecord && (
            <>
              <SheetHeader>
                <SheetTitle>Maintenance Record Details</SheetTitle>
              </SheetHeader>
              
              <div className="mt-6 space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">Equipment Information</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Name:</span>
                      <span className="text-sm font-medium text-foreground">{selectedRecord.equipmentName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Type:</span>
                      <span className="text-sm font-medium text-foreground">{selectedRecord.equipmentType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Serial:</span>
                      <span className="text-sm font-medium text-foreground">{selectedRecord.equipmentSerial}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Facility:</span>
                      <span className="text-sm font-medium text-foreground">{selectedRecord.facilityName || "—"}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">Maintenance Details</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Type:</span>
                      <Badge className={`${getTypeBadgeColor(selectedRecord.maintenanceType)} no-default-hover-elevate`}>
                        {selectedRecord.maintenanceType}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Status:</span>
                      <Badge variant={getStatusBadgeVariant(selectedRecord.status)}>
                        {selectedRecord.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Verification:</span>
                      <Badge variant={selectedRecord.verificationStatus === "Verified" ? "default" : "outline"}>
                        {selectedRecord.verificationStatus}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Start Date:</span>
                      <span className="text-sm font-medium text-foreground">
                        {format(new Date(selectedRecord.maintenanceDate), "dd/MM/yyyy HH:mm")}
                      </span>
                    </div>
                    {selectedRecord.endDate && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">End Date:</span>
                        <span className="text-sm font-medium text-foreground">
                          {format(new Date(selectedRecord.endDate), "dd/MM/yyyy HH:mm")}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Performed By:</span>
                      <span className="text-sm font-medium text-foreground">{selectedRecord.performedBy || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Cost:</span>
                      <span className="text-sm font-medium text-foreground">
                        {selectedRecord.cost ? `${parseFloat(selectedRecord.cost).toFixed(2)} KWD` : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedRecord.description && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">Description</h3>
                    <p className="text-sm text-foreground">{selectedRecord.description}</p>
                  </div>
                )}

                {selectedRecord.actionsTaken && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">Actions Taken</h3>
                    <p className="text-sm text-foreground">{selectedRecord.actionsTaken}</p>
                  </div>
                )}

                {selectedRecord.partsUsed && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">Parts Used</h3>
                    <p className="text-sm text-foreground">{selectedRecord.partsUsed}</p>
                  </div>
                )}

                {selectedRecord.notes && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">Notes</h3>
                    <p className="text-sm text-foreground">{selectedRecord.notes}</p>
                  </div>
                )}

                <div className="pt-4 border-t flex gap-2">
                  {selectedRecord.status !== "Completed" && (
                    <Button 
                      className="flex-1 gap-2" 
                      onClick={() => completeMutation.mutate(selectedRecord.id)}
                      disabled={completeMutation.isPending}
                      data-testid="button-complete-maintenance"
                    >
                      <Check className="w-4 h-4" />
                      {completeMutation.isPending ? "Completing..." : "Mark Complete"}
                    </Button>
                  )}
                  <Button className="flex-1 gap-2" variant="outline" onClick={() => setSelectedRecord(null)}>
                    Close
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
