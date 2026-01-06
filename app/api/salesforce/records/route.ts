import { NextRequest, NextResponse } from "next/server";
import { queryAllRecords, queryContacts, queryLeads, getLeadSources, getLeadStatuses, getSalesforceUsers } from "@/lib/salesforce";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const action = searchParams.get('action');

    // Handle metadata requests
    if (action === 'lead-sources') {
      const sources = await getLeadSources();
      return NextResponse.json({ sources });
    }

    if (action === 'lead-statuses') {
      const statuses = await getLeadStatuses();
      return NextResponse.json({ statuses });
    }

    if (action === 'users') {
      const users = await getSalesforceUsers();
      return NextResponse.json({ users });
    }

    // Parse query parameters
    const limit = parseInt(searchParams.get('limit') || '25');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search') || undefined;
    const recordType = (searchParams.get('type') || 'all') as 'all' | 'contact' | 'lead';
    const sortBy = searchParams.get('sortBy') || 'CreatedDate';
    const sortOrder = (searchParams.get('sortOrder') || 'DESC').toUpperCase() as 'ASC' | 'DESC';

    // Parse filters
    const filters: any = {};

    const hasOwner = searchParams.get('hasOwner');
    if (hasOwner === 'true') {
      filters.hasOwner = true;
    } else if (hasOwner === 'false') {
      filters.hasOwner = false;
    }

    if (searchParams.get('ownerId')) {
      filters.ownerId = searchParams.get('ownerId');
    }

    if (searchParams.get('leadSource')) {
      filters.leadSource = searchParams.get('leadSource');
    }

    if (searchParams.get('status')) {
      filters.status = searchParams.get('status');
    }

    if (searchParams.get('industry')) {
      filters.industry = searchParams.get('industry');
    }

    // SOQL condition from AI (takes precedence)
    const soqlCondition = searchParams.get('soql');
    if (soqlCondition) {
      filters.soqlCondition = soqlCondition;
    }

    // Query records based on type
    let result;
    if (recordType === 'contact') {
      result = await queryContacts({ limit, offset, search, sortBy, sortOrder, filters });
    } else if (recordType === 'lead') {
      result = await queryLeads({ limit, offset, search, sortBy, sortOrder, filters });
    } else {
      result = await queryAllRecords({ limit, offset, search, recordType, filters });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Salesforce records error:', error);

    if (error instanceof Error && error.message === 'Not connected to Salesforce') {
      return NextResponse.json(
        { error: 'Not connected to Salesforce', connected: false },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch records' },
      { status: 500 }
    );
  }
}
