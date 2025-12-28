import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const user = await db.user.update({
      where: { id },
      data: {
        name: body.name,
        email: body.email,
        avatar: body.avatar,
        status: body.status,
        timezone: body.timezone,
        dailyCapacity: body.dailyCapacity ? parseInt(body.dailyCapacity) : null,
        weeklyCapacity: body.weeklyCapacity ? parseInt(body.weeklyCapacity) : null,
      },
    });
    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update user" },
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
    await db.user.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
