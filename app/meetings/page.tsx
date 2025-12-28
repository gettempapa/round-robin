"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { DashboardLayout } from "@/components/dashboard-layout";

type Booking = {
  id: string;
  scheduledAt: string;
  duration: number;
  status: string;
  notes: string | null;
  calendarEventId: string | null;
  conferenceLink: string | null;
  recordingLink: string | null;
  actualStartTime: string | null;
  actualEndTime: string | null;
  attendeeCount: number | null;
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
  contact: {
    id: string;
    name: string;
    email: string | null;
    company: string | null;
    phone: string | null;
  };
};

export default function MeetingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  useEffect(() => {
    fetchAllBookings();
  }, []);

  useEffect(() => {
    filterBookings();
  }, [statusFilter, searchQuery, allBookings]);

  const fetchAllBookings = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/bookings`);
      const data = await response.json();
      setAllBookings(data.bookings || []);
    } catch (error) {
      console.error("Failed to fetch bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterBookings = () => {
    let filtered = allBookings;

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((b) => b.status === statusFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.contact.name.toLowerCase().includes(query) ||
          b.contact.email?.toLowerCase().includes(query) ||
          b.contact.company?.toLowerCase().includes(query) ||
          b.user.name.toLowerCase().includes(query) ||
          b.user.email.toLowerCase().includes(query)
      );
    }

    setBookings(filtered);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      scheduled: "bg-primary/10 text-primary border border-primary/20",
      completed: "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]",
      cancelled: "bg-destructive/10 text-destructive border border-destructive/20",
      no_show: "bg-muted text-muted-foreground border",
    };

    const labels: Record<string, string> = {
      scheduled: "Scheduled",
      completed: "Completed",
      cancelled: "Cancelled",
      no_show: "No Show",
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status] || "bg-muted text-muted-foreground border"}`}>
        {labels[status] || status}
      </span>
    );
  };

  const handleUpdateStatus = async (bookingId: string, newStatus: string) => {
    try {
      await fetch("/api/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: bookingId, status: newStatus }),
      });
      fetchAllBookings();
      setShowUpdateModal(false);
    } catch (error) {
      console.error("Failed to update booking:", error);
      alert("Failed to update booking");
    }
  };

  const handleAddRecording = async (bookingId: string, recordingLink: string) => {
    try {
      await fetch("/api/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: bookingId, recordingLink }),
      });
      fetchAllBookings();
      setShowUpdateModal(false);
    } catch (error) {
      console.error("Failed to add recording link:", error);
      alert("Failed to add recording link");
    }
  };

  const stats = {
    total: allBookings.length,
    scheduled: allBookings.filter((b) => b.status === "scheduled").length,
    completed: allBookings.filter((b) => b.status === "completed").length,
    noShow: allBookings.filter((b) => b.status === "no_show").length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meetings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage and track all your scheduled meetings</p>
        </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded border p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total Meetings</div>
          <div className="text-3xl font-bold mt-2">{stats.total}</div>
        </div>
        <div className="bg-card rounded border p-4 border-l-2 border-l-primary">
          <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Scheduled</div>
          <div className="text-3xl font-bold text-primary mt-2">{stats.scheduled}</div>
        </div>
        <div className="bg-card rounded border p-4 border-l-2 border-l-[hsl(var(--success))]">
          <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Completed</div>
          <div className="text-3xl font-bold text-[hsl(var(--success))] mt-2">{stats.completed}</div>
        </div>
        <div className="bg-card rounded border p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">No Shows</div>
          <div className="text-3xl font-bold mt-2">{stats.noShow}</div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-card rounded border p-3 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search by contact or sales rep..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-2 bg-input border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              statusFilter === "all" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter("scheduled")}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              statusFilter === "scheduled" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
            }`}
          >
            Scheduled
          </button>
          <button
            onClick={() => setStatusFilter("completed")}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              statusFilter === "completed" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
            }`}
          >
            Completed
          </button>
          <button
            onClick={() => setStatusFilter("no_show")}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              statusFilter === "no_show" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
            }`}
          >
            No Show
          </button>
          <button
            onClick={() => setStatusFilter("cancelled")}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              statusFilter === "cancelled" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
            }`}
          >
            Cancelled
          </button>
        </div>
      </div>

      {/* Bookings List */}
      <div className="bg-card rounded border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading meetings...</div>
        ) : bookings.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No meetings found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/30 border-b">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Scheduled
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Links
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium">{booking.contact.name}</div>
                      <div className="text-xs text-muted-foreground">{booking.contact.email}</div>
                      {booking.contact.company && (
                        <div className="text-xs text-muted-foreground/70">{booking.contact.company}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm">{booking.user.name}</div>
                      <div className="text-xs text-muted-foreground">{booking.user.email}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm">
                        {format(new Date(booking.scheduledAt), "MMM dd, yyyy")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(booking.scheduledAt), "h:mm a")}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {booking.duration} min
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getStatusBadge(booking.status)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        {booking.conferenceLink && (
                          <a
                            href={booking.conferenceLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline"
                          >
                            Join Meeting
                          </a>
                        )}
                        {booking.recordingLink && (
                          <a
                            href={booking.recordingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-purple-600 hover:underline"
                          >
                            View Recording
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <button
                        onClick={() => {
                          setSelectedBooking(booking);
                          setShowUpdateModal(true);
                        }}
                        className="text-primary hover:text-primary/80 transition-colors"
                      >
                        Update
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Update Modal */}
      {showUpdateModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded border p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold mb-4">Update Meeting</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <select
                  className="w-full bg-input border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={selectedBooking.status}
                  onChange={(e) => handleUpdateStatus(selectedBooking.id, e.target.value)}
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="no_show">No Show</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Recording Link</label>
                <input
                  type="url"
                  placeholder="https://..."
                  className="w-full bg-input border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  defaultValue={selectedBooking.recordingLink || ""}
                  onBlur={(e) => {
                    if (e.target.value !== selectedBooking.recordingLink) {
                      handleAddRecording(selectedBooking.id, e.target.value);
                    }
                  }}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  onClick={() => setShowUpdateModal(false)}
                  className="px-4 py-2 bg-muted rounded hover:bg-muted/80 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </DashboardLayout>
  );
}
