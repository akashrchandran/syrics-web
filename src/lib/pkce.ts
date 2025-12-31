/**
 * PKCE (Proof Key for Code Exchange) utilities for Spotify OAuth
 * https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow
 */

/**
 * Generate a cryptographically random code verifier (43-128 characters)
 */
export function generateCodeVerifier(length: number = 64): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const randomValues = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(randomValues)
    .map((x) => possible[x % possible.length])
    .join('');
}

/**
 * Generate SHA-256 hash and base64url encode it for code challenge
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  
  return base64UrlEncode(digest);
}

/**
 * Base64 URL encode an ArrayBuffer (no padding, URL-safe characters)
 */
function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Generate a random state parameter to prevent CSRF attacks
 */
export function generateState(length: number = 16): string {
  const randomValues = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(randomValues)
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Store PKCE values in sessionStorage for the OAuth callback
 */
export function storePkceValues(codeVerifier: string, state: string): void {
  sessionStorage.setItem('spotify_code_verifier', codeVerifier);
  sessionStorage.setItem('spotify_oauth_state', state);
}

/**
 * Retrieve and clear PKCE values from sessionStorage
 */
export function retrievePkceValues(): { codeVerifier: string | null; state: string | null } {
  const codeVerifier = sessionStorage.getItem('spotify_code_verifier');
  const state = sessionStorage.getItem('spotify_oauth_state');
  
  // Clear after retrieval for security
  sessionStorage.removeItem('spotify_code_verifier');
  sessionStorage.removeItem('spotify_oauth_state');
  
  return { codeVerifier, state };
}
