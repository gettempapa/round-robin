import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conditions, conditionLogic } = body;

    if (!conditions || !Array.isArray(conditions)) {
      return NextResponse.json(
        { error: "conditions array is required" },
        { status: 400 }
      );
    }

    // Build the where clause based on conditions
    const whereConditions: any[] = [];

    for (const condition of conditions) {
      const { field, operator, value } = condition;

      // Skip conditions with empty values unless operator doesn't need a value
      const operatorsWithoutValue = ["isBlank", "isPresent"];
      if (!operatorsWithoutValue.includes(operator) && (!value || value.trim() === "")) {
        continue; // Skip this condition
      }

      let whereClause: any = {};

      switch (operator) {
        case "equals":
          whereClause[field] = value;
          break;
        case "notEquals":
          whereClause[field] = { not: value };
          break;
        case "contains":
          whereClause[field] = { contains: value, mode: "insensitive" };
          break;
        case "notContains":
          whereClause[field] = { not: { contains: value, mode: "insensitive" } };
          break;
        case "startsWith":
          whereClause[field] = { startsWith: value, mode: "insensitive" };
          break;
        case "isBlank":
          whereClause[field] = null;
          break;
        case "isPresent":
          whereClause[field] = { not: null };
          break;
        case "greaterThan":
          whereClause[field] = { gt: value };
          break;
        case "lessThan":
          whereClause[field] = { lt: value };
          break;
        default:
          whereClause[field] = value;
      }

      whereConditions.push(whereClause);
    }

    // If no valid conditions, return empty result
    if (whereConditions.length === 0) {
      return NextResponse.json({
        count: 0,
        contacts: [],
      });
    }

    // Combine conditions based on logic
    const where =
      conditionLogic === "OR"
        ? { OR: whereConditions }
        : { AND: whereConditions };

    // Query contacts
    console.log("Preview matches where clause:", JSON.stringify(where, null, 2));

    const contacts = await db.contact.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
        leadSource: true,
        industry: true,
        country: true,
        companySize: true,
      },
      take: 50, // Limit to 50 for performance
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      count: contacts.length,
      contacts,
    });
  } catch (error) {
    console.error("Error previewing matches:", error);
    console.error("Error details:", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: "Failed to preview matches", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
