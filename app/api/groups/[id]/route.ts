import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const group = await db.roundRobinGroup.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: true,
          },
        },
        _count: {
          select: {
            rules: true,
            assignments: true,
          },
        },
      },
    });

    if (!group) {
      return NextResponse.json(
        { error: "Group not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(group);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch group" },
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
    const group = await db.roundRobinGroup.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description,
        distributionMode: body.distributionMode,
        isActive: body.isActive,
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });
    return NextResponse.json(group);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update group" },
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
    await db.roundRobinGroup.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete group" },
      { status: 500 }
    );
  }
}
