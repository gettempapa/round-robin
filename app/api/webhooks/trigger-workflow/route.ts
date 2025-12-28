import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/webhooks/trigger-workflow
// Trigger an external workflow (Workato, Zapier, Make, etc.) with contact data
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { contactId } = body;

    if (!contactId) {
      return NextResponse.json(
        { error: "contactId is required" },
        { status: 400 }
      );
    }

    // Get contact with full details
    const contact = await db.contact.findUnique({
      where: { id: contactId },
      include: {
        assignments: {
          include: {
            user: true,
            group: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Prepare webhook payload
    const payload = {
      event: "contact.workflow_triggered",
      timestamp: new Date().toISOString(),
      contact: {
        id: contact.id,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        company: contact.company,
        jobTitle: contact.jobTitle,
        leadSource: contact.leadSource,
        industry: contact.industry,
        country: contact.country,
        companySize: contact.companySize,
        createdAt: contact.createdAt,
      },
      assignment: contact.assignments[0]
        ? {
            userId: contact.assignments[0].user.id,
            userName: contact.assignments[0].user.name,
            userEmail: contact.assignments[0].user.email,
            groupId: contact.assignments[0].group.id,
            groupName: contact.assignments[0].group.name,
            method: contact.assignments[0].method,
            assignedAt: contact.assignments[0].createdAt,
          }
        : null,
    };

    // Log the webhook trigger
    const webhookLog = await db.webhookLog.create({
      data: {
        source: "roundrobin",
        eventType: "contact.workflow_triggered",
        payload: JSON.stringify(payload),
        status: "pending",
        contactId: contact.id,
      },
    });

    // In a real implementation, you would:
    // 1. Get webhook URL from settings/config
    // 2. Send POST request to that URL with payload
    // 3. Update webhookLog with success/failure
    //
    // For now, we'll just mark it as success and return the payload
    // This allows you to configure the webhook receiver in Workato/Zapier
    // and they can call back to retrieve the data

    await db.webhookLog.update({
      where: { id: webhookLog.id },
      data: {
        status: "success",
        processedAt: new Date(),
      },
    });

    // Return success with the payload
    // In production, you'd send this to configured webhook URLs
    return NextResponse.json({
      success: true,
      message: "Workflow trigger logged. Configure webhook URL in settings to send to external systems.",
      webhookLogId: webhookLog.id,
      payload,
      // Instructions for integration
      instructions: {
        workato:
          "Configure Workato to poll GET /api/webhooks/logs?status=pending to retrieve new contacts",
        zapier:
          "Use Webhooks by Zapier with this endpoint as the trigger URL",
        custom:
          "POST to your webhook URL with the payload shown above",
      },
    });
  } catch (error) {
    console.error("Error triggering workflow:", error);
    return NextResponse.json(
      { error: "Failed to trigger workflow" },
      { status: 500 }
    );
  }
}
