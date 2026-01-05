import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendMeetingReminder } from "@/lib/email/resend";

// Verify the request is from Vercel Cron
function verifyCronRequest(request: Request): boolean {
  const authHeader = request.headers.get("authorization");

  // In production, verify with CRON_SECRET
  if (process.env.CRON_SECRET) {
    return authHeader === `Bearer ${process.env.CRON_SECRET}`;
  }

  // In development, allow all requests
  return process.env.NODE_ENV === "development";
}

export async function GET(request: Request) {
  // Verify cron authentication
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    // Find pending reminders that are due
    const dueReminders = await db.meetingReminder.findMany({
      where: {
        status: "pending",
        scheduledFor: {
          lte: now,
        },
        booking: {
          status: "scheduled",
          scheduledAt: {
            gt: now, // Meeting hasn't happened yet
          },
        },
      },
      include: {
        booking: {
          include: {
            contact: true,
            user: true,
            meetingType: true,
          },
        },
        reminderConfig: true,
      },
      take: 50, // Process up to 50 reminders per run
    });

    console.log(`[Cron] Processing ${dueReminders.length} due reminders`);

    const results = {
      processed: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
    };

    for (const reminder of dueReminders) {
      results.processed++;

      const { booking, reminderConfig } = reminder;

      // Skip if no contact email
      if (!booking.contact.email) {
        await db.meetingReminder.update({
          where: { id: reminder.id },
          data: {
            status: "skipped",
            error: "No contact email",
          },
        });
        results.skipped++;
        continue;
      }

      // Send email
      const emailResult = await sendMeetingReminder({
        to: booking.contact.email,
        contactName: booking.contact.name,
        userName: booking.user.name,
        userEmail: booking.user.email,
        meetingTime: booking.scheduledAt,
        duration: booking.duration,
        conferenceLink: booking.conferenceLink,
        meetingTypeName: booking.meetingType?.name,
        customSubject: reminderConfig.emailSubject,
      });

      if (emailResult.success) {
        await db.meetingReminder.update({
          where: { id: reminder.id },
          data: {
            status: "sent",
            sentAt: new Date(),
          },
        });

        // Update booking's last reminder timestamp
        await db.booking.update({
          where: { id: booking.id },
          data: { lastReminderSentAt: new Date() },
        });

        // Create timeline event
        await db.meetingEvent.create({
          data: {
            bookingId: booking.id,
            eventType: "reminder_sent",
            description: `${reminderConfig.name} reminder sent to ${booking.contact.email}`,
          },
        });

        results.sent++;
        console.log(`[Cron] Sent reminder for booking ${booking.id}`);
      } else {
        await db.meetingReminder.update({
          where: { id: reminder.id },
          data: {
            status: "failed",
            error: emailResult.error,
          },
        });

        results.failed++;
        console.error(`[Cron] Failed to send reminder for booking ${booking.id}:`, emailResult.error);
      }
    }

    console.log(`[Cron] Reminder processing complete:`, results);

    return NextResponse.json({
      success: true,
      ...results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Error processing reminders:", error);
    return NextResponse.json(
      {
        error: "Failed to process reminders",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
