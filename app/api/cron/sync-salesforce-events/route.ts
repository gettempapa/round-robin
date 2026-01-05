import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  createSalesforceEvent,
  updateSalesforceEvent,
  querySalesforceEventsByIds,
  getSalesforceConnection,
} from '@/lib/salesforce';

const CRON_SECRET = process.env.CRON_SECRET;

// Map internal status to Salesforce Event status
function mapStatusToSalesforce(status: string): string {
  const statusMap: Record<string, string> = {
    scheduled: 'Planned',
    completed: 'Completed',
    cancelled: 'Cancelled',
    no_show: 'Not Held',
    rescheduled: 'Cancelled',
  };
  return statusMap[status] || 'Planned';
}

// Map Salesforce status back to internal status
function mapStatusFromSalesforce(sfStatus: string): string | null {
  const statusMap: Record<string, string> = {
    'Planned': 'scheduled',
    'Completed': 'completed',
    'Cancelled': 'cancelled',
    'Not Held': 'no_show',
  };
  return statusMap[sfStatus] || null;
}

export async function GET(request: Request) {
  // Verify cron secret in production
  if (CRON_SECRET) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // Check if Salesforce is connected
  const conn = await getSalesforceConnection();
  if (!conn) {
    return NextResponse.json({
      success: true,
      message: 'Salesforce not connected, skipping sync',
      results: { skipped: true },
    });
  }

  try {
    const results = {
      created: 0,
      updated: 0,
      syncedFromSF: 0,
      errors: [] as string[],
    };

    // 1. Push new bookings to Salesforce (those without salesforceEventId)
    const bookingsToSync = await db.booking.findMany({
      where: {
        salesforceEventId: null,
        status: {
          in: ['scheduled', 'completed'],
        },
      },
      include: {
        contact: true,
        user: true,
        meetingType: true,
      },
      take: 50,
    });

    for (const booking of bookingsToSync) {
      try {
        const endTime = new Date(booking.scheduledAt.getTime() + booking.duration * 60 * 1000);

        const sfEvent = await createSalesforceEvent({
          Subject: booking.meetingType?.name || `Meeting with ${booking.contact.name}`,
          StartDateTime: booking.scheduledAt,
          EndDateTime: endTime,
          Description: booking.notes || `Meeting with ${booking.contact.name}${booking.contact.email ? ` (${booking.contact.email})` : ''}`,
          Location: booking.conferenceLink || undefined,
          Status: mapStatusToSalesforce(booking.status),
        });

        await db.booking.update({
          where: { id: booking.id },
          data: { salesforceEventId: sfEvent.Id },
        });

        await db.meetingEvent.create({
          data: {
            bookingId: booking.id,
            eventType: 'salesforce_sync',
            description: `Meeting synced to Salesforce Event (${sfEvent.Id})`,
            performedBy: 'system',
          },
        });

        results.created++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`Create SF event for booking ${booking.id}: ${errorMessage}`);
      }
    }

    // 2. Update existing Salesforce events for changed bookings
    const bookingsToUpdate = await db.booking.findMany({
      where: {
        salesforceEventId: { not: null },
        updatedAt: {
          gt: new Date(Date.now() - 30 * 60 * 1000), // Updated in last 30 minutes
        },
      },
      include: {
        meetingType: true,
      },
      take: 50,
    });

    for (const booking of bookingsToUpdate) {
      if (!booking.salesforceEventId) continue;

      try {
        const endTime = new Date(booking.scheduledAt.getTime() + booking.duration * 60 * 1000);

        await updateSalesforceEvent(booking.salesforceEventId, {
          Subject: booking.meetingType?.name || 'Meeting',
          StartDateTime: booking.scheduledAt,
          EndDateTime: endTime,
          Description: booking.notes || undefined,
          Status: mapStatusToSalesforce(booking.status),
        });

        results.updated++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`Update SF event ${booking.salesforceEventId}: ${errorMessage}`);
      }
    }

    // 3. Sync changes from Salesforce back to local
    const bookingsWithSFId = await db.booking.findMany({
      where: {
        salesforceEventId: { not: null },
        status: 'scheduled', // Only sync scheduled meetings
      },
      take: 100,
    });

    if (bookingsWithSFId.length > 0) {
      const sfEventIds = bookingsWithSFId
        .map(b => b.salesforceEventId)
        .filter((id): id is string => id !== null);

      try {
        const sfEvents = await querySalesforceEventsByIds(sfEventIds);
        const sfEventMap = new Map(sfEvents.map(e => [e.Id, e]));

        for (const booking of bookingsWithSFId) {
          if (!booking.salesforceEventId) continue;

          const sfEvent = sfEventMap.get(booking.salesforceEventId);
          if (!sfEvent) continue;

          // Check if status changed in Salesforce
          const newStatus = mapStatusFromSalesforce(sfEvent.Status);
          if (newStatus && newStatus !== booking.status) {
            await db.booking.update({
              where: { id: booking.id },
              data: { status: newStatus },
            });

            await db.meetingEvent.create({
              data: {
                bookingId: booking.id,
                eventType: 'status_changed',
                description: `Status updated from Salesforce: ${booking.status} -> ${newStatus}`,
                previousValue: booking.status,
                newValue: newStatus,
                performedBy: 'salesforce_sync',
              },
            });

            results.syncedFromSF++;
          }

          // Check if time changed in Salesforce
          const sfStartTime = new Date(sfEvent.StartDateTime);
          if (Math.abs(sfStartTime.getTime() - booking.scheduledAt.getTime()) > 60000) {
            // More than 1 minute difference
            const previousTime = booking.scheduledAt.toISOString();

            await db.booking.update({
              where: { id: booking.id },
              data: { scheduledAt: sfStartTime },
            });

            await db.meetingEvent.create({
              data: {
                bookingId: booking.id,
                eventType: 'rescheduled',
                description: `Meeting time updated from Salesforce`,
                previousValue: previousTime,
                newValue: sfStartTime.toISOString(),
                performedBy: 'salesforce_sync',
              },
            });

            results.syncedFromSF++;
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`Query SF events: ${errorMessage}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Salesforce sync complete: ${results.created} created, ${results.updated} updated, ${results.syncedFromSF} synced from SF`,
      results,
    });
  } catch (error) {
    console.error('Cron: sync-salesforce-events error:', error);
    return NextResponse.json(
      { error: 'Failed to sync Salesforce events' },
      { status: 500 }
    );
  }
}
