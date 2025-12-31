/**
 * Spotify API Service
 * Handles all Spotify API interactions with proper authentication,
 * error handling, and response validation.
 * Supports both OAuth (PKCE) and Client Credentials flows.
 */

import { SpotifyTrack, SpotifyAlbum, SpotifyPlaylist, AutocompleteSuggestion, SpotifyData, SpotifyContentType, SpotifyAuthTokens, SpotifyUserProfile, AuthMode } from '@/types/spotify';
import { generateCodeVerifier, generateCodeChallenge, generateState, storePkceValues, retrievePkceValues } from '@/lib/pkce';
import { getConfig } from '@/lib/config';

// Spotify API endpoints
const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_AUTHORIZE_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

// OAuth configuration - use runtime config for Docker support
const SPOTIFY_CLIENT_ID = getConfig('VITE_SPOTIFY_CLIENT_ID');
const REDIRECT_URI = `${window.location.origin}/callback`;

// Scopes for OAuth - includes user library, playlists, and profile access
const SPOTIFY_SCOPES = [
  'user-read-private',
  'user-read-email',
  'user-library-read',
  'playlist-read-private',
  'playlist-read-collaborative',
].join(' ');

// Cache for access token (Client Credentials flow)
let accessToken: string | null = null;
let tokenExpiry: number = 0;

// OAuth token cache
let oauthAccessToken: string | null = null;
let oauthRefreshToken: string | null = null;
let oauthTokenExpiry: number = 0;

// Current auth mode
let currentAuthMode: AuthMode = 'client-credentials';

/**
 * Initialize OAuth tokens from localStorage
 */
export const initializeOAuthFromStorage = (): { accessToken: string | null; refreshToken: string | null; tokenExpiry: number } => {
  oauthAccessToken = localStorage.getItem('spotify_oauth_access_token');
  oauthRefreshToken = localStorage.getItem('spotify_oauth_refresh_token');
  oauthTokenExpiry = parseInt(localStorage.getItem('spotify_oauth_token_expiry') || '0', 10);
  
  if (oauthAccessToken && oauthRefreshToken) {
    currentAuthMode = 'oauth';
  }
  
  return {
    accessToken: oauthAccessToken,
    refreshToken: oauthRefreshToken,
    tokenExpiry: oauthTokenExpiry,
  };
};

/**
 * Save OAuth tokens to localStorage
 */
const saveOAuthTokens = (tokens: SpotifyAuthTokens): void => {
  const expiry = Date.now() + (tokens.expires_in * 1000);
  
  localStorage.setItem('spotify_oauth_access_token', tokens.access_token);
  localStorage.setItem('spotify_oauth_refresh_token', tokens.refresh_token);
  localStorage.setItem('spotify_oauth_token_expiry', expiry.toString());
  
  oauthAccessToken = tokens.access_token;
  oauthRefreshToken = tokens.refresh_token;
  oauthTokenExpiry = expiry;
  currentAuthMode = 'oauth';
};

/**
 * Clear OAuth tokens from localStorage
 */
export const clearOAuthTokens = (): void => {
  localStorage.removeItem('spotify_oauth_access_token');
  localStorage.removeItem('spotify_oauth_refresh_token');
  localStorage.removeItem('spotify_oauth_token_expiry');
  localStorage.removeItem('spotify_user_profile');
  
  oauthAccessToken = null;
  oauthRefreshToken = null;
  oauthTokenExpiry = 0;
  currentAuthMode = 'client-credentials';
};

/**
 * Set the current authentication mode
 */
export const setAuthMode = (mode: AuthMode): void => {
  currentAuthMode = mode;
};

/**
 * Get the current authentication mode
 */
export const getAuthMode = (): AuthMode => currentAuthMode;

/**
 * Error class for Spotify API errors
 */
export class SpotifyApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public errorCode?: string
  ) {
    super(message);
    this.name = 'SpotifyApiError';
  }
}

