import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const outcome = await db.meetingOutcome.findUnique({
      where: { id },
      include: {
        _count: {
          select: { bookings: true },
        },
      },
    });

    if (!outcome) {
      return NextResponse.json({ error: "Meeting outcome not found" }, { status: 404 });
    }

    return NextResponse.json({ outcome });
  } catch (error) {
    console.error("Error fetching meeting outcome:", error);
    return NextResponse.json(
      { error: "Failed to fetch meeting outcome" },
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
    const { name, description, isPositive, isActive } = body;

    const outcome = await db.meetingOutcome.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(isPositive !== undefined && { isPositive }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ outcome });
  } catch (error) {
    console.error("Error updating meeting outcome:", error);
    return NextResponse.json(
      { error: "Failed to update meeting outcome" },
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

    // Check if there are bookings using this outcome
    const bookingsCount = await db.booking.count({
      where: { outcomeId: id },
    });

    if (bookingsCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete outcome with ${bookingsCount} existing bookings` },
        { status: 400 }
      );
    }

    await db.meetingOutcome.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting meeting outcome:", error);
    return NextResponse.json(
      { error: "Failed to delete meeting outcome" },
      { status: 500 }
    );
  }
}
