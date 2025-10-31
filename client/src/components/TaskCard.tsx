import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import { ProgressBar } from "./ProgressBar";
import { TaskStatusType, TaskStatus } from "@shared/utils";
import { formatDate } from "@/lib/dateUtils";
import { Calendar, MapPin, User } from "lucide-react";

interface TaskCardProps {
  task: {
    id: string;
    equipmentName: string;
    equipmentIdCode?: string | null;
    facilityName: string;
    locationName?: string | null;
    status: TaskStatusType | string;
    dueDate: Date | string;
    priority: string;
    assignedToUserEmail?: string | null;
    assignedToUserFirstName?: string | null;
    assignedToUserLastName?: string | null;
    checklistResult?: any;
    planChecklistJson?: any;
  };
  onViewDetails?: (taskId: string) => void;
  onMarkComplete?: (taskId: string) => void;
  className?: string;
}

export function TaskCard({ 
  task, 
  onViewDetails, 
  onMarkComplete, 
  className = "" 
}: TaskCardProps) {
  // Get border color based on status
  const getBorderColor = (status: string) => {
    switch (status) {
      case TaskStatus.OVERDUE:
        return "border-l-red-500";
      case TaskStatus.DUE_TODAY:
        return "border-l-orange-500";
      case TaskStatus.COMPLETED:
        return "border-l-green-500";
      case TaskStatus.OPEN:
        return "border-l-blue-500";
      default:
        return "border-l-muted-foreground";
    }
  };

  // Calculate checklist progress
  const getChecklistProgress = () => {
    if (!task.planChecklistJson && !task.checklistResult) return null;
    
    const checklist = task.checklistResult || task.planChecklistJson;
    if (!Array.isArray(checklist) || checklist.length === 0) return null;
    
    const completed = checklist.filter((item: any) => item.done === true).length;
    const total = checklist.length;
    return { completed, total, percentage: Math.round((completed / total) * 100) };
  };

  const progress = getChecklistProgress();
  const assignedUserName = task.assignedToUserFirstName && task.assignedToUserLastName
    ? `${task.assignedToUserFirstName} ${task.assignedToUserLastName}`
    : task.assignedToUserEmail || "Unassigned";

  return (
    <Card 
      className={`border-l-4 ${getBorderColor(task.status)} hover-elevate ${className}`}
      data-testid={`card-task-${task.id}`}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg mb-1" data-testid={`text-equipment-name-${task.id}`}>
              {task.equipmentName}
            </CardTitle>
            {task.equipmentIdCode && (
              <p className="text-sm text-muted-foreground" data-testid={`text-equipment-id-${task.id}`}>
                {task.equipmentIdCode}
              </p>
            )}
          </div>
          <StatusBadge status={task.status} id={task.id} />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Facility & Location */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 flex-shrink-0" />
          <span data-testid={`text-facility-location-${task.id}`}>
            {task.facilityName}
            {task.locationName && ` • ${task.locationName}`}
          </span>
        </div>

        {/* Due Date */}
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="font-medium">Due Date:</span>
          <span data-testid={`text-due-date-${task.id}`}>
            {formatDate(new Date(task.dueDate))}
          </span>
        </div>

        {/* Assigned To */}
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="font-medium">Assigned To:</span>
          <span data-testid={`text-assigned-user-${task.id}`}>
            {assignedUserName}
          </span>
        </div>

        {/* Progress Bar for in-progress tasks */}
        {progress && task.status !== TaskStatus.COMPLETED && (
          <div className="pt-2">
            <ProgressBar progress={progress.percentage} id={task.id} showPercentage />
            <p className="text-xs text-muted-foreground mt-1">
              {progress.completed} of {progress.total} steps completed
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between gap-2 pt-2 flex-wrap">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onViewDetails?.(task.id)}
            data-testid={`button-view-details-${task.id}`}
          >
            View Details
          </Button>
          {task.status !== TaskStatus.COMPLETED && task.status !== TaskStatus.CANCELLED && (
            <Button 
              size="sm"
              onClick={() => onMarkComplete?.(task.id)}
              data-testid={`button-mark-complete-${task.id}`}
            >
              Mark as Done
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
