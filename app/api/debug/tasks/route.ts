import { NextRequest, NextResponse } from "next/server";
import { getSalesforceConnection } from "@/lib/salesforce";

export async function GET(req: NextRequest) {
  try {
    const conn = await getSalesforceConnection();
    if (!conn) {
      return NextResponse.json({ error: "Not connected to Salesforce" }, { status: 401 });
    }

    const recordId = req.nextUrl.searchParams.get("recordId");

    const debug: any = {
      timestamp: new Date().toISOString(),
    };

    // Get all recent tasks
    const recentTasks = await conn.query(`
      SELECT Id, Subject, WhoId, Who.Name, WhatId, What.Name, Status, CreatedDate, Type
      FROM Task
      ORDER BY CreatedDate DESC
      LIMIT 20
    `);
    debug.recentTasks = recentTasks.records.map((t: any) => ({
      id: t.Id,
      subject: t.Subject,
      whoId: t.WhoId,
      whoName: t.Who?.Name,
      whatId: t.WhatId,
      whatName: t.What?.Name,
      status: t.Status,
      type: t.Type,
      createdDate: t.CreatedDate,
    }));

    // Get all recent events
    const recentEvents = await conn.query(`
      SELECT Id, Subject, WhoId, Who.Name, WhatId, What.Name, StartDateTime, CreatedDate
      FROM Event
      ORDER BY CreatedDate DESC
      LIMIT 10
    `);
    debug.recentEvents = recentEvents.records.map((e: any) => ({
      id: e.Id,
      subject: e.Subject,
      whoId: e.WhoId,
      whoName: e.Who?.Name,
      whatId: e.WhatId,
      whatName: e.What?.Name,
      startDateTime: e.StartDateTime,
      createdDate: e.CreatedDate,
    }));

    // If recordId provided, search for that specific record
    if (recordId) {
      // Find the record
      let record: any = null;
      try {
        const leadResult = await conn.query(`SELECT Id, Name, Email FROM Lead WHERE Id = '${recordId}'`);
        if (leadResult.records.length > 0) {
          record = { ...leadResult.records[0], type: "Lead" };
        }
      } catch {}

      if (!record) {
        try {
          const contactResult = await conn.query(`SELECT Id, Name, Email FROM Contact WHERE Id = '${recordId}'`);
          if (contactResult.records.length > 0) {
            record = { ...contactResult.records[0], type: "Contact" };
          }
        } catch {}
      }

      debug.targetRecord = record;

      if (record) {
        // Find tasks for this record
        const tasksForRecord = await conn.query(`
          SELECT Id, Subject, WhoId, Who.Name, Status, CreatedDate
          FROM Task
          WHERE WhoId = '${recordId}'
        `);
        debug.tasksForRecord = tasksForRecord.records;

        // Also try ActivityHistories
        try {
          const activityQuery = record.type === "Lead"
            ? `SELECT Id, (SELECT Id, Subject, Status, CreatedDate FROM ActivityHistories ORDER BY CreatedDate DESC LIMIT 20) FROM Lead WHERE Id = '${recordId}'`
            : `SELECT Id, (SELECT Id, Subject, Status, CreatedDate FROM ActivityHistories ORDER BY CreatedDate DESC LIMIT 20) FROM Contact WHERE Id = '${recordId}'`;

          const activityResult = await conn.query(activityQuery);
          debug.activityHistories = (activityResult.records[0] as any)?.ActivityHistories?.records || [];
        } catch (e: any) {
          debug.activityHistoriesError = e.message;
        }
      }
    }

    // Find Noah specifically
    const noahLeads = await conn.query(`SELECT Id, Name, Email FROM Lead WHERE Name LIKE '%Noah%' LIMIT 5`);
    const noahContacts = await conn.query(`SELECT Id, Name, Email FROM Contact WHERE Name LIKE '%Noah%' LIMIT 5`);
    debug.noahRecords = {
      leads: noahLeads.records,
      contacts: noahContacts.records,
    };

    return NextResponse.json(debug);
  } catch (error) {
    console.error("Debug tasks error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
