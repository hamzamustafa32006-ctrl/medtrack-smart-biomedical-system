import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { AlertCenter } from "./AlertCenter";

export function NotificationBell() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data } = useQuery<{ count: number }>({
    queryKey: ['/api/alerts/unread-count'],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const unreadCount = data?.count || 0;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative hover:bg-primary-foreground/10"
        onClick={() => setDrawerOpen(true)}
        data-testid="button-notification-bell"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 px-1 text-xs"
            data-testid="badge-unread-count"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      <AlertCenter open={drawerOpen} onOpenChange={setDrawerOpen} />
    </>
  );
}
