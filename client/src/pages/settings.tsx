import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, User, Bell, Info } from "lucide-react";

export default function Settings() {
  const { user } = useAuth();

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  return (
    <div className="min-h-full bg-background">
      <div className="border-b bg-card px-6 py-4">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Settings</h1>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Profile Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={user?.profileImageUrl || undefined} alt="Profile" />
                <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium text-lg" data-testid="text-user-name">
                  {user?.firstName && user?.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : "User"}
                </p>
                {user?.email && (
                  <p className="text-sm text-muted-foreground" data-testid="text-user-email">
                    {user.email}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* App Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>About</CardTitle>
            <CardDescription>Application information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-10 h-10 bg-primary/10 rounded-md flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Maintenance Alert</p>
                <p className="text-muted-foreground">Version 1.0.0 (MVP)</p>
              </div>
            </div>
            <div className="text-sm text-muted-foreground pt-2 border-t">
              <p>
                Professional maintenance tracking for engineers in hospital and industrial environments.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-4">
          <Button
            variant="destructive"
            className="w-full"
            asChild
            data-testid="button-logout-settings"
          >
            <a href="/api/logout">
              <LogOut className="w-4 h-4 mr-2" />
              Log Out
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
