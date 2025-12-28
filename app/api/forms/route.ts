import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const forms = await db.form.findMany({
      include: {
        _count: {
          select: {
            submissions: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(forms);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch forms" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const form = await db.form.create({
      data: {
        name: body.name,
        description: body.description,
        fields: JSON.stringify(body.fields || []),
        isActive: body.isActive !== false,
      },
    });
    return NextResponse.json(form);
  } catch (error) {
    console.error("Error creating form:", error);
    return NextResponse.json(
      { error: "Failed to create form" },
      { status: 500 }
    );
  }
}
