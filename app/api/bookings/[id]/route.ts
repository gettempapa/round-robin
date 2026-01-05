import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const booking = await db.booking.findUnique({
      where: { id },
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
            jobTitle: true,
          },
        },
        meetingType: true,
        outcome: true,
        originalBooking: {
          select: {
            id: true,
            scheduledAt: true,
            status: true,
          },
        },
        rescheduledBookings: {
          select: {
            id: true,
            scheduledAt: true,
            status: true,
          },
        },
        reminders: {
          include: {
            reminderConfig: true,
          },
          orderBy: {
            scheduledFor: 'asc',
          },
        },
        events: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 50,
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    return NextResponse.json({ booking });
  } catch (error) {
    console.error("Error fetching booking:", error);
    return NextResponse.json(
      { error: "Failed to fetch booking" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      status,
      recordingLink,
      actualStartTime,
      actualEndTime,
      attendeeCount,
      notes,
      outcomeId,
      cancellationReason,
      meetingTypeId,
    } = body;

    // Get current booking for comparison
    const currentBooking = await db.booking.findUnique({
      where: { id },
      include: { contact: true },
    });

    if (!currentBooking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const updateData: Prisma.BookingUpdateInput = {};

    if (status !== undefined) updateData.status = status;
    if (recordingLink !== undefined) updateData.recordingLink = recordingLink;
    if (actualStartTime !== undefined) updateData.actualStartTime = actualStartTime ? new Date(actualStartTime) : null;
    if (actualEndTime !== undefined) updateData.actualEndTime = actualEndTime ? new Date(actualEndTime) : null;
    if (attendeeCount !== undefined) updateData.attendeeCount = attendeeCount;
    if (notes !== undefined) updateData.notes = notes;
    if (outcomeId !== undefined) updateData.outcome = outcomeId ? { connect: { id: outcomeId } } : { disconnect: true };
    if (cancellationReason !== undefined) updateData.cancellationReason = cancellationReason;
    if (meetingTypeId !== undefined) updateData.meetingType = meetingTypeId ? { connect: { id: meetingTypeId } } : { disconnect: true };

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

      // If cancelled or no-show, skip pending reminders
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

    return NextResponse.json({ booking });
  } catch (error) {
    console.error("Error updating booking:", error);
    return NextResponse.json(
      { error: "Failed to update booking" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const booking = await db.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Delete the booking (cascades to reminders and events)
    await db.booking.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting booking:", error);
    return NextResponse.json(
      { error: "Failed to delete booking" },
      { status: 500 }
    );
  }
}
