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
