import { NextResponse } from 'next/server';
import { googleOAuthHandler } from '@/lib/auth/google-oauth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const authUrl = googleOAuthHandler.getAuthorizationUrl(userId);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Error initiating Google OAuth:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Google authentication' },
      { status: 500 }
    );
  }
}
