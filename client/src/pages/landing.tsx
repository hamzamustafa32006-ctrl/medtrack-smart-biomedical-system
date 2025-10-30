import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, ClipboardList, FileText, Shield } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Maintenance Alert</h1>
          </div>
          <Button asChild data-testid="button-login">
            <a href="/api/login">Log In</a>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground">
            Never Miss Critical Maintenance Again
          </h2>
          <p className="text-lg text-muted-foreground">
            Professional maintenance tracking for engineers in hospital and industrial environments.
            Stay ahead of equipment servicing and contract renewals.
          </p>
          <div className="pt-4">
            <Button size="lg" asChild data-testid="button-get-started">
              <a href="/api/login">Get Started</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="space-y-2">
              <div className="w-12 h-12 bg-warning/10 rounded-md flex items-center justify-center">
                <Bell className="w-6 h-6 text-warning" />
              </div>
              <CardTitle className="text-lg">Smart Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Automatic notifications for upcoming maintenance and expiring contracts.
                Never miss a deadline.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-2">
              <div className="w-12 h-12 bg-primary/10 rounded-md flex items-center justify-center">
                <ClipboardList className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Equipment Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Organize and monitor all your equipment in one place.
                Track maintenance schedules and frequencies.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-2">
              <div className="w-12 h-12 bg-primary/10 rounded-md flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Contract Management</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Keep vendor contracts organized with automatic expiration warnings.
                Maintain compliance effortlessly.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-2">
              <div className="w-12 h-12 bg-primary/10 rounded-md flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Complete History</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Full maintenance record history for audits and compliance.
                Track who did what and when.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <Card className="bg-primary text-primary-foreground border-primary-border">
          <CardHeader className="text-center space-y-4">
            <CardTitle className="text-2xl md:text-3xl">
              Ready to streamline your maintenance workflow?
            </CardTitle>
            <CardDescription className="text-primary-foreground/80 text-base">
              Join engineers who trust Maintenance Alert for critical equipment tracking.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-8">
            <Button size="lg" variant="secondary" asChild data-testid="button-cta-login">
              <a href="/api/login">Log In to Continue</a>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
