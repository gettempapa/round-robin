import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const groups = await db.roundRobinGroup.findMany({
      include: {
        members: {
          include: {
            user: true,
          },
        },
        rules: {
          select: {
            id: true,
            name: true,
            isActive: true,
            ruleset: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            rules: true,
            assignments: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(groups);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch groups" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const group = await db.roundRobinGroup.create({
      data: {
        name: body.name,
        description: body.description,
        distributionMode: body.distributionMode || "equal",
        isActive: body.isActive !== false,
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });
    return NextResponse.json(group);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create group" },
      { status: 500 }
    );
  }
}
