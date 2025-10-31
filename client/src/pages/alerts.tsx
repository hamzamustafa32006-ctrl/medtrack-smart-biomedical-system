import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AlertTriangle, Bell, CheckCircle2, Eye } from "lucide-react";
import { useLocation } from "wouter";
import { formatDate } from "@/lib/dateUtils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

type AlertWithDetails = {
  id: string;
  entityType: string;
  entityId: string;
  severity: 'critical' | 'warning' | 'info';
  status: 'open' | 'acknowledged' | 'snoozed' | 'resolved';
  title: string;
  message: string;
  createdAt: string | null;
  equipmentName?: string | null;
  facilityName?: string | null;
  locationName?: string | null;
  taskDueDate?: string | null;
  contractEndDate?: string | null;
  equipmentNextDueDate?: string | null;
};

export default function AlertsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('severity');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const buildQueryUrl = () => {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.append('status', statusFilter);
    if (severityFilter !== 'all') params.append('severity', severityFilter);
    const queryString = params.toString();
    return `/api/alerts${queryString ? `?${queryString}` : ''}`;
  };

  const { data: alerts, isLoading } = useQuery<AlertWithDetails[]>({
    queryKey: ['/api/alerts', statusFilter, severityFilter],
    queryFn: async () => {
      const response = await fetch(buildQueryUrl());
      if (!response.ok) throw new Error('Failed to fetch alerts');
      return response.json();
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (alertId: string) => {
      return apiRequest(`/api/alerts/${alertId}/acknowledge`, 'PATCH');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/alerts/unread-count'] });
      toast({
        title: "Alert acknowledged",
        description: "The alert has been marked as acknowledged.",
      });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (alertId: string) => {
      return apiRequest(`/api/alerts/${alertId}/resolve`, 'PATCH');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/alerts/unread-count'] });
      toast({
        title: "Alert resolved",
        description: "The alert has been marked as resolved.",
      });
    },
  });

  const getDueDate = (alert: AlertWithDetails): Date | null => {
    if (alert.taskDueDate) return new Date(alert.taskDueDate);
    if (alert.contractEndDate) return new Date(alert.contractEndDate);
    if (alert.equipmentNextDueDate) return new Date(alert.equipmentNextDueDate);
    return null;
  };

  const sortedAlerts = alerts
    ? [...alerts].sort((a, b) => {
        let comparison = 0;

        if (sortBy === 'severity') {
          const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
          const aSeverity = a.severity ? (severityOrder[a.severity] ?? 99) : 99;
          const bSeverity = b.severity ? (severityOrder[b.severity] ?? 99) : 99;
          comparison = aSeverity - bSeverity;
        } else if (sortBy === 'dueDate') {
          const aDueDate = getDueDate(a);
          const bDueDate = getDueDate(b);
          if (aDueDate && bDueDate) {
            comparison = aDueDate.getTime() - bDueDate.getTime();
          } else if (aDueDate) {
            comparison = -1;
          } else if (bDueDate) {
            comparison = 1;
          }
        } else if (sortBy === 'status') {
          const statusOrder = { open: 0, acknowledged: 1, snoozed: 2, resolved: 3 };
          comparison = statusOrder[a.status as keyof typeof statusOrder] - 
                      statusOrder[b.status as keyof typeof statusOrder];
        } else if (sortBy === 'equipment') {
          comparison = (a.equipmentName || '').localeCompare(b.equipmentName || '');
        } else if (sortBy === 'facility') {
          comparison = (a.facilityName || '').localeCompare(b.facilityName || '');
        }

        if (comparison === 0) {
          // Final tiebreaker: sort by ID for deterministic ordering
          // Use localeCompare for UUID strings
          const idComparison = a.id.localeCompare(b.id);
          return sortOrder === 'asc' ? idComparison : -idComparison;
        }

        return sortOrder === 'asc' ? comparison : -comparison;
      })
    : [];

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return (
          <Badge variant="destructive" data-testid={`badge-severity-${severity}`}>
            <AlertTriangle className="w-3 h-3 mr-1" />
            Critical
          </Badge>
        );
      case 'warning':
        return (
          <Badge className="bg-accent text-accent-foreground" data-testid={`badge-severity-${severity}`}>
            <Bell className="w-3 h-3 mr-1" />
            Warning
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" data-testid={`badge-severity-${severity}`}>
            Info
          </Badge>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="outline" data-testid={`badge-status-${status}`}>Open</Badge>;
      case 'acknowledged':
        return <Badge variant="secondary" data-testid={`badge-status-${status}`}>Acknowledged</Badge>;
      case 'snoozed':
        return <Badge variant="secondary" data-testid={`badge-status-${status}`}>Snoozed</Badge>;
      case 'resolved':
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" data-testid={`badge-status-${status}`}>
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Resolved
          </Badge>
        );
      default:
        return <Badge variant="outline" data-testid={`badge-status-${status}`}>{status}</Badge>;
    }
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  return (
    <div className="h-full overflow-auto p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" data-testid="heading-alerts">Alerts</h1>
            <p className="text-muted-foreground">
              Monitor and manage all maintenance alerts
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle>All Alerts</CardTitle>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Severity:</span>
                  <Select value={severityFilter} onValueChange={setSeverityFilter}>
                    <SelectTrigger className="w-32" data-testid="select-severity-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-36" data-testid="select-status-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="acknowledged">Acknowledged</SelectItem>
                      <SelectItem value="snoozed">Snoozed</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="loading-alerts">
                Loading alerts...
              </div>
            ) : !sortedAlerts || sortedAlerts.length === 0 ? (
              <div className="text-center py-12" data-testid="empty-alerts">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No alerts found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover-elevate active-elevate-2"
                      onClick={() => handleSort('severity')}
                      data-testid="header-severity"
                    >
                      Severity {sortBy === 'severity' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover-elevate active-elevate-2"
                      onClick={() => handleSort('equipment')}
                      data-testid="header-equipment"
                    >
                      Equipment {sortBy === 'equipment' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover-elevate active-elevate-2"
                      onClick={() => handleSort('facility')}
                      data-testid="header-facility"
                    >
                      Facility {sortBy === 'facility' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead 
                      className="cursor-pointer hover-elevate active-elevate-2"
                      onClick={() => handleSort('dueDate')}
                      data-testid="header-duedate"
                    >
                      Due Date {sortBy === 'dueDate' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover-elevate active-elevate-2"
                      onClick={() => handleSort('status')}
                      data-testid="header-status"
                    >
                      Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedAlerts.map((alert) => {
                    const dueDate = getDueDate(alert);
                    return (
                      <TableRow key={alert.id} data-testid={`row-alert-${alert.id}`}>
                        <TableCell>{getSeverityBadge(alert.severity)}</TableCell>
                        <TableCell className="font-medium" data-testid={`text-equipment-${alert.id}`}>
                          {alert.equipmentName || 'N/A'}
                        </TableCell>
                        <TableCell data-testid={`text-facility-${alert.id}`}>
                          {alert.facilityName || 'N/A'}
                        </TableCell>
                        <TableCell data-testid={`text-location-${alert.id}`}>
                          {alert.locationName || 'N/A'}
                        </TableCell>
                        <TableCell data-testid={`text-duedate-${alert.id}`}>
                          {dueDate ? formatDate(dueDate) : 'N/A'}
                        </TableCell>
                        <TableCell>{getStatusBadge(alert.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {alert.status === 'open' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => acknowledgeMutation.mutate(alert.id)}
                                disabled={acknowledgeMutation.isPending}
                                data-testid={`button-acknowledge-${alert.id}`}
                              >
                                Acknowledge
                              </Button>
                            )}
                            {(alert.status === 'open' || alert.status === 'acknowledged') && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => resolveMutation.mutate(alert.id)}
                                disabled={resolveMutation.isPending}
                                data-testid={`button-resolve-${alert.id}`}
                              >
                                Resolve
                              </Button>
                            )}
                            {alert.entityType === 'equipment' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setLocation('/equipment')}
                                data-testid={`button-view-${alert.id}`}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
