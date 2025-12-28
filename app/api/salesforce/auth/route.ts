import { NextRequest, NextResponse } from "next/server";
import crypto from 'crypto';
import { generateCodeVerifier, generateCodeChallenge } from '@/lib/salesforce-pkce';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    // Check if credentials are configured
    if (!process.env.SALESFORCE_CLIENT_ID || !process.env.SALESFORCE_CLIENT_SECRET) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/salesforce?error=credentials_not_configured`
      );
    }

    // Generate PKCE code verifier and challenge
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    // Store verifier in database with a state parameter for retrieval
    const state = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    await db.oAuthVerifier.create({
      data: {
        state,
        verifier: codeVerifier,
        expiresAt,
      },
    });

    // Clean up expired verifiers (optional background cleanup)
    db.oAuthVerifier.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    }).catch(() => {}); // Fire and forget

    const loginUrl = process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com';
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/salesforce/callback`;

    // Build authorization URL with PKCE
    const authUrl = new URL(`${loginUrl}/services/oauth2/authorize`);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', process.env.SALESFORCE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', 'api refresh_token');
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('state', state);

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error('Salesforce auth error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/salesforce?error=auth_failed`
    );
  }
}
