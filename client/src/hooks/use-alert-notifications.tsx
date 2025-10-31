import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { AlertTriangle, Clock, Info } from 'lucide-react';

interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  createdAt: string;
}

export function useAlertNotifications(isAuthenticated: boolean) {
  const seenAlertIds = useRef<Set<string>>(new Set());
  const isFirstFetch = useRef(true);
  const wasAuthenticated = useRef(false);

  const { data: alerts } = useQuery<Alert[]>({
    queryKey: ['/api/alerts', 'notifications'],
    enabled: isAuthenticated,
    queryFn: async () => {
      const response = await fetch('/api/alerts?status=open');
      if (!response.ok) return [];
      return response.json();
    },
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (!isAuthenticated && wasAuthenticated.current) {
      seenAlertIds.current.clear();
      isFirstFetch.current = true;
      wasAuthenticated.current = false;
      return;
    }

    if (!isAuthenticated) {
      return;
    }

    wasAuthenticated.current = true;

    if (!alerts || alerts.length === 0) return;

    if (isFirstFetch.current) {
      alerts.forEach((alert) => seenAlertIds.current.add(alert.id));
      isFirstFetch.current = false;
      return;
    }

    const newAlerts = alerts.filter((alert) => !seenAlertIds.current.has(alert.id));

    newAlerts.forEach((alert) => {
      seenAlertIds.current.add(alert.id);

      const severityConfig = {
        critical: {
          icon: AlertTriangle,
          iconClass: 'text-destructive',
          variant: 'destructive' as const,
          duration: null,
        },
        warning: {
          icon: Clock,
          iconClass: 'text-accent-foreground',
          variant: 'default' as const,
          duration: 5000,
        },
        info: {
          icon: Info,
          iconClass: 'text-blue-600 dark:text-blue-400',
          variant: 'default' as const,
          duration: 5000,
        },
      };

      const config = severityConfig[alert.severity];
      const Icon = config.icon;

      const titleContent = (
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${config.iconClass}`} />
          <span>{alert.title}</span>
        </div>
      );

      const { dismiss } = toast({
        title: titleContent as any,
        description: alert.message,
        variant: config.variant,
      });

      if (config.duration) {
        setTimeout(() => {
          dismiss();
        }, config.duration);
      }
    });
  }, [isAuthenticated, alerts]);
}
