import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { ROUTING_FIELDS } from "@/lib/routing-context";

type RuleSuggestion = {
  name: string;
  description: string;
  conditions: Array<{
    field: string;
    operator: string;
    value: string;
  }>;
  conditionLogic: string;
  groupId?: string;
  groupName?: string;
  confidence: number;
  explanation: string;
};

// Pattern matching fallback (used if API key not set or API fails)
function patternMatchingFallback(
  input: string,
  availableGroups: Array<{ id: string; name: string }>
): RuleSuggestion {
  const lowerInput = input.toLowerCase();
  const conditions: Array<{ field: string; operator: string; value: string }> = [];
  let groupName = "";
  let confidence = 0.7;

  // Extract patterns (simplified version)
  if (lowerInput.includes("enterprise")) {
    conditions.push({ field: "companySize", operator: "equals", value: "Enterprise" });
    confidence += 0.1;
  } else if (lowerInput.includes("smb")) {
    conditions.push({ field: "companySize", operator: "equals", value: "SMB" });
    confidence += 0.1;
  }

  if (lowerInput.includes("website")) {
    conditions.push({ field: "leadSource", operator: "equals", value: "Website" });
    confidence += 0.1;
  } else if (lowerInput.includes("google ads")) {
    conditions.push({ field: "leadSource", operator: "equals", value: "Google Ads" });
    confidence += 0.1;
  }

  // Match group name
  for (const group of availableGroups) {
    if (lowerInput.includes(group.name.toLowerCase())) {
      groupName = group.name;
      confidence += 0.15;
      break;
    }
  }

  if (conditions.length === 0) {
    conditions.push({ field: "leadSource", operator: "equals", value: "Website" });
    confidence = 0.4;
  }

  const ruleName = `Route ${conditions[0].value} records`;
  const description = `Automatically routes records where ${conditions.map(c => `${c.field} ${c.operator} "${c.value}"`).join(" and ")}`;
  const explanation = `Based on your description, I've created a rule using pattern matching.`;

  return {
    name: ruleName,
    description,
    conditions,
    conditionLogic: "AND",
    groupId: availableGroups.find((g) => g.name === groupName)?.id,
    groupName,
    confidence,
    explanation,
  };
}

async function interpretRuleWithClaude(
  userInput: string,
  availableGroups: Array<{ id: string; name: string }>
): Promise<RuleSuggestion> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const groupsList = availableGroups.map((g) => g.name).join(", ");
  const fieldsList = ROUTING_FIELDS.map((field) => {
    const examples = field.examples ? ` e.g., ${field.examples.join(", ")}` : "";
    return `- ${field.value} (${field.label}): ${field.description}${examples}`;
  }).join("\n");

  const prompt = `You are an expert at converting natural language into routing rule logic.
Rules are object-agnostic across Lead, Contact, and Account records. Do not mention object types in the output.

Available fields:
${fieldsList}

Available operators:
- equals: exact match (use this for "is")
- notEquals: inverse match (use this for "is not")
- contains: substring match
- notContains: inverse substring match (use this for "does not contain")
- startsWith: prefix match
- isBlank: field is empty or null (use when user says "is blank", "is empty", or "is missing")
- isPresent: field has a value (use when user says "is present", "is known", "exists", or "has a value")
- greaterThan: numeric comparison
- lessThan: numeric comparison

Available groups: ${groupsList}

User request: "${userInput}"

Convert this into a routing rule. Return ONLY valid JSON (no markdown, no explanation) in this exact format:
{
  "name": "Brief rule name (e.g., 'Route Enterprise Leads')",
  "description": "One sentence description of what this rule does",
  "conditions": [
    {
      "field": "fieldName",
      "operator": "operatorName",
      "value": "value"
    }
  ],
  "conditionLogic": "AND or OR",
  "groupName": "name of the target group from available groups, or empty string if not clear",
  "confidence": 0.95,
  "explanation": "Brief explanation of how you interpreted the request"
}`;

  const message = await anthropic.messages.create({
    model: "claude-3-5-haiku-20241022",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  // Extract JSON from response
  const textContent = message.content[0];
  if (textContent.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  let responseText = textContent.text.trim();

  // Remove markdown code blocks if present
  responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "");

  const result = JSON.parse(responseText);

  // Find the actual group ID
  const matchedGroup = availableGroups.find(
    (g) => g.name.toLowerCase() === result.groupName?.toLowerCase()
  );

  return {
    name: result.name,
    description: result.description,
    conditions: result.conditions,
    conditionLogic: result.conditionLogic || "AND",
    groupId: matchedGroup?.id,
    groupName: matchedGroup?.name || result.groupName,
    confidence: result.confidence || 0.95,
    explanation: result.explanation,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userInput, availableGroups } = body;

    if (!userInput || !availableGroups) {
      return NextResponse.json(
        { error: "userInput and availableGroups are required" },
        { status: 400 }
      );
    }

    let suggestion: RuleSuggestion;

    // Try Claude API first if key is available
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        console.log("Using Claude API for rule interpretation");
        suggestion = await interpretRuleWithClaude(userInput, availableGroups);
      } catch (error) {
        console.error("Claude API failed, falling back to pattern matching:", error);
        suggestion = patternMatchingFallback(userInput, availableGroups);
      }
    } else {
      console.log("No ANTHROPIC_API_KEY found, using pattern matching");
      suggestion = patternMatchingFallback(userInput, availableGroups);
    }

    return NextResponse.json({ suggestion });
  } catch (error) {
    console.error("Error interpreting rule:", error);
    return NextResponse.json(
      { error: "Failed to interpret rule" },
      { status: 500 }
    );
  }
}
