"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { MeetingStatusBadge } from "./meeting-status-badge";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MoreHorizontal,
  Video,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

interface Meeting {
  id: string;
  scheduledAt: string;
  duration: number;
  status: string;
  notes: string | null;
  conferenceLink: string | null;
  contact: {
    id: string;
    name: string;
    email: string | null;
    company: string | null;
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
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface MeetingsTableProps {
  meetings: Meeting[];
  pagination: Pagination;
  sortBy: string;
  sortOrder: string;
  onSort: (field: string) => void;
  onPageChange: (page: number) => void;
  onMeetingClick: (meetingId: string) => void;
  onStatusChange: (meetingId: string, status: string) => void;
  onReschedule: (meetingId: string) => void;
  loading?: boolean;
}

export function MeetingsTable({
  meetings,
  pagination,
  sortBy,
  sortOrder,
  onSort,
  onPageChange,
  onMeetingClick,
  onStatusChange,
  onReschedule,
  loading,
}: MeetingsTableProps) {
  const SortButton = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8"
      onClick={() => onSort(field)}
    >
      {children}
      <ArrowUpDown className={`ml-2 h-4 w-4 ${sortBy === field ? "opacity-100" : "opacity-30"}`} />
    </Button>
  );

  if (loading) {
    return (
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contact</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Scheduled</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><div className="h-4 bg-muted rounded w-32 animate-pulse" /></TableCell>
                <TableCell><div className="h-4 bg-muted rounded w-24 animate-pulse" /></TableCell>
                <TableCell><div className="h-4 bg-muted rounded w-28 animate-pulse" /></TableCell>
                <TableCell><div className="h-4 bg-muted rounded w-20 animate-pulse" /></TableCell>
                <TableCell><div className="h-4 bg-muted rounded w-20 animate-pulse" /></TableCell>
                <TableCell><div className="h-4 bg-muted rounded w-8 animate-pulse" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead><SortButton field="contact">Contact</SortButton></TableHead>
              <TableHead><SortButton field="user">Assigned To</SortButton></TableHead>
              <TableHead><SortButton field="scheduledAt">Scheduled</SortButton></TableHead>
              <TableHead>Type</TableHead>
              <TableHead><SortButton field="status">Status</SortButton></TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {meetings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No meetings found
                </TableCell>
              </TableRow>
            ) : (
              meetings.map((meeting) => (
                <TableRow
                  key={meeting.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onMeetingClick(meeting.id)}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium">{meeting.contact.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {meeting.contact.company || meeting.contact.email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        {meeting.user.avatar ? (
                          <img src={meeting.user.avatar} alt={meeting.user.name} />
                        ) : (
                          <div className="bg-primary text-primary-foreground text-xs flex items-center justify-center h-full w-full">
                            {meeting.user.name.charAt(0)}
                          </div>
                        )}
                      </Avatar>
                      <span className="text-sm">{meeting.user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {format(new Date(meeting.scheduledAt), "MMM d, yyyy")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(meeting.scheduledAt), "h:mm a")} ({meeting.duration} min)
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {meeting.meetingType ? (
                      <span
                        className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium"
                        style={{
                          backgroundColor: meeting.meetingType.color
                            ? `${meeting.meetingType.color}20`
                            : "#e5e7eb",
                          color: meeting.meetingType.color || "#374151",
                        }}
                      >
                        {meeting.meetingType.name}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <MeetingStatusBadge status={meeting.status} />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onMeetingClick(meeting.id)}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        {meeting.conferenceLink && (
                          <DropdownMenuItem
                            onClick={() => window.open(meeting.conferenceLink!, "_blank")}
                          >
                            <Video className="h-4 w-4 mr-2" />
                            Join Meeting
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {meeting.status === "scheduled" && (
                          <>
                            <DropdownMenuItem onClick={() => onStatusChange(meeting.id, "completed")}>
                              Mark as Completed
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onStatusChange(meeting.id, "no_show")}>
                              Mark as No Show
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onReschedule(meeting.id)}>
                              Reschedule
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onStatusChange(meeting.id, "cancelled")}
                              className="text-red-600"
                            >
                              Cancel Meeting
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
          {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}{" "}
          meetings
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page === 1}
            onClick={() => onPageChange(pagination.page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => onPageChange(pagination.page + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
