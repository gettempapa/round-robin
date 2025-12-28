/**
 * Google Calendar API Service
 *
 * Handles all interactions with Google Calendar API:
 * - Fetching events
 * - Creating events
 * - Checking availability
 * - Token refresh
 */

import { google } from 'googleapis';
import { ICalendarProvider, CalendarEvent, CalendarCredentials, TimeSlot, OAuthTokenResponse } from './types';

export class GoogleCalendarService implements ICalendarProvider {
  private calendar;

  constructor() {
    this.calendar = google.calendar('v3');
  }

  /**
   * Create OAuth2 client with credentials
   */
  private getOAuthClient(credentials: CalendarCredentials) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: credentials.accessToken,
      refresh_token: credentials.refreshToken,
      expiry_date: credentials.expiresAt.getTime(),
    });

    return oauth2Client;
  }

  /**
   * Get all calendar events in a date range
   */
  async getEvents(
    credentials: CalendarCredentials,
    startDate: Date,
    endDate: Date
  ): Promise<CalendarEvent[]> {
    const auth = this.getOAuthClient(credentials);

    const response = await this.calendar.events.list({
      auth,
      calendarId: 'primary',
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];

    return events.map((event) => ({
      id: event.id!,
      summary: event.summary || 'Untitled Event',
      description: event.description ?? undefined,
      start: new Date(event.start?.dateTime || event.start?.date || ''),
      end: new Date(event.end?.dateTime || event.end?.date || ''),
      attendees: event.attendees?.map((a) => a.email || '') || [],
      location: event.location ?? undefined,
      conferenceLink: event.hangoutLink ?? undefined,
    }));
  }

  /**
   * Create a new calendar event
   */
  async createEvent(
    credentials: CalendarCredentials,
    event: Partial<CalendarEvent>
  ): Promise<CalendarEvent> {
    const auth = this.getOAuthClient(credentials);

    console.log('📅 Creating Google Calendar event:', {
      summary: event.summary,
      start: event.start?.toISOString(),
      end: event.end?.toISOString(),
      attendees: event.attendees,
    });

    const response = await this.calendar.events.insert({
      auth,
      calendarId: 'primary',
      conferenceDataVersion: 1, // Enable Google Meet link
      requestBody: {
        summary: event.summary,
        description: event.description,
        start: {
          dateTime: event.start?.toISOString(),
          timeZone: 'America/New_York',
        },
        end: {
          dateTime: event.end?.toISOString(),
          timeZone: 'America/New_York',
        },
        attendees: event.attendees?.map((email) => ({ email })),
        location: event.location,
        conferenceData: {
          createRequest: {
            requestId: `roundrobin-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 30 }, // 30 min before
          ],
        },
      },
    });

    const createdEvent = response.data;

    console.log('✅ Calendar event created:', {
      id: createdEvent.id,
      htmlLink: createdEvent.htmlLink,
      hangoutLink: createdEvent.hangoutLink,
    });

    return {
      id: createdEvent.id!,
      summary: createdEvent.summary || '',
      description: createdEvent.description ?? undefined,
      start: new Date(createdEvent.start?.dateTime || ''),
      end: new Date(createdEvent.end?.dateTime || ''),
      attendees: createdEvent.attendees?.map((a) => a.email || '') || [],
      location: createdEvent.location ?? undefined,
      conferenceLink: createdEvent.hangoutLink ?? undefined,
    };
  }

  /**
   * Get available time slots based on existing events
   */
  async getAvailableSlots(
    credentials: CalendarCredentials,
    startDate: Date,
    endDate: Date,
    duration: number,
    businessHours: { start: number; end: number } = { start: 9, end: 17 }
  ): Promise<TimeSlot[]> {
    // Fetch all existing events
    const events = await this.getEvents(credentials, startDate, endDate);

    const availableSlots: TimeSlot[] = [];
    const currentDate = new Date(startDate);

    while (currentDate < endDate) {
      // Skip weekends
      if (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // Generate slots for business hours
      for (let hour = businessHours.start; hour < businessHours.end; hour++) {
        const slotStart = new Date(currentDate);
        slotStart.setHours(hour, 0, 0, 0);

        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + duration);

        // Check if slot conflicts with any existing event
        const hasConflict = events.some((event) => {
          return (
            (slotStart >= event.start && slotStart < event.end) ||
            (slotEnd > event.start && slotEnd <= event.end) ||
            (slotStart <= event.start && slotEnd >= event.end)
          );
        });

        availableSlots.push({
          start: slotStart,
          end: slotEnd,
          available: !hasConflict,
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Filter to only return available slots
    return availableSlots.filter((slot) => slot.available);
  }

  /**
   * Refresh an expired access token
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenResponse> {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();

    return {
      access_token: credentials.access_token!,
      refresh_token: credentials.refresh_token || refreshToken,
      expires_in: 3600, // Google typically gives 1 hour
      scope: credentials.scope || '',
      token_type: credentials.token_type || 'Bearer',
    };
  }
}