/**
 * Get Spotify credentials from localStorage or environment
 */
const getCredentials = (): { clientId: string; clientSecret: string } => {
  const clientId = localStorage.getItem('spotify_client_id');
  const clientSecret = localStorage.getItem('spotify_client_secret');
  
  if (!clientId || !clientSecret) {
    throw new SpotifyApiError(
      'Spotify credentials not configured. Please add your Client ID and Client Secret in Settings.',
      401,
      'CREDENTIALS_MISSING'
    );
  }
  
  return { clientId, clientSecret };
};

// ============================================
// OAuth PKCE Flow Functions
// ============================================

/**
 * Get the OAuth client ID
 */
export const getOAuthClientId = (): string => {
  return SPOTIFY_CLIENT_ID;
};

/**
 * Get the OAuth redirect URI
 */
export const getRedirectUri = (): string => {
  return REDIRECT_URI;
};

/**
 * Initiate the OAuth PKCE login flow
 * Redirects the user to Spotify's authorization page
 */
export const initiateOAuthLogin = async (): Promise<void> => {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateState();
  
  // Store PKCE values for the callback
  storePkceValues(codeVerifier, state);
  
  const clientId = getOAuthClientId();
  
  if (!clientId) {
    throw new SpotifyApiError(
      'Spotify Client ID is not configured.',
      401,
      'CLIENT_ID_MISSING'
    );
  }
  
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    state: state,
    scope: SPOTIFY_SCOPES,
  });
  
  window.location.href = `${SPOTIFY_AUTHORIZE_URL}?${params.toString()}`;
};

/**
 * Handle the OAuth callback and exchange the code for tokens
 */
export const handleOAuthCallback = async (code: string, state: string): Promise<SpotifyAuthTokens> => {
  const { codeVerifier, state: storedState } = retrievePkceValues();
  
  if (!codeVerifier) {
    throw new SpotifyApiError(
      'OAuth session expired. Please try logging in again.',
      400,
      'PKCE_MISSING'
    );
  }
  
  if (state !== storedState) {
    throw new SpotifyApiError(
      'Invalid OAuth state. This could be a security issue. Please try logging in again.',
      400,
      'STATE_MISMATCH'
    );
  }
  
  const clientId = getOAuthClientId();
  
  const response = await fetch(SPOTIFY_AUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new SpotifyApiError(
      error.error_description || 'Failed to exchange authorization code',
      response.status,
      error.error
    );
  }
  
  const tokens: SpotifyAuthTokens = await response.json();
  saveOAuthTokens(tokens);
  
  return tokens;
};

/**
 * Refresh the OAuth access token using the refresh token
 */
export const refreshOAuthToken = async (): Promise<SpotifyAuthTokens> => {
  if (!oauthRefreshToken) {
    throw new SpotifyApiError(
      'No refresh token available. Please log in again.',
      401,
      'REFRESH_TOKEN_MISSING'
    );
  }
  
  const clientId = getOAuthClientId();
  
  const response = await fetch(SPOTIFY_AUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'refresh_token',
      refresh_token: oauthRefreshToken,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    
    // If refresh fails, clear tokens and throw
    if (response.status === 400 || response.status === 401) {
      clearOAuthTokens();
      throw new SpotifyApiError(
        'Session expired. Please log in again.',
        401,
        'REFRESH_FAILED'
      );
    }
    
    throw new SpotifyApiError(
      error.error_description || 'Failed to refresh access token',
      response.status,
      error.error
    );
  }
  
  const tokens: SpotifyAuthTokens = await response.json();
  
  // Refresh token may or may not be returned
  if (!tokens.refresh_token) {
    tokens.refresh_token = oauthRefreshToken;
  }
  
  saveOAuthTokens(tokens);
  
  return tokens;
};

/**
 * Get the current OAuth access token, refreshing if needed
 */
