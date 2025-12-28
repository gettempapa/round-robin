import { NextResponse } from 'next/server';
import { microsoftOAuthHandler } from '@/lib/auth/microsoft-oauth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const authUrl = await microsoftOAuthHandler.getAuthorizationUrl(userId);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Error initiating Microsoft OAuth:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Microsoft authentication' },
      { status: 500 }
    );
  }
}
