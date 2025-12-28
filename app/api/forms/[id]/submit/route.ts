import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { autoRouteContact } from "@/lib/routing-engine";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: formId } = await params;
    const body = await request.json();

    // Get the form
    const form = await db.form.findUnique({
      where: { id: formId, isActive: true },
    });

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    // Upsert contact to avoid duplicates (use email as unique identifier)
    const contact = await db.contact.upsert({
      where: {
        email: body.email || `unknown-${Date.now()}@placeholder.com`,
      },
      update: {
        name: body.name || "Unknown",
        phone: body.phone,
        company: body.company,
        jobTitle: body.jobTitle,
        industry: body.industry,
        country: body.country,
        companySize: body.companySize,
        // Keep original leadSource on update
      },
      create: {
        name: body.name || "Unknown",
        email: body.email,
        phone: body.phone,
        company: body.company,
        jobTitle: body.jobTitle,
        leadSource: body.leadSource || "Form",
        industry: body.industry,
        country: body.country,
        companySize: body.companySize,
      },
    });

    // Save form submission
    const submission = await db.formSubmission.create({
      data: {
        formId,
        contactId: contact.id,
        data: JSON.stringify(body),
      },
    });

    // Auto-route the contact
    const routed = await autoRouteContact(contact.id);

    // Get the assignment to return the assigned user
    let assignedUser = null;
    if (routed) {
      const assignment = await db.assignment.findFirst({
        where: { contactId: contact.id },
        include: {
          user: true,
        },
        orderBy: { createdAt: "desc" },
      });

      if (assignment) {
        assignedUser = {
          id: assignment.user.id,
          name: assignment.user.name,
          email: assignment.user.email,
        };
      }
    }

    return NextResponse.json({
      success: true,
      contact: {
        id: contact.id,
        name: contact.name,
      },
      routed,
      assignedUser,
    });
  } catch (error) {
    console.error("Error submitting form:", error);
    return NextResponse.json(
      { error: "Failed to submit form" },
      { status: 500 }
    );
  }
}
