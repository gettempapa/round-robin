import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/users/[id]/time-off - Get user's time off periods
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const timeOff = await db.timeOff.findMany({
      where: { userId: id },
      orderBy: { startDate: "asc" },
    });

    return NextResponse.json(timeOff);
  } catch (error) {
    console.error("Error fetching time off:", error);
    return NextResponse.json(
      { error: "Failed to fetch time off" },
      { status: 500 }
    );
  }
}

// POST /api/users/[id]/time-off - Add time off period
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { startDate, endDate, reason } = body;

    // Validate required fields
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "startDate and endDate are required" },
        { status: 400 }
      );
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      );
    }

    if (end < start) {
      return NextResponse.json(
        { error: "endDate must be after startDate" },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await db.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Create time off period
    const timeOff = await db.timeOff.create({
      data: {
        userId: id,
        startDate: start,
        endDate: end,
        reason: reason || null,
      },
    });

    return NextResponse.json(timeOff, { status: 201 });
  } catch (error) {
    console.error("Error creating time off:", error);
    return NextResponse.json(
      { error: "Failed to create time off" },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id]/time-off?timeOffId=xxx - Delete a time off period
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const timeOffId = searchParams.get("timeOffId");

    if (!timeOffId) {
      return NextResponse.json(
        { error: "timeOffId query parameter is required" },
        { status: 400 }
      );
    }

    // Verify the time off belongs to this user
    const timeOff = await db.timeOff.findFirst({
      where: {
        id: timeOffId,
        userId: id,
      },
    });

    if (!timeOff) {
      return NextResponse.json(
        { error: "Time off period not found" },
        { status: 404 }
      );
    }

    await db.timeOff.delete({
      where: { id: timeOffId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting time off:", error);
    return NextResponse.json(
      { error: "Failed to delete time off" },
      { status: 500 }
    );
  }
}
