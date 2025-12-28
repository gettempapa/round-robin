import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const trigger = await db.rulesetTrigger.create({
      data: {
        rulesetId: id,
        triggerType: body.triggerType,
      },
    });
    return NextResponse.json(trigger);
  } catch (error) {
    console.error("Error adding trigger:", error);
    return NextResponse.json(
      { error: "Failed to add trigger" },
      { status: 500 }
    );
  }
}
