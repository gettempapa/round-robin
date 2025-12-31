import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getNextUserInGroup } from "@/lib/routing-engine";
import { getRecordById, updateRecordOwner, checkSalesforceConnection } from "@/lib/salesforce";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: recordId } = await params;
    const body = await req.json();
    const { groupId } = body;

    if (!groupId) {
      return NextResponse.json(
        { error: "groupId is required" },
        { status: 400 }
      );
    }

    // Check Salesforce connection
    const sfStatus = await checkSalesforceConnection();
    if (!sfStatus.connected) {
      return NextResponse.json(
        { error: "Not connected to Salesforce" },
        { status: 401 }
      );
    }

    // Get the Salesforce record first to verify it exists
    const sfRecord = await getRecordById(recordId);
    if (!sfRecord) {
      return NextResponse.json(
        { error: "Salesforce record not found" },
        { status: 404 }
      );
    }

    // Get the next user in the round robin group
    const user = await getNextUserInGroup(groupId);

    // Check if user has a linked Salesforce user ID
    if (!user.salesforceUserId) {
      return NextResponse.json(
        {
          error: `User "${user.name}" does not have a linked Salesforce user. Please configure their Salesforce User ID in settings.`,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
          },
        },
        { status: 400 }
      );
    }

    // Update the owner in Salesforce
    await updateRecordOwner(recordId, user.salesforceUserId);

    // Get the updated record
    const updatedRecord = await getRecordById(recordId);

    // Get the group details for the response
    const group = await db.roundRobinGroup.findUnique({
      where: { id: groupId },
    });

    return NextResponse.json({
      success: true,
      record: updatedRecord,
      assignedTo: {
        id: user.id,
        name: user.name,
        email: user.email,
        salesforceUserId: user.salesforceUserId,
      },
      group: group ? {
        id: group.id,
        name: group.name,
      } : null,
    });
  } catch (error) {
    console.error("Error routing Salesforce record:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to route record",
      },
      { status: 500 }
    );
  }
}
