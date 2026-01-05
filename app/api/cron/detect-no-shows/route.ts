import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const CRON_SECRET = process.env.CRON_SECRET;

// How long after scheduled time to wait before marking as no-show (in minutes)
const NO_SHOW_THRESHOLD_MINUTES = 30;

export async function GET(request: Request) {
  // Verify cron secret in production
  if (CRON_SECRET) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const now = new Date();
    const thresholdTime = new Date(now.getTime() - NO_SHOW_THRESHOLD_MINUTES * 60 * 1000);

    // Find scheduled meetings that are past their time + threshold
    const overdueBookings = await db.booking.findMany({
      where: {
        status: 'scheduled',
        scheduledAt: {
          lt: thresholdTime,
        },
      },
      include: {
        contact: true,
        user: true,
      },
      take: 100,
    });

    const results = {
      processed: 0,
      markedNoShow: 0,
      errors: [] as string[],
    };

    for (const booking of overdueBookings) {
      results.processed++;

      try {
        // Calculate how long ago the meeting was scheduled
        const endTime = new Date(booking.scheduledAt.getTime() + booking.duration * 60 * 1000);

        // Only mark as no-show if the meeting end time has passed
        if (endTime > now) {
          continue; // Meeting is still in progress
        }

        // Update booking status to no_show
        await db.booking.update({
          where: { id: booking.id },
          data: { status: 'no_show' },
        });

        // Create timeline event
        await db.meetingEvent.create({
          data: {
            bookingId: booking.id,
            eventType: 'status_changed',
            description: 'Meeting automatically marked as no-show (meeting time passed)',
            previousValue: 'scheduled',
            newValue: 'no_show',
            performedBy: 'system',
          },
        });

        // Cancel any pending reminders
        await db.meetingReminder.updateMany({
          where: {
            bookingId: booking.id,
            status: 'pending',
          },
          data: {
            status: 'skipped',
            error: 'Meeting marked as no-show',
          },
        });

        results.markedNoShow++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`Booking ${booking.id}: ${errorMessage}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} overdue bookings, marked ${results.markedNoShow} as no-show`,
      results,
    });
  } catch (error) {
    console.error('Cron: detect-no-shows error:', error);
    return NextResponse.json(
      { error: 'Failed to detect no-shows' },
      { status: 500 }
    );
  }
}
