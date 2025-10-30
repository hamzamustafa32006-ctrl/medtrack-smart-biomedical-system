// Home page - Displays maintenance alerts
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Bell, Calendar, Clock, Plus } from "lucide-react";
import { format, differenceInDays, isPast } from "date-fns";
import type { Equipment, Contract } from "@shared/schema";

interface AlertItem {
  id: string;
  type: "contract_expiring" | "maintenance_due" | "contract_expired";
  equipmentName: string;
  message: string;
  daysRemaining: number;
  isUrgent: boolean;
  equipment?: Equipment;
  contract?: Contract;
}

export default function Home() {
  const { data: equipment, isLoading: equipmentLoading } = useQuery<Equipment[]>({
    queryKey: ["/api/equipment"],
  });

  const { data: contracts, isLoading: contractsLoading } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
  });

  const isLoading = equipmentLoading || contractsLoading;

  // Generate alerts from contracts and equipment
  const alerts: AlertItem[] = [];

  if (contracts && equipment) {
    // Contract expiration alerts
    contracts.forEach((contract) => {
      const equip = equipment.find((e) => e.id === contract.equipmentId);
      if (!equip) return;

      const daysUntilExpiry = differenceInDays(new Date(contract.endDate), new Date());
      const isExpired = isPast(new Date(contract.endDate));

      if (isExpired) {
        alerts.push({
          id: `contract-expired-${contract.id}`,
          type: "contract_expired",
          equipmentName: equip.name,
          message: `Contract with ${contract.vendorName} has expired`,
          daysRemaining: daysUntilExpiry,
          isUrgent: true,
          equipment: equip,
          contract,
        });
      } else if (daysUntilExpiry <= contract.alertThresholdDays) {
        alerts.push({
          id: `contract-expiring-${contract.id}`,
          type: "contract_expiring",
          equipmentName: equip.name,
          message: `Contract with ${contract.vendorName} expiring soon`,
          daysRemaining: daysUntilExpiry,
          isUrgent: daysUntilExpiry <= 7,
          equipment: equip,
          contract,
        });
      }
    });

    // Maintenance due alerts
    equipment.forEach((equip) => {
      if (!equip.lastMaintenanceDate || !equip.maintenanceFrequencyDays) return;

      const nextDueDate = new Date(equip.lastMaintenanceDate);
      nextDueDate.setDate(nextDueDate.getDate() + equip.maintenanceFrequencyDays);

      const daysUntilDue = differenceInDays(nextDueDate, new Date());
      const isPastDue = daysUntilDue < 0;

      if (isPastDue || daysUntilDue <= 14) {
        alerts.push({
          id: `maintenance-due-${equip.id}`,
          type: "maintenance_due",
          equipmentName: equip.name,
          message: isPastDue
            ? "Maintenance overdue"
            : "Maintenance due soon",
          daysRemaining: daysUntilDue,
          isUrgent: isPastDue || daysUntilDue <= 3,
          equipment: equip,
        });
      }
    });
  }

  // Sort by urgency and days remaining
  alerts.sort((a, b) => {
    if (a.isUrgent !== b.isUrgent) return a.isUrgent ? -1 : 1;
    return a.daysRemaining - b.daysRemaining;
  });

  return (
    <div className="min-h-full bg-background">
      <div className="border-b bg-card px-6 py-4">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Maintenance Alerts</h1>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-warning/10 rounded-md flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-warning" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold" data-testid="text-urgent-count">
                    {alerts.filter((a) => a.isUrgent).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Urgent Alerts</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-md flex items-center justify-center flex-shrink-0">
                  <Bell className="w-6 h-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold" data-testid="text-total-alerts">
                    {alerts.length}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Alerts</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Active Alerts</h2>
            <Button variant="outline" size="sm" asChild data-testid="button-add-equipment">
              <a href="/equipment">
                <Plus className="w-4 h-4 mr-2" />
                Add Equipment
              </a>
            </Button>
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
          ) : alerts.length === 0 ? (
            <Card>
              <CardHeader className="text-center py-12">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bell className="w-8 h-8 text-muted-foreground" />
                </div>
                <CardTitle>No Active Alerts</CardTitle>
                <CardDescription className="max-w-md mx-auto">
                  You're all caught up! Add equipment and contracts to start tracking maintenance alerts.
                </CardDescription>
                <div className="pt-4">
                  <Button asChild data-testid="button-add-first-equipment">
                    <a href="/equipment">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Equipment
                    </a>
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <Card
                  key={alert.id}
                  className={`${
                    alert.isUrgent ? "border-l-4 border-l-warning" : ""
                  }`}
                  data-testid={`alert-card-${alert.id}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-base">
                            {alert.equipmentName}
                          </CardTitle>
                          {alert.isUrgent && (
                            <Badge variant="destructive" className="bg-warning text-warning-foreground">
                              Urgent
                            </Badge>
                          )}
                        </div>
                        <CardDescription>{alert.message}</CardDescription>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        {alert.daysRemaining < 0 ? (
                          <div className="text-warning text-sm font-medium">
                            Overdue
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            {alert.daysRemaining === 0
                              ? "Today"
                              : `${alert.daysRemaining} day${alert.daysRemaining !== 1 ? "s" : ""}`}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {alert.contract && (
                        <>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{format(new Date(alert.contract.endDate), "MMM d, yyyy")}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-medium">{alert.contract.vendorName}</span>
                          </div>
                        </>
                      )}
                      {alert.type === "maintenance_due" && alert.equipment?.equipmentId && (
                        <div className="flex items-center gap-1">
                          <span>ID: {alert.equipment.equipmentId}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
