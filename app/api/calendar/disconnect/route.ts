import { NextResponse } from 'next/server';
import { calendarService } from '@/lib/calendar/calendar-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    await calendarService.disconnectCalendar(userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting calendar:', error);
    return NextResponse.json({ error: 'Failed to disconnect calendar' }, { status: 500 });
  }
}
