import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calendarService } from "@/lib/calendar/calendar-service";
import { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const meetingTypeId = searchParams.get("meetingTypeId");
    const search = searchParams.get("search");

    // Sorting
    const sortBy = searchParams.get("sortBy") || "scheduledAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "25");
    const skip = (page - 1) * limit;

    const where: Prisma.BookingWhereInput = {};

    if (userId) {
      where.userId = userId;
    }

    if (status && status !== "all") {
      where.status = status;
    }

    if (meetingTypeId) {
      where.meetingTypeId = meetingTypeId;
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

    // Search by contact name, email, company or user name
    if (search) {
      where.OR = [
        { contact: { name: { contains: search, mode: "insensitive" } } },
        { contact: { email: { contains: search, mode: "insensitive" } } },
        { contact: { company: { contains: search, mode: "insensitive" } } },
        { user: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    // Build orderBy based on sortBy field
    let orderBy: Prisma.BookingOrderByWithRelationInput = {};
    switch (sortBy) {
      case "contact":
        orderBy = { contact: { name: sortOrder as Prisma.SortOrder } };
        break;
      case "user":
        orderBy = { user: { name: sortOrder as Prisma.SortOrder } };
        break;
      case "status":
        orderBy = { status: sortOrder as Prisma.SortOrder };
        break;
      case "duration":
        orderBy = { duration: sortOrder as Prisma.SortOrder };
        break;
      case "createdAt":
        orderBy = { createdAt: sortOrder as Prisma.SortOrder };
        break;
      default:
        orderBy = { scheduledAt: sortOrder as Prisma.SortOrder };
    }

    // Get total count for pagination
    const total = await db.booking.count({ where });

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
        meetingType: {
          select: {
            id: true,
            name: true,
            color: true,
            duration: true,
          },
        },
        outcome: {
          select: {
            id: true,
            name: true,
            isPositive: true,
          },
        },
      },
      orderBy,
      skip,
      take: limit,
    });

    return NextResponse.json({
      bookings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
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
    const { contactId, userId, scheduledAt, duration, notes, meetingTypeId } = body;

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
        meetingTypeId: meetingTypeId || null,
      },
      include: {
        user: true,
        contact: true,
        meetingType: true,
      },
    });

    // Create meeting event for timeline
    await db.meetingEvent.create({
      data: {
        bookingId: booking.id,
        eventType: 'created',
        description: `Meeting scheduled with ${contact.name}`,
      },
    });

    // Schedule reminders based on active reminder configs
    const reminderConfigs = await db.reminderConfig.findMany({
      where: { isActive: true },
    });

    for (const config of reminderConfigs) {
      const reminderTime = new Date(slotStart);
      reminderTime.setMinutes(reminderTime.getMinutes() - config.minutesBefore);

      // Only create reminder if it's in the future
      if (reminderTime > new Date()) {
        await db.meetingReminder.create({
          data: {
            bookingId: booking.id,
            reminderConfigId: config.id,
            scheduledFor: reminderTime,
            status: 'pending',
          },
        });
      }
    }

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
    const {
      id,
      status,
      recordingLink,
      actualStartTime,
      actualEndTime,
      attendeeCount,
      notes,
      outcomeId,
      cancellationReason,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Booking ID is required" }, { status: 400 });
    }

    // Get current booking for comparison
    const currentBooking = await db.booking.findUnique({
      where: { id },
      include: { contact: true },
    });

    if (!currentBooking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const updateData: Prisma.BookingUpdateInput = {};

    if (status) updateData.status = status;
    if (recordingLink !== undefined) updateData.recordingLink = recordingLink;
    if (actualStartTime !== undefined) updateData.actualStartTime = actualStartTime ? new Date(actualStartTime) : null;
    if (actualEndTime !== undefined) updateData.actualEndTime = actualEndTime ? new Date(actualEndTime) : null;
    if (attendeeCount !== undefined) updateData.attendeeCount = attendeeCount;
    if (notes !== undefined) updateData.notes = notes;
    if (outcomeId !== undefined) updateData.outcome = outcomeId ? { connect: { id: outcomeId } } : { disconnect: true };
    if (cancellationReason !== undefined) updateData.cancellationReason = cancellationReason;

    const booking = await db.booking.update({
      where: { id },
      data: updateData,
      include: {
        user: true,
        contact: true,
        meetingType: true,
        outcome: true,
      },
    });

    // Create timeline events for status changes
    if (status && status !== currentBooking.status) {
      await db.meetingEvent.create({
        data: {
          bookingId: id,
          eventType: 'status_changed',
          description: `Status changed from ${currentBooking.status} to ${status}`,
          previousValue: currentBooking.status,
          newValue: status,
        },
      });

      // If cancelled, skip pending reminders
      if (status === 'cancelled' || status === 'no_show') {
        await db.meetingReminder.updateMany({
          where: {
            bookingId: id,
            status: 'pending',
          },
          data: {
            status: 'skipped',
          },
        });
      }
    }

    // Create timeline event for outcome set
    if (outcomeId && outcomeId !== currentBooking.outcomeId) {
      const outcome = await db.meetingOutcome.findUnique({ where: { id: outcomeId } });
      await db.meetingEvent.create({
        data: {
          bookingId: id,
          eventType: 'outcome_set',
          description: `Meeting outcome set to "${outcome?.name || 'Unknown'}"`,
          newValue: outcomeId,
        },
      });
    }

    // Create timeline event for notes added
    if (notes && notes !== currentBooking.notes) {
      await db.meetingEvent.create({
        data: {
          bookingId: id,
          eventType: 'note_added',
          description: 'Notes updated',
        },
      });
    }

    return NextResponse.json({ booking });
  } catch (error) {
    console.error("Error updating booking:", error);
    return NextResponse.json(
      { error: "Failed to update booking" },
      { status: 500 }
    );
  }
}
