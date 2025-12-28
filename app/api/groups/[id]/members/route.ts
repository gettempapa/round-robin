import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupId } = await params;
    const body = await request.json();

    const member = await db.groupMember.create({
      data: {
        userId: body.userId,
        groupId,
        weight: body.weight || 1,
      },
      include: {
        user: true,
      },
    });

    return NextResponse.json(member);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to add member" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId required" },
        { status: 400 }
      );
    }

    await db.groupMember.delete({
      where: {
        userId_groupId: {
          userId,
          groupId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 }
    );
  }
}
