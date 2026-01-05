"use client";

import { formatDistanceToNow, format } from "date-fns";
import {
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Bell,
  Clock,
  FileText,
  RefreshCw,
  Target,
} from "lucide-react";

interface TimelineEvent {
  id: string;
  eventType: string;
  description: string;
  previousValue?: string | null;
  newValue?: string | null;
  performedBy?: string | null;
  createdAt: string;
  reminderStatus?: string;
  scheduledFor?: string;
}

interface MeetingTimelineProps {
  events: TimelineEvent[];
}

const eventIcons: Record<string, React.ReactNode> = {
  created: <Calendar className="h-4 w-4" />,
  status_changed: <RefreshCw className="h-4 w-4" />,
  rescheduled: <Clock className="h-4 w-4" />,
  reminder_sent: <Bell className="h-4 w-4" />,
  reminder: <Bell className="h-4 w-4" />,
  note_added: <FileText className="h-4 w-4" />,
  outcome_set: <Target className="h-4 w-4" />,
};

const eventColors: Record<string, string> = {
  created: "bg-blue-100 text-blue-600",
  status_changed: "bg-amber-100 text-amber-600",
  rescheduled: "bg-blue-100 text-blue-600",
  reminder_sent: "bg-green-100 text-green-600",
  reminder: "bg-gray-100 text-gray-600",
  note_added: "bg-indigo-100 text-indigo-600",
  outcome_set: "bg-emerald-100 text-emerald-600",
};

export function MeetingTimeline({ events }: MeetingTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No events recorded yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event, index) => {
        const icon = eventIcons[event.eventType] || <Calendar className="h-4 w-4" />;
        const colorClass = eventColors[event.eventType] || "bg-gray-100 text-gray-600";

        return (
          <div key={event.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`p-2 rounded-full ${colorClass}`}>
                {icon}
              </div>
              {index < events.length - 1 && (
                <div className="w-px h-full bg-border mt-2" />
              )}
            </div>
            <div className="flex-1 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-sm">{event.description}</p>
                  {event.eventType === "reminder" && event.reminderStatus === "pending" && event.scheduledFor && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Scheduled for {format(new Date(event.scheduledFor), "MMM d, h:mm a")}
                    </p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                  {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
