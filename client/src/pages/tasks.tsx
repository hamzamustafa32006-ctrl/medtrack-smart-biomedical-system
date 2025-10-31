import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskCard } from "@/components/TaskCard";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { TaskStatus, TaskPriority } from "@shared/utils";
import type { Facility, Location, User } from "@shared/schema";

interface MaintenanceTaskWithDetails {
  id: string;
  equipmentId: string;
  equipmentName: string;
  equipmentIdCode: string | null;
  facilityId: string;
  facilityName: string;
  facilityCode: string;
  locationId: string | null;
  locationName: string | null;
  locationCode: string | null;
  planId: string | null;
  planName: string | null;
  assignedTo: string | null;
  assignedToUserFirstName: string | null;
  assignedToUserLastName: string | null;
  assignedToUserEmail: string | null;
  assignedDate: string;
  dueDate: string;
  completedDate: string | null;
  status: string;
  priority: string;
  title: string;
  description: string | null;
  checklist: any[] | null;
  technicianNotes: string | null;
  attachments: string[] | null;
}

export default function Tasks() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [facilityFilter, setFacilityFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [assignedUserFilter, setAssignedUserFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("dueDate");
  const [showFilters, setShowFilters] = useState(false);

  // Fetch tasks
  const { data: tasks, isLoading: tasksLoading } = useQuery<MaintenanceTaskWithDetails[]>({
    queryKey: ["/api/maintenance-tasks"],
  });

  // Fetch facilities for filter dropdown
  const { data: facilities } = useQuery<Facility[]>({
    queryKey: ["/api/facilities"],
  });

  // Fetch locations for filter dropdown
  const { data: locations } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });

  // Derive unique assigned users from tasks
  const uniqueAssignedUsers = tasks?.reduce((acc, task) => {
    if (task.assignedTo && !acc.some(u => u.id === task.assignedTo)) {
      acc.push({
        id: task.assignedTo,
        name: `${task.assignedToUserFirstName || ''} ${task.assignedToUserLastName || ''}`.trim() || task.assignedToUserEmail || 'Unknown'
      });
    }
    return acc;
  }, [] as Array<{ id: string; name: string }>) || [];

  // Filter and sort tasks
  const filteredTasks = tasks?.filter((task) => {
    // Search filter
    if (searchQuery && !task.equipmentName.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Status filter
    if (statusFilter !== "all" && task.status !== statusFilter) {
      return false;
    }

    // Facility filter
    if (facilityFilter !== "all" && task.facilityId !== facilityFilter) {
      return false;
    }

    // Location filter
    if (locationFilter !== "all" && task.locationId !== locationFilter) {
      return false;
    }

    // Assigned user filter
    if (assignedUserFilter !== "all" && task.assignedTo !== assignedUserFilter) {
      return false;
    }

    return true;
  }) || [];

  // Sort tasks
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    switch (sortBy) {
      case "dueDate":
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      case "priority":
        const priorityOrder: Record<string, number> = { 
          [TaskPriority.HIGH]: 0, 
          [TaskPriority.MEDIUM]: 1, 
          [TaskPriority.LOW]: 2 
        };
        const aPriority = priorityOrder[a.priority.toUpperCase()] ?? 999;
        const bPriority = priorityOrder[b.priority.toUpperCase()] ?? 999;
        return aPriority - bPriority;
      case "status":
        const statusOrder: Record<string, number> = { 
          [TaskStatus.OVERDUE]: 0, 
          [TaskStatus.DUE_TODAY]: 1, 
          [TaskStatus.OPEN]: 2, 
          [TaskStatus.COMPLETED]: 3,
          [TaskStatus.CANCELLED]: 4
        };
        const aStatus = statusOrder[a.status.toUpperCase()] ?? 999;
        const bStatus = statusOrder[b.status.toUpperCase()] ?? 999;
        return aStatus - bStatus;
      case "equipmentName":
        return a.equipmentName.localeCompare(b.equipmentName);
      default:
        return 0;
    }
  });

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setFacilityFilter("all");
    setLocationFilter("all");
    setAssignedUserFilter("all");
  };

  const hasActiveFilters = searchQuery || statusFilter !== "all" || facilityFilter !== "all" || 
                           locationFilter !== "all" || assignedUserFilter !== "all";

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Maintenance Tasks</h1>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Search and Filter Bar */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4">
              {/* Search and Toggle Filters */}
              <div className="flex gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by equipment name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    data-testid="input-search"
                  />
                </div>
                <Button
                  variant={showFilters ? "default" : "outline"}
                  onClick={() => setShowFilters(!showFilters)}
                  data-testid="button-toggle-filters"
                >
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Filters
                </Button>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    onClick={clearFilters}
                    data-testid="button-clear-filters"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                )}
              </div>

              {/* Filter Controls */}
              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger data-testid="select-status-filter">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value={TaskStatus.OPEN}>Open</SelectItem>
                        <SelectItem value={TaskStatus.DUE_TODAY}>Due Today</SelectItem>
                        <SelectItem value={TaskStatus.OVERDUE}>Overdue</SelectItem>
                        <SelectItem value={TaskStatus.COMPLETED}>Completed</SelectItem>
                        <SelectItem value={TaskStatus.CANCELLED}>Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Facility</label>
                    <Select value={facilityFilter} onValueChange={setFacilityFilter}>
                      <SelectTrigger data-testid="select-facility-filter">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Facilities</SelectItem>
                        {facilities?.map((facility) => (
                          <SelectItem key={facility.id} value={facility.id}>
                            {facility.code} - {facility.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Location</label>
                    <Select value={locationFilter} onValueChange={setLocationFilter}>
                      <SelectTrigger data-testid="select-location-filter">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Locations</SelectItem>
                        {locations?.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Assigned To</label>
                    <Select value={assignedUserFilter} onValueChange={setAssignedUserFilter}>
                      <SelectTrigger data-testid="select-assigned-user-filter">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        {uniqueAssignedUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Sort Control */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">Sort by:</span>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px]" data-testid="select-sort">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dueDate">Due Date</SelectItem>
                    <SelectItem value="priority">Priority</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="equipmentName">Equipment Name</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Task Count */}
        <div className="mb-4 text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground" data-testid="text-task-count">{sortedTasks.length}</span> of{" "}
          <span className="font-medium text-foreground">{tasks?.length || 0}</span> tasks
        </div>

        {/* Task List */}
        {tasksLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        ) : sortedTasks.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground" data-testid="text-no-tasks">
                {hasActiveFilters ? "No tasks match your filters" : "No maintenance tasks found"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sortedTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onViewDetails={() => {
                  // TODO: Open task detail modal (Task 3.4)
                  console.log("View task details:", task.id);
                }}
                onMarkComplete={() => {
                  // TODO: Implement mark complete (Task 3.4)
                  console.log("Mark task complete:", task.id);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
