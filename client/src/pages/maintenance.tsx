import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Eye, X, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { MaintenanceRecordForm } from "@/components/maintenance-record-form";
import { useMaintenance, type MaintenanceFilters, type MaintenanceRecord } from "@/hooks/useMaintenance";
import { format } from "date-fns";

const STATUS_OPTIONS = ["In Progress", "Completed", "Scheduled", "Pending Verification"];
const TYPE_OPTIONS = ["Preventive", "Corrective", "Calibration", "Inspection", "Emergency"];

export default function MaintenancePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [costMin, setCostMin] = useState<string>("");
  const [costMax, setCostMax] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<string>("maintenanceDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Debounced search (simulated via useMemo)
  const debouncedSearch = useMemo(() => searchQuery, [searchQuery]);

  const filters: MaintenanceFilters = {
    q: debouncedSearch || undefined,
    status: selectedStatuses.length > 0 ? selectedStatuses : undefined,
    maintenanceType: selectedTypes.length > 0 ? selectedTypes : undefined,
    costMin: costMin ? parseFloat(costMin) : undefined,
    costMax: costMax ? parseFloat(costMax) : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    sort: sortField,
    order: sortOrder,
    page: currentPage,
    pageSize: 20,
  };

  const { data, isLoading } = useMaintenance(filters);
  const records = data?.data || [];
  const meta = data?.meta;

  const completeMutation = useMutation({
    mutationFn: async (recordId: string) => {
      return await apiRequest("PATCH", `/api/maintenance-records/${recordId}/complete`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-records/details"] });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-records"] });
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

  const handleSearch = () => {
    setSearchQuery(searchInput);
    setCurrentPage(1);
  };

  const toggleStatus = (status: string) => {
    setSelectedStatuses(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
    setCurrentPage(1);
  };

  const toggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSearchInput("");
    setSearchQuery("");
    setSelectedStatuses([]);
    setSelectedTypes([]);
    setCostMin("");
    setCostMax("");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
    setCurrentPage(1);
  };

  const activeFilterCount = 
    (selectedStatuses.length > 0 ? 1 : 0) +
    (selectedTypes.length > 0 ? 1 : 0) +
    (costMin || costMax ? 1 : 0) +
    (dateFrom || dateTo ? 1 : 0) +
    (searchQuery ? 1 : 0);

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

      {/* Search Bar & Quick Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 flex gap-2">
                <Input
                  placeholder="Search equipment, technician..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  data-testid="input-search-maintenance"
                />
                <Button onClick={handleSearch} variant="secondary" size="icon" data-testid="button-search">
                  <Search className="w-4 h-4" />
                </Button>
              </div>
              
              <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                <Button variant="outline" onClick={() => setFiltersOpen(true)} className="gap-2" data-testid="button-open-filters">
                  <Plus className="w-4 h-4" />
                  Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
                </Button>
                <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Advanced Filters</SheetTitle>
                  </SheetHeader>
                  
                  <div className="mt-6 space-y-6">
                    <div>
                      <Label className="text-sm font-semibold">Status</Label>
                      <div className="mt-2 space-y-2">
                        {STATUS_OPTIONS.map((status) => (
                          <div key={status} className="flex items-center gap-2">
                            <Checkbox
                              id={`status-${status}`}
                              checked={selectedStatuses.includes(status)}
                              onCheckedChange={() => toggleStatus(status)}
                              data-testid={`checkbox-status-${status}`}
                            />
                            <Label htmlFor={`status-${status}`} className="text-sm cursor-pointer">
                              {status}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-semibold">Maintenance Type</Label>
                      <div className="mt-2 space-y-2">
                        {TYPE_OPTIONS.map((type) => (
                          <div key={type} className="flex items-center gap-2">
                            <Checkbox
                              id={`type-${type}`}
                              checked={selectedTypes.includes(type)}
                              onCheckedChange={() => toggleType(type)}
                              data-testid={`checkbox-type-${type}`}
                            />
                            <Label htmlFor={`type-${type}`} className="text-sm cursor-pointer">
                              {type}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-semibold">Cost Range (KWD)</Label>
                      <div className="mt-2 flex gap-2">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={costMin}
                          onChange={(e) => setCostMin(e.target.value)}
                          data-testid="input-cost-min"
                        />
                        <Input
                          type="number"
                          placeholder="Max"
                          value={costMax}
                          onChange={(e) => setCostMax(e.target.value)}
                          data-testid="input-cost-max"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-semibold">Date Range</Label>
                      <div className="mt-2 space-y-2">
                        <Input
                          type="date"
                          placeholder="From"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                          data-testid="input-date-from"
                        />
                        <Input
                          type="date"
                          placeholder="To"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                          data-testid="input-date-to"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          resetFilters();
                          setFiltersOpen(false);
                        }}
                        data-testid="button-reset-filters"
                      >
                        Reset
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={() => setFiltersOpen(false)}
                        data-testid="button-apply-filters"
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Active Filter Chips */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap gap-2">
                {searchQuery && (
                  <Badge variant="secondary" className="gap-1">
                    Search: {searchQuery}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => {
                        setSearchQuery("");
                        setSearchInput("");
                        setCurrentPage(1);
                      }}
                    />
                  </Badge>
                )}
                {selectedStatuses.map((status) => (
                  <Badge key={status} variant="secondary" className="gap-1">
                    {status}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => toggleStatus(status)} />
                  </Badge>
                ))}
                {selectedTypes.map((type) => (
                  <Badge key={type} variant="secondary" className="gap-1">
                    {type}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => toggleType(type)} />
                  </Badge>
                ))}
                {(costMin || costMax) && (
                  <Badge variant="secondary" className="gap-1">
                    Cost: {costMin || "0"} - {costMax || "∞"}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => {
                        setCostMin("");
                        setCostMax("");
                        setCurrentPage(1);
                      }}
                    />
                  </Badge>
                )}
                {(dateFrom || dateTo) && (
                  <Badge variant="secondary" className="gap-1">
                    Date: {dateFrom || "Start"} - {dateTo || "End"}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => {
                        setDateFrom("");
                        setDateTo("");
                        setCurrentPage(1);
                      }}
                    />
                  </Badge>
                )}
              </div>
            )}

            {/* Results Count */}
            {meta && (
              <div className="text-sm text-muted-foreground">
                Showing {records.length > 0 ? (meta.page - 1) * meta.pageSize + 1 : 0} - {Math.min(meta.page * meta.pageSize, meta.total)} of {meta.total} records
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-12">
              <Search className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-lg font-semibold text-foreground">No Maintenance Records</h3>
              <p className="text-muted-foreground mt-1">
                {activeFilterCount > 0
                  ? "No records match your filters"
                  : "Start by logging your first maintenance activity"}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 hover-elevate"
                          onClick={() => handleSort("equipmentName")}
                          data-testid="sort-equipment"
                        >
                          Equipment
                          {sortField === "equipmentName" && <ArrowUpDown className="w-3 h-3" />}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 hover-elevate"
                          onClick={() => handleSort("maintenanceType")}
                          data-testid="sort-type"
                        >
                          Type
                          {sortField === "maintenanceType" && <ArrowUpDown className="w-3 h-3" />}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 hover-elevate"
                          onClick={() => handleSort("maintenanceDate")}
                          data-testid="sort-date"
                        >
                          Date
                          {sortField === "maintenanceDate" && <ArrowUpDown className="w-3 h-3" />}
                        </Button>
                      </TableHead>
                      <TableHead>Technician</TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 hover-elevate"
                          onClick={() => handleSort("status")}
                          data-testid="sort-status"
                        >
                          Status
                          {sortField === "status" && <ArrowUpDown className="w-3 h-3" />}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 hover-elevate"
                          onClick={() => handleSort("cost")}
                          data-testid="sort-cost"
                        >
                          Cost (KWD)
                          {sortField === "cost" && <ArrowUpDown className="w-3 h-3" />}
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => (
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

              {/* Pagination */}
              {meta && meta.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Page {meta.page} of {meta.totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={meta.page === 1}
                      data-testid="button-prev-page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(meta.totalPages, p + 1))}
                      disabled={meta.page === meta.totalPages}
                      data-testid="button-next-page"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
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
