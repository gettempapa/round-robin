import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";
import { claudeTools } from "@/lib/ai/tools";
import { executeToolCall, ToolResult } from "@/lib/ai/tool-handlers";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Build rich system context from database
async function buildSystemContext() {
  const [contacts, users, groups, rulesets] = await Promise.all([
    db.contact.findMany({
      include: {
        assignments: {
          include: {
            user: true,
            group: true,
          },
        },
      },
    }),
    db.user.findMany({
      include: {
        assignments: true,
        groupMemberships: {
          include: { group: true },
        },
      },
    }),
    db.roundRobinGroup.findMany({
      include: {
        members: {
          include: { user: true },
        },
        _count: {
          select: { assignments: true },
        },
      },
    }),
    db.ruleset.findMany({
      include: {
        rules: {
          include: { group: true },
        },
      },
    }),
  ]);

  const unassignedContacts = contacts.filter((c) => c.assignments.length === 0);
  const recentContacts = contacts.filter((c) => {
    const daysAgo =
      (Date.now() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysAgo <= 7;
  });

  const userStats = users
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      assignmentCount: u.assignments.length,
      groups: u.groupMemberships.map((m: any) => m.group.name),
      isActive: u.status === 'active',
      dailyCapacity: u.dailyCapacity,
      weeklyCapacity: u.weeklyCapacity,
    }))
    .sort((a, b) => b.assignmentCount - a.assignmentCount);

  return `You are an AI assistant for RoundRobin, a lead routing platform. You can TAKE ACTIONS on behalf of the user using the tools provided. Be proactive and helpful.

**CURRENT SYSTEM STATE:**

CONTACTS:
- Total: ${contacts.length}
- Assigned: ${contacts.filter((c) => c.assignments.length > 0).length}
- Unassigned: ${unassignedContacts.length}
- Added this week: ${recentContacts.length}

UNASSIGNED CONTACTS:
${
  unassignedContacts
    .slice(0, 10)
    .map(
      (c) =>
        `- ID: ${c.id} | ${c.name} <${c.email}>${c.company ? ` | ${c.company}` : ""}${c.leadSource ? ` | Source: ${c.leadSource}` : ""}`
    )
    .join("\n") || "None"
}
${unassignedContacts.length > 10 ? `...and ${unassignedContacts.length - 10} more` : ""}

TEAM MEMBERS:
${userStats.map((u) => `- ID: ${u.id} | ${u.name} <${u.email}> | ${u.assignmentCount} assignments | Groups: ${u.groups.length > 0 ? u.groups.join(", ") : "None"} | ${u.isActive ? "Active" : "Inactive"}`).join("\n")}

GROUPS/TEAMS:
${groups.map((g) => `- ID: ${g.id} | ${g.name} | ${g.members.length} members | ${g._count.assignments} total assignments | Distribution: ${g.distributionMode || "equal"}`).join("\n")}

RULESETS & RULES:
${rulesets.map((r) => `- Ruleset: ${r.name} (ID: ${r.id}) - ${r.isActive ? "Active" : "Inactive"}\n${r.rules.map((rule) => `  - Rule: ${rule.name} (ID: ${rule.id}) → ${rule.group?.name || "No group"} | ${rule.isActive ? "Active" : "Inactive"}`).join("\n")}`).join("\n") || "No rulesets"}

**CAPABILITIES:**
You have tools to:
- Create, update, and delete contacts
- Assign and reassign contacts to users or groups
- Create and manage routing rules
- Create groups and manage team membership
- Create and update users
- View lists and statistics
- Navigate to specific pages

**BEHAVIOR GUIDELINES:**
1. When the user asks to DO something, USE THE APPROPRIATE TOOL. Don't just describe what you would do.
2. For destructive actions (delete), use requestConfirmation first.
3. When showing data, the tools will return UI components that render nicely in the chat.
4. Be concise in your text responses. The UI components do most of the work.
5. If multiple tools are needed, call them in sequence.
6. For queries about data, use the list/get tools to show rich UI cards.
7. When creating rules, make sure to use actual group IDs from the list above.
8. If the user's request is ambiguous, ask a clarifying question.
9. After performing actions, briefly confirm what was done.

**EXAMPLES:**
- "Create a contact for john@acme.com" → Use createContact tool
- "Show me unassigned contacts" → Use listContacts with filter: "unassigned"
- "Assign Sarah's leads to Mike" → Use reassignContact tool
- "Add a rule to route enterprise leads to sales" → Use createRule tool
- "Who has the most assignments?" → Use getAssignmentStats with groupBy: "user"
- "Take me to the rules page" → Use navigateTo with page: "rules"`;
}

export async function POST(req: NextRequest) {
  try {
    const { message, conversationHistory, confirmationResponse } = await req.json();

    const systemContext = await buildSystemContext();

    // Convert conversation history to Anthropic format
    const messages: Anthropic.MessageParam[] = [
      ...(conversationHistory || []).map((msg: any) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      {
        role: "user" as const,
        content: message,
      },
    ];

    // Call Claude with tools
    let response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemContext,
      tools: claudeTools as any,
      messages,
    });

    // Process tool calls in a loop until we get a final response
    const toolResults: Array<{ tool: string; result: ToolResult }> = [];
    let textContent = "";

    while (response.stop_reason === "tool_use") {
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
      );

      // Also capture any text content
      const textBlocks = response.content.filter(
        (block): block is Anthropic.TextBlock => block.type === "text"
      );
      if (textBlocks.length > 0) {
        textContent += textBlocks.map((b) => b.text).join("\n");
      }

      // Execute all tool calls
      const toolResultsForClaude: Anthropic.ToolResultBlockParam[] = [];

      for (const toolUse of toolUseBlocks) {
        const result = await executeToolCall(toolUse.name, toolUse.input);
        toolResults.push({ tool: toolUse.name, result });

        toolResultsForClaude.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        });
      }

      // Continue the conversation with tool results
      response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemContext,
        tools: claudeTools as any,
        messages: [
          ...messages,
          { role: "assistant", content: response.content },
          { role: "user", content: toolResultsForClaude },
        ],
      });
    }

    // Get final text response
    const finalTextBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === "text"
    );
    if (finalTextBlocks.length > 0) {
      textContent += (textContent ? "\n" : "") + finalTextBlocks.map((b) => b.text).join("\n");
    }

    // Build response with text and UI components
    return NextResponse.json({
      message: textContent || "Done!",
      toolResults: toolResults.map((tr) => ({
        tool: tr.tool,
        success: tr.result.success,
        error: tr.result.error,
        uiComponent: tr.result.uiComponent,
        data: tr.result.data,
      })),
    });
  } catch (error) {
    console.error("AI chat error:", error);
    return NextResponse.json(
      {
        message:
          "I encountered an error processing your request. Please try again.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
