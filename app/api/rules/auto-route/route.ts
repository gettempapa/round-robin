import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSalesforceConnection } from "@/lib/salesforce";

// Evaluate a SOQL condition against a record
function evaluateSoqlCondition(condition: string, record: any): boolean {
  // Simple evaluation - parse common SOQL patterns
  // This handles: Field = 'Value', Field != 'Value', Field LIKE '%pattern%', Field IN ('a','b')

  try {
    // Handle AND/OR by splitting (simplified - doesn't handle nested parens)
    const andParts = condition.split(/\s+AND\s+/i);

    for (const part of andParts) {
      const orParts = part.split(/\s+OR\s+/i);
      let orMatched = false;

      for (const orPart of orParts) {
        if (evaluateSingleCondition(orPart.trim(), record)) {
          orMatched = true;
          break;
        }
      }

      if (!orMatched && orParts.length > 0) {
        return false; // AND condition failed
      }
    }

    return true;
  } catch (e) {
    console.error('Error evaluating SOQL condition:', condition, e);
    return false;
  }
}

function evaluateSingleCondition(condition: string, record: any): boolean {
  // Parse: Field = 'Value'
  let match = condition.match(/^(\w+)\s*=\s*'([^']*)'$/i);
  if (match) {
    const [, field, value] = match;
    return String(record[field] || '').toLowerCase() === value.toLowerCase();
  }

  // Parse: Field != 'Value'
  match = condition.match(/^(\w+)\s*!=\s*'([^']*)'$/i);
  if (match) {
    const [, field, value] = match;
    return String(record[field] || '').toLowerCase() !== value.toLowerCase();
  }

  // Parse: Field LIKE '%pattern%'
  match = condition.match(/^(\w+)\s+LIKE\s+'([^']*)'$/i);
  if (match) {
    const [, field, pattern] = match;
    const fieldValue = String(record[field] || '').toLowerCase();
    const regex = new RegExp('^' + pattern.toLowerCase().replace(/%/g, '.*') + '$');
    return regex.test(fieldValue);
  }

  // Parse: Field IN ('a', 'b', 'c')
  match = condition.match(/^(\w+)\s+IN\s*\(([^)]+)\)$/i);
  if (match) {
    const [, field, valueList] = match;
    const values = valueList.split(',').map(v => v.trim().replace(/^'|'$/g, '').toLowerCase());
    return values.includes(String(record[field] || '').toLowerCase());
  }

  // Parse: Field > number or Field >= number
  match = condition.match(/^(\w+)\s*(>=?|<=?)\s*(\d+)$/i);
  if (match) {
    const [, field, operator, numStr] = match;
    const fieldValue = parseFloat(record[field]) || 0;
    const compareValue = parseFloat(numStr);
    switch (operator) {
      case '>': return fieldValue > compareValue;
      case '>=': return fieldValue >= compareValue;
      case '<': return fieldValue < compareValue;
      case '<=': return fieldValue <= compareValue;
    }
  }

  // Parse: Field = null or Field != null
  match = condition.match(/^(\w+)\s*(=|!=)\s*null$/i);
  if (match) {
    const [, field, operator] = match;
    const isNull = record[field] === null || record[field] === undefined || record[field] === '';
    return operator === '=' ? isNull : !isNull;
  }

  return false;
}

