/**
 * Microsoft Outlook Calendar API Service
 *
 * Handles all interactions with Microsoft Graph API:
 * - Fetching calendar events
 * - Creating events
 * - Checking availability
 * - Token refresh
 */

import { Client } from '@microsoft/microsoft-graph-client';
import { ConfidentialClientApplication } from '@azure/msal-node';
import { ICalendarProvider, CalendarEvent, CalendarCredentials, TimeSlot, OAuthTokenResponse } from './types';

export class MicrosoftCalendarService implements ICalendarProvider {
  /**
   * Create Microsoft Graph client with credentials
   */
  private getGraphClient(accessToken: string) {
    return Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      },
    });
  }

  /**
   * Get all calendar events in a date range
   */
  async getEvents(
    credentials: CalendarCredentials,
    startDate: Date,
    endDate: Date
  ): Promise<CalendarEvent[]> {
    const client = this.getGraphClient(credentials.accessToken);

    const response = await client
      .api('/me/calendar/events')
      .filter(
        `start/dateTime ge '${startDate.toISOString()}' and end/dateTime le '${endDate.toISOString()}'`
      )
      .select('id,subject,body,start,end,attendees,location,onlineMeeting')
      .orderby('start/dateTime')
      .get();

    const events = response.value || [];

    return events.map((event: any) => ({
      id: event.id,
      summary: event.subject || 'Untitled Event',
      description: event.body?.content,
      start: new Date(event.start.dateTime),
      end: new Date(event.end.dateTime),
      attendees: event.attendees?.map((a: any) => a.emailAddress.address) || [],
      location: event.location?.displayName,
      conferenceLink: event.onlineMeeting?.joinUrl,
    }));
  }

  /**
   * Create a new calendar event
   */
  async createEvent(
    credentials: CalendarCredentials,
    event: Partial<CalendarEvent>
  ): Promise<CalendarEvent> {
    const client = this.getGraphClient(credentials.accessToken);

    const response = await client
      .api('/me/calendar/events')
      .post({
        subject: event.summary,
        body: {
          contentType: 'HTML',
          content: event.description || '',
        },
        start: {
          dateTime: event.start?.toISOString(),
          timeZone: 'America/New_York',
        },
        end: {
          dateTime: event.end?.toISOString(),
          timeZone: 'America/New_York',
        },
        attendees: event.attendees?.map((email) => ({
          emailAddress: {
            address: email,
          },
          type: 'required',
        })),
        location: event.location
          ? {
              displayName: event.location,
            }
          : undefined,
        isOnlineMeeting: true,
        onlineMeetingProvider: 'teamsForBusiness',
        reminderMinutesBeforeStart: 30,
      });

    return {
      id: response.id,
      summary: response.subject,
      description: response.body?.content,
      start: new Date(response.start.dateTime),
      end: new Date(response.end.dateTime),
      attendees: response.attendees?.map((a: any) => a.emailAddress.address) || [],
      location: response.location?.displayName,
      conferenceLink: response.onlineMeeting?.joinUrl,
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
   * Refresh an expired access token using MSAL
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenResponse> {
    const msalConfig = {
      auth: {
        clientId: process.env.MICROSOFT_CLIENT_ID!,
        authority: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}`,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      },
    };

    const cca = new ConfidentialClientApplication(msalConfig);

    const refreshTokenRequest = {
      refreshToken: refreshToken,
      scopes: ['https://graph.microsoft.com/Calendars.ReadWrite', 'offline_access'],
    };

    const response = await cca.acquireTokenByRefreshToken(refreshTokenRequest);

    if (!response) {
      throw new Error('Failed to refresh Microsoft access token');
    }

    return {
      access_token: response.accessToken,
      refresh_token: refreshToken, // Microsoft doesn't always return new refresh token
      expires_in: response.expiresOn
        ? Math.floor((response.expiresOn.getTime() - Date.now()) / 1000)
        : 3600,
      scope: response.scopes.join(' '),
      token_type: response.tokenType || 'Bearer',
    };
  }
}
