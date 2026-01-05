"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MeetingStatsCards } from "@/components/meetings/meeting-stats-cards";
import { MeetingFilters } from "@/components/meetings/meeting-filters";
import { MeetingsTable } from "@/components/meetings/meetings-table";
import { MeetingDetailDialog } from "@/components/meetings/meeting-detail-dialog";
import { CancellationDialog } from "@/components/meetings/cancellation-dialog";
import { MeetingOutcomeDialog } from "@/components/meetings/meeting-outcome-dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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

interface MeetingStats {
  total: number;
  scheduled: number;
  completed: number;
  cancelled: number;
  noShow: number;
  upcoming: number;
  completionRate: number;
  noShowRate: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function MeetingsPage() {
  const router = useRouter();

  // Data state
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [stats, setStats] = useState<MeetingStats>({
    total: 0,
    scheduled: 0,
    completed: 0,
    cancelled: 0,
    noShow: 0,
    upcoming: 0,
    completionRate: 0,
    noShowRate: 0,
  });
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
  });
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [meetingTypes, setMeetingTypes] = useState<Array<{ id: string; name: string }>>([]);

  // Filter state
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [userId, setUserId] = useState("");
  const [meetingTypeId, setMeetingTypeId] = useState("");
  const [sortBy, setSortBy] = useState("scheduledAt");
  const [sortOrder, setSortOrder] = useState("desc");

  // Loading state
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  // Dialog state
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [cancellationDialogOpen, setCancellationDialogOpen] = useState(false);
  const [outcomeDialogOpen, setOutcomeDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch meetings
  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sortBy,
        sortOrder,
      });

      if (search) params.append("search", search);
      if (status !== "all") params.append("status", status);
      if (userId) params.append("userId", userId);
      if (meetingTypeId) params.append("meetingTypeId", meetingTypeId);

      const response = await fetch(`/api/bookings?${params}`);
      const data = await response.json();

      setMeetings(data.bookings || []);
      setPagination(data.pagination || pagination);
    } catch (error) {
      console.error("Failed to fetch meetings:", error);
      toast.error("Failed to load meetings");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, sortBy, sortOrder, search, status, userId, meetingTypeId]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const response = await fetch("/api/bookings/stats");
      const data = await response.json();
      setStats(data.stats || stats);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch filter options
  const fetchFilterOptions = useCallback(async () => {
    try {
      const [usersRes, typesRes] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/meeting-types"),
      ]);

      const usersData = await usersRes.json();
      const typesData = await typesRes.json();

      setUsers(usersData.users || []);
      setMeetingTypes(typesData.meetingTypes || []);
    } catch (error) {
      console.error("Failed to fetch filter options:", error);
    }
  }, []);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  useEffect(() => {
    fetchStats();
    fetchFilterOptions();
  }, [fetchStats, fetchFilterOptions]);

  // Handle sorting
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  // Clear filters
  const handleClearFilters = () => {
    setSearch("");
    setStatus("all");
    setUserId("");
    setMeetingTypeId("");
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Handle status change
  const handleStatusChange = async (meetingId: string, newStatus: string) => {
    if (newStatus === "cancelled") {
      setSelectedMeetingId(meetingId);
      setCancellationDialogOpen(true);
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`/api/bookings/${meetingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error("Failed to update status");

      toast.success(`Meeting marked as ${newStatus.replace("_", " ")}`);
      fetchMeetings();
      fetchStats();
      setDetailDialogOpen(false);
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error("Failed to update meeting status");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle cancellation with reason
  const handleCancellation = async (reason: string) => {
    if (!selectedMeetingId) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/bookings/${selectedMeetingId}`, {
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
      setDetailDialogOpen(false);
      fetchMeetings();
      fetchStats();
    } catch (error) {
      console.error("Failed to cancel meeting:", error);
      toast.error("Failed to cancel meeting");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle reschedule
  const handleReschedule = (meetingId: string) => {
    // Navigate to reschedule page or open reschedule dialog
    router.push(`/meetings/${meetingId}?action=reschedule`);
  };

  // Handle set outcome
  const handleSetOutcome = (meetingId: string) => {
    setSelectedMeetingId(meetingId);
    setOutcomeDialogOpen(true);
  };

  // Handle outcome confirmation
  const handleOutcomeConfirm = async (outcomeId: string, notes?: string) => {
    if (!selectedMeetingId) return;

    setActionLoading(true);
    try {
      const body: any = { outcomeId };
      if (notes) body.notes = notes;

      const response = await fetch(`/api/bookings/${selectedMeetingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error("Failed to set outcome");

      toast.success("Meeting outcome saved");
      setOutcomeDialogOpen(false);
      setDetailDialogOpen(false);
      fetchMeetings();
    } catch (error) {
      console.error("Failed to set outcome:", error);
      toast.error("Failed to save outcome");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle meeting click
  const handleMeetingClick = (meetingId: string) => {
    setSelectedMeetingId(meetingId);
    setDetailDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meetings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage and track all scheduled meetings with prospects
          </p>
        </div>

        {/* Stats Cards */}
        <MeetingStatsCards stats={stats} loading={statsLoading} />

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <MeetingFilters
              search={search}
              onSearchChange={(value) => {
                setSearch(value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              status={status}
              onStatusChange={(value) => {
                setStatus(value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              userId={userId}
              onUserChange={(value) => {
                setUserId(value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              meetingTypeId={meetingTypeId}
              onMeetingTypeChange={(value) => {
                setMeetingTypeId(value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              users={users}
              meetingTypes={meetingTypes}
              onClearFilters={handleClearFilters}
            />
          </CardContent>
        </Card>

        {/* Meetings Table */}
        <MeetingsTable
          meetings={meetings}
          pagination={pagination}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          onPageChange={handlePageChange}
          onMeetingClick={handleMeetingClick}
          onStatusChange={handleStatusChange}
          onReschedule={handleReschedule}
          loading={loading}
        />

        {/* Detail Dialog */}
        <MeetingDetailDialog
          meetingId={selectedMeetingId}
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          onStatusChange={handleStatusChange}
          onReschedule={handleReschedule}
          onSetOutcome={handleSetOutcome}
        />

        {/* Cancellation Dialog */}
        <CancellationDialog
          open={cancellationDialogOpen}
          onOpenChange={setCancellationDialogOpen}
          onConfirm={handleCancellation}
          loading={actionLoading}
        />

        {/* Outcome Dialog */}
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
