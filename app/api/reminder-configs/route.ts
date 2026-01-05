import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const configs = await db.reminderConfig.findMany({
      orderBy: { minutesBefore: 'desc' },
      include: {
        _count: {
          select: { reminders: true },
        },
      },
    });

    return NextResponse.json({ configs });
  } catch (error) {
    console.error("Error fetching reminder configs:", error);
    return NextResponse.json(
      { error: "Failed to fetch reminder configs" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, minutesBefore, emailSubject, emailBody, isActive } = body;

    if (!name || minutesBefore === undefined) {
      return NextResponse.json(
        { error: "Name and minutesBefore are required" },
        { status: 400 }
      );
    }

    // Check for duplicate timing
    const existing = await db.reminderConfig.findFirst({
      where: { minutesBefore },
    });

    if (existing) {
      return NextResponse.json(
        { error: `A reminder config for ${minutesBefore} minutes already exists` },
        { status: 400 }
      );
    }

    const config = await db.reminderConfig.create({
      data: {
        name,
        minutesBefore,
        emailSubject: emailSubject || "Reminder: Your upcoming meeting",
        emailBody: emailBody || null,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json({ config }, { status: 201 });
  } catch (error) {
    console.error("Error creating reminder config:", error);
    return NextResponse.json(
      { error: "Failed to create reminder config" },
      { status: 500 }
    );
  }
}
