import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { autoRouteContact } from "@/lib/routing-engine";

export async function GET() {
  try {
    const contacts = await db.contact.findMany({
      include: {
        assignments: {
          include: {
            user: true,
            group: true,
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(contacts);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch contacts" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const contact = await db.contact.create({
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone,
        company: body.company,
        jobTitle: body.jobTitle,
        leadSource: body.leadSource,
        industry: body.industry,
        country: body.country,
        companySize: body.companySize,
        customFields: body.customFields ? JSON.stringify(body.customFields) : null,
      },
    });

    // Automatically attempt to route the contact based on rules
    const routed = await autoRouteContact(contact.id);

    // Return contact with routing status
    return NextResponse.json({ ...contact, autoRouted: routed });
  } catch (error) {
    console.error("Error creating contact:", error);
    return NextResponse.json(
      { error: "Failed to create contact" },
      { status: 500 }
    );
  }
}
