import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getSalesforceConnection,
  createSalesforceEvent,
  updateSalesforceEvent,
  querySalesforceEventsByIds,
} from "@/lib/salesforce";

// Verify the request is from Vercel Cron
function verifyCronRequest(request: Request): boolean {
  const authHeader = request.headers.get("authorization");

  if (process.env.CRON_SECRET) {
    return authHeader === `Bearer ${process.env.CRON_SECRET}`;
  }

  return process.env.NODE_ENV === "development";
}

// Map RoundRobin status to Salesforce Event status
function mapStatusToSalesforce(status: string): string {
  switch (status) {
    case "scheduled":
      return "Planned";
    case "completed":
      return "Completed";
    case "cancelled":
    case "rescheduled":
      return "Cancelled";
    case "no_show":
      return "Not Held";
    default:
      return "Planned";
  }
}

// Map Salesforce Event status to RoundRobin status
function mapStatusFromSalesforce(sfStatus: string): string | null {
  switch (sfStatus) {
    case "Planned":
      return "scheduled";
    case "Completed":
      return "completed";
    case "Cancelled":
      return "cancelled";
    case "Not Held":
      return "no_show";
    default:
      return null;
  }
}

export async function GET(request: Request) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if Salesforce is connected
    let conn;
    try {
      conn = await getSalesforceConnection();
    } catch {
      return NextResponse.json({
        success: true,
        message: "Salesforce not connected, skipping sync",
        timestamp: new Date().toISOString(),
      });
    }

    const results = {
      createdInSalesforce: 0,
      updatedInSalesforce: 0,
      syncedFromSalesforce: 0,
      errors: 0,
    };

    // 1. Push new bookings to Salesforce (those without salesforceEventId)
    const newBookings = await db.booking.findMany({
      where: {
        salesforceEventId: null,
        status: { in: ["scheduled", "completed"] },
        contact: {
          NOT: { email: null },
        },
      },
      include: {
        contact: true,
        user: true,
        meetingType: true,
      },
      take: 20,
    });

    for (const booking of newBookings) {
      try {
        // Get contact's Salesforce ID if exists
        const sfSync = await db.salesforceSync.findFirst({
          where: {
            objectType: "Contact",
            localId: booking.contactId,
          },
        });

        const endTime = new Date(booking.scheduledAt);
        endTime.setMinutes(endTime.getMinutes() + booking.duration);

        const sfEvent = await createSalesforceEvent({
          Subject: `${booking.meetingType?.name || "Meeting"} with ${booking.contact.name}`,
          WhoId: sfSync?.salesforceId,
          OwnerId: booking.user.salesforceUserId || undefined,
          StartDateTime: booking.scheduledAt,
          EndDateTime: endTime,
          Description: booking.notes || undefined,
          Type: booking.meetingType?.name || "Meeting",
          Location: booking.conferenceLink || "Video Call",
        });

        if (sfEvent?.Id) {
          await db.booking.update({
            where: { id: booking.id },
            data: { salesforceEventId: sfEvent.Id },
          });
          results.createdInSalesforce++;
          console.log(`[SF Sync] Created event for booking ${booking.id}`);
        }
      } catch (error) {
        console.error(`[SF Sync] Error creating event for booking ${booking.id}:`, error);
        results.errors++;
      }
    }

    // 2. Push status updates to Salesforce
    const recentlyUpdated = await db.booking.findMany({
      where: {
        salesforceEventId: { not: null },
        updatedAt: {
          gte: new Date(Date.now() - 35 * 60 * 1000), // Last 35 minutes
        },
      },
      take: 50,
    });

    for (const booking of recentlyUpdated) {
      if (!booking.salesforceEventId) continue;

      try {
        await updateSalesforceEvent(booking.salesforceEventId, {
          Status: mapStatusToSalesforce(booking.status),
        });
        results.updatedInSalesforce++;
      } catch (error) {
        console.error(`[SF Sync] Error updating event ${booking.salesforceEventId}:`, error);
        results.errors++;
      }
    }

    // 3. Pull status changes from Salesforce
    const bookingsWithSfId = await db.booking.findMany({
      where: {
        salesforceEventId: { not: null },
        status: "scheduled",
      },
      select: {
        id: true,
        salesforceEventId: true,
        status: true,
      },
      take: 50,
    });

    if (bookingsWithSfId.length > 0) {
      const sfEventIds = bookingsWithSfId
        .map((b) => b.salesforceEventId)
        .filter((id): id is string => id !== null);

      try {
        const sfEvents = await querySalesforceEventsByIds(sfEventIds);

        for (const sfEvent of sfEvents) {
          const booking = bookingsWithSfId.find(
            (b) => b.salesforceEventId === sfEvent.Id
          );
          if (!booking) continue;

          const newStatus = mapStatusFromSalesforce(sfEvent.Status);
          if (newStatus && newStatus !== booking.status) {
            await db.booking.update({
              where: { id: booking.id },
              data: { status: newStatus },
            });

            await db.meetingEvent.create({
              data: {
                bookingId: booking.id,
                eventType: "status_changed",
                description: `Status synced from Salesforce: ${booking.status} → ${newStatus}`,
                previousValue: booking.status,
                newValue: newStatus,
              },
            });

            results.syncedFromSalesforce++;
            console.log(`[SF Sync] Updated booking ${booking.id} status from Salesforce`);
          }
        }
      } catch (error) {
        console.error("[SF Sync] Error fetching events from Salesforce:", error);
        results.errors++;
      }
    }

    console.log("[SF Sync] Sync complete:", results);

    return NextResponse.json({
      success: true,
      ...results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[SF Sync] Error during sync:", error);
    return NextResponse.json(
      {
        error: "Failed to sync with Salesforce",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
