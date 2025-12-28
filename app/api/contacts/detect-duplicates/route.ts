import { NextResponse } from "next/server";
import { detectDuplicates, getDuplicateGroups } from "@/lib/dedupe";

export async function POST() {
  try {
    const result = await detectDuplicates();

    return NextResponse.json({
      success: true,
      duplicateGroups: result.duplicateGroups.length,
      totalDuplicates: result.totalDuplicates,
    });
  } catch (error) {
    console.error("Error detecting duplicates:", error);
    return NextResponse.json(
      { error: "Failed to detect duplicates" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const duplicateGroups = await getDuplicateGroups();

    return NextResponse.json({
      duplicateGroups,
      totalGroups: duplicateGroups.length,
      totalDuplicates: duplicateGroups.reduce((sum, g) => sum + g.length, 0),
    });
  } catch (error) {
    console.error("Error getting duplicates:", error);
    return NextResponse.json(
      { error: "Failed to get duplicates" },
      { status: 500 }
    );
  }
}
