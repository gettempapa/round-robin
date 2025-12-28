import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // First, get all assignments
    const allAssignments = await db.assignment.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // Then fetch the related data separately to avoid null constraint errors
    const assignments = await Promise.all(
      allAssignments.map(async (assignment) => {
        const [contact, user, group] = await Promise.all([
          db.contact.findUnique({ where: { id: assignment.contactId } }),
          db.user.findUnique({ where: { id: assignment.userId } }),
          db.roundRobinGroup.findUnique({ where: { id: assignment.groupId } }),
        ]);

        return {
          ...assignment,
          contact,
          user,
          group,
        };
      })
    );

    // Filter out assignments with missing required relations
    const validAssignments = assignments.filter(
      (a) => a.contact && a.user && a.group
    );

    // Fetch rules for assignments that have ruleId
    const ruleIds = validAssignments
      .filter((a) => a.ruleId)
      .map((a) => a.ruleId as string);

    const rules = ruleIds.length > 0
      ? await db.rule.findMany({
          where: { id: { in: ruleIds } },
        })
      : [];

    return NextResponse.json({ assignments: validAssignments, rules });
  } catch (error) {
    console.error("Error in activity API:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity", assignments: [], rules: [] },
      { status: 500 }
    );
  }
}
