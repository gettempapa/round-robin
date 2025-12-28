import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rule = await db.rule.findUnique({
      where: { id },
      include: {
        group: true,
      },
    });

    if (!rule) {
      return NextResponse.json(
        { error: "Rule not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(rule);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch rule" },
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
    const rule = await db.rule.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description,
        rulesetId: body.rulesetId,
        groupId: body.groupId,
        isActive: body.isActive,
        conditions: body.conditions ? JSON.stringify(body.conditions) : undefined,
      },
      include: {
        group: true,
      },
    });
    return NextResponse.json(rule);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update rule" },
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
    await db.rule.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete rule" },
      { status: 500 }
    );
  }
}
