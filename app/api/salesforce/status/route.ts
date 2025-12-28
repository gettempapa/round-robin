import { NextResponse } from "next/server";
import { checkSalesforceConnection } from "@/lib/salesforce";

export async function GET() {
  try {
    const status = await checkSalesforceConnection();
    return NextResponse.json(status);
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json({ connected: false });
  }
}
