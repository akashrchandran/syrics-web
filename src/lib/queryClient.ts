import { QueryClient } from '@tanstack/react-query';

/**
 * Query Client Configuration
 * 
 * Configured with sensible defaults for a lyrics app:
 * - Stale time: 5 minutes (Spotify data doesn't change frequently)
 * - GC time: 30 minutes (keep data in cache for quick access)
 * - Retry: 1 retry for failed queries (avoid hammering APIs)
 * - Refetch on window focus: disabled (user-initiated refreshes preferred)
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000, // 10 minutes - Spotify metadata rarely changes
      gcTime: 60 * 60 * 1000, // 1 hour - keep in cache longer for quick access
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false, // Don't refetch if data exists
    },
    mutations: {
      retry: 0,
    },
  },
});

/**
 * Query Keys
 * Centralized query keys for cache management
 */
export const queryKeys = {
  // Spotify queries
  spotify: {
    all: ['spotify'] as const,
    search: (query: string) => [...queryKeys.spotify.all, 'search', query] as const,
    track: (id: string) => [...queryKeys.spotify.all, 'track', id] as const,
    album: (id: string) => [...queryKeys.spotify.all, 'album', id] as const,
    playlist: (id: string) => [...queryKeys.spotify.all, 'playlist', id] as const,
    data: (type: string, id: string) => [...queryKeys.spotify.all, 'data', type, id] as const,
  },
  // User library queries (OAuth only)
  library: {
    all: ['library'] as const,
    savedTracks: (limit: number, offset: number) => 
      [...queryKeys.library.all, 'savedTracks', limit, offset] as const,
    playlists: (limit: number, offset: number) => 
      [...queryKeys.library.all, 'playlists', limit, offset] as const,
    savedAlbums: (limit: number, offset: number) => 
      [...queryKeys.library.all, 'albums', limit, offset] as const,
  },
  // Lyrics queries
  lyrics: {
    all: ['lyrics'] as const,
    track: (trackId: string, format: 'lrc' | 'srt' | 'raw') => 
      [...queryKeys.lyrics.all, 'track', trackId, format] as const,
  },
} as const;
