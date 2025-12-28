import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings/salesforce?error=${error}`);
    }

    if (!code || !state) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings/salesforce?error=no_code`);
    }

    // Retrieve code verifier from database
    const verifierRecord = await db.oAuthVerifier.findUnique({
      where: { state },
    });

    if (!verifierRecord) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings/salesforce?error=invalid_state`);
    }

    // Check if expired
    if (verifierRecord.expiresAt < new Date()) {
      await db.oAuthVerifier.delete({ where: { state } });
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings/salesforce?error=expired_state`);
    }

    const codeVerifier = verifierRecord.verifier;

    // Clean up verifier
    await db.oAuthVerifier.delete({ where: { state } });

    const loginUrl = process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com';
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/salesforce/callback`;

    // Exchange code for tokens with PKCE
    const tokenResponse = await fetch(`${loginUrl}/services/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: process.env.SALESFORCE_CLIENT_ID!,
        client_secret: process.env.SALESFORCE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/salesforce?error=token_exchange_failed`
      );
    }

    const tokens = await tokenResponse.json();

    // Get user identity
    const identityResponse = await fetch(tokens.id, {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    });

    const identity = await identityResponse.json();

    // Store or update integration in database
    await db.salesforceIntegration.upsert({
      where: {
        userId: 'default', // In production, use actual user ID from session
      },
      create: {
        userId: 'default',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || '',
        instanceUrl: tokens.instance_url,
        orgId: identity.organization_id,
        username: identity.username,
        isActive: true,
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || '',
        instanceUrl: tokens.instance_url,
        orgId: identity.organization_id,
        username: identity.username,
        isActive: true,
        updatedAt: new Date(),
      },
    });

    // Redirect back to settings page with success
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings/salesforce?success=true`);
  } catch (error) {
    console.error('Salesforce callback error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/salesforce?error=callback_failed`
    );
  }
}
