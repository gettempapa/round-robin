import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const users = await db.user.findMany({
      include: {
        _count: {
          select: {
            groupMemberships: true,
            assignments: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = await db.user.create({
      data: {
        name: body.name,
        email: body.email,
        avatar: body.avatar,
        status: body.status || "active",
        timezone: body.timezone || "America/New_York",
        dailyCapacity: body.dailyCapacity ? parseInt(body.dailyCapacity) : null,
        weeklyCapacity: body.weeklyCapacity ? parseInt(body.weeklyCapacity) : null,
      },
    });
    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
