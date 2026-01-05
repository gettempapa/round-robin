import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calendarService } from "@/lib/calendar/calendar-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { newScheduledAt, duration, notes, reason } = body;

    if (!newScheduledAt) {
      return NextResponse.json(
        { error: "newScheduledAt is required" },
        { status: 400 }
      );
    }

    // Get original booking
    const originalBooking = await db.booking.findUnique({
      where: { id },
      include: {
        contact: true,
        user: true,
        meetingType: true,
      },
    });

    if (!originalBooking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (originalBooking.status === 'cancelled' || originalBooking.status === 'completed') {
      return NextResponse.json(
        { error: "Cannot reschedule a cancelled or completed meeting" },
        { status: 400 }
      );
    }

    const slotStart = new Date(newScheduledAt);
    const bookingDuration = duration || originalBooking.duration;
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotEnd.getMinutes() + bookingDuration);

    // Check calendar availability
    const syncStatus = await calendarService.getSyncStatus(originalBooking.userId);

    if (!syncStatus.connected) {
      return NextResponse.json(
        { error: "User does not have a calendar connected" },
        { status: 400 }
      );
    }

    const isAvailable = await calendarService.isSlotAvailable(
      originalBooking.userId,
      slotStart,
      slotEnd
    );

    if (!isAvailable) {
      return NextResponse.json(
        { error: "Selected time slot is not available" },
        { status: 409 }
      );
    }

    // Create new calendar event
    const calendarEvent = await calendarService.createEvent(originalBooking.userId, {
      summary: `Meeting with ${originalBooking.contact.name}`,
      description:
        notes ||
        originalBooking.notes ||
        `Rescheduled meeting with ${originalBooking.contact.name}`,
      start: slotStart,
      end: slotEnd,
      attendees: originalBooking.contact.email ? [originalBooking.contact.email] : [],
      location: "Video Call",
    });

    // Mark original booking as rescheduled
    await db.booking.update({
      where: { id },
      data: {
        status: 'rescheduled',
        cancellationReason: reason || 'Rescheduled to new time',
      },
    });

    // Skip pending reminders for original booking
    await db.meetingReminder.updateMany({
      where: {
        bookingId: id,
        status: 'pending',
      },
      data: {
        status: 'skipped',
      },
    });

    // Create new booking
    const newBooking = await db.booking.create({
      data: {
        contactId: originalBooking.contactId,
        userId: originalBooking.userId,
        scheduledAt: slotStart,
        duration: bookingDuration,
        notes: notes || originalBooking.notes,
        calendarEventId: calendarEvent.id,
        conferenceLink: calendarEvent.conferenceLink,
        status: 'scheduled',
        meetingTypeId: originalBooking.meetingTypeId,
        originalBookingId: id,
      },
      include: {
        user: true,
        contact: true,
        meetingType: true,
      },
    });

    // Create timeline events
    await db.meetingEvent.create({
      data: {
        bookingId: id,
        eventType: 'rescheduled',
        description: `Meeting rescheduled to ${slotStart.toISOString()}`,
        previousValue: originalBooking.scheduledAt.toISOString(),
        newValue: slotStart.toISOString(),
      },
    });

    await db.meetingEvent.create({
      data: {
        bookingId: newBooking.id,
        eventType: 'created',
        description: `Rescheduled from meeting on ${originalBooking.scheduledAt.toLocaleDateString()}`,
      },
    });

    // Schedule reminders for new booking
    const reminderConfigs = await db.reminderConfig.findMany({
      where: { isActive: true },
    });

    for (const config of reminderConfigs) {
      const reminderTime = new Date(slotStart);
      reminderTime.setMinutes(reminderTime.getMinutes() - config.minutesBefore);

      if (reminderTime > new Date()) {
        await db.meetingReminder.create({
          data: {
            bookingId: newBooking.id,
            reminderConfigId: config.id,
            scheduledFor: reminderTime,
            status: 'pending',
          },
        });
      }
    }

    return NextResponse.json({
      originalBooking: { id, status: 'rescheduled' },
      newBooking,
      calendarEvent: {
        id: calendarEvent.id,
        conferenceLink: calendarEvent.conferenceLink,
      },
    });
  } catch (error) {
    console.error("Error rescheduling booking:", error);
    return NextResponse.json(
      {
        error: "Failed to reschedule booking",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
