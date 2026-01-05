import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendMeetingReminder } from '@/lib/email/resend';

const CRON_SECRET = process.env.CRON_SECRET;

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

    // Find pending reminders that are due
    const pendingReminders = await db.meetingReminder.findMany({
      where: {
        status: 'pending',
        scheduledFor: {
          lte: now,
        },
        booking: {
          status: 'scheduled',
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
      take: 50, // Process in batches
    });

    const results = {
      processed: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const reminder of pendingReminders) {
      results.processed++;

      try {
        // Check if booking is still valid
        if (reminder.booking.status !== 'scheduled') {
          await db.meetingReminder.update({
            where: { id: reminder.id },
            data: {
              status: 'skipped',
              error: 'Booking no longer scheduled',
            },
          });
          results.skipped++;
          continue;
        }

        // Check if contact has email
        if (!reminder.booking.contact.email) {
          await db.meetingReminder.update({
            where: { id: reminder.id },
            data: {
              status: 'skipped',
              error: 'Contact has no email address',
            },
          });
          results.skipped++;
          continue;
        }

        // Send the reminder email
        const emailResult = await sendMeetingReminder({
          to: reminder.booking.contact.email,
          contactName: reminder.booking.contact.name,
          userName: reminder.booking.user.name,
          meetingTime: reminder.booking.scheduledAt,
          conferenceLink: reminder.booking.conferenceLink,
          duration: reminder.booking.duration,
          meetingType: reminder.booking.meetingType?.name,
        });

        if (emailResult.success) {
          // Update reminder status
          await db.meetingReminder.update({
            where: { id: reminder.id },
            data: {
              status: 'sent',
              sentAt: new Date(),
            },
          });

          // Update booking's lastReminderSentAt
          await db.booking.update({
            where: { id: reminder.booking.id },
            data: { lastReminderSentAt: new Date() },
          });

          // Create timeline event
          await db.meetingEvent.create({
            data: {
              bookingId: reminder.booking.id,
              eventType: 'reminder_sent',
              description: `${reminder.reminderConfig.name} reminder sent to ${reminder.booking.contact.email}`,
            },
          });

          results.sent++;
        } else {
          await db.meetingReminder.update({
            where: { id: reminder.id },
            data: {
              status: 'failed',
              error: emailResult.error || 'Unknown error',
            },
          });
          results.failed++;
          results.errors.push(`Reminder ${reminder.id}: ${emailResult.error}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await db.meetingReminder.update({
          where: { id: reminder.id },
          data: {
            status: 'failed',
            error: errorMessage,
          },
        });
        results.failed++;
        results.errors.push(`Reminder ${reminder.id}: ${errorMessage}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} reminders: ${results.sent} sent, ${results.failed} failed, ${results.skipped} skipped`,
      results,
    });
  } catch (error) {
    console.error('Cron: send-reminders error:', error);
    return NextResponse.json(
      { error: 'Failed to process reminders' },
      { status: 500 }
    );
  }
}
