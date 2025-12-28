"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

type CalendarSyncStatus = {
  connected: boolean;
  provider?: 'google' | 'microsoft';
  email?: string;
  lastSyncAt?: string;
  lastError?: string;
};

export function CalendarConnectionCard() {
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<CalendarSyncStatus | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // TODO: Get actual user ID from auth context/session
  // For now, using Sarah Johnson's ID as the "shared calendar" for all reps
  const userId = "cmjp5xpi20000fsl3ifqa7fug"; // Sarah Johnson - shared calendar for testing

  useEffect(() => {
    fetchSyncStatus();
  }, []);

  const fetchSyncStatus = async () => {
    try {
      const response = await fetch(`/api/calendar/status?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setSyncStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch sync status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectGoogle = () => {
    setConnecting(true);
    window.location.href = `/api/auth/google/connect?userId=${userId}`;
  };

  const handleConnectMicrosoft = () => {
    setConnecting(true);
    window.location.href = `/api/auth/microsoft/connect?userId=${userId}`;
  };

  const handleDisconnect = async () => {
    if (
      !confirm(
        'Are you sure you want to disconnect your calendar? You will stop receiving bookings.'
      )
    ) {
      return;
    }

    setDisconnecting(true);
    try {
      const response = await fetch('/api/calendar/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        toast.success('Calendar disconnected');
        setSyncStatus({ connected: false });
      } else {
        toast.error('Failed to disconnect calendar');
      }
    } catch (error) {
      toast.error('Failed to disconnect calendar');
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Calendar Integration
            </CardTitle>
            <CardDescription>
              Connect your calendar to enable automatic booking and availability checking
            </CardDescription>
          </div>
          {syncStatus?.connected && (
            <Badge variant="default" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Connected
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {syncStatus?.connected ? (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Provider:</span>
                  <Badge variant="outline">
                    {syncStatus.provider === 'google' ? 'Google Calendar' : 'Outlook Calendar'}
                  </Badge>
                </div>
                {syncStatus.email && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Account:</span>
                    <span className="text-sm text-muted-foreground">{syncStatus.email}</span>
                  </div>
                )}
                {syncStatus.lastSyncAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Last synced:</span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(syncStatus.lastSyncAt).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {syncStatus.lastError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-900">Sync Error</p>
                    <p className="text-sm text-red-700">{syncStatus.lastError}</p>
                  </div>
                </div>
              </div>
            )}

            <Button
              variant="destructive"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="w-full"
            >
              {disconnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                'Disconnect Calendar'
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-900">Calendar Required</p>
                  <p className="text-sm text-yellow-700">
                    You must connect a calendar to receive bookings. This ensures meetings are only
                    scheduled when you're available.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Choose a calendar to connect:</p>

              <Button
                variant="outline"
                onClick={handleConnectGoogle}
                disabled={connecting}
                className="w-full justify-start"
              >
                {connecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Connect Google Calendar
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={handleConnectMicrosoft}
                disabled={connecting}
                className="w-full justify-start"
              >
                {connecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path fill="#f25022" d="M0 0h11v11H0z" />
                      <path fill="#00a4ef" d="M13 0h11v11H13z" />
                      <path fill="#7fba00" d="M0 13h11v11H0z" />
                      <path fill="#ffb900" d="M13 13h11v11H13z" />
                    </svg>
                    Connect Outlook Calendar
                  </>
                )}
              </Button>
            </div>

            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="text-xs text-muted-foreground">
                <strong>Note:</strong> You'll need to set up OAuth credentials first. See the
                documentation in <code>docs/GOOGLE_OAUTH_SETUP.md</code> or{' '}
                <code>docs/MICROSOFT_OAUTH_SETUP.md</code> for instructions.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
