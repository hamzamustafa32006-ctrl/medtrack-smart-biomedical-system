import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Home, AlertTriangle, ClipboardList, History, Settings, Building2, CheckSquare, Bell, ChevronDown, User, MoreHorizontal, BarChart3, Wrench, Activity } from "lucide-react";

const mainNavItems = [
  { path: "/", icon: Home, label: "Home", testId: "link-home-main" },
  { path: "/dashboard", icon: BarChart3, label: "Analytics", testId: "link-analytics-main" },
  { path: "/equipment", icon: ClipboardList, label: "Equipment", testId: "link-equipment-main" },
  { path: "/maintenance", icon: Wrench, label: "Maintenance", testId: "link-maintenance-main" },
];

const secondaryNavItems = [
  { path: "/equipment-status", icon: Activity, label: "Equipment Status", testId: "link-equipment-status-more" },
  { path: "/tasks", icon: CheckSquare, label: "Schedules", testId: "link-schedules-more" },
  { path: "/facilities", icon: Building2, label: "Facilities", testId: "link-facilities-more" },
  { path: "/history", icon: History, label: "Reports", testId: "link-reports-more" },
  { path: "/settings", icon: Settings, label: "Settings", testId: "link-settings-more" },
];

const userNavItems = [
  { path: "/alerts", icon: AlertTriangle, label: "Alerts", testId: "link-alerts-user" },
];

export function AppSidebar() {
  const [location] = useLocation();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-sidebar-primary rounded-md flex items-center justify-center">
            <Bell className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <h2 className="font-bold text-sidebar-foreground">MedTrack</h2>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="flex flex-col">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.path;
                
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild isActive={isActive} data-testid={item.testId}>
                      <Link href={item.path}>
                        <Icon className="w-5 h-5" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Secondary Navigation (Collapsible) */}
        <SidebarGroup>
          <Collapsible open={isMoreOpen} onOpenChange={setIsMoreOpen}>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer hover-elevate active-elevate-2 rounded-md flex items-center justify-between" data-testid="button-more-toggle">
                <div className="flex items-center gap-2">
                  <MoreHorizontal className="w-4 h-4" />
                  <span>More</span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${isMoreOpen ? "rotate-180" : ""}`} />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {secondaryNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location === item.path;
                    
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton asChild isActive={isActive} data-testid={item.testId}>
                          <Link href={item.path}>
                            <Icon className="w-5 h-5" />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>
      </SidebarContent>

      {/* User Area at Bottom */}
      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          {userNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            
            return (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton asChild isActive={isActive} data-testid={item.testId}>
                  <Link href={item.path}>
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
