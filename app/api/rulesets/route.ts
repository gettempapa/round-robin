import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const rulesets = await db.ruleset.findMany({
      include: {
        rules: {
          include: {
            group: true,
          },
          orderBy: { priority: "asc" },
        },
        triggers: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(rulesets);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch rulesets" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const ruleset = await db.ruleset.create({
      data: {
        name: body.name,
        description: body.description,
        isActive: body.isActive !== false,
      },
      include: {
        rules: true,
        triggers: true,
      },
    });
    return NextResponse.json(ruleset);
  } catch (error) {
    console.error("Error creating ruleset:", error);
    return NextResponse.json(
      { error: "Failed to create ruleset" },
      { status: 500 }
    );
  }
}
