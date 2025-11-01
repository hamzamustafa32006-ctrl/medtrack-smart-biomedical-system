import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Equipment } from "@shared/schema";
import { formatDate } from "@/lib/dateUtils";
import { AlertTriangle, AlertCircle, CheckCircle2, Package } from "lucide-react";

type OverviewData = {
  critical: { count: number; items: Equipment[] };
  medium: { count: number; items: Equipment[] };
  good: { count: number; items: Equipment[] };
};

function StatusBadge({ statusColor }: { statusColor?: string | null }) {
  if (!statusColor) return null;
  
  const colors = {
    red: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    orange: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    green: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  };
  
  return (
    <Badge variant="outline" className={`text-xs ${colors[statusColor as keyof typeof colors] || ''}`}>
      {statusColor}
    </Badge>
  );
}

function EquipmentItem({ equipment }: { equipment: Equipment }) {
  return (
    <div className="px-4 py-3 hover-elevate border-b last:border-b-0" data-testid={`equipment-item-${equipment.id}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="font-medium text-sm">{equipment.name}</div>
          <div className="text-xs text-muted-foreground mt-1 space-x-2">
            {equipment.equipmentId && <span>ID: {equipment.equipmentId}</span>}
            {equipment.type && <span>• {equipment.type}</span>}
            {equipment.manufacturer && <span>• {equipment.manufacturer}</span>}
          </div>
          {equipment.nextDueDate && (
            <div className="text-xs text-muted-foreground mt-1">
              Next Due: {formatDate(new Date(equipment.nextDueDate))}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusBadge statusColor={equipment.statusColor} />
          {equipment.isOverdue && (
            <Badge variant="destructive" className="text-xs">Overdue</Badge>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusSection({ 
  title, 
  items, 
  count,
  icon: Icon,
  colorClass 
}: { 
  title: string; 
  items: Equipment[]; 
  count: number;
  icon: any;
  colorClass: string;
}) {
  return (
    <Card className="overflow-hidden">
      <div className={`px-4 py-3 border-b ${colorClass} flex items-center gap-2`}>
        <Icon className="w-4 h-4" />
        <h3 className="font-semibold text-sm">
          {title} ({count})
        </h3>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {items.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No equipment in this category</p>
          </div>
        ) : (
          <div data-testid={`list-${title.toLowerCase()}`}>
            {items.map((equipment) => (
              <EquipmentItem key={equipment.id} equipment={equipment} />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

export default function EquipmentStatusLists() {
  const { data, isLoading } = useQuery<OverviewData>({
    queryKey: ["/api/equipment-alerts/overview"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" data-testid="loading-lists">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-64 w-full" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" data-testid="status-lists">
      <StatusSection
        title="Critical"
        items={data?.critical.items || []}
        count={data?.critical.count || 0}
        icon={AlertTriangle}
        colorClass="bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-900"
      />
      <StatusSection
        title="Medium"
        items={data?.medium.items || []}
        count={data?.medium.count || 0}
        icon={AlertCircle}
        colorClass="bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-900"
      />
      <StatusSection
        title="Good"
        items={data?.good.items || []}
        count={data?.good.count || 0}
        icon={CheckCircle2}
        colorClass="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-900"
      />
    </div>
  );
}
