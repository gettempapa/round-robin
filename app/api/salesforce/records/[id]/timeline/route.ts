import { NextRequest, NextResponse } from "next/server";
import { getRecordTimeline } from "@/lib/salesforce";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get Salesforce timeline
    const { record, timeline } = await getRecordTimeline(id);

    // Try to find local contact by email to get RoundRobin assignments
    let localContact = null;
    if (record.email) {
      localContact = await db.contact.findFirst({
        where: { email: record.email },
        include: {
          assignments: {
            include: {
              user: true,
              group: true,
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    }

    // Get rule names for assignments
    const ruleIds = localContact?.assignments
      .filter(a => a.ruleId)
      .map(a => a.ruleId as string) || [];

    const rules = ruleIds.length > 0
      ? await db.rule.findMany({ where: { id: { in: ruleIds } } })
      : [];

    const ruleMap = new Map(rules.map(r => [r.id, r]));

    // Add RoundRobin routing events to timeline
    const roundRobinEvents = localContact?.assignments.map((assignment) => {
      // Parse metadata for matched conditions
      let matchedConditions = null;
      let ruleName = null;

      if (assignment.metadata) {
        try {
          const meta = JSON.parse(assignment.metadata);
          matchedConditions = meta.conditions;
          ruleName = meta.matchedRule?.name;
        } catch (e) {}
      }

      // Fallback to rule lookup if not in metadata
      if (!ruleName && assignment.ruleId) {
        ruleName = ruleMap.get(assignment.ruleId)?.name;
      }

      return {
        id: `rr-${assignment.id}`,
        type: 'routing' as const,
        title: assignment.method === 'auto' ? 'Auto-Routed' : 'Manually Routed',
        description: `Assigned to ${assignment.user.name} via ${assignment.group.name}`,
        timestamp: assignment.createdAt.toISOString(),
        actor: { id: '', name: 'RoundRobin' },
        metadata: {
          assignmentId: assignment.id,
          userId: assignment.userId,
          userName: assignment.user.name,
          groupId: assignment.groupId,
          groupName: assignment.group.name,
          method: assignment.method,
          ruleId: assignment.ruleId,
          ruleName,
          matchedConditions,
        },
        icon: 'shuffle',
        color: 'primary',
      };
    }) || [];

    // Merge and sort all events
    const allEvents = [...timeline, ...roundRobinEvents].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json({
      record,
      timeline: allEvents,
      localContact: localContact ? {
        id: localContact.id,
        assignmentCount: localContact.assignments.length,
      } : null,
    });
  } catch (error) {
    console.error('Timeline error:', error);

    if (error instanceof Error && error.message === 'Not connected to Salesforce') {
      return NextResponse.json(
        { error: 'Not connected to Salesforce', connected: false },
        { status: 401 }
      );
    }

    if (error instanceof Error && error.message === 'Record not found') {
      return NextResponse.json(
        { error: 'Record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch timeline' },
      { status: 500 }
    );
  }
}
