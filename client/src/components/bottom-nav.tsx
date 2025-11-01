import { Link, useLocation } from "wouter";
import { Home, ClipboardList, CheckSquare, BarChart3 } from "lucide-react";

const navItems = [
  { path: "/", icon: Home, label: "Home", testId: "link-home-mobile" },
  { path: "/dashboard", icon: BarChart3, label: "Analytics", testId: "link-analytics-mobile" },
  { path: "/equipment", icon: ClipboardList, label: "Equipment", testId: "link-equipment-mobile" },
  { path: "/tasks", icon: CheckSquare, label: "Tasks", testId: "link-tasks-mobile" },
];

export function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-card-border md:hidden z-50">
      <div className="grid grid-cols-4 h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          
          return (
            <Link key={item.path} href={item.path}>
              <div
                data-testid={item.testId}
                className={`
                  flex flex-col items-center justify-center h-full gap-1
                  hover-elevate active-elevate-2 cursor-pointer
                  ${isActive ? "text-primary" : "text-muted-foreground"}
                `}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
