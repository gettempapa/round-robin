import { NextResponse } from 'next/server';
import { googleOAuthHandler } from '@/lib/auth/google-oauth';
import { EncryptionService } from '@/lib/calendar/encryption';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  console.log('🔵 Google OAuth callback triggered');

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // userId
    const error = searchParams.get('error');

    console.log('📥 Received params:', { code: code?.substring(0, 20) + '...', state, error });

    if (error) {
      console.log('❌ OAuth error:', error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=google_auth_denied`
      );
    }

    if (!code || !state) {
      console.log('❌ Missing code or state');
      return NextResponse.json(
        { error: 'Missing authorization code or state' },
        { status: 400 }
      );
    }

    const userId = state;
    console.log('👤 User ID:', userId);

    // Exchange code for tokens
    console.log('🔄 Exchanging code for tokens...');
    const tokens = await googleOAuthHandler.getTokensFromCode(code);
    console.log('✅ Tokens received:', {
      has_access: !!tokens.access_token,
      has_refresh: !!tokens.refresh_token,
      expiry: tokens.expiry_date
    });

    if (!tokens.access_token || !tokens.refresh_token) {
      console.log('❌ Missing tokens');
      return NextResponse.json({ error: 'Failed to obtain tokens' }, { status: 500 });
    }

    // Get user's email
    console.log('📧 Getting user email...');
    const email = await googleOAuthHandler.getUserEmail(tokens.access_token);
    console.log('✅ User email:', email);

    // Calculate expiry date
    const expiresAt = new Date(Date.now() + (tokens.expiry_date || 3600 * 1000));
    console.log('⏰ Token expires at:', expiresAt);

    // Encrypt tokens
    console.log('🔐 Encrypting tokens...');
    const encryptedAccessToken = EncryptionService.encrypt(tokens.access_token);
    const encryptedRefreshToken = EncryptionService.encrypt(tokens.refresh_token);
    console.log('✅ Tokens encrypted');

    // Store in database (upsert)
    console.log('💾 Saving to database...');
    const saved = await db.calendarSync.upsert({
      where: { userId },
      create: {
        userId,
        provider: 'google',
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
    console.log('✅ Calendar sync saved:', saved.id);

    // Redirect back to settings page with success
    console.log('🔄 Redirecting to settings...');
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?success=google_connected`
    );
  } catch (error) {
    console.error('❌ ERROR in Google OAuth callback:', error);
    console.error('Error details:', error instanceof Error ? error.message : error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'N/A');
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=google_auth_failed`
    );
  }
}
