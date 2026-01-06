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

  return `You are an AI assistant for a lead routing app. Execute actions directly using tools. Be extremely concise.

**RESPONSE STYLE:**
- One sentence max for confirmations
- No explanations or commentary unless asked
- No speculation about what things "appear to be"
- Just report facts and results

**SYSTEM DATA:**

GROUPS: ${groups.map((g) => `${g.name} (ID: ${g.id})`).join(", ")}

TEAM: ${userStats.map((u) => `${u.name} (ID: ${u.id})`).join(", ")}

**TOOLS:**
- listContacts: Use soqlCondition for precise filtering (e.g., "Name LIKE 'N%'" for names starting with N)
- createRule: Use soqlCondition for rule conditions
- navigateTo: Navigate and optionally filter page content
- Other tools: create/update/delete contacts, assign, manage groups

**CRITICAL:**
- For search/filter requests: Navigate to the page WITH the filter applied, so results show in the main UI
- Use exact SOQL syntax: "Name LIKE 'N%'" (starts with), "Industry = 'Tech'" (equals), etc.
- Match only what user asked for - no extra results`;
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
    let pendingConfirmation = false;

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

        // Check if this is a pending confirmation (needs user approval before action)
        if (result.data?.pending === true) {
          pendingConfirmation = true;
        }

        toolResultsForClaude.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        });
      }

      // If we have a pending confirmation, break out to show it to the user
      // Don't continue the Claude conversation - wait for user to confirm
      if (pendingConfirmation) {
        break;
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

    // Get final text response (only if not a pending confirmation)
    if (!pendingConfirmation) {
      const finalTextBlocks = response.content.filter(
        (block): block is Anthropic.TextBlock => block.type === "text"
      );
      if (finalTextBlocks.length > 0) {
        textContent += (textContent ? "\n" : "") + finalTextBlocks.map((b) => b.text).join("\n");
      }
    }

    // Build response with text and UI components
    return NextResponse.json({
      message: pendingConfirmation
        ? "Please review and confirm:"
        : (textContent || "Done!"),
      toolResults: toolResults.map((tr) => ({
        tool: tr.tool,
        success: tr.result.success,
        error: tr.result.error,
        uiComponent: tr.result.uiComponent,
        data: tr.result.data,
      })),
      pendingConfirmation,
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
