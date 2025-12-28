"use client";

import { Suspense } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { CalendarConnectionCard } from "@/components/calendar-connection-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import Link from "next/link";

function SettingsPageContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    // Handle OAuth callback results
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === 'google_connected') {
      toast.success('Google Calendar connected successfully!');
    } else if (success === 'microsoft_connected') {
      toast.success('Outlook Calendar connected successfully!');
    } else if (error === 'google_auth_denied') {
      toast.error('Google Calendar connection was denied');
    } else if (error === 'microsoft_auth_denied') {
      toast.error('Outlook Calendar connection was denied');
    } else if (error === 'google_auth_failed') {
      toast.error('Failed to connect Google Calendar');
    } else if (error === 'microsoft_auth_failed') {
      toast.error('Failed to connect Outlook Calendar');
    }
  }, [searchParams]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account and calendar integrations
          </p>
        </div>

        <Tabs defaultValue="calendar" className="space-y-4">
          <TabsList>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="salesforce">Salesforce</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="space-y-4">
            <CalendarConnectionCard />
          </TabsContent>

          <TabsContent value="salesforce" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Salesforce Integration</CardTitle>
                <CardDescription>Connect your Salesforce org to sync opportunities and route leads</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-muted-foreground">
                    The Salesforce integration allows you to:
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 ml-2">
                    <li>View opportunities from Salesforce in real-time</li>
                    <li>Sync contact assignments back to Salesforce</li>
                    <li>Route Salesforce leads using RoundRobin rules</li>
                    <li>Analyze performance with Salesforce data</li>
                  </ul>
                  <div className="flex gap-2 pt-2">
                    <Button asChild>
                      <Link href="/settings/salesforce">
                        Configure Salesforce
                      </Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href="/salesforce/opportunities">
                        View Opportunities
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>Update your profile information</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Profile settings coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Configure how you receive notifications</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Notification settings coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="text-center py-12">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-3 text-xs text-muted-foreground">Loading settings...</p>
        </div>
      </DashboardLayout>
    }>
      <SettingsPageContent />
    </Suspense>
  );
}
