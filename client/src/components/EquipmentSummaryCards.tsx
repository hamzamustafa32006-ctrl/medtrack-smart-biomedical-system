import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type SummaryData = {
  critical: number;
  medium: number;
  good: number;
};

function SummaryCard({ 
  title, 
  value, 
  icon: Icon,
  colorClass,
  iconColorClass
}: { 
  title: string; 
  value: number; 
  icon: any;
  colorClass: string;
  iconColorClass: string;
}) {
  return (
    <Card className={`p-4 ${colorClass}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <h3 className="text-3xl font-bold mt-2" data-testid={`count-${title.toLowerCase()}`}>
            {value}
          </h3>
        </div>
        <div className={`p-3 rounded-full ${iconColorClass}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </Card>
  );
}

export default function EquipmentSummaryCards() {
  const { data, isLoading } = useQuery<SummaryData>({
    queryKey: ["/api/equipment-alerts/summary"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" data-testid="loading-summary">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-20 w-full" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" data-testid="summary-cards">
      <SummaryCard
        title="Critical"
        value={data?.critical || 0}
        icon={AlertTriangle}
        colorClass="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950"
        iconColorClass="bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300"
      />
      <SummaryCard
        title="Medium"
        value={data?.medium || 0}
        icon={AlertCircle}
        colorClass="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950"
        iconColorClass="bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300"
      />
      <SummaryCard
        title="Good"
        value={data?.good || 0}
        icon={CheckCircle2}
        colorClass="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950"
        iconColorClass="bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300"
      />
    </div>
  );
}
