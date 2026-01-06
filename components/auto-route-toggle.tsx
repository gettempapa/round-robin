"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { toast } from "sonner";

type AutoRouteStatus = {
  lastRun: Date | null;
  lastResult: {
    checked: number;
    routed: number;
    error?: string;
  } | null;
  isRunning: boolean;
};

export function AutoRouteToggle() {
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState<AutoRouteStatus>({
    lastRun: null,
    lastResult: null,
    isRunning: false,
  });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load enabled state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("autoRouteEnabled");
    if (saved === "true") {
      setEnabled(true);
    }
  }, []);

  // Run auto-route check
  const runAutoRoute = useCallback(async () => {
    if (status.isRunning) return;

    setStatus((s) => ({ ...s, isRunning: true }));

    try {
      const response = await fetch("/api/rules/auto-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queueName: "RevOps Queue" }),
      });

      const data = await response.json();

      setStatus({
        lastRun: new Date(),
        lastResult: {
          checked: data.checked || 0,
          routed: data.routed || 0,
          error: data.error,
        },
        isRunning: false,
      });

      if (data.routed > 0) {
        toast.success(`Routed ${data.routed} lead${data.routed > 1 ? "s" : ""}`, {
          description: data.results
            ?.slice(0, 3)
            .map((r: any) => `${r.leadName} → ${r.assignedTo}`)
            .join(", "),
        });
      }
    } catch (error) {
      setStatus((s) => ({
        ...s,
        isRunning: false,
        lastResult: {
          checked: 0,
          routed: 0,
          error: error instanceof Error ? error.message : "Failed to run",
        },
      }));
    }
  }, [status.isRunning]);

  // Set up interval when enabled
  useEffect(() => {
    if (enabled) {
      // Run immediately when enabled
      runAutoRoute();

      // Then run every 60 seconds (1 minute)
      intervalRef.current = setInterval(() => {
        runAutoRoute();
      }, 60000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled]); // Don't include runAutoRoute - it causes interval to reset

  // Handle toggle
  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    localStorage.setItem("autoRouteEnabled", checked.toString());

    if (checked) {
      toast.info("Auto-routing enabled", {
        description: "Checking for leads in RevOps Queue every minute",
      });
    } else {
      toast.info("Auto-routing disabled");
    }
  };

  // Format time ago
  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg border">
      <div className="flex items-center gap-2">
        <Switch
          id="auto-route"
          checked={enabled}
          onCheckedChange={handleToggle}
        />
        <Label htmlFor="auto-route" className="text-sm font-medium cursor-pointer">
          Auto-route from RevOps Queue
        </Label>
      </div>

      {enabled && (
        <>
          <div className="h-4 w-px bg-border" />

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {status.isRunning ? (
              <>
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>Checking...</span>
              </>
            ) : status.lastResult?.error ? (
              <>
                <AlertCircle className="h-3 w-3 text-red-500" />
                <span title={status.lastResult.error}>Error</span>
              </>
            ) : status.lastRun ? (
              <>
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                <span title={`Checked ${status.lastResult?.checked || 0}, Routed ${status.lastResult?.routed || 0}`}>
                  {formatTimeAgo(status.lastRun)}
                </span>
              </>
            ) : (
              <>
                <Clock className="h-3 w-3" />
                <span>Waiting...</span>
              </>
            )}
          </div>

          {status.lastResult && !status.lastResult.error && (
            <Badge variant="secondary" className="text-xs">
              {status.lastResult.checked} in queue
            </Badge>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={runAutoRoute}
            disabled={status.isRunning}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${status.isRunning ? "animate-spin" : ""}`} />
            Run Now
          </Button>
        </>
      )}
    </div>
  );
}
