import { CheckCircle2, Clock } from "lucide-react";

interface ChecklistItemProps {
  text: string;
  done: boolean;
  id: string; // Required - must be fully qualified unique ID (e.g., `${taskId}-${index}`)
  className?: string;
}

export function ChecklistItem({ 
  text, 
  done, 
  id, 
  className = "" 
}: ChecklistItemProps) {
  const testId = `checklist-item-${done ? 'done' : 'pending'}-${id}`;

  return (
    <li className={`flex items-center gap-2 ${className}`} data-testid={testId}>
      {done ? (
        <CheckCircle2 className="h-5 w-5 text-green-500 dark:text-green-400 flex-shrink-0" data-testid={`icon-done-${id}`} />
      ) : (
        <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0" data-testid={`icon-pending-${id}`} />
      )}
      <span className={done ? "line-through text-muted-foreground" : ""}>
        {text}
      </span>
    </li>
  );
}
