/**
 * Shared types for calendar operations
 */

export type CalendarProvider = 'google' | 'microsoft';

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  attendees?: string[];
  location?: string;
  conferenceLink?: string;
}

export interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
}

export interface AvailabilityRequest {
  userId: string;
  startDate: Date;
  endDate: Date;
  duration: number; // minutes
}

export interface CalendarCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface OAuthTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

export interface CalendarSyncStatus {
  connected: boolean;
  provider?: CalendarProvider;
  email?: string;
  lastSyncAt?: Date;
  lastError?: string;
}

// Interface that all calendar providers must implement
export interface ICalendarProvider {
  /**
   * Get all events in a date range
   */
  getEvents(credentials: CalendarCredentials, startDate: Date, endDate: Date): Promise<CalendarEvent[]>;

  /**
   * Create a new calendar event
   */
  createEvent(credentials: CalendarCredentials, event: Partial<CalendarEvent>): Promise<CalendarEvent>;

  /**
   * Get available time slots based on existing events
   */
  getAvailableSlots(
    credentials: CalendarCredentials,
    startDate: Date,
    endDate: Date,
    duration: number,
    businessHours?: { start: number; end: number }
  ): Promise<TimeSlot[]>;

  /**
   * Refresh an expired access token
   */
  refreshAccessToken(refreshToken: string): Promise<OAuthTokenResponse>;
}
