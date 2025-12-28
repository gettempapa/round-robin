import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/webhooks/logs?status=pending&limit=10
// Retrieve webhook logs (useful for polling integrations like Workato)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50");
    const source = searchParams.get("source") || undefined;

    const logs = await db.webhookLog.findMany({
      where: {
        ...(status && { status }),
        ...(source && { source }),
      },
      orderBy: {
        createdAt: "desc",
      },
      take: Math.min(limit, 100), // Cap at 100
    });

    // Parse JSON payloads for easier consumption
    const formattedLogs = logs.map((log) => ({
      ...log,
      payload: log.payload ? JSON.parse(log.payload) : null,
    }));

    return NextResponse.json(formattedLogs);
  } catch (error) {
    console.error("Error fetching webhook logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch webhook logs" },
      { status: 500 }
    );
  }
}
