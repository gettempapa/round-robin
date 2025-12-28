import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST() {
  try {
    await db.salesforceIntegration.updateMany({
      where: { userId: 'default' }, // In production, use actual user ID
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Disconnect error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect' },
      { status: 500 }
    );
  }
}
