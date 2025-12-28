import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const rules = await db.rule.findMany({
      include: {
        group: true,
      },
      orderBy: { priority: "asc" },
    });
    return NextResponse.json(rules);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch rules" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Get the highest priority number for this ruleset and add 1
    const highestPriority = await db.rule.findFirst({
      where: { rulesetId: body.rulesetId },
      orderBy: { priority: "desc" },
      select: { priority: true },
    });

    const rule = await db.rule.create({
      data: {
        name: body.name,
        description: body.description,
        rulesetId: body.rulesetId,
        groupId: body.groupId,
        priority: highestPriority ? highestPriority.priority + 1 : 0,
        isActive: body.isActive !== false,
        conditions: JSON.stringify(body.conditions),
      },
      include: {
        group: true,
      },
    });
    return NextResponse.json(rule);
  } catch (error) {
    console.error("Error creating rule:", error);
    return NextResponse.json(
      { error: "Failed to create rule" },
      { status: 500 }
    );
  }
}
