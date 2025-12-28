import { NextResponse } from 'next/server';
import { calendarService } from '@/lib/calendar/calendar-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, summary, description, start, end, attendees, location } = body;

    if (!userId || !summary || !start || !end) {
      return NextResponse.json(
        { error: 'userId, summary, start, and end are required' },
        { status: 400 }
      );
    }

    const event = await calendarService.createEvent(userId, {
      summary,
      description,
      start: new Date(start),
      end: new Date(end),
      attendees: attendees || [],
      location,
    });

    return NextResponse.json({ event });
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return NextResponse.json(
      {
        error: 'Failed to create calendar event',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
