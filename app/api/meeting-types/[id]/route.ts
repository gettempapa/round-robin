import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const meetingType = await db.meetingType.findUnique({
      where: { id },
      include: {
        _count: {
          select: { bookings: true },
        },
      },
    });

    if (!meetingType) {
      return NextResponse.json({ error: "Meeting type not found" }, { status: 404 });
    }

    return NextResponse.json({ meetingType });
  } catch (error) {
    console.error("Error fetching meeting type:", error);
    return NextResponse.json(
      { error: "Failed to fetch meeting type" },
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
    const { name, description, duration, color, isActive } = body;

    const meetingType = await db.meetingType.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(duration !== undefined && { duration }),
        ...(color !== undefined && { color }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ meetingType });
  } catch (error) {
    console.error("Error updating meeting type:", error);
    return NextResponse.json(
      { error: "Failed to update meeting type" },
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

    // Check if there are bookings using this type
    const bookingsCount = await db.booking.count({
      where: { meetingTypeId: id },
    });

    if (bookingsCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete meeting type with ${bookingsCount} existing bookings` },
        { status: 400 }
      );
    }

    await db.meetingType.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting meeting type:", error);
    return NextResponse.json(
      { error: "Failed to delete meeting type" },
      { status: 500 }
    );
  }
}
