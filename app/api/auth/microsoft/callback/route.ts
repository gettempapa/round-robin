import { NextResponse } from 'next/server';
import { microsoftOAuthHandler } from '@/lib/auth/microsoft-oauth';
import { EncryptionService } from '@/lib/calendar/encryption';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // userId
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=microsoft_auth_denied`
      );
    }

    if (!code || !state) {
      return NextResponse.json(
        { error: 'Missing authorization code or state' },
        { status: 400 }
      );
    }

    const userId = state;

    // Exchange code for tokens
    const tokens = await microsoftOAuthHandler.getTokensFromCode(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.json({ error: 'Failed to obtain tokens' }, { status: 500 });
    }

    // Get user's email from ID token
    const email = microsoftOAuthHandler.getUserEmailFromIdToken(tokens.id_token || '');

    // Calculate expiry date
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Encrypt tokens
    const encryptedAccessToken = EncryptionService.encrypt(tokens.access_token);
    const encryptedRefreshToken = EncryptionService.encrypt(tokens.refresh_token);

    // Store in database (upsert)
    await db.calendarSync.upsert({
      where: { userId },
      create: {
        userId,
        provider: 'microsoft',
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        email,
        syncEnabled: true,
      },
      update: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        email,
        syncEnabled: true,
        lastError: null,
      },
    });

    // Redirect back to settings page with success
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?success=microsoft_connected`
    );
  } catch (error) {
    console.error('Error handling Microsoft OAuth callback:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=microsoft_auth_failed`
    );
  }
}
