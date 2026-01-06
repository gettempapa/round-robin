import jsforce, { Connection } from 'jsforce';
import { db } from './db';

export interface SalesforceConnection {
  accessToken: string;
  refreshToken: string;
  instanceUrl: string;
}

// Get Salesforce OAuth connection
export async function getSalesforceConnection(): Promise<Connection | null> {
  try {
    // Get stored connection from database
    const integration = await db.salesforceIntegration.findFirst({
      where: { userId: 'default' } // In production, use actual user ID from session
    });

    if (!integration || !integration.accessToken) {
      return null;
    }

    const conn = new jsforce.Connection({
      instanceUrl: integration.instanceUrl,
      accessToken: integration.accessToken,
      refreshToken: integration.refreshToken || undefined,
      oauth2: {
        clientId: process.env.SALESFORCE_CLIENT_ID!,
        clientSecret: process.env.SALESFORCE_CLIENT_SECRET!,
        redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/salesforce/callback`,
      }
    });

    // Test the connection and refresh if needed
    try {
      await conn.identity();
      return conn;
    } catch (error) {
      // Token might be expired, try to refresh
      if (integration.refreshToken) {
        const newConn = new jsforce.Connection({
          oauth2: {
            clientId: process.env.SALESFORCE_CLIENT_ID!,
            clientSecret: process.env.SALESFORCE_CLIENT_SECRET!,
            redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/salesforce/callback`,
          }
        });

        const result = await newConn.oauth2.refreshToken(integration.refreshToken);

        // Update stored tokens
        await db.salesforceIntegration.update({
          where: { id: integration.id },
          data: {
            accessToken: result.access_token,
            instanceUrl: result.instance_url,
          }
        });

        return new jsforce.Connection({
          instanceUrl: result.instance_url,
          accessToken: result.access_token,
          refreshToken: integration.refreshToken,
        });
      }
      return null;
    }
  } catch (error) {
    console.error('Failed to get Salesforce connection:', error);
    return null;
  }
}

