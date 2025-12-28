import crypto from 'crypto';

// Store code verifiers temporarily (persists across hot reloads)
// In production, use Redis or database
export const codeVerifiers = new Map<string, string>();

export function generateCodeVerifier() {
  return crypto.randomBytes(32).toString('base64url');
}

export function generateCodeChallenge(verifier: string) {
  return crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');
}
