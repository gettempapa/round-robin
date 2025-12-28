import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { toZonedTime } from "date-fns-tz";
import { isWithinInterval } from "date-fns";

// GET /api/users/[id]/is-available?datetime=ISO_STRING
// Check if user is available at a specific datetime
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const datetimeParam = searchParams.get("datetime");

    // Default to current time if not provided
    const datetime = datetimeParam ? new Date(datetimeParam) : new Date();

    if (isNaN(datetime.getTime())) {
      return NextResponse.json(
        { error: "Invalid datetime format" },
        { status: 400 }
      );
    }

    // Get user with availability and time off
    const user = await db.user.findUnique({
      where: { id },
      include: {
        availability: { where: { isActive: true } },
        timeOff: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user is active
    if (user.status !== "active") {
      return NextResponse.json({
        available: false,
        reason: "User status is not active",
        user: { id: user.id, name: user.name, status: user.status },
      });
    }

    // Check time off
    const isOnTimeOff = user.timeOff.some((timeOff) =>
      isWithinInterval(datetime, {
        start: new Date(timeOff.startDate),
        end: new Date(timeOff.endDate),
      })
    );

    if (isOnTimeOff) {
      const currentTimeOff = user.timeOff.find((timeOff) =>
        isWithinInterval(datetime, {
          start: new Date(timeOff.startDate),
          end: new Date(timeOff.endDate),
        })
      );
      return NextResponse.json({
        available: false,
        reason: "User is on time off",
        timeOff: currentTimeOff,
        user: { id: user.id, name: user.name },
      });
    }

    // If no availability schedule set, assume always available
    if (user.availability.length === 0) {
      return NextResponse.json({
        available: true,
        reason: "No availability schedule set, user is available",
        user: { id: user.id, name: user.name },
      });
    }

    // Check if current time falls within user's working hours
    const userTimezone = user.timezone || "America/New_York";
    const zonedDate = toZonedTime(datetime, userTimezone);
    const dayOfWeek = zonedDate.getDay();
    const timeString = `${zonedDate.getHours().toString().padStart(2, "0")}:${zonedDate.getMinutes().toString().padStart(2, "0")}`;

    const matchingAvailability = user.availability.find((avail) => {
      if (avail.dayOfWeek !== dayOfWeek) return false;
      return timeString >= avail.startTime && timeString <= avail.endTime;
    });

    if (matchingAvailability) {
      return NextResponse.json({
        available: true,
        reason: "User is within working hours",
        availability: matchingAvailability,
        user: { id: user.id, name: user.name },
        zonedTime: {
          timezone: userTimezone,
          dayOfWeek,
          time: timeString,
        },
      });
    }

    return NextResponse.json({
      available: false,
      reason: "Outside of user's working hours",
      user: { id: user.id, name: user.name },
      zonedTime: {
        timezone: userTimezone,
        dayOfWeek,
        time: timeString,
      },
    });
  } catch (error) {
    console.error("Error checking availability:", error);
    return NextResponse.json(
      { error: "Failed to check availability" },
      { status: 500 }
    );
  }
}
