import { NextResponse } from 'next/server';
import { calendarService } from '@/lib/calendar/calendar-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, startDate, endDate, duration } = body;

    if (!userId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'userId, startDate, and endDate are required' },
        { status: 400 }
      );
    }

    const slots = await calendarService.getAvailableSlots(
      userId,
      new Date(startDate),
      new Date(endDate),
      duration || 30
    );

    return NextResponse.json({ slots });
  } catch (error) {
    console.error('Error fetching availability:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch availability',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
