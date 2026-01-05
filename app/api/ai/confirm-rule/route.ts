import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { name, description, groupId, conditions, conditionLogic = "AND" } = await req.json();

    // Get or create a default ruleset
    let ruleset = await db.ruleset.findFirst({
      where: { isActive: true },
    });

    if (!ruleset) {
      ruleset = await db.ruleset.create({
        data: {
          name: "Default Ruleset",
          description: "Auto-created ruleset",
          isActive: true,
        },
      });
    }

    // Get max priority
    const maxPriority = await db.rule.aggregate({
      _max: { priority: true },
      where: { rulesetId: ruleset.id },
    });

    const rule = await db.rule.create({
      data: {
        name,
        description: description || null,
        groupId,
        rulesetId: ruleset.id,
        conditions: JSON.stringify(conditions),
        conditionLogic,
        priority: (maxPriority._max.priority || 0) + 1,
        isActive: true,
      },
      include: {
        group: true,
      },
    });

    return NextResponse.json({ success: true, rule });
  } catch (error) {
    console.error("Failed to create rule:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create rule" },
      { status: 500 }
    );
  }
}