// Query opportunities from Salesforce
export async function queryOpportunities(options: {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  filters?: {
    stage?: string;
    owner?: string;
    amount?: { min?: number; max?: number };
  };
}) {
  const conn = await getSalesforceConnection();
  if (!conn) {
    throw new Error('Not connected to Salesforce');
  }

  const { limit = 25, offset = 0, sortBy = 'CreatedDate', sortOrder = 'DESC', filters } = options;

  // Build WHERE clause
  const whereConditions: string[] = [];
  if (filters?.stage) {
    whereConditions.push(`StageName = '${filters.stage.replace(/'/g, "\\'")}'`);
  }
  if (filters?.owner) {
    whereConditions.push(`Owner.Name LIKE '%${filters.owner.replace(/'/g, "\\'")}%'`);
  }
  if (filters?.amount?.min) {
    whereConditions.push(`Amount >= ${filters.amount.min}`);
  }
  if (filters?.amount?.max) {
    whereConditions.push(`Amount <= ${filters.amount.max}`);
  }

  const whereClause = whereConditions.length > 0
    ? `WHERE ${whereConditions.join(' AND ')}`
    : '';

  const query = `
    SELECT
      Id, Name, StageName, Amount, CloseDate,
      Owner.Name, Owner.Id, Account.Name, Probability,
      CreatedDate, LastModifiedDate
    FROM Opportunity
    ${whereClause}
    ORDER BY ${sortBy} ${sortOrder}
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  const result = await conn.query(query);

  return {
    records: result.records,
    totalSize: result.totalSize,
    done: result.done,
  };
}

// Get Salesforce stages (picklist values)
export async function getOpportunityStages() {
  const conn = await getSalesforceConnection();
  if (!conn) {
    throw new Error('Not connected to Salesforce');
  }

  const metadata = await conn.sobject('Opportunity').describe();
  const stageField = metadata.fields.find(f => f.name === 'StageName');

  return stageField?.picklistValues || [];
}

// Check connection status
export async function checkSalesforceConnection() {
  try {
    const conn = await getSalesforceConnection();
    if (!conn) {
      return { connected: false };
    }

    const identity = await conn.identity();
    return {
      connected: true,
      username: identity.username,
      organizationId: identity.organization_id,
    };
  } catch (error) {
    return { connected: false };
  }
}

// Query contacts from Salesforce
export async function queryContacts(options: {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
  filters?: {
    hasOwner?: boolean;
    ownerId?: string;
    leadSource?: string;
    industry?: string;
  };
}) {
  const conn = await getSalesforceConnection();
  if (!conn) {
    throw new Error('Not connected to Salesforce');
  }

  const { limit = 25, offset = 0, sortBy = 'CreatedDate', sortOrder = 'DESC', search, filters } = options;

  // Build WHERE clause
  const whereConditions: string[] = [];

  if (search) {
    const escapedSearch = search.replace(/'/g, "\\'");
    whereConditions.push(`(Name LIKE '%${escapedSearch}%' OR Email LIKE '%${escapedSearch}%' OR Account.Name LIKE '%${escapedSearch}%')`);
  }

  if (filters?.hasOwner === false) {
    whereConditions.push(`OwnerId = null`);
  } else if (filters?.hasOwner === true) {
    whereConditions.push(`OwnerId != null`);
  }

  if (filters?.ownerId) {
    whereConditions.push(`OwnerId = '${filters.ownerId.replace(/'/g, "\\'")}'`);
  }

  if (filters?.leadSource) {
    whereConditions.push(`LeadSource = '${filters.leadSource.replace(/'/g, "\\'")}'`);
  }

  const whereClause = whereConditions.length > 0
    ? `WHERE ${whereConditions.join(' AND ')}`
    : '';

  const query = `
    SELECT
      Id, Name, Email, Phone, Title, Department,
      Account.Id, Account.Name, Account.Industry,
      Owner.Id, Owner.Name, Owner.Email,
      LeadSource, MailingCity, MailingState, MailingCountry,
      CreatedDate, LastModifiedDate
    FROM Contact
    ${whereClause}
    ORDER BY ${sortBy} ${sortOrder}
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  const result = await conn.query(query);

  // Transform to match our UI format
  const contacts = result.records.map((record: any) => ({
    id: record.Id,
    name: record.Name,
    email: record.Email,
    phone: record.Phone,
    title: record.Title,
    department: record.Department,
    company: record.Account?.Name || null,
    companyId: record.Account?.Id || null,
    industry: record.Account?.Industry || null,
    owner: record.Owner ? {
      id: record.Owner.Id,
      name: record.Owner.Name,
      email: record.Owner.Email,
    } : null,
    leadSource: record.LeadSource,
    city: record.MailingCity,
    state: record.MailingState,
    country: record.MailingCountry,
    createdAt: record.CreatedDate,
    updatedAt: record.LastModifiedDate,
    _type: 'contact',
  }));

  return {
    records: contacts,
    totalSize: result.totalSize,
    done: result.done,
  };
}

// Query leads from Salesforce
export async function queryLeads(options: {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
  filters?: {
    hasOwner?: boolean;
    ownerId?: string;
    leadSource?: string;
    status?: string;
    industry?: string;
  };
}) {
  const conn = await getSalesforceConnection();
  if (!conn) {
    throw new Error('Not connected to Salesforce');
  }

  const { limit = 25, offset = 0, sortBy = 'CreatedDate', sortOrder = 'DESC', search, filters } = options;

  // Build WHERE clause
  const whereConditions: string[] = [];

  if (search) {
    const escapedSearch = search.replace(/'/g, "\\'");
    whereConditions.push(`(Name LIKE '%${escapedSearch}%' OR Email LIKE '%${escapedSearch}%' OR Company LIKE '%${escapedSearch}%')`);
  }

  if (filters?.hasOwner === false) {
    whereConditions.push(`OwnerId = null`);
  } else if (filters?.hasOwner === true) {
    whereConditions.push(`OwnerId != null`);
  }

  if (filters?.ownerId) {
    whereConditions.push(`OwnerId = '${filters.ownerId.replace(/'/g, "\\'")}'`);
  }

  if (filters?.leadSource) {
    whereConditions.push(`LeadSource = '${filters.leadSource.replace(/'/g, "\\'")}'`);
  }

  if (filters?.status) {
    whereConditions.push(`Status = '${filters.status.replace(/'/g, "\\'")}'`);
  }

  if (filters?.industry) {
    whereConditions.push(`Industry = '${filters.industry.replace(/'/g, "\\'")}'`);
  }

  const whereClause = whereConditions.length > 0
    ? `WHERE ${whereConditions.join(' AND ')}`
    : '';

  const query = `
    SELECT
      Id, Name, FirstName, LastName, Email, Phone, Title,
      Company, Industry, NumberOfEmployees,
      Owner.Id, Owner.Name, Owner.Email,
      LeadSource, Status, Rating,
      City, State, Country,
      CreatedDate, LastModifiedDate
    FROM Lead
    ${whereClause}
    ORDER BY ${sortBy} ${sortOrder}
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  const result = await conn.query(query);

  // Transform to match our UI format
  const leads = result.records.map((record: any) => ({
    id: record.Id,
    name: record.Name,
    firstName: record.FirstName,
    lastName: record.LastName,
    email: record.Email,
    phone: record.Phone,
    title: record.Title,
    company: record.Company,
    industry: record.Industry,
    companySize: record.NumberOfEmployees ? `${record.NumberOfEmployees}` : null,
    owner: record.Owner ? {
      id: record.Owner.Id,
      name: record.Owner.Name,
      email: record.Owner.Email,
    } : null,
    leadSource: record.LeadSource,
    status: record.Status,
    rating: record.Rating,
    city: record.City,
    state: record.State,
    country: record.Country,
    createdAt: record.CreatedDate,
    updatedAt: record.LastModifiedDate,
    _type: 'lead',
  }));

  return {
    records: leads,
    totalSize: result.totalSize,
    done: result.done,
  };
}

// Query both contacts and leads (combined view)
export async function queryAllRecords(options: {
  limit?: number;
  offset?: number;
  search?: string;
  recordType?: 'all' | 'contact' | 'lead';
  filters?: {
    hasOwner?: boolean;
    ownerId?: string;
    leadSource?: string;
  };
}) {
  const { recordType = 'all', limit = 25, ...rest } = options;

  if (recordType === 'contact') {
    return queryContacts({ ...rest, limit });
  }

  if (recordType === 'lead') {
    return queryLeads({ ...rest, limit });
  }

  // Query both and merge
  const halfLimit = Math.ceil(limit / 2);
  const [contactsResult, leadsResult] = await Promise.all([
    queryContacts({ ...rest, limit: halfLimit }),
    queryLeads({ ...rest, limit: halfLimit }),
  ]);

  // Merge and sort by createdAt
  const allRecords = [...contactsResult.records, ...leadsResult.records]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);

  return {
    records: allRecords,
    totalSize: contactsResult.totalSize + leadsResult.totalSize,
    done: contactsResult.done && leadsResult.done,
  };
}

// Get a single contact or lead by ID
export async function getRecordById(id: string) {
  const conn = await getSalesforceConnection();
  if (!conn) {
    throw new Error('Not connected to Salesforce');
  }

  // Try Contact first
  try {
    const query = `
      SELECT
        Id, Name, Email, Phone, Title, Department, Description,
        Account.Id, Account.Name, Account.Industry, Account.Website,
        Owner.Id, Owner.Name, Owner.Email,
        LeadSource, MailingStreet, MailingCity, MailingState, MailingPostalCode, MailingCountry,
        CreatedDate, LastModifiedDate
      FROM Contact
      WHERE Id = '${id}'
    `;
    const result = await conn.query(query);
    if (result.records.length > 0) {
      const record = result.records[0] as any;
      return {
        id: record.Id,
        name: record.Name,
        email: record.Email,
        phone: record.Phone,
        title: record.Title,
        department: record.Department,
        description: record.Description,
        company: record.Account?.Name || null,
        companyId: record.Account?.Id || null,
        industry: record.Account?.Industry || null,
        website: record.Account?.Website || null,
        owner: record.Owner ? {
          id: record.Owner.Id,
          name: record.Owner.Name,
          email: record.Owner.Email,
        } : null,
        leadSource: record.LeadSource,
        address: {
          street: record.MailingStreet,
          city: record.MailingCity,
          state: record.MailingState,
          postalCode: record.MailingPostalCode,
          country: record.MailingCountry,
        },
        createdAt: record.CreatedDate,
        updatedAt: record.LastModifiedDate,
        _type: 'contact',
      };
    }
  } catch (e) {
    // Not a contact, try lead
  }

  // Try Lead
  const leadQuery = `
    SELECT
      Id, Name, FirstName, LastName, Email, Phone, Title, Description,
      Company, Industry, NumberOfEmployees, Website,
      Owner.Id, Owner.Name, Owner.Email,
      LeadSource, Status, Rating,
      Street, City, State, PostalCode, Country,
      CreatedDate, LastModifiedDate
    FROM Lead
    WHERE Id = '${id}'
  `;
  const leadResult = await conn.query(leadQuery);
  if (leadResult.records.length > 0) {
    const record = leadResult.records[0] as any;
    return {
      id: record.Id,
      name: record.Name,
      firstName: record.FirstName,
      lastName: record.LastName,
      email: record.Email,
      phone: record.Phone,
      title: record.Title,
      description: record.Description,
      company: record.Company,
      industry: record.Industry,
      companySize: record.NumberOfEmployees ? `${record.NumberOfEmployees}` : null,
      website: record.Website,
      owner: record.Owner ? {
        id: record.Owner.Id,
        name: record.Owner.Name,
        email: record.Owner.Email,
      } : null,
      leadSource: record.LeadSource,
      status: record.Status,
      rating: record.Rating,
      address: {
        street: record.Street,
        city: record.City,
        state: record.State,
        postalCode: record.PostalCode,
        country: record.Country,
      },
      createdAt: record.CreatedDate,
      updatedAt: record.LastModifiedDate,
      _type: 'lead',
    };
  }

  return null;
}

// Update Owner on a Contact or Lead
export async function updateRecordOwner(recordId: string, ownerId: string) {
  const conn = await getSalesforceConnection();
  if (!conn) {
    throw new Error('Not connected to Salesforce');
  }

  // Determine if it's a Contact or Lead by prefix
  // Contact IDs start with 003, Lead IDs start with 00Q
  const isContact = recordId.startsWith('003');
  const objectType = isContact ? 'Contact' : 'Lead';

  const result = await conn.sobject(objectType).update({
    Id: recordId,
    OwnerId: ownerId,
  });

  return result;
}

// Get Salesforce users (for owner assignment)
export async function getSalesforceUsers() {
  const conn = await getSalesforceConnection();
  if (!conn) {
    throw new Error('Not connected to Salesforce');
  }

  const query = `
    SELECT Id, Name, Email, IsActive
    FROM User
    WHERE IsActive = true
    ORDER BY Name ASC
  `;

  const result = await conn.query(query);
  return result.records.map((user: any) => ({
    id: user.Id,
    name: user.Name,
    email: user.Email,
  }));
}

// Get lead sources picklist
export async function getLeadSources() {
  const conn = await getSalesforceConnection();
  if (!conn) {
    throw new Error('Not connected to Salesforce');
  }

  const metadata = await conn.sobject('Lead').describe();
  const sourceField = metadata.fields.find((f: any) => f.name === 'LeadSource');
  return sourceField?.picklistValues || [];
}

// Get lead statuses picklist
export async function getLeadStatuses() {
  const conn = await getSalesforceConnection();
  if (!conn) {
    throw new Error('Not connected to Salesforce');
  }

  const metadata = await conn.sobject('Lead').describe();
  const statusField = metadata.fields.find((f: any) => f.name === 'Status');
  return statusField?.picklistValues || [];
}

// ============================================
// Salesforce Events API (for Meetings sync)
// ============================================

export interface SalesforceEventData {
  Subject: string;
  WhoId?: string; // Contact/Lead ID
  OwnerId?: string; // User ID
  StartDateTime: Date;
  EndDateTime: Date;
  Description?: string;
  Type?: string;
  Location?: string;
  Status?: string; // Planned, Completed, Cancelled, Not Held
}

// Create an Event in Salesforce
export async function createSalesforceEvent(data: SalesforceEventData) {
  const conn = await getSalesforceConnection();
  if (!conn) {
    throw new Error('Not connected to Salesforce');
  }

  const eventData: Record<string, unknown> = {
    Subject: data.Subject,
    StartDateTime: data.StartDateTime.toISOString(),
    EndDateTime: data.EndDateTime.toISOString(),
    ShowAs: 'Busy',
  };

  if (data.WhoId) eventData.WhoId = data.WhoId;
  if (data.OwnerId) eventData.OwnerId = data.OwnerId;
  if (data.Description) eventData.Description = data.Description;
  if (data.Type) eventData.Type = data.Type;
  if (data.Location) eventData.Location = data.Location;
  if (data.Status) eventData.Status = data.Status;

  const result = await conn.sobject('Event').create(eventData);

  if (result.success) {
    return { Id: result.id, ...data };
  }

  throw new Error(`Failed to create Salesforce event: ${JSON.stringify(result.errors)}`);
}

// Update an Event in Salesforce
export async function updateSalesforceEvent(eventId: string, data: Partial<{
  Subject: string;
  Status: string;
  Description: string;
  Location: string;
  StartDateTime: Date;
  EndDateTime: Date;
}>) {
  const conn = await getSalesforceConnection();
  if (!conn) {
    throw new Error('Not connected to Salesforce');
  }

  const updateData: { Id: string; [key: string]: unknown } = { Id: eventId };

  if (data.Subject) updateData.Subject = data.Subject;
  if (data.Status) updateData.Status = data.Status;
  if (data.Description) updateData.Description = data.Description;
  if (data.Location) updateData.Location = data.Location;
  if (data.StartDateTime) updateData.StartDateTime = data.StartDateTime.toISOString();
  if (data.EndDateTime) updateData.EndDateTime = data.EndDateTime.toISOString();

  const result = await conn.sobject('Event').update(updateData as any);
  const singleResult = Array.isArray(result) ? result[0] : result;

  if (!singleResult.success) {
    throw new Error(`Failed to update Salesforce event: ${JSON.stringify(singleResult.errors)}`);
  }

  return singleResult;
}

// Query Events by IDs
export async function querySalesforceEventsByIds(eventIds: string[]) {
  const conn = await getSalesforceConnection();
  if (!conn) {
    throw new Error('Not connected to Salesforce');
  }

  if (eventIds.length === 0) {
    return [];
  }

  const idsString = eventIds.map(id => `'${id}'`).join(',');

  const query = `
    SELECT
      Id, Subject, WhoId, OwnerId, StartDateTime, EndDateTime,
      Description, Type, Location, Status, LastModifiedDate
    FROM Event
    WHERE Id IN (${idsString})
  `;

  const result = await conn.query(query);

  return result.records.map((event: any) => ({
    Id: event.Id,
    Subject: event.Subject,
    WhoId: event.WhoId,
    OwnerId: event.OwnerId,
    StartDateTime: event.StartDateTime,
    EndDateTime: event.EndDateTime,
    Description: event.Description,
    Type: event.Type,
    Location: event.Location,
    Status: event.Status || 'Planned',
    LastModifiedDate: event.LastModifiedDate,
  }));
}

// Query recently modified Events
export async function querySalesforceEventsModifiedSince(since: Date) {
  const conn = await getSalesforceConnection();
  if (!conn) {
    throw new Error('Not connected to Salesforce');
  }

  const query = `
    SELECT
      Id, Subject, WhoId, OwnerId, StartDateTime, EndDateTime,
      Description, Type, Location, Status, LastModifiedDate
    FROM Event
    WHERE LastModifiedDate > ${since.toISOString()}
    ORDER BY LastModifiedDate DESC
    LIMIT 100
  `;

  const result = await conn.query(query);

  return result.records.map((event: any) => ({
    Id: event.Id,
    Subject: event.Subject,
    WhoId: event.WhoId,
    OwnerId: event.OwnerId,
    StartDateTime: event.StartDateTime,
    EndDateTime: event.EndDateTime,
    Description: event.Description,
    Type: event.Type,
    Location: event.Location,
    Status: event.Status || 'Planned',
    LastModifiedDate: event.LastModifiedDate,
  }));
}

// Delete an Event in Salesforce
export async function deleteSalesforceEvent(eventId: string) {
  const conn = await getSalesforceConnection();
  if (!conn) {
    throw new Error('Not connected to Salesforce');
  }

  const result = await conn.sobject('Event').destroy(eventId);

  if (!result.success) {
    throw new Error(`Failed to delete Salesforce event: ${JSON.stringify(result.errors)}`);
  }

  return result;
}

// ============================================
// Timeline API - Full contact/lead history
// ============================================

export type TimelineEvent = {
  id: string;
  type: 'created' | 'status_change' | 'owner_change' | 'converted' | 'activity' | 'task' | 'event' | 'opportunity' | 'account_linked' | 'email' | 'call' | 'note';
  title: string;
  description?: string;
  timestamp: string;
  actor?: { id: string; name: string };
  metadata?: Record<string, any>;
  icon?: string;
  color?: string;
};

export async function getRecordTimeline(recordId: string): Promise<{
  record: any;
  timeline: TimelineEvent[];
}> {
  const conn = await getSalesforceConnection();
  if (!conn) {
    throw new Error('Not connected to Salesforce');
  }

  const isLead = recordId.startsWith('00Q');
  const isContact = recordId.startsWith('003');
  const objectType = isLead ? 'Lead' : 'Contact';

  const timeline: TimelineEvent[] = [];

  // 1. Get the main record with history
  const recordQuery = isLead
    ? `SELECT Id, Name, Email, Company, Status, LeadSource, Owner.Id, Owner.Name,
         CreatedDate, CreatedBy.Name, LastModifiedDate, ConvertedDate, ConvertedContactId,
         ConvertedAccountId, ConvertedOpportunityId
       FROM Lead WHERE Id = '${recordId}'`
    : `SELECT Id, Name, Email, Account.Id, Account.Name, Owner.Id, Owner.Name,
         CreatedDate, CreatedBy.Name, LastModifiedDate
       FROM Contact WHERE Id = '${recordId}'`;

  const recordResult = await conn.query(recordQuery);
  if (recordResult.records.length === 0) {
    throw new Error('Record not found');
  }

  const record = recordResult.records[0] as any;

  // Add creation event
  timeline.push({
    id: `${recordId}-created`,
    type: 'created',
    title: `${objectType} Created`,
    description: isLead ? `Lead created from ${record.LeadSource || 'unknown source'}` : 'Contact created',
    timestamp: record.CreatedDate,
    actor: { id: '', name: record.CreatedBy?.Name || 'System' },
    icon: 'plus-circle',
    color: 'emerald',
  });

  // 2. Get field history (status changes, owner changes, etc.)
  try {
    const historyObject = isLead ? 'LeadHistory' : 'ContactHistory';
    const historyQuery = `
      SELECT Id, Field, OldValue, NewValue, CreatedDate, CreatedBy.Name
      FROM ${historyObject}
      WHERE ${isLead ? 'LeadId' : 'ContactId'} = '${recordId}'
      ORDER BY CreatedDate DESC
      LIMIT 100
    `;
    const historyResult = await conn.query(historyQuery);

    for (const h of historyResult.records as any[]) {
      if (h.Field === 'Owner' || h.Field === 'OwnerId') {
        timeline.push({
          id: h.Id,
          type: 'owner_change',
          title: 'Owner Changed',
          description: `${h.OldValue || 'Unassigned'} → ${h.NewValue}`,
          timestamp: h.CreatedDate,
          actor: { id: '', name: h.CreatedBy?.Name || 'System' },
          metadata: { oldValue: h.OldValue, newValue: h.NewValue },
          icon: 'user-check',
          color: 'blue',
        });
      } else if (h.Field === 'Status') {
        timeline.push({
          id: h.Id,
          type: 'status_change',
          title: 'Status Changed',
          description: `${h.OldValue || 'None'} → ${h.NewValue}`,
          timestamp: h.CreatedDate,
          actor: { id: '', name: h.CreatedBy?.Name || 'System' },
          metadata: { oldValue: h.OldValue, newValue: h.NewValue },
          icon: 'refresh-cw',
          color: 'amber',
        });
      }
    }
  } catch (e) {
    // History tracking might not be enabled
    console.log('Field history not available');
  }

  // 3. Get Tasks - query by WhoId, and also by related Lead/Contact email
  try {
    // Build a list of related IDs to query
    const relatedIds = [recordId];

    // If this is a Contact, also check for tasks on related Leads with same email
    // If this is a Lead, also check for tasks on related Contacts with same email
    if (record.Email) {
      try {
        if (isLead) {
          // Find contacts with same email
          const contactsWithEmail = await conn.query(
            `SELECT Id FROM Contact WHERE Email = '${record.Email}' LIMIT 5`
          );
          relatedIds.push(...(contactsWithEmail.records as any[]).map(c => c.Id));
        } else {
          // Find leads with same email
          const leadsWithEmail = await conn.query(
            `SELECT Id FROM Lead WHERE Email = '${record.Email}' AND IsConverted = false LIMIT 5`
          );
          relatedIds.push(...(leadsWithEmail.records as any[]).map(l => l.Id));
        }
      } catch (e) {
        // Ignore - just use the primary record ID
      }
    }

    const whoIdFilter = relatedIds.map(id => `'${id}'`).join(',');
    const taskQuery = `
      SELECT Id, Subject, Status, Priority, Description, ActivityDate,
             CreatedDate, Owner.Name, WhoId, Type
      FROM Task
      WHERE WhoId IN (${whoIdFilter})
      ORDER BY CreatedDate DESC
      LIMIT 50
    `;
    console.log('Querying tasks for IDs:', relatedIds);
    const taskResult = await conn.query(taskQuery);
    console.log('Task results:', taskResult.totalSize, 'records');

    for (const task of taskResult.records as any[]) {
      const isCall = task.Type === 'Call' || task.Subject?.toLowerCase().includes('call');
      const isEmail = task.Type === 'Email' || task.Subject?.toLowerCase().includes('email');

      timeline.push({
        id: task.Id,
        type: isCall ? 'call' : isEmail ? 'email' : 'task',
        title: task.Subject || 'Task',
        description: task.Description?.substring(0, 200),
        timestamp: task.CreatedDate,
        actor: { id: '', name: task.Owner?.Name || 'Unknown' },
        metadata: { status: task.Status, priority: task.Priority },
        icon: isCall ? 'phone' : isEmail ? 'mail' : 'check-square',
        color: task.Status === 'Completed' ? 'emerald' : 'slate',
      });
    }

    // Also query Events with same filter
    const eventQuery = `
      SELECT Id, Subject, Description, StartDateTime, EndDateTime,
             CreatedDate, Owner.Name, WhoId, Type, Location
      FROM Event
      WHERE WhoId IN (${whoIdFilter})
      ORDER BY CreatedDate DESC
      LIMIT 50
    `;
    const eventResult = await conn.query(eventQuery);
    console.log('Event results:', eventResult.totalSize, 'records');

    for (const event of eventResult.records as any[]) {
      timeline.push({
        id: event.Id,
        type: 'event',
        title: event.Subject || 'Meeting',
        description: event.Location ? `Location: ${event.Location}` : event.Description?.substring(0, 200),
        timestamp: event.StartDateTime || event.CreatedDate,
        actor: { id: '', name: event.Owner?.Name || 'Unknown' },
        metadata: { startTime: event.StartDateTime, endTime: event.EndDateTime, type: event.Type },
        icon: 'calendar',
        color: 'purple',
      });
    }
  } catch (e) {
    console.error('Tasks/Events query error:', e);
  }

  // 5. If Lead was converted, add conversion event
  if (isLead && record.ConvertedDate) {
    timeline.push({
      id: `${recordId}-converted`,
      type: 'converted',
      title: 'Lead Converted',
      description: 'Converted to Contact, Account, and Opportunity',
      timestamp: record.ConvertedDate,
      metadata: {
        contactId: record.ConvertedContactId,
        accountId: record.ConvertedAccountId,
        opportunityId: record.ConvertedOpportunityId,
      },
      icon: 'check-circle',
      color: 'emerald',
    });
  }

  // 6. For Contacts, get related Opportunities via ContactRoles
  if (isContact) {
    try {
      const oppQuery = `
        SELECT Id, Opportunity.Id, Opportunity.Name, Opportunity.StageName,
               Opportunity.Amount, Opportunity.CloseDate, Opportunity.CreatedDate,
               Role, CreatedDate
        FROM OpportunityContactRole
        WHERE ContactId = '${recordId}'
        ORDER BY CreatedDate DESC
        LIMIT 20
      `;
      const oppResult = await conn.query(oppQuery);

      for (const ocr of oppResult.records as any[]) {
        timeline.push({
          id: ocr.Id,
          type: 'opportunity',
          title: `Linked to Opportunity`,
          description: `${ocr.Opportunity?.Name} (${ocr.Opportunity?.StageName})${ocr.Role ? ` as ${ocr.Role}` : ''}`,
          timestamp: ocr.CreatedDate,
          metadata: {
            opportunityId: ocr.Opportunity?.Id,
            amount: ocr.Opportunity?.Amount,
            stage: ocr.Opportunity?.StageName,
            closeDate: ocr.Opportunity?.CloseDate,
            role: ocr.Role,
          },
          icon: 'briefcase',
          color: 'indigo',
        });
      }
    } catch (e) {
      console.log('Opportunity roles not available');
    }

    // Get Account link if exists
    if (record.Account?.Id) {
      timeline.push({
        id: `${recordId}-account`,
        type: 'account_linked',
        title: 'Linked to Account',
        description: record.Account.Name,
        timestamp: record.CreatedDate, // Approximate - contacts are linked at creation
        metadata: { accountId: record.Account.Id, accountName: record.Account.Name },
        icon: 'building',
        color: 'sky',
      });
    }
  }

  // 7. Get Notes (ContentNote via ContentDocumentLink)
  try {
    const noteQuery = `
      SELECT ContentDocument.Title, ContentDocument.CreatedDate,
             ContentDocument.CreatedBy.Name, ContentDocument.FileType
      FROM ContentDocumentLink
      WHERE LinkedEntityId = '${recordId}'
      ORDER BY ContentDocument.CreatedDate DESC
      LIMIT 20
    `;
    const noteResult = await conn.query(noteQuery);

    for (const note of noteResult.records as any[]) {
      const doc = note.ContentDocument as any;
      if (doc?.FileType === 'SNOTE') {
        timeline.push({
          id: `note-${doc.Id}`,
          type: 'note',
          title: 'Note Added',
          description: doc.Title,
          timestamp: doc.CreatedDate,
          actor: { id: '', name: doc.CreatedBy?.Name || 'Unknown' },
          icon: 'file-text',
          color: 'slate',
        });
      }
    }
  } catch (e) {
    console.log('Notes not available');
  }

  // Sort timeline by timestamp descending
  timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return {
    record: {
      id: record.Id,
      name: record.Name,
      email: record.Email,
      company: isLead ? record.Company : record.Account?.Name,
      status: isLead ? record.Status : null,
      owner: record.Owner ? { id: record.Owner.Id, name: record.Owner.Name } : null,
      createdAt: record.CreatedDate,
      _type: isLead ? 'lead' : 'contact',
    },
    timeline,
  };
}
