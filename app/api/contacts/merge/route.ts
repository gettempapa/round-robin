import { NextRequest, NextResponse } from "next/server";
import { mergeContacts } from "@/lib/dedupe";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { masterContactId, duplicateContactIds, fieldPreferences } = body;

    if (!masterContactId || !duplicateContactIds || !Array.isArray(duplicateContactIds)) {
      return NextResponse.json(
        { error: "masterContactId and duplicateContactIds array are required" },
        { status: 400 }
      );
    }

    const mergedContact = await mergeContacts(
      masterContactId,
      duplicateContactIds,
      fieldPreferences
    );

    return NextResponse.json({
      success: true,
      contact: mergedContact,
    });
  } catch (error) {
    console.error("Error merging contacts:", error);
    return NextResponse.json(
      { error: "Failed to merge contacts" },
      { status: 500 }
    );
  }
}
