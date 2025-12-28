import { NextResponse } from 'next/server';
import { calendarService } from '@/lib/calendar/calendar-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const status = await calendarService.getSyncStatus(userId);

    return NextResponse.json(status);
  } catch (error) {
    console.error('Error fetching sync status:', error);
    return NextResponse.json({ error: 'Failed to fetch sync status' }, { status: 500 });
  }
}
