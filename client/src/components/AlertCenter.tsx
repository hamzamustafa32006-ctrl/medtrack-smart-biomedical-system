import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Clock, Info, CheckCircle2, Eye, Filter } from "lucide-react";
import { formatDate } from "@/lib/dateUtils";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Alert } from "@shared/schema";
import { useLocation } from "wouter";

interface AlertCenterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AlertWithDetails extends Alert {
  facilityName?: string;
  locationName?: string;
  equipmentName?: string;
  taskDueDate?: string;
  contractEndDate?: string;
  equipmentNextDueDate?: string;
}

export function AlertCenter({ open, onOpenChange }: AlertCenterProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('open');

  // Build query URL with filters
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
    enabled: open, // Only fetch when drawer is open
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (alertId: string) => {
      return apiRequest(`/api/alerts/${alertId}/acknowledge`, 'PATCH');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/alerts/unread-count'] });
      toast({
        title: "Alert Acknowledged",
        description: "The alert has been marked as acknowledged.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to acknowledge alert. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Helper to get due date from alert based on entity type
  const getDueDate = (alert: AlertWithDetails): Date | null => {
    if (alert.taskDueDate) return new Date(alert.taskDueDate);
    if (alert.contractEndDate) return new Date(alert.contractEndDate);
    if (alert.equipmentNextDueDate) return new Date(alert.equipmentNextDueDate);
    return null;
  };

  const sortedAlerts = alerts
    ? [...alerts].sort((a, b) => {
        // Sort by severity (critical > warning > info), then by due date
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        const severityDiff = severityOrder[a.severity as keyof typeof severityOrder] - 
                            severityOrder[b.severity as keyof typeof severityOrder];
        if (severityDiff !== 0) return severityDiff;
        
        // Then by due date (earliest first)
        const aDueDate = getDueDate(a);
        const bDueDate = getDueDate(b);
        
        if (aDueDate && bDueDate) {
          return aDueDate.getTime() - bDueDate.getTime();
        }
        if (aDueDate) return -1; // a has due date, b doesn't - a comes first
        if (bDueDate) return 1;  // b has due date, a doesn't - b comes first
        
        // If no due dates, sort by creation date (newest first) with null checks
        const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (aCreated !== bCreated) return bCreated - aCreated;
        
        // Final tiebreaker: sort by ID for deterministic ordering
        return a.id.localeCompare(b.id);
      })
    : [];

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-destructive" />;
      case 'warning':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getSeverityColors = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-2 border-destructive bg-destructive/10 dark:bg-destructive/5';
      case 'warning':
        return 'border-2 border-accent bg-accent/10 dark:bg-accent/5';
      default:
        return 'border-2 border-primary bg-primary/10 dark:bg-primary/5';
    }
  };

  const handleViewEquipment = (alert: AlertWithDetails) => {
    onOpenChange(false);
    if (alert.entityType === 'equipment') {
      setLocation(`/equipment?highlight=${alert.entityId}`);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg" data-testid="sheet-alert-center">
        <SheetHeader>
          <SheetTitle data-testid="text-alert-center-title">Alert Center</SheetTitle>
          <SheetDescription>
            {alerts && alerts.length > 0 
              ? `You have ${alerts.length} active alert${alerts.length !== 1 ? 's' : ''}`
              : 'No active alerts'}
          </SheetDescription>
        </SheetHeader>

        {/* Filters */}
        <div className="flex gap-2 mt-4">
          <div className="flex-1">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger data-testid="select-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
                <SelectItem value="snoozed">Snoozed</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger data-testid="select-severity-filter">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <ScrollArea className="h-[calc(100vh-12rem)] mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader className="space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : sortedAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground" data-testid="text-no-alerts">
                No active alerts
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                You're all caught up!
              </p>
            </div>
          ) : (
            <div className="space-y-3" data-testid="list-alerts">
              {sortedAlerts.map((alert) => (
                <Card
                  key={alert.id}
                  className={getSeverityColors(alert.severity)}
                  data-testid={`card-alert-${alert.id}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1">
                        {getSeverityIcon(alert.severity)}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm leading-tight" data-testid={`text-alert-title-${alert.id}`}>
                            {alert.title}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            {(() => {
                              const dueDate = getDueDate(alert);
                              if (dueDate) {
                                return `Due: ${formatDate(dueDate)}`;
                              }
                              return alert.createdAt ? `Created: ${formatDate(new Date(alert.createdAt))}` : '';
                            })()}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}
                        className="shrink-0"
                        data-testid={`badge-severity-${alert.id}`}
                      >
                        {alert.severity}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm" data-testid={`text-alert-message-${alert.id}`}>
                      {alert.message}
                    </p>
                    
                    {(alert.facilityName || alert.locationName) && (
                      <div className="text-xs text-muted-foreground space-y-1">
                        {alert.facilityName && (
                          <div>Facility: {alert.facilityName}</div>
                        )}
                        {alert.locationName && (
                          <div>Location: {alert.locationName}</div>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => acknowledgeMutation.mutate(alert.id)}
                        disabled={acknowledgeMutation.isPending || alert.status === 'acknowledged'}
                        data-testid={`button-acknowledge-${alert.id}`}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        {alert.status === 'acknowledged' ? 'Acknowledged' : 'Acknowledge'}
                      </Button>

                      {alert.entityType === 'equipment' && alert.entityId && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewEquipment(alert)}
                          data-testid={`button-view-equipment-${alert.id}`}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View Equipment
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
