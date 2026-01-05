import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const meetingTypes = await db.meetingType.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { bookings: true },
        },
      },
    });

    return NextResponse.json({ meetingTypes });
  } catch (error) {
    console.error("Error fetching meeting types:", error);
    return NextResponse.json(
      { error: "Failed to fetch meeting types" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, duration, color, isActive } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const meetingType = await db.meetingType.create({
      data: {
        name,
        description: description || null,
        duration: duration || 30,
        color: color || null,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json({ meetingType }, { status: 201 });
  } catch (error) {
    console.error("Error creating meeting type:", error);
    return NextResponse.json(
      { error: "Failed to create meeting type" },
      { status: 500 }
    );
  }
}
