"use client";

import { Suspense } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, ExternalLink, CloudOff, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

interface ConnectionStatus {
  connected: boolean;
  username?: string;
  organizationId?: string;
}

function SalesforceSettingsPageContent() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();

  useEffect(() => {
    fetchStatus();

    // Handle OAuth callback
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (searchParams.get('success')) {
      toast.success('Successfully connected to Salesforce!');
      // Clear URL params after showing success
      window.history.replaceState({}, '', '/settings/salesforce');
    } else if (error === 'credentials_not_configured') {
      toast.error('Salesforce credentials not configured', {
        description: 'Please add SALESFORCE_CLIENT_ID and SALESFORCE_CLIENT_SECRET to your .env file'
      });
    } else if (error === 'access_denied') {
      toast.error('Access denied', {
        description: 'You denied the authorization request. Click "Connect to Salesforce" to try again.'
      });
    } else if (error === 'invalid_state' || error === 'expired_state') {
      toast.error('Session expired', {
        description: 'The authorization session expired. Please try connecting again.'
      });
    } else if (error) {
      // Show the raw error for debugging
      const errorMsg = errorDescription
        ? `${error}: ${decodeURIComponent(errorDescription)}`
        : error;

      toast.error('Failed to connect to Salesforce', {
        description: errorMsg,
        duration: 10000, // Show longer for debugging
      });
    }
  }, [searchParams]);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/salesforce/status');
      const data = await res.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    window.location.href = '/api/salesforce/auth';
  };

  const handleDisconnect = async () => {
    try {
      await fetch('/api/salesforce/disconnect', { method: 'POST' });
      toast.success('Disconnected from Salesforce');
      fetchStatus();
    } catch (error) {
      toast.error('Failed to disconnect');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Salesforce Integration
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Connect your Salesforce account to sync opportunities and data
          </p>
        </div>

        {/* Connection Status */}
        <Card>
          <CardHeader className="border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Connection Status</CardTitle>
                <CardDescription className="text-xs mt-1">
                  OAuth 2.0 integration with Salesforce
                </CardDescription>
              </div>
              {status?.connected ? (
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <CloudOff className="h-3 w-3 mr-1" />
                  Not Connected
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Checking connection...
              </div>
            ) : status?.connected ? (
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 shrink-0">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold mb-1">Connected to Salesforce</h3>
                    <div className="space-y-1 text-xs text-muted-foreground font-mono">
                      <div>User: <span className="text-foreground">{status.username}</span></div>
                      <div>Org ID: <span className="text-foreground">{status.organizationId}</span></div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/salesforce/opportunities">
                      View Opportunities
                      <ExternalLink className="h-3 w-3 ml-1.5" />
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDisconnect}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    Disconnect
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground shrink-0">
                    <XCircle className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold mb-1">Not connected</h3>
                    <p className="text-xs text-muted-foreground">
                      Connect your Salesforce account to access opportunities and sync data in real-time
                    </p>
                  </div>
                </div>

                <Button onClick={handleConnect} className="bg-[#00A1E0] hover:bg-[#0089BD]">
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M10.006 5.413a5.238 5.238 0 0 1 4.04-1.975c2.124 0 3.953 1.266 4.756 3.08a3.99 3.99 0 0 1 2.297 3.634c0 2.117-1.645 3.852-3.72 4.006-.23.017-.462.026-.695.026H8.596c-.247 0-.49-.011-.731-.032-2.021-.174-3.583-1.88-3.583-3.968 0-1.648.99-3.06 2.404-3.678.105-1.614 1.393-2.893 3.012-2.893.22 0 .435.024.643.07z"/>
                  </svg>
                  Connect to Salesforce
                </Button>

                <div className="border-t pt-4 space-y-3">
                  <div>
                    <h4 className="text-xs font-semibold mb-2 text-amber-600">Setup Required (One-Time)</h4>
                    <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                      <li>In Salesforce: Setup → Apps → App Manager → New External Client App</li>
                      <li>Enable OAuth Settings and set callback URL to: <code className="text-xs bg-muted px-1 py-0.5 rounded font-semibold">http://localhost:3000/api/salesforce/callback</code></li>
                      <li>Check "Require Proof Key for Code Exchange (PKCE)"</li>
                      <li>Add OAuth scopes: "Manage user data via APIs (api)" and "Perform requests at any time (refresh_token, offline_access)"</li>
                      <li>Set Permitted Users to "All users may self-authorize"</li>
                      <li>Copy Consumer Key/Secret to your .env file (restart server after)</li>
                    </ol>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold mb-2">Troubleshooting OAUTH_AUTHORIZATION_BLOCKED</h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Verify callback URL matches exactly (including http/https)</li>
                      <li>• Check "Permitted Users" is NOT set to "Admin approved users"</li>
                      <li>• Disable IP restrictions for development</li>
                      <li>• Ensure PKCE is enabled in Connected App settings</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Features */}
        <Card>
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="text-sm font-semibold">Integration Features</CardTitle>
            <CardDescription className="text-xs mt-1">
              What you can do with Salesforce integration
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 shrink-0">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-1">Live Opportunity Access</h3>
                  <p className="text-xs text-muted-foreground">
                    View and filter Salesforce opportunities in real-time without storing data locally
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 shrink-0">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-1">Smart Routing</h3>
                  <p className="text-xs text-muted-foreground">
                    Route Salesforce leads and contacts to your team based on rules
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 shrink-0">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-1">Bi-directional Sync</h3>
                  <p className="text-xs text-muted-foreground">
                    Sync assignments back to Salesforce automatically
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 shrink-0">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-1">Analytics</h3>
                  <p className="text-xs text-muted-foreground">
                    Track routing performance and conversion rates from Salesforce
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export default function SalesforceSettingsPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="text-center py-12">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-3 text-xs text-muted-foreground">Loading Salesforce settings...</p>
        </div>
      </DashboardLayout>
    }>
      <SalesforceSettingsPageContent />
    </Suspense>
  );
}
