import { NextRequest, NextResponse } from "next/server";
import { getRecordById, updateRecordOwner } from "@/lib/salesforce";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const record = await getRecordById(id);

    if (!record) {
      return NextResponse.json(
        { error: 'Record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(record);
  } catch (error) {
    console.error('Salesforce record error:', error);

    if (error instanceof Error && error.message === 'Not connected to Salesforce') {
      return NextResponse.json(
        { error: 'Not connected to Salesforce', connected: false },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch record' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    // Update owner if provided
    if (body.ownerId) {
      await updateRecordOwner(id, body.ownerId);
    }

    // Fetch and return updated record
    const record = await getRecordById(id);
    return NextResponse.json(record);
  } catch (error) {
    console.error('Salesforce update error:', error);

    if (error instanceof Error && error.message === 'Not connected to Salesforce') {
      return NextResponse.json(
        { error: 'Not connected to Salesforce', connected: false },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update record' },
      { status: 500 }
    );
  }
}
