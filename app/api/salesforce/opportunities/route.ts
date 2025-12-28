import { NextRequest, NextResponse } from "next/server";
import { queryOpportunities, getOpportunityStages } from "@/lib/salesforce";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;

    // Get query parameters
    const action = searchParams.get('action');

    // Handle stages request
    if (action === 'stages') {
      const stages = await getOpportunityStages();
      return NextResponse.json({ stages });
    }

    // Parse query parameters for opportunities
    const limit = parseInt(searchParams.get('limit') || '25');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = searchParams.get('sortBy') || 'CreatedDate';
    const sortOrder = (searchParams.get('sortOrder') || 'DESC').toUpperCase() as 'ASC' | 'DESC';

    // Parse filters
    const filters: any = {};
    if (searchParams.get('stage')) {
      filters.stage = searchParams.get('stage');
    }
    if (searchParams.get('owner')) {
      filters.owner = searchParams.get('owner');
    }
    if (searchParams.get('minAmount')) {
      filters.amount = { ...filters.amount, min: parseFloat(searchParams.get('minAmount')!) };
    }
    if (searchParams.get('maxAmount')) {
      filters.amount = { ...filters.amount, max: parseFloat(searchParams.get('maxAmount')!) };
    }

    const result = await queryOpportunities({
      limit,
      offset,
      sortBy,
      sortOrder,
      filters,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Salesforce opportunities error:', error);

    if (error instanceof Error && error.message === 'Not connected to Salesforce') {
      return NextResponse.json(
        { error: 'Not connected to Salesforce. Please connect your account first.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch opportunities' },
      { status: 500 }
    );
  }
}
