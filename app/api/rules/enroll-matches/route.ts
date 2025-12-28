import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getNextUserInGroup } from "@/lib/routing-engine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ruleId, contactIds, groupId } = body;

    if (!ruleId || !contactIds || !Array.isArray(contactIds) || !groupId) {
      return NextResponse.json(
        { error: "ruleId, contactIds array, and groupId are required" },
        { status: 400 }
      );
    }

    const rule = await db.rule.findUnique({
      where: { id: ruleId },
    });

    if (!rule) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    const assignments = [];

    // Assign each contact to the group using round-robin
    for (const contactId of contactIds) {
      const contact = await db.contact.findUnique({
        where: { id: contactId },
        include: { assignments: true },
      });

      if (!contact) continue;

      // Skip if already assigned
      if (contact.assignments.length > 0) continue;

      const nextUser = await getNextUserInGroup(groupId);

      if (!nextUser) continue;

      const assignment = await db.assignment.create({
        data: {
          contactId: contact.id,
          userId: nextUser.id,
          groupId: groupId,
          ruleId: ruleId,
          method: "retroactive",
        },
        include: {
          user: true,
          group: true,
        },
      });

      assignments.push(assignment);
    }

    return NextResponse.json({
      enrolled: assignments.length,
      assignments,
    });
  } catch (error) {
    console.error("Error enrolling contacts:", error);
    return NextResponse.json(
      { error: "Failed to enroll contacts" },
      { status: 500 }
    );
  }
}
