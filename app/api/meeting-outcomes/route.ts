import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const outcomes = await db.meetingOutcome.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { bookings: true },
        },
      },
    });

    return NextResponse.json({ outcomes });
  } catch (error) {
    console.error("Error fetching meeting outcomes:", error);
    return NextResponse.json(
      { error: "Failed to fetch meeting outcomes" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, isPositive, isActive } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const outcome = await db.meetingOutcome.create({
      data: {
        name,
        description: description || null,
        isPositive: isPositive ?? true,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json({ outcome }, { status: 201 });
  } catch (error) {
    console.error("Error creating meeting outcome:", error);
    return NextResponse.json(
      { error: "Failed to create meeting outcome" },
      { status: 500 }
    );
  }
}