export async function POST(req: NextRequest) {
  const debug: any[] = [];

  try {
    const conn = await getSalesforceConnection();
    if (!conn) {
      return NextResponse.json({ error: "Not connected to Salesforce", debug }, { status: 401 });
    }
    debug.push("Connected to Salesforce");

    // Get the queue name to look for (default: RevOps Queue)
    const { queueName = "RevOps Queue" } = await req.json().catch(() => ({}));
    debug.push(`Looking for queue: ${queueName}`);

    // Find the queue by name - also try searching all queues
    const allQueuesResult = await conn.query(`
      SELECT Id, Name FROM Group WHERE Type = 'Queue' LIMIT 20
    `);
    debug.push(`All queues in org: ${allQueuesResult.records.map((q: any) => q.Name).join(', ') || 'none'}`);

    const queueResult = await conn.query(`
      SELECT Id, Name FROM Group WHERE Type = 'Queue' AND Name = '${queueName}' LIMIT 1
    `);

    if (queueResult.records.length === 0) {
      return NextResponse.json({
        error: `Queue "${queueName}" not found`,
        availableQueues: allQueuesResult.records.map((q: any) => q.Name),
        routed: 0,
        checked: 0,
        debug,
      });
    }

    const queueId = (queueResult.records[0] as any).Id;
    debug.push(`Found queue ${queueName} with ID ${queueId}`);
    console.log(`Auto-route: Found queue ${queueName} with ID ${queueId}`);

    // Find leads owned by this queue
    const leadsResult = await conn.query(`
      SELECT Id, Name, Email, Company, Industry, LeadSource, Status,
             AnnualRevenue, NumberOfEmployees, Country, State, Title
      FROM Lead
      WHERE OwnerId = '${queueId}' AND IsConverted = false
      LIMIT 100
    `);

    const leads = leadsResult.records as any[];
    debug.push(`Found ${leads.length} leads in queue`);
    debug.push(`Lead samples: ${leads.slice(0, 3).map((l: any) => `${l.Name} (Industry: ${l.Industry}, Source: ${l.LeadSource}, Company: ${l.Company})`).join('; ')}`);
    console.log(`Auto-route: Found ${leads.length} leads in queue`);

    if (leads.length === 0) {
      return NextResponse.json({
        message: "No leads in queue",
        routed: 0,
        checked: 0,
        queueName,
        debug,
      });
    }

    // Get active rules ordered by priority
    const rules = await db.rule.findMany({
      where: {
        isActive: true,
        objectType: { in: ["Lead", "Both"] },
      },
      include: {
        group: {
          include: {
            members: {
              include: { user: true },
            },
          },
        },
      },
      orderBy: { priority: 'asc' },
    });

    debug.push(`Found ${rules.length} active rules`);
    debug.push(`Rules: ${rules.map(r => `"${r.name}" (condition: ${r.soqlCondition || 'none'}, group: ${r.group?.name || 'no group'})`).join('; ')}`);
    console.log(`Auto-route: Found ${rules.length} active rules`);

    const results: any[] = [];
    const noMatchReasons: any[] = [];
    let routedCount = 0;

    // Process each lead
    for (const lead of leads) {
      // Find first matching rule
      let matchedRule = null;
      const leadEvaluation: any = {
        leadName: lead.Name,
        leadFields: {
          Industry: lead.Industry,
          LeadSource: lead.LeadSource,
          Company: lead.Company,
          AnnualRevenue: lead.AnnualRevenue,
          NumberOfEmployees: lead.NumberOfEmployees,
          Country: lead.Country,
          State: lead.State,
        },
        ruleEvaluations: [],
      };

      for (const rule of rules) {
        const condition = rule.soqlCondition || '';
        if (!condition) {
          leadEvaluation.ruleEvaluations.push({
            ruleName: rule.name,
            condition: 'none',
            result: 'skipped - no condition',
          });
          continue;
        }

        const matches = evaluateSoqlCondition(condition, lead);
        leadEvaluation.ruleEvaluations.push({
          ruleName: rule.name,
          condition,
          result: matches ? 'MATCHED' : 'no match',
          hasGroup: !!rule.group,
          groupMembers: rule.group?.members.length || 0,
        });

        if (matches) {
          matchedRule = rule;
          break;
        }
      }

      if (!matchedRule) {
        noMatchReasons.push(leadEvaluation);
      }

      if (matchedRule && !matchedRule.group) {
        leadEvaluation.assignmentFailure = `Rule "${matchedRule.name}" matched but has no group assigned`;
        noMatchReasons.push(leadEvaluation);
      }

      if (matchedRule && matchedRule.group) {
        // Get next user from round-robin group (filter by active users)
        const activeMembers = matchedRule.group.members.filter(m => m.user.status === 'active');

        if (activeMembers.length === 0) {
          leadEvaluation.assignmentFailure = `Rule "${matchedRule.name}" matched but group has no active members`;
          noMatchReasons.push(leadEvaluation);
        }

        if (activeMembers.length > 0) {
          // Simple round-robin based on assignment counts - pick user with fewest assignments
          const userAssignmentCounts = await db.assignment.groupBy({
            by: ['userId'],
            where: {
              groupId: matchedRule.groupId,
              userId: { in: activeMembers.map(m => m.userId) },
            },
            _count: { id: true },
          });

          // Build a map of userId -> count
          const countMap = new Map<string, number>();
          for (const member of activeMembers) {
            const found = userAssignmentCounts.find(c => c.userId === member.userId);
            countMap.set(member.userId, found?._count.id || 0);
          }

          // Find member with lowest count
          let minCount = Infinity;
          let assignee = activeMembers[0];
          for (const member of activeMembers) {
            const count = countMap.get(member.userId) || 0;
            if (count < minCount) {
              minCount = count;
              assignee = member;
            }
          }

          // Get the Salesforce user ID for this assignee
          // First check if we have it stored, otherwise match by email
          let sfUserId = assignee.user.salesforceUserId;

          if (!sfUserId) {
            const sfUserResult = await conn.query(`
              SELECT Id, Name, Email FROM User WHERE Email = '${assignee.user.email}' LIMIT 1
            `);

            if (sfUserResult.records.length > 0) {
              sfUserId = (sfUserResult.records[0] as any).Id;
              // Store it for future use
              await db.user.update({
                where: { id: assignee.user.id },
                data: { salesforceUserId: sfUserId },
              });
            }
          }

          if (sfUserId) {
            // Update the lead owner in Salesforce
            await conn.sobject('Lead').update({
              Id: lead.Id,
              OwnerId: sfUserId,
            });

            // Increment rule match count
            await db.rule.update({
              where: { id: matchedRule.id },
              data: { matchCount: { increment: 1 } },
            });

            routedCount++;
            results.push({
              leadId: lead.Id,
              leadName: lead.Name,
              ruleName: matchedRule.name,
              assignedTo: assignee.user.name,
              groupName: matchedRule.group.name,
            });

            console.log(`Auto-route: Routed ${lead.Name} to ${assignee.user.name} via rule "${matchedRule.name}"`);
          } else {
            leadEvaluation.assignmentFailure = `Rule "${matchedRule.name}" matched but couldn't find SF user for ${assignee.user.email}`;
            noMatchReasons.push(leadEvaluation);
            console.log(`Auto-route: Could not find SF user for ${assignee.user.email}`);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      checked: leads.length,
      routed: routedCount,
      queueName,
      results,
      timestamp: new Date().toISOString(),
      debug,
      noMatchReasons: noMatchReasons.slice(0, 5), // Show first 5 non-matching leads with details
    });
  } catch (error) {
    console.error("Auto-route error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// GET to check status
export async function GET() {
  return NextResponse.json({
    message: "Auto-route endpoint. POST to trigger routing.",
    usage: "POST with optional { queueName: 'Queue Name' }",
  });
}
