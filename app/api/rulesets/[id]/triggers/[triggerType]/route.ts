import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; triggerType: string }> }
) {
  try {
    const { id, triggerType } = await params;

    await db.rulesetTrigger.deleteMany({
      where: {
        rulesetId: id,
        triggerType: triggerType,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing trigger:", error);
    return NextResponse.json(
      { error: "Failed to remove trigger" },
      { status: 500 }
    );
  }
}
