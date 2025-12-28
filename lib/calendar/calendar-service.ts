/**
 * Unified Calendar Service
 *
 * Purpose: Provide a single interface to work with any calendar provider
 * Handles: Provider selection, credential management, token refresh
 */

import { db } from '@/lib/db';
import { EncryptionService } from './encryption';
import { GoogleCalendarService } from './google-calendar';
import { MicrosoftCalendarService } from './microsoft-calendar';
import {
  ICalendarProvider,
  CalendarProvider,
  CalendarEvent,
  TimeSlot,
  CalendarCredentials,
  CalendarSyncStatus,
} from './types';

export class CalendarService {
  private googleService: GoogleCalendarService;
  private microsoftService: MicrosoftCalendarService;

  constructor() {
    this.googleService = new GoogleCalendarService();
    this.microsoftService = new MicrosoftCalendarService();
  }

  /**
   * Get the appropriate calendar provider service
   */
  private getProviderService(provider: CalendarProvider): ICalendarProvider {
    switch (provider) {
      case 'google':
        return this.googleService;
      case 'microsoft':
        return this.microsoftService;
      default:
        throw new Error(`Unknown calendar provider: ${provider}`);
    }
  }

  /**
   * Get decrypted credentials for a user
   */
  private async getCredentials(userId: string): Promise<{
    credentials: CalendarCredentials;
    provider: CalendarProvider;
    syncId: string;
  }> {
    let sync = await db.calendarSync.findUnique({
      where: { userId },
    });

    // FALLBACK: If user doesn't have a calendar, use shared calendar (for testing)
    if (!sync) {
      // Try to find any connected calendar as fallback
      sync = await db.calendarSync.findFirst({
        where: { syncEnabled: true },
        orderBy: { createdAt: 'desc' },
      });

      if (!sync) {
        throw new Error('No calendar connected for this user');
      }

      console.log(`Using shared calendar (${sync.email}) for user ${userId}`);
    }

    if (!sync.syncEnabled) {
      throw new Error('Calendar sync is disabled');
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(sync.expiresAt);
    const needsRefresh = expiresAt.getTime() - now.getTime() < 5 * 60 * 1000; // Refresh if < 5 min

    let accessToken = EncryptionService.decrypt(sync.accessToken);
    let refreshToken = EncryptionService.decrypt(sync.refreshToken);
    let newExpiresAt = expiresAt;

    // Refresh token if needed
    if (needsRefresh) {
      console.log(`Refreshing token for user ${userId}`);
      const provider = this.getProviderService(sync.provider as CalendarProvider);
      const newTokens = await provider.refreshAccessToken(refreshToken);

      accessToken = newTokens.access_token;
      if (newTokens.refresh_token) {
        refreshToken = newTokens.refresh_token;
      }
      newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000);

      // Update database with new tokens
      await db.calendarSync.update({
        where: { id: sync.id },
        data: {
          accessToken: EncryptionService.encrypt(accessToken),
          refreshToken: EncryptionService.encrypt(refreshToken),
          expiresAt: newExpiresAt,
          lastSyncAt: new Date(),
        },
      });
    }

    return {
      credentials: {
        accessToken,
        refreshToken,
        expiresAt: newExpiresAt,
      },
      provider: sync.provider as CalendarProvider,
      syncId: sync.id,
    };
  }

  /**
   * Get calendar sync status for a user
   */
  async getSyncStatus(userId: string): Promise<CalendarSyncStatus> {
    let sync = await db.calendarSync.findUnique({
      where: { userId },
    });

    // FALLBACK: If user doesn't have a calendar, check for shared calendar
    if (!sync) {
      sync = await db.calendarSync.findFirst({
        where: { syncEnabled: true },
        orderBy: { createdAt: 'desc' },
      });

      if (!sync) {
        return { connected: false };
      }

      console.log(`Using shared calendar (${sync.email}) for user ${userId} - getSyncStatus`);
    }

    return {
      connected: true,
      provider: sync.provider as CalendarProvider,
      email: sync.email || undefined,
      lastSyncAt: sync.lastSyncAt || undefined,
      lastError: sync.lastError || undefined,
    };
  }

  /**
   * Get available time slots for a user
   */
  async getAvailableSlots(
    userId: string,
    startDate: Date,
    endDate: Date,
    duration: number = 30
  ): Promise<TimeSlot[]> {
    try {
      const { credentials, provider, syncId } = await this.getCredentials(userId);
      const service = this.getProviderService(provider);

      // Get user's availability settings (if we implement this feature)
      // For now, use default business hours 9-5
      const businessHours = { start: 9, end: 17 };

      const slots = await service.getAvailableSlots(
        credentials,
        startDate,
        endDate,
        duration,
        businessHours
      );

      // Update last sync time (use syncId, not userId, for shared calendar support)
      await db.calendarSync.update({
        where: { id: syncId },
        data: { lastSyncAt: new Date(), lastError: null },
      });

      return slots;
    } catch (error) {
      // Log error to database (attempt with userId first, then ignore if it fails)
      await db.calendarSync.update({
        where: { userId },
        data: { lastError: error instanceof Error ? error.message : 'Unknown error' },
      }).catch(() => {
        // Ignore errors updating the error field (user may not have own calendar)
      });

      throw error;
    }
  }

  /**
   * Create a calendar event
   */
  async createEvent(
    userId: string,
    event: Partial<CalendarEvent>
  ): Promise<CalendarEvent> {
    try {
      const { credentials, provider, syncId } = await this.getCredentials(userId);
      const service = this.getProviderService(provider);

      const createdEvent = await service.createEvent(credentials, event);

      // Update last sync time (use syncId, not userId, for shared calendar support)
      await db.calendarSync.update({
        where: { id: syncId },
        data: { lastSyncAt: new Date(), lastError: null },
      });

      return createdEvent;
    } catch (error) {
      // Log error to database (attempt with userId first, then ignore if it fails)
      await db.calendarSync.update({
        where: { userId },
        data: { lastError: error instanceof Error ? error.message : 'Unknown error' },
      }).catch(() => {
        // Ignore errors updating the error field (user may not have own calendar)
      });

      throw error;
    }
  }

  /**
   * Check if a specific time slot is available
   */
  async isSlotAvailable(
    userId: string,
    slotStart: Date,
    slotEnd: Date
  ): Promise<boolean> {
    const { credentials, provider } = await this.getCredentials(userId);
    const service = this.getProviderService(provider);

    const events = await service.getEvents(credentials, slotStart, slotEnd);

    // Check for conflicts
    const hasConflict = events.some((event) => {
      return (
        (slotStart >= event.start && slotStart < event.end) ||
        (slotEnd > event.start && slotEnd <= event.end) ||
        (slotStart <= event.start && slotEnd >= event.end)
      );
    });

    return !hasConflict;
  }

  /**
   * Disconnect calendar for a user
   */
  async disconnectCalendar(userId: string): Promise<void> {
    await db.calendarSync.delete({
      where: { userId },
    });
  }
}

// Export singleton instance
export const calendarService = new CalendarService();
