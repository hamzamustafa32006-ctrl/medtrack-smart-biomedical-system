import { useQuery } from "@tanstack/react-query";
import type { Equipment } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  color: string;
  equipment: Equipment[];
}

function Section({ title, icon, color, equipment }: SectionProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h2 className={`text-lg font-semibold ${color}`}>{title}</h2>
        <span className="text-sm text-muted-foreground">({equipment.length})</span>
      </div>
      
      {equipment.length === 0 ? (
        <p className="text-sm text-muted-foreground">No equipment in this category</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {equipment.map((item) => (
            <Card
              key={item.id}
              className="p-4 hover-elevate transition-all"
              data-testid={`equipment-card-${item.id}`}
            >
              <h3 className="font-semibold text-foreground mb-1">{item.name}</h3>
              <p className="text-sm text-muted-foreground">{item.type}</p>
              {item.model && (
                <p className="text-xs text-muted-foreground mt-1">{item.model}</p>
              )}
              
              <div className="mt-3 pt-3 border-t space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Facility:</span>
                  <span className="text-foreground font-medium">{item.facilityName || "—"}</span>
                </div>
                {item.department && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Department:</span>
                    <span className="text-foreground font-medium">{item.department}</span>
                  </div>
                )}
                {item.lastMaintenanceDate && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Last Maintenance:</span>
                    <span className="text-foreground font-medium">
                      {new Date(item.lastMaintenanceDate).toLocaleDateString('en-GB')}
                    </span>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function EquipmentStatusPage() {
  const { data: equipment = [], isLoading } = useQuery<Equipment[]>({
    queryKey: ["/api/equipment"],
  });

  const goodEquipment = equipment.filter(e => e.status === "Active" || e.status === "Good");
  const needsMaintenanceEquipment = equipment.filter(
    e => e.status === "Needs Maintenance" || e.status === "Under Maintenance" || e.status === "Pending Inspection"
  );
  const notWorkingEquipment = equipment.filter(
    e => e.status === "Not Working" || e.status === "Out of Service"
  );

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6 space-y-8">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-6">
          <Skeleton className="h-6 w-64" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Equipment Status</h1>
        <p className="text-muted-foreground mt-1">
          Comprehensive view of all equipment categorized by operational status
        </p>
      </div>

      {/* 🟢 Good Equipment */}
      <Section
        title="Good Equipment"
        icon={<CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />}
        color="text-green-600 dark:text-green-400"
        equipment={goodEquipment}
      />

      {/* 🟡 Needs Maintenance */}
      <Section
        title="Equipment Needs Maintenance"
        icon={<AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />}
        color="text-orange-600 dark:text-orange-400"
        equipment={needsMaintenanceEquipment}
      />

      {/* 🔴 Not Working */}
      <Section
        title="Not Working Equipment"
        icon={<XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />}
        color="text-red-600 dark:text-red-400"
        equipment={notWorkingEquipment}
      />
    </div>
  );
}
