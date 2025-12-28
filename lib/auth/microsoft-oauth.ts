/**
 * Microsoft OAuth Flow Handler
 */

import {
  ConfidentialClientApplication,
  AuthorizationUrlRequest,
  AuthorizationCodeRequest,
} from '@azure/msal-node';

export class MicrosoftOAuthHandler {
  private msalClient: ConfidentialClientApplication | null = null;
  private redirectUri: string = '';

  private getClient(): ConfidentialClientApplication {
    if (!this.msalClient) {
      if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET) {
        throw new Error('Microsoft OAuth not configured. Please set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET.');
      }

      this.redirectUri = process.env.MICROSOFT_REDIRECT_URI!;

      const msalConfig = {
        auth: {
          clientId: process.env.MICROSOFT_CLIENT_ID!,
          authority: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}`,
          clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
        },
      };

      this.msalClient = new ConfidentialClientApplication(msalConfig);
    }
    return this.msalClient;
  }

  private getRedirectUri(): string {
    if (!this.redirectUri) {
      this.getClient(); // This initializes redirectUri
    }
    return this.redirectUri;
  }

  /**
   * Generate authorization URL for user to grant permissions
   */
  async getAuthorizationUrl(userId: string): Promise<string> {
    const authCodeUrlParameters: AuthorizationUrlRequest = {
      scopes: [
        'https://graph.microsoft.com/Calendars.Read',
        'https://graph.microsoft.com/Calendars.ReadWrite',
        'https://graph.microsoft.com/User.Read',
        'offline_access', // Get refresh token
      ],
      redirectUri: this.getRedirectUri(),
      state: userId, // Pass userId to identify user in callback
      prompt: 'consent', // Force consent to get refresh token
    };

    return await this.getClient().getAuthCodeUrl(authCodeUrlParameters);
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokensFromCode(code: string) {
    const tokenRequest: AuthorizationCodeRequest = {
      code: code,
      scopes: [
        'https://graph.microsoft.com/Calendars.Read',
        'https://graph.microsoft.com/Calendars.ReadWrite',
        'https://graph.microsoft.com/User.Read',
        'offline_access',
      ],
      redirectUri: this.getRedirectUri(),
    };

    const response = await this.getClient().acquireTokenByCode(tokenRequest);

    if (!response) {
      throw new Error('Failed to acquire tokens');
    }

    return {
      access_token: response.accessToken,
      refresh_token: '', // MSAL manages refresh tokens internally
      expires_in: response.expiresOn
        ? Math.floor((response.expiresOn.getTime() - Date.now()) / 1000)
        : 3600,
      scope: response.scopes.join(' '),
      token_type: response.tokenType || 'Bearer',
      id_token: response.idToken || '',
    };
  }

  /**
   * Get user's email from ID token
   */
  getUserEmailFromIdToken(idToken: string): string {
    // Decode JWT (simple base64 decode, no verification needed since we got it from Microsoft)
    const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
    return payload.preferred_username || payload.email || '';
  }
}

export const microsoftOAuthHandler = new MicrosoftOAuthHandler();
