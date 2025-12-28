import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/users/[id]/availability - Get user's weekly availability schedule
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const availability = await db.availability.findMany({
      where: { userId: id },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });

    return NextResponse.json(availability);
  } catch (error) {
    console.error("Error fetching availability:", error);
    return NextResponse.json(
      { error: "Failed to fetch availability" },
      { status: 500 }
    );
  }
}

// POST /api/users/[id]/availability - Set or update user's availability
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { dayOfWeek, startTime, endTime, isActive = true } = body;

    // Validate required fields
    if (dayOfWeek === undefined || !startTime || !endTime) {
      return NextResponse.json(
        { error: "dayOfWeek, startTime, and endTime are required" },
        { status: 400 }
      );
    }

    // Validate dayOfWeek is 0-6
    if (dayOfWeek < 0 || dayOfWeek > 6) {
      return NextResponse.json(
        { error: "dayOfWeek must be between 0 (Sunday) and 6 (Saturday)" },
        { status: 400 }
      );
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return NextResponse.json(
        { error: "Invalid time format. Use HH:MM (e.g., 09:00)" },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await db.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Create availability slot
    const availability = await db.availability.create({
      data: {
        userId: id,
        dayOfWeek,
        startTime,
        endTime,
        isActive,
      },
    });

    return NextResponse.json(availability, { status: 201 });
  } catch (error) {
    console.error("Error creating availability:", error);
    return NextResponse.json(
      { error: "Failed to create availability" },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id]/availability?availabilityId=xxx - Delete a specific availability slot
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const availabilityId = searchParams.get("availabilityId");

    if (!availabilityId) {
      return NextResponse.json(
        { error: "availabilityId query parameter is required" },
        { status: 400 }
      );
    }

    // Verify the availability belongs to this user
    const availability = await db.availability.findFirst({
      where: {
        id: availabilityId,
        userId: id,
      },
    });

    if (!availability) {
      return NextResponse.json(
        { error: "Availability slot not found" },
        { status: 404 }
      );
    }

    await db.availability.delete({
      where: { id: availabilityId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting availability:", error);
    return NextResponse.json(
      { error: "Failed to delete availability" },
      { status: 500 }
    );
  }
}
