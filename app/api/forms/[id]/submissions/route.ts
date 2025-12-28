import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: formId } = await params;

    const submissions = await db.formSubmission.findMany({
      where: { formId },
      include: {
        form: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Parse the JSON data for each submission
    const parsedSubmissions = submissions.map((sub) => ({
      ...sub,
      data: JSON.parse(sub.data),
    }));

    return NextResponse.json({ submissions: parsedSubmissions });
  } catch (error) {
    console.error("Error fetching submissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 }
    );
  }
}
