import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calendarService } from "@/lib/calendar/calendar-service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: any = {};

    if (userId) {
      where.userId = userId;
    }

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.scheduledAt = {};
      if (startDate) {
        where.scheduledAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.scheduledAt.lte = new Date(endDate);
      }
    }

    const bookings = await db.booking.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
            phone: true,
          },
        },
      },
      orderBy: {
        scheduledAt: "desc",
      },
    });

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { contactId, userId, scheduledAt, duration, notes } = body;

    console.log('📥 Booking request:', { contactId, userId, scheduledAt, duration });

    if (!contactId || !userId || !scheduledAt) {
      console.log('❌ Missing required fields:', { contactId, userId, scheduledAt });
      return NextResponse.json(
        { error: "contactId, userId, and scheduledAt are required" },
        { status: 400 }
      );
    }

    const slotStart = new Date(scheduledAt);
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotEnd.getMinutes() + (duration || 30));

    // CRITICAL: Check if user has calendar connected
    console.log('🔍 Checking calendar sync for user:', userId);
    const syncStatus = await calendarService.getSyncStatus(userId);
    console.log('📊 Calendar sync status:', syncStatus);

    if (!syncStatus.connected) {
      console.log('❌ User does not have calendar connected');
      return NextResponse.json(
        { error: "User does not have a calendar connected", requiresCalendar: true },
        { status: 400 }
      );
    }

    // CRITICAL: Validate availability
    const isAvailable = await calendarService.isSlotAvailable(userId, slotStart, slotEnd);

    if (!isAvailable) {
      return NextResponse.json(
        { error: "Selected time slot is no longer available", slotUnavailable: true },
        { status: 409 } // Conflict
      );
    }

    // Get contact and user info for calendar event
    const contact = await db.contact.findUnique({
      where: { id: contactId },
    });

    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!contact || !user) {
      return NextResponse.json({ error: "Contact or user not found" }, { status: 404 });
    }

    // Create calendar event
    const calendarEvent = await calendarService.createEvent(userId, {
      summary: `Meeting with ${contact.name}`,
      description:
        notes ||
        `RoundRobin booking with ${contact.name} from ${contact.company || "Unknown Company"}`,
      start: slotStart,
      end: slotEnd,
      attendees: contact.email ? [contact.email] : [],
      location: "Video Call",
    });

    // Create booking in database
    const booking = await db.booking.create({
      data: {
        contactId,
        userId,
        scheduledAt: slotStart,
        duration: duration || 30,
        notes: notes || `Meeting with ${contact.name}`,
        calendarEventId: calendarEvent.id,
        conferenceLink: calendarEvent.conferenceLink,
        status: 'scheduled',
      },
      include: {
        user: true,
        contact: true,
      },
    });

    return NextResponse.json({
      booking,
      calendarEvent: {
        id: calendarEvent.id,
        conferenceLink: calendarEvent.conferenceLink,
      },
    });
  } catch (error) {
    console.error("Error creating booking:", error);
    return NextResponse.json(
      {
        error: "Failed to create booking",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, recordingLink, actualStartTime, actualEndTime, attendeeCount, notes } = body;

    if (!id) {
      return NextResponse.json({ error: "Booking ID is required" }, { status: 400 });
    }

    const updateData: any = {};

    if (status) updateData.status = status;
    if (recordingLink !== undefined) updateData.recordingLink = recordingLink;
    if (actualStartTime !== undefined) updateData.actualStartTime = actualStartTime ? new Date(actualStartTime) : null;
    if (actualEndTime !== undefined) updateData.actualEndTime = actualEndTime ? new Date(actualEndTime) : null;
    if (attendeeCount !== undefined) updateData.attendeeCount = attendeeCount;
    if (notes !== undefined) updateData.notes = notes;

    const booking = await db.booking.update({
      where: { id },
      data: updateData,
      include: {
        user: true,
        contact: true,
      },
    });

    return NextResponse.json({ booking });
  } catch (error) {
    console.error("Error updating booking:", error);
    return NextResponse.json(
      { error: "Failed to update booking" },
      { status: 500 }
    );
  }
}
