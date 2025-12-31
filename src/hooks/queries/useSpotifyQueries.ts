import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import {
  searchSpotify,
  fetchSpotifyData,
  fetchSpotifyDataFromLink,
  fetchUserSavedTracks,
  fetchUserPlaylists,
  fetchUserSavedAlbums,
  parseSpotifyLink,
} from '@/services/spotify';
import { SpotifyContentType } from '@/types/spotify';

export const useSpotifySearch = (query: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: queryKeys.spotify.search(query),
    queryFn: () => searchSpotify(query),
    enabled: enabled && query.trim().length >= 2,
    staleTime: 5 * 60 * 1000, 
    gcTime: 30 * 60 * 1000, 
  });
};

/**
 * Hook for fetching Spotify data by type and ID
 * Automatically uses the appropriate fetch function
 */
export const useSpotifyData = (
  id: string, 
  type: SpotifyContentType, 
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: queryKeys.spotify.data(type, id),
    queryFn: () => fetchSpotifyData(id, type),
    enabled: enabled && !!id && !!type,
    staleTime: type === 'playlist' ? 10 * 60 * 1000 : 30 * 60 * 1000, 
    gcTime: 60 * 60 * 1000, 
  });
};

/**
 * Mutation hook for fetching Spotify data from a link
 * Used for form submissions where we don't know the type upfront
 */
export const useFetchSpotifyDataFromLink = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (link: string) => fetchSpotifyDataFromLink(link),
    onSuccess: (data) => {
      
      const parsed = parseSpotifyLink(
        data.type === 'track' ? data.track!.id :
        data.type === 'album' ? data.album!.id :
        data.playlist!.id
      );
      if (parsed) {
        queryClient.setQueryData(
          queryKeys.spotify.data(data.type, parsed.id),
          data
        );
      }
    },
  });
};

/**
 * Mutation hook for fetching Spotify data by type and ID
 * Used for form submissions (autocomplete selection)
 */
export const useFetchSpotifyData = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, type }: { id: string; type: SpotifyContentType }) => 
      fetchSpotifyData(id, type),
    onSuccess: (data, variables) => {
      
      queryClient.setQueryData(
        queryKeys.spotify.data(variables.type, variables.id),
        data
      );
    },
  });
};





/**
 * Hook for fetching user's liked songs
 */
export const useUserSavedTracks = (
  limit: number = 50, 
  offset: number = 0,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: queryKeys.library.savedTracks(limit, offset),
    queryFn: () => fetchUserSavedTracks(limit, offset),
    enabled,
    staleTime: 2 * 60 * 1000, 
    gcTime: 10 * 60 * 1000, 
  });
};

/**
 * Hook for fetching user's playlists
 */
export const useUserPlaylists = (
  limit: number = 50, 
  offset: number = 0,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: queryKeys.library.playlists(limit, offset),
    queryFn: () => fetchUserPlaylists(limit, offset),
    enabled,
    staleTime: 2 * 60 * 1000, 
    gcTime: 10 * 60 * 1000, 
  });
};

/**
 * Hook for fetching user's saved albums
 */
export const useUserSavedAlbums = (
  limit: number = 50, 
  offset: number = 0,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: queryKeys.library.savedAlbums(limit, offset),
    queryFn: () => fetchUserSavedAlbums(limit, offset),
    enabled,
    staleTime: 2 * 60 * 1000, 
    gcTime: 10 * 60 * 1000, 
  });
};