const getOAuthAccessToken = async (): Promise<string> => {
  // Return cached token if still valid (with 60s buffer)
  if (oauthAccessToken && Date.now() < oauthTokenExpiry - 60000) {
    return oauthAccessToken;
  }
  
  // Try to refresh the token
  if (oauthRefreshToken) {
    const tokens = await refreshOAuthToken();
    return tokens.access_token;
  }
  
  throw new SpotifyApiError(
    'Not authenticated. Please log in.',
    401,
    'NOT_AUTHENTICATED'
  );
};

/**
 * Fetch the current user's Spotify profile
 */
export const fetchUserProfile = async (): Promise<SpotifyUserProfile> => {
  const token = await getOAuthAccessToken();
  
  const response = await fetch(`${SPOTIFY_API_BASE}/me`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new SpotifyApiError(
      error.error?.message || 'Failed to fetch user profile',
      response.status,
      error.error?.status
    );
  }
  
  const profile: SpotifyUserProfile = await response.json();
  
  // Cache the profile
  localStorage.setItem('spotify_user_profile', JSON.stringify(profile));
  
  return profile;
};

/**
 * Get cached user profile from localStorage
 */
export const getCachedUserProfile = (): SpotifyUserProfile | null => {
  const cached = localStorage.getItem('spotify_user_profile');
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      return null;
    }
  }
  return null;
};

/**
 * Check if user is authenticated via OAuth
 */
export const isOAuthAuthenticated = (): boolean => {
  return !!(oauthAccessToken && oauthRefreshToken && Date.now() < oauthTokenExpiry + 3600000);
};

/**
 * Logout from OAuth
 */
export const logoutOAuth = (): void => {
  clearOAuthTokens();
};

// ============================================
// Client Credentials Flow Functions (Original)
// ============================================

/**
 * Validate client credentials by attempting to authenticate
 * Returns true if credentials are valid, throws error if invalid
 */
export const validateClientCredentials = async (clientId: string, clientSecret: string): Promise<boolean> => {
  const response = await fetch(SPOTIFY_AUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new SpotifyApiError(
      error.error_description || 'Invalid credentials. Please check your Client ID and Client Secret.',
      response.status,
      error.error
    );
  }

  return true;
};

/**
 * Get or refresh the access token using Client Credentials flow
 */
const getClientCredentialsToken = async (): Promise<string> => {
  // Return cached token if still valid (with 60s buffer)
  if (accessToken && Date.now() < tokenExpiry - 60000) {
    return accessToken;
  }

  const { clientId, clientSecret } = getCredentials();
  
  const response = await fetch(SPOTIFY_AUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new SpotifyApiError(
      error.error_description || 'Failed to authenticate with Spotify',
      response.status,
      error.error
    );
  }

  const data = await response.json();
  accessToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in * 1000);
  
  return accessToken!;
};

/**
 * Get the appropriate access token based on current auth mode
 */
const getAccessToken = async (): Promise<string> => {
  if (currentAuthMode === 'oauth' && oauthAccessToken) {
    return getOAuthAccessToken();
  }
  return getClientCredentialsToken();
};

/**
 * Make an authenticated request to the Spotify API
 */
