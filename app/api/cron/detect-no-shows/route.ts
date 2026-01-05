import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Verify the request is from Vercel Cron
function verifyCronRequest(request: Request): boolean {
  const authHeader = request.headers.get("authorization");

  if (process.env.CRON_SECRET) {
    return authHeader === `Bearer ${process.env.CRON_SECRET}`;
  }

  return process.env.NODE_ENV === "development";
}

// Grace period after meeting end time before marking as no-show (in minutes)
const NO_SHOW_GRACE_PERIOD_MINUTES = 30;

export async function GET(request: Request) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const gracePeriodAgo = new Date(now.getTime() - NO_SHOW_GRACE_PERIOD_MINUTES * 60 * 1000);

    // Find scheduled meetings that have passed their end time + grace period
    // and have no actual start time recorded
    const potentialNoShows = await db.booking.findMany({
      where: {
        status: "scheduled",
        actualStartTime: null, // Never started
        scheduledAt: {
          lt: gracePeriodAgo, // Meeting time + grace period has passed
        },
      },
      include: {
        contact: {
          select: {
            name: true,
          },
        },
        user: {
          select: {
            name: true,
          },
        },
      },
      take: 100, // Process up to 100 per run
    });

    console.log(`[Cron] Found ${potentialNoShows.length} potential no-shows`);

    const results = {
      processed: 0,
      markedNoShow: 0,
    };

    for (const booking of potentialNoShows) {
      // Calculate when the meeting should have ended
      const meetingEndTime = new Date(booking.scheduledAt);
      meetingEndTime.setMinutes(meetingEndTime.getMinutes() + booking.duration);

      // Add grace period
      const noShowThreshold = new Date(meetingEndTime);
      noShowThreshold.setMinutes(noShowThreshold.getMinutes() + NO_SHOW_GRACE_PERIOD_MINUTES);

      // Only mark as no-show if we're past the threshold
      if (now > noShowThreshold) {
        results.processed++;

        await db.booking.update({
          where: { id: booking.id },
          data: {
            status: "no_show",
          },
        });

        // Skip any pending reminders
        await db.meetingReminder.updateMany({
          where: {
            bookingId: booking.id,
            status: "pending",
          },
          data: {
            status: "skipped",
          },
        });

        // Create timeline event
        await db.meetingEvent.create({
          data: {
            bookingId: booking.id,
            eventType: "status_changed",
            description: `Automatically marked as no-show (${NO_SHOW_GRACE_PERIOD_MINUTES} min after scheduled end time)`,
            previousValue: "scheduled",
            newValue: "no_show",
          },
        });

        results.markedNoShow++;
        console.log(`[Cron] Marked booking ${booking.id} as no-show`);
      }
    }

    console.log(`[Cron] No-show detection complete:`, results);

    return NextResponse.json({
      success: true,
      ...results,
      gracePeriodMinutes: NO_SHOW_GRACE_PERIOD_MINUTES,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Error detecting no-shows:", error);
    return NextResponse.json(
      {
        error: "Failed to detect no-shows",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
