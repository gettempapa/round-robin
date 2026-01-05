"use client";

import { useState, useEffect, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MeetingStatusBadge } from "@/components/meetings/meeting-status-badge";
import { MeetingTimeline } from "@/components/meetings/meeting-timeline";
import { CancellationDialog } from "@/components/meetings/cancellation-dialog";
import { MeetingOutcomeDialog } from "@/components/meetings/meeting-outcome-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Video,
  Mail,
  Phone,
  Building,
  User,
  ExternalLink,
  FileText,
  RefreshCw,
} from "lucide-react";

interface Meeting {
  id: string;
  scheduledAt: string;
  duration: number;
  status: string;
  notes: string | null;
  conferenceLink: string | null;
  recordingLink: string | null;
  cancellationReason: string | null;
  salesforceEventId: string | null;
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

export default function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const action = searchParams.get("action");

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [cancellationDialogOpen, setCancellationDialogOpen] = useState(false);
  const [outcomeDialogOpen, setOutcomeDialogOpen] = useState(false);

  useEffect(() => {
    fetchMeeting();
  }, [id]);

  const fetchMeeting = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/bookings/${id}`);
      if (!response.ok) throw new Error("Meeting not found");
      const data = await response.json();
      setMeeting(data.booking);
    } catch (error) {
      console.error("Failed to fetch meeting:", error);
      toast.error("Failed to load meeting details");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    if (status === "cancelled") {
      setCancellationDialogOpen(true);
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) throw new Error("Failed to update status");

      toast.success(`Meeting marked as ${status.replace("_", " ")}`);
      fetchMeeting();
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error("Failed to update meeting status");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancellation = async (reason: string) => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "cancelled",
          cancellationReason: reason,
        }),
      });

      if (!response.ok) throw new Error("Failed to cancel meeting");

      toast.success("Meeting cancelled");
      setCancellationDialogOpen(false);
      fetchMeeting();
    } catch (error) {
      console.error("Failed to cancel meeting:", error);
      toast.error("Failed to cancel meeting");
    } finally {
      setActionLoading(false);
    }
  };

  const handleOutcomeConfirm = async (outcomeId: string, notes?: string) => {
    setActionLoading(true);
    try {
      const body: Record<string, unknown> = { outcomeId };
      if (notes) body.notes = notes;

      const response = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error("Failed to set outcome");

      toast.success("Meeting outcome saved");
      setOutcomeDialogOpen(false);
      fetchMeeting();
    } catch (error) {
      console.error("Failed to set outcome:", error);
      toast.error("Failed to save outcome");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!meeting) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <h2 className="text-xl font-semibold">Meeting not found</h2>
          <Button variant="link" onClick={() => router.push("/meetings")}>
            Back to Meetings
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2"
              onClick={() => router.push("/meetings")}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Meetings
            </Button>
            <h1 className="text-2xl font-bold">Meeting with {meeting.contact.name}</h1>
            <div className="flex items-center gap-3 text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(new Date(meeting.scheduledAt), "EEEE, MMMM d, yyyy")}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {format(new Date(meeting.scheduledAt), "h:mm a")} ({meeting.duration} min)
              </span>
            </div>
          </div>
          <MeetingStatusBadge status={meeting.status} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Meeting Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Meeting Type */}
                {meeting.meetingType && (
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span
                      className="px-2 py-1 rounded-md text-sm font-medium"
                      style={{
                        backgroundColor: meeting.meetingType.color
                          ? `${meeting.meetingType.color}20`
                          : "#e5e7eb",
                        color: meeting.meetingType.color || "#374151",
                      }}
                    >
                      {meeting.meetingType.name}
                    </span>
                  </div>
                )}

                {/* Conference Link */}
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

                {/* Recording Link */}
                {meeting.recordingLink && (
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={meeting.recordingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1"
                    >
                      View Recording
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}

                {/* Outcome */}
                {meeting.outcome && (
                  <div className="flex items-center gap-2">
                    <Badge variant={meeting.outcome.isPositive ? "default" : "secondary"}>
                      Outcome: {meeting.outcome.name}
                    </Badge>
                  </div>
                )}

                {/* Cancellation Reason */}
                {meeting.cancellationReason && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm font-medium text-muted-foreground">Cancellation Reason</p>
                    <p className="text-sm mt-1">{meeting.cancellationReason}</p>
                  </div>
                )}

                <Separator />

                {/* Notes */}
                {meeting.notes && (
                  <div>
                    <h4 className="font-medium mb-2">Notes</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {meeting.notes}
                    </p>
                  </div>
                )}

                {/* Actions */}
                {meeting.status === "scheduled" && (
                  <>
                    <Separator />
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        onClick={() => handleStatusChange("completed")}
                        disabled={actionLoading}
                      >
                        Mark as Completed
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleStatusChange("no_show")}
                        disabled={actionLoading}
                      >
                        Mark as No Show
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => setCancellationDialogOpen(true)}
                        disabled={actionLoading}
                      >
                        Cancel Meeting
                      </Button>
                    </div>
                  </>
                )}

                {meeting.status === "completed" && !meeting.outcome && (
                  <>
                    <Separator />
                    <Button onClick={() => setOutcomeDialogOpen(true)}>Set Outcome</Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Activity Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <MeetingTimeline events={meeting.events} />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                    <span className="text-sm">{meeting.contact.company}</span>
                  </div>
                )}
                {meeting.contact.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`mailto:${meeting.contact.email}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {meeting.contact.email}
                    </a>
                  </div>
                )}
                {meeting.contact.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{meeting.contact.phone}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Assigned To Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Assigned To</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    {meeting.user.avatar ? (
                      <img src={meeting.user.avatar} alt={meeting.user.name} />
                    ) : (
                      <div className="bg-primary text-primary-foreground flex items-center justify-center h-full w-full font-medium">
                        {meeting.user.name.charAt(0)}
                      </div>
                    )}
                  </Avatar>
                  <div>
                    <p className="font-medium">{meeting.user.name}</p>
                    <p className="text-sm text-muted-foreground">{meeting.user.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reminders Card */}
            {meeting.reminders.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Reminders</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
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
                          ? "Sent"
                          : reminder.status === "pending"
                          ? "Pending"
                          : reminder.status}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Related Meetings */}
            {(meeting.originalBooking || meeting.rescheduledBookings.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Related Meetings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {meeting.originalBooking && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => router.push(`/meetings/${meeting.originalBooking!.id}`)}
                    >
                      Original: {format(new Date(meeting.originalBooking.scheduledAt), "MMM d, yyyy")}
                    </Button>
                  )}
                  {meeting.rescheduledBookings.map((booking) => (
                    <Button
                      key={booking.id}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => router.push(`/meetings/${booking.id}`)}
                    >
                      Rescheduled: {format(new Date(booking.scheduledAt), "MMM d, yyyy")}
                    </Button>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Dialogs */}
        <CancellationDialog
          open={cancellationDialogOpen}
          onOpenChange={setCancellationDialogOpen}
          onConfirm={handleCancellation}
          loading={actionLoading}
        />

        <MeetingOutcomeDialog
          open={outcomeDialogOpen}
          onOpenChange={setOutcomeDialogOpen}
          onConfirm={handleOutcomeConfirm}
          loading={actionLoading}
        />
      </div>
    </DashboardLayout>
  );
}
