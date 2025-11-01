// Reference: javascript_log_in_with_replit blueprint
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { useAuth } from "@/hooks/useAuth";
import { NotificationBell } from "@/components/NotificationBell";
import { useAlertNotifications } from "@/hooks/use-alert-notifications.tsx";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import Alerts from "@/pages/alerts";
import Tasks from "@/pages/tasks";
import Facilities from "@/pages/facilities";
import Equipment from "@/pages/equipment";
import Maintenance from "@/pages/maintenance";
import History from "@/pages/history";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Landing />;
  }

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/alerts" component={Alerts} />
      <Route path="/tasks" component={Tasks} />
      <Route path="/facilities" component={Facilities} />
      <Route path="/equipment" component={Equipment} />
      <Route path="/maintenance" component={Maintenance} />
      <Route path="/history" component={History} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  const { isAuthenticated, isLoading } = useAuth();
  
  // Enable alert notifications polling only when authenticated
  useAlertNotifications(isAuthenticated);
  
  // Custom sidebar width for better mobile and desktop experience
  const sidebarStyle = {
    "--sidebar-width": "16rem",       // 256px for good content display
    "--sidebar-width-icon": "4rem",   // 64px for icon-only mode
  } as React.CSSProperties;

  if (isLoading || !isAuthenticated) {
    return (
      <>
        <Toaster />
        <Router />
      </>
    );
  }

  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-2 border-b gap-2">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <NotificationBell />
          </header>
          <main className="flex-1 overflow-auto pb-16 md:pb-0">
            <Toaster />
            <Router />
          </main>
          <BottomNav />
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthenticatedApp />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
