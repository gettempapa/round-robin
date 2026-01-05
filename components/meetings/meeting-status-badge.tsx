"use client";

import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

type MeetingStatus = "scheduled" | "completed" | "cancelled" | "no_show" | "rescheduled";

const statusConfig: Record<MeetingStatus, {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  className: string;
  icon: React.ReactNode;
}> = {
  scheduled: {
    label: "Scheduled",
    variant: "default",
    className: "bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200",
    icon: <Clock className="h-3 w-3" />,
  },
  completed: {
    label: "Completed",
    variant: "default",
    className: "bg-green-100 text-green-800 hover:bg-green-100 border-green-200",
    icon: <CheckCircle className="h-3 w-3" />,
  },
  cancelled: {
    label: "Cancelled",
    variant: "default",
    className: "bg-gray-100 text-gray-600 hover:bg-gray-100 border-gray-200",
    icon: <XCircle className="h-3 w-3" />,
  },
  no_show: {
    label: "No Show",
    variant: "default",
    className: "bg-red-100 text-red-800 hover:bg-red-100 border-red-200",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  rescheduled: {
    label: "Rescheduled",
    variant: "default",
    className: "bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200",
    icon: <RefreshCw className="h-3 w-3" />,
  },
};

interface MeetingStatusBadgeProps {
  status: string;
  showIcon?: boolean;
}

export function MeetingStatusBadge({ status, showIcon = true }: MeetingStatusBadgeProps) {
  const config = statusConfig[status as MeetingStatus] || statusConfig.scheduled;

  return (
    <Badge variant={config.variant} className={`${config.className} gap-1`}>
      {showIcon && config.icon}
      {config.label}
    </Badge>
  );
}
