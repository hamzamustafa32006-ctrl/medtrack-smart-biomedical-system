interface ProgressBarProps {
  progress: number; // 0-100
  id: string; // Required for unique test IDs
  className?: string;
  showPercentage?: boolean;
}

export function ProgressBar({ 
  progress, 
  id,
  className = "", 
  showPercentage = false 
}: ProgressBarProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className={`space-y-1 ${className}`}>
      {showPercentage && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Progress</span>
          <span>{clampedProgress}%</span>
        </div>
      )}
      <div 
        className="w-full bg-muted rounded-full h-2" 
        data-testid={`progress-bar-container-${id}`}
      >
        <div
          className="bg-primary h-2 rounded-full transition-all duration-300"
          style={{ width: `${clampedProgress}%` }}
          data-testid={`progress-bar-fill-${id}`}
        />
      </div>
    </div>
  );
}
