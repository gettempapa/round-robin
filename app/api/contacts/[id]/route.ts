import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const contact = await db.contact.findUnique({
      where: { id },
      include: {
        assignments: {
          include: {
            user: true,
            group: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Fetch rules for assignments
    const ruleIds = contact.assignments
      .filter((a) => a.ruleId)
      .map((a) => a.ruleId as string);

    const rules = ruleIds.length > 0
      ? await db.rule.findMany({
          where: { id: { in: ruleIds } },
        })
      : [];

    const rulesMap = new Map(rules.map((r) => [r.id, r]));

    // Attach rule details to assignments
    const assignmentsWithRules = contact.assignments.map((assignment) => ({
      ...assignment,
      rule: assignment.ruleId ? rulesMap.get(assignment.ruleId) : null,
    }));

    return NextResponse.json({
      ...contact,
      assignments: assignmentsWithRules,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch contact" },
      { status: 500 }
    );
  }
}
