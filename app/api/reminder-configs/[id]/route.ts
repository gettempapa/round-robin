import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const config = await db.reminderConfig.findUnique({
      where: { id },
      include: {
        _count: {
          select: { reminders: true },
        },
      },
    });

    if (!config) {
      return NextResponse.json({ error: "Reminder config not found" }, { status: 404 });
    }

    return NextResponse.json({ config });
  } catch (error) {
    console.error("Error fetching reminder config:", error);
    return NextResponse.json(
      { error: "Failed to fetch reminder config" },
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
    const { name, minutesBefore, emailSubject, emailBody, isActive } = body;

    // Check for duplicate timing if minutesBefore is being changed
    if (minutesBefore !== undefined) {
      const existing = await db.reminderConfig.findFirst({
        where: {
          minutesBefore,
          id: { not: id },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: `A reminder config for ${minutesBefore} minutes already exists` },
          { status: 400 }
        );
      }
    }

    const config = await db.reminderConfig.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(minutesBefore !== undefined && { minutesBefore }),
        ...(emailSubject !== undefined && { emailSubject }),
        ...(emailBody !== undefined && { emailBody }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ config });
  } catch (error) {
    console.error("Error updating reminder config:", error);
    return NextResponse.json(
      { error: "Failed to update reminder config" },
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

    // Delete associated reminders first
    await db.meetingReminder.deleteMany({
      where: { reminderConfigId: id },
    });

    await db.reminderConfig.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting reminder config:", error);
    return NextResponse.json(
      { error: "Failed to delete reminder config" },
      { status: 500 }
    );
  }
}
