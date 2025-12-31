export type SpotifyContentType = 'track' | 'album' | 'playlist';

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: string[];
  album: string;
  albumImage: string;
  duration: number;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  artists: string[];
  image: string;
  releaseDate: string;
  totalTracks: number;
  label?: string;
  tracks: SpotifyTrack[];
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  owner: string;
  image: string;
  totalTracks: number;
  tracks: SpotifyTrack[];
}

export interface AutocompleteSuggestion {
  id: string;
  name: string;
  type: SpotifyContentType;
  subtitle: string;
  image?: string;
}

export type LyricsFormat = 'lrc' | 'srt' | 'raw';

export interface LyricsSettings {
  lyricsType: LyricsFormat;
  fileNameFormat: string[];
  lyricsApiBase?: string;
}

export interface SpotifyData {
  type: SpotifyContentType;
  track?: SpotifyTrack;
  album?: SpotifyAlbum;
  playlist?: SpotifyPlaylist;
}

// OAuth Authentication Types
export type AuthMode = 'oauth' | 'client-credentials';

export interface SpotifyAuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface SpotifyUserProfile {
  id: string;
  display_name: string | null;
  email?: string;
  images: Array<{ url: string; height: number | null; width: number | null }>;
  product?: string;
  country?: string;
}

export interface AuthState {
  mode: AuthMode;
  isAuthenticated: boolean;
  user: SpotifyUserProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiry: number;
}

export interface SavedTracksResponse {
  href: string;
  items: Array<{
    added_at: string;
    track: {
      id: string;
      name: string;
      artists: Array<{ id: string; name: string }>;
      album: {
        id: string;
        name: string;
        images: Array<{ url: string; height: number; width: number }>;
      };
      duration_ms: number;
    };
  }>;
  limit: number;
  next: string | null;
  offset: number;
  previous: string | null;
  total: number;
}