const spotifyFetch = async <T>(endpoint: string): Promise<T> => {
  const token = await getAccessToken();
  
  const response = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    
    if (response.status === 401) {
      // Token expired, clear cache and retry once
      accessToken = null;
      tokenExpiry = 0;
      const newToken = await getAccessToken();
      
      const retryResponse = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${newToken}`,
        },
      });
      
      if (!retryResponse.ok) {
        throw new SpotifyApiError(
          error.error?.message || 'Spotify API request failed',
          retryResponse.status,
          error.error?.status
        );
      }
      
      return retryResponse.json();
    }
    
    throw new SpotifyApiError(
      error.error?.message || 'Spotify API request failed',
      response.status,
      error.error?.status
    );
  }

  return response.json();
};

// Spotify API response types
interface SpotifyApiImage {
  url: string;
  height: number;
  width: number;
}

interface SpotifyApiArtist {
  id: string;
  name: string;
}

interface SpotifyApiTrack {
  id: string;
  name: string;
  artists: SpotifyApiArtist[];
  album: {
    id: string;
    name: string;
    images: SpotifyApiImage[];
  };
  duration_ms: number;
}

interface SpotifyApiAlbum {
  id: string;
  name: string;
  artists: SpotifyApiArtist[];
  images: SpotifyApiImage[];
  release_date: string;
  total_tracks: number;
  label: string;
  tracks: {
    items: SpotifyApiTrack[];
    next: string | null;
    total: number;
  };
}

interface SpotifyApiPlaylist {
  id: string;
  name: string;
  owner: {
    display_name: string;
  };
  images: SpotifyApiImage[];
  tracks: {
    items: Array<{
      track: SpotifyApiTrack | null;
    }>;
    next: string | null;
    total: number;
  };
}

interface SpotifySearchResponse {
  tracks?: {
    items: SpotifyApiTrack[];
  };
  albums?: {
    items: SpotifyApiAlbum[];
  };
  playlists?: {
    items: SpotifyApiPlaylist[];
  };
}

/**
 * Get the best quality image from Spotify images array
 */
const getBestImage = (images: SpotifyApiImage[]): string => {
  if (!images || images.length === 0) return '';
  // Sort by width descending and get the first (largest)
  const sorted = [...images].sort((a, b) => (b.width || 0) - (a.width || 0));
  return sorted[0]?.url || '';
};

/**
 * Transform Spotify API track to our format
 */
const transformTrack = (track: SpotifyApiTrack, albumImage?: string): SpotifyTrack => ({
  id: track.id,
  name: track.name,
  artists: track.artists.map(a => a.name),
  album: track.album?.name || '',
  albumImage: albumImage || getBestImage(track.album?.images || []),
  duration: track.duration_ms,
});

/**
 * Transform Spotify API album to our format
 */
const transformAlbum = (album: SpotifyApiAlbum): SpotifyAlbum => ({
  id: album.id,
  name: album.name,
  artists: album.artists.map(a => a.name),
  image: getBestImage(album.images),
  releaseDate: album.release_date,
  totalTracks: album.total_tracks,
  label: album.label,
  tracks: album.tracks.items.map(t => transformTrack(t, getBestImage(album.images))),
});

/**
 * Transform Spotify API playlist to our format
 */
const transformPlaylist = (playlist: SpotifyApiPlaylist): SpotifyPlaylist => ({
  id: playlist.id,
  name: playlist.name,
  owner: playlist.owner.display_name,
  image: getBestImage(playlist.images),
  totalTracks: playlist.tracks.total,
  tracks: playlist.tracks.items
    .filter(item => item.track !== null)
    .map(item => transformTrack(item.track!)),
});

/**
 * Search Spotify for tracks, albums, and playlists
 */
export const searchSpotify = async (query: string): Promise<AutocompleteSuggestion[]> => {
  if (!query.trim() || query.length < 2) return [];
  
  const encodedQuery = encodeURIComponent(query);
  const data = await spotifyFetch<SpotifySearchResponse>(
    `/search?q=${encodedQuery}&type=track,album,playlist&limit=5`
  );
  
  const suggestions: AutocompleteSuggestion[] = [];
  
  // Add tracks
  if (data.tracks?.items) {
    data.tracks.items.forEach(track => {
      suggestions.push({
        id: track.id,
        name: track.name,
        type: 'track' as SpotifyContentType,
        subtitle: track.artists.map(a => a.name).join(', '),
        image: getBestImage(track.album?.images || []),
      });
    });
  }
  
  // Add albums
  if (data.albums?.items) {
    data.albums.items.forEach(album => {
      suggestions.push({
        id: album.id,
        name: album.name,
        type: 'album' as SpotifyContentType,
        subtitle: `${album.artists.map(a => a.name).join(', ')} • ${album.release_date?.split('-')[0] || ''}`,
        image: getBestImage(album.images),
      });
    });
  }
  
  // Add playlists
  if (data.playlists?.items) {
    data.playlists.items.forEach(playlist => {
      if (playlist) {
        suggestions.push({
          id: playlist.id,
          name: playlist.name,
          type: 'playlist' as SpotifyContentType,
          subtitle: `${playlist.tracks.total} songs • ${playlist.owner.display_name}`,
          image: getBestImage(playlist.images),
        });
      }
    });
  }
  
  return suggestions;
};

/**
 * Fetch a track by ID
 */
export const fetchTrack = async (id: string): Promise<SpotifyTrack> => {
  const data = await spotifyFetch<SpotifyApiTrack>(`/tracks/${id}`);
  return transformTrack(data);
};

/**
 * Fetch an album by ID with all tracks
 */
export const fetchAlbum = async (id: string): Promise<SpotifyAlbum> => {
  const data = await spotifyFetch<SpotifyApiAlbum>(`/albums/${id}`);
  const album = transformAlbum(data);
  
  // Fetch additional tracks if there are more than 50
  if (data.tracks.next) {
    let nextUrl = data.tracks.next;
    while (nextUrl) {
      const additionalTracks = await spotifyFetch<{
        items: SpotifyApiTrack[];
        next: string | null;
      }>(nextUrl.replace(SPOTIFY_API_BASE, ''));
      
      album.tracks.push(...additionalTracks.items.map(t => transformTrack(t, album.image)));
      nextUrl = additionalTracks.next || '';
    }
  }
  
  return album;
};

/**
 * Fetch a playlist by ID with all tracks
 */
export const fetchPlaylist = async (id: string): Promise<SpotifyPlaylist> => {
  const data = await spotifyFetch<SpotifyApiPlaylist>(`/playlists/${id}`);
  const playlist = transformPlaylist(data);
  
  // Fetch additional tracks if there are more than 100
  if (data.tracks.next) {
    let nextUrl = data.tracks.next;
    while (nextUrl) {
      const additionalTracks = await spotifyFetch<{
        items: Array<{ track: SpotifyApiTrack | null }>;
        next: string | null;
      }>(nextUrl.replace(SPOTIFY_API_BASE, ''));
      
      playlist.tracks.push(
        ...additionalTracks.items
          .filter(item => item.track !== null)
          .map(item => transformTrack(item.track!))
      );
      nextUrl = additionalTracks.next || '';
    }
  }
  
  return playlist;
};

/**
 * Parse a Spotify URL or URI to extract the type and ID
 */
export const parseSpotifyLink = (input: string): { type: SpotifyContentType; id: string } | null => {
  // Handle Spotify URIs (spotify:track:xxx, spotify:album:xxx, spotify:playlist:xxx)
  const uriMatch = input.match(/spotify:(track|album|playlist):([a-zA-Z0-9]+)/);
  if (uriMatch) {
    return {
      type: uriMatch[1] as SpotifyContentType,
      id: uriMatch[2],
    };
  }
  
  // Handle Spotify URLs (https://open.spotify.com/track/xxx, etc.)
  const urlMatch = input.match(/spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/);
  if (urlMatch) {
    return {
      type: urlMatch[1] as SpotifyContentType,
      id: urlMatch[2],
    };
  }
  
  return null;
};

/**
 * Fetch Spotify data based on type and ID
 */
export const fetchSpotifyData = async (id: string, type: SpotifyContentType): Promise<SpotifyData> => {
  switch (type) {
    case 'track': {
      const track = await fetchTrack(id);
      return { type: 'track', track };
    }
    case 'album': {
      const album = await fetchAlbum(id);
      return { type: 'album', album };
    }
    case 'playlist': {
      const playlist = await fetchPlaylist(id);
      return { type: 'playlist', playlist };
    }
    default:
      throw new SpotifyApiError('Invalid content type', 400, 'INVALID_TYPE');
  }
};

/**
 * Fetch Spotify data from a URL or URI
 */
export const fetchSpotifyDataFromLink = async (link: string): Promise<SpotifyData> => {
  const parsed = parseSpotifyLink(link);
  
  if (!parsed) {
    throw new SpotifyApiError(
      'Invalid Spotify link. Please use a valid Spotify URL or URI.',
      400,
      'INVALID_LINK'
    );
  }
  
  return fetchSpotifyData(parsed.id, parsed.type);
};

/**
 * Check if credentials are configured
 */
export const hasCredentials = (): boolean => {
  // If OAuth is active, we're good
  if (currentAuthMode === 'oauth' && isOAuthAuthenticated()) {
    return true;
  }
  
  // Otherwise check client credentials
  try {
    getCredentials();
    return true;
  } catch {
    return false;
  }
};

/**
 * Clear the cached access token
 */
export const clearTokenCache = (): void => {
  accessToken = null;
  tokenExpiry = 0;
};

// ============================================
// User Library Functions (OAuth only)
// ============================================

/**
 * Fetch user's saved tracks (liked songs)
 * Requires OAuth authentication
 */
export const fetchUserSavedTracks = async (limit: number = 50, offset: number = 0): Promise<{ tracks: SpotifyTrack[]; total: number; hasMore: boolean }> => {
  if (currentAuthMode !== 'oauth') {
    throw new SpotifyApiError(
      'User library access requires Spotify login.',
      401,
      'OAUTH_REQUIRED'
    );
  }
  
  const data = await spotifyFetch<{
    items: Array<{ track: SpotifyApiTrack }>;
    total: number;
    next: string | null;
  }>(`/me/tracks?limit=${limit}&offset=${offset}`);
  
  return {
    tracks: data.items.map(item => transformTrack(item.track)),
    total: data.total,
    hasMore: data.next !== null,
  };
};

/**
 * Fetch user's playlists
 * Requires OAuth authentication
 */
export const fetchUserPlaylists = async (limit: number = 50, offset: number = 0): Promise<{ playlists: SpotifyPlaylist[]; total: number; hasMore: boolean }> => {
  if (currentAuthMode !== 'oauth') {
    throw new SpotifyApiError(
      'User library access requires Spotify login.',
      401,
      'OAUTH_REQUIRED'
    );
  }
  
  const data = await spotifyFetch<{
    items: SpotifyApiPlaylist[];
    total: number;
    next: string | null;
  }>(`/me/playlists?limit=${limit}&offset=${offset}`);
  
  return {
    playlists: data.items.map(playlist => ({
      id: playlist.id,
      name: playlist.name,
      owner: playlist.owner.display_name,
      image: getBestImage(playlist.images),
      totalTracks: playlist.tracks.total,
      tracks: [], // Tracks are fetched separately
    })),
    total: data.total,
    hasMore: data.next !== null,
  };
};

/**
 * Fetch user's saved albums
 * Requires OAuth authentication
 */
export const fetchUserSavedAlbums = async (limit: number = 50, offset: number = 0): Promise<{ albums: SpotifyAlbum[]; total: number; hasMore: boolean }> => {
  if (currentAuthMode !== 'oauth') {
    throw new SpotifyApiError(
      'User library access requires Spotify login.',
      401,
      'OAUTH_REQUIRED'
    );
  }
  
  const data = await spotifyFetch<{
    items: Array<{ album: SpotifyApiAlbum }>;
    total: number;
    next: string | null;
  }>(`/me/albums?limit=${limit}&offset=${offset}`);
  
  return {
    albums: data.items.map(item => transformAlbum(item.album)),
    total: data.total,
    hasMore: data.next !== null,
  };
};
