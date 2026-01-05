"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MeetingStatusBadge } from "./meeting-status-badge";
import { MeetingTimeline } from "./meeting-timeline";
import {
  Calendar,
  Clock,
  Video,
  Mail,
  Phone,
  Building,
  User,
  ExternalLink,
  FileText,
} from "lucide-react";
import { format } from "date-fns";

interface Meeting {
  id: string;
  scheduledAt: string;
  duration: number;
  status: string;
  notes: string | null;
  conferenceLink: string | null;
  recordingLink: string | null;
  cancellationReason: string | null;
  contact: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    jobTitle: string | null;
  };
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
  meetingType: {
    id: string;
    name: string;
    color: string | null;
  } | null;
  outcome: {
    id: string;
    name: string;
    isPositive: boolean;
  } | null;
  originalBooking: {
    id: string;
    scheduledAt: string;
    status: string;
  } | null;
  rescheduledBookings: Array<{
    id: string;
    scheduledAt: string;
    status: string;
  }>;
  reminders: Array<{
    id: string;
    status: string;
    scheduledFor: string;
    sentAt: string | null;
    reminderConfig: {
      name: string;
    };
  }>;
  events: Array<{
    id: string;
    eventType: string;
    description: string;
    previousValue: string | null;
    newValue: string | null;
    createdAt: string;
  }>;
}

interface MeetingDetailDialogProps {
  meetingId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (meetingId: string, status: string) => void;
  onReschedule: (meetingId: string) => void;
  onSetOutcome: (meetingId: string) => void;
}

export function MeetingDetailDialog({
  meetingId,
  open,
  onOpenChange,
  onStatusChange,
  onReschedule,
  onSetOutcome,
}: MeetingDetailDialogProps) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (meetingId && open) {
      setLoading(true);
      fetch(`/api/bookings/${meetingId}`)
        .then((res) => res.json())
        .then((data) => {
          setMeeting(data.booking);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [meetingId, open]);

  if (!meeting && !loading) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl font-bold">
                {loading ? "Loading..." : `Meeting with ${meeting?.contact.name}`}
              </DialogTitle>
              <DialogDescription>
                {meeting && (
                  <span className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(meeting.scheduledAt), "EEEE, MMMM d, yyyy 'at' h:mm a")}
                  </span>
                )}
              </DialogDescription>
            </div>
            {meeting && <MeetingStatusBadge status={meeting.status} />}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="py-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : meeting ? (
          <Tabs defaultValue="details" className="mt-4">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-6 mt-4">
              {/* Meeting Info */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Meeting Info
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{meeting.duration} minutes</span>
                    </div>
                    {meeting.meetingType && (
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span>{meeting.meetingType.name}</span>
                      </div>
                    )}
                    {meeting.conferenceLink && (
                      <div className="flex items-center gap-2">
                        <Video className="h-4 w-4 text-muted-foreground" />
                        <a
                          href={meeting.conferenceLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          Join Meeting
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                    {meeting.outcome && (
                      <div className="flex items-center gap-2">
                        <Badge variant={meeting.outcome.isPositive ? "default" : "secondary"}>
                          Outcome: {meeting.outcome.name}
                        </Badge>
                      </div>
                    )}
                    {meeting.cancellationReason && (
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Cancellation reason:</span>{" "}
                        {meeting.cancellationReason}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Assigned To
                  </h3>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      {meeting.user.avatar ? (
                        <img src={meeting.user.avatar} alt={meeting.user.name} />
                      ) : (
                        <div className="bg-primary text-primary-foreground flex items-center justify-center h-full w-full">
                          {meeting.user.name.charAt(0)}
                        </div>
                      )}
                    </Avatar>
                    <div>
                      <p className="font-medium">{meeting.user.name}</p>
                      <p className="text-sm text-muted-foreground">{meeting.user.email}</p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Contact Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Contact Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{meeting.contact.name}</p>
                      {meeting.contact.jobTitle && (
                        <p className="text-sm text-muted-foreground">{meeting.contact.jobTitle}</p>
                      )}
                    </div>
                  </div>
                  {meeting.contact.company && (
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span>{meeting.contact.company}</span>
                    </div>
                  )}
                  {meeting.contact.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={`mailto:${meeting.contact.email}`}
                        className="text-primary hover:underline"
                      >
                        {meeting.contact.email}
                      </a>
                    </div>
                  )}
                  {meeting.contact.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{meeting.contact.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {meeting.notes && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      Notes
                    </h3>
                    <p className="text-sm whitespace-pre-wrap">{meeting.notes}</p>
                  </div>
                </>
              )}

              {/* Reminders */}
              {meeting.reminders.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      Reminders
                    </h3>
                    <div className="space-y-2">
                      {meeting.reminders.map((reminder) => (
                        <div
                          key={reminder.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span>{reminder.reminderConfig.name}</span>
                          <Badge
                            variant={
                              reminder.status === "sent"
                                ? "default"
                                : reminder.status === "pending"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {reminder.status === "sent"
                              ? `Sent ${format(new Date(reminder.sentAt!), "MMM d, h:mm a")}`
                              : reminder.status === "pending"
                              ? `Scheduled for ${format(new Date(reminder.scheduledFor), "MMM d, h:mm a")}`
                              : reminder.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Actions */}
              <Separator />
              <div className="flex gap-2 flex-wrap">
                {meeting.status === "scheduled" && (
                  <>
                    <Button onClick={() => onStatusChange(meeting.id, "completed")}>
                      Mark as Completed
                    </Button>
                    <Button variant="outline" onClick={() => onReschedule(meeting.id)}>
                      Reschedule
                    </Button>
                    <Button variant="outline" onClick={() => onStatusChange(meeting.id, "no_show")}>
                      Mark as No Show
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => onStatusChange(meeting.id, "cancelled")}
                    >
                      Cancel
                    </Button>
                  </>
                )}
                {meeting.status === "completed" && !meeting.outcome && (
                  <Button onClick={() => onSetOutcome(meeting.id)}>Set Outcome</Button>
                )}
              </div>
            </TabsContent>

            <TabsContent value="timeline" className="mt-4">
              <MeetingTimeline events={meeting.events} />
            </TabsContent>
          </Tabs>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
