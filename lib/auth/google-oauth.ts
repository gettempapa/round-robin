/**
 * Google OAuth Flow Handler
 */

import { google } from 'googleapis';

export class GoogleOAuthHandler {
  private oauth2Client;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  /**
   * Generate authorization URL for user to grant permissions
   */
  getAuthorizationUrl(userId: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.email', // To get user's email
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline', // Get refresh token
      scope: scopes,
      state: userId, // Pass userId to identify user in callback
      prompt: 'consent', // Force consent screen to ensure we get refresh token
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokensFromCode(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    return tokens;
  }

  /**
   * Get user's email from access token
   */
  async getUserEmail(accessToken: string): Promise<string> {
    const oauth2 = google.oauth2({
      version: 'v2',
      auth: this.oauth2Client,
    });

    this.oauth2Client.setCredentials({ access_token: accessToken });

    const { data } = await oauth2.userinfo.get();
    return data.email || '';
  }
}

export const googleOAuthHandler = new GoogleOAuthHandler();
