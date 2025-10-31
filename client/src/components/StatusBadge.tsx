import { Badge } from "@/components/ui/badge";
import { TaskStatusType, TaskStatus } from "@shared/utils";

interface StatusBadgeProps {
  status: TaskStatusType | string;
  id: string; // Required for unique test IDs
  className?: string;
}

export function StatusBadge({ status, id, className = "" }: StatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case TaskStatus.COMPLETED:
        return {
          label: "Completed",
          variant: "default" as const,
          className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-green-300 dark:border-green-700",
        };
      case TaskStatus.OVERDUE:
        return {
          label: "Overdue",
          variant: "destructive" as const,
          className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 border-red-300 dark:border-red-700",
        };
      case TaskStatus.DUE_TODAY:
        return {
          label: "Due Today",
          variant: "default" as const,
          className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700",
        };
      case TaskStatus.OPEN:
        return {
          label: "Open",
          variant: "outline" as const,
          className: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-blue-300 dark:border-blue-700",
        };
      case TaskStatus.CANCELLED:
        return {
          label: "Cancelled",
          variant: "secondary" as const,
          className: "",
        };
      default:
        return {
          label: status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " "),
          variant: "outline" as const,
          className: "",
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge 
      variant={config.variant} 
      className={`${config.className} ${className}`}
      data-testid={`badge-status-${status}-${id}`}
    >
      {config.label}
    </Badge>
  );
}
