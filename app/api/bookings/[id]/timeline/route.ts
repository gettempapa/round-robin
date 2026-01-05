import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");

    const booking = await db.booking.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const events = await db.meetingEvent.findMany({
      where: { bookingId: id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Also include reminder events
    const reminders = await db.meetingReminder.findMany({
      where: { bookingId: id },
      include: {
        reminderConfig: {
          select: {
            name: true,
            minutesBefore: true,
          },
        },
      },
      orderBy: { scheduledFor: 'asc' },
    });

    // Transform reminders into event format for timeline
    const reminderEvents = reminders.map((r) => ({
      id: r.id,
      bookingId: r.bookingId,
      eventType: 'reminder',
      description: `${r.reminderConfig.name} reminder ${r.status === 'sent' ? 'sent' : r.status === 'pending' ? 'scheduled' : r.status}`,
      previousValue: null,
      newValue: r.status,
      performedBy: null,
      createdAt: r.sentAt || r.scheduledFor,
      reminderStatus: r.status,
      scheduledFor: r.scheduledFor,
    }));

    // Combine and sort all events
    const allEvents = [...events, ...reminderEvents].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({ events: allEvents });
  } catch (error) {
    console.error("Error fetching booking timeline:", error);
    return NextResponse.json(
      { error: "Failed to fetch timeline" },
      { status: 500 }
    );
  }
}
