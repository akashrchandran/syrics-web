import { queryKeys, queryClient } from '@/lib/queryClient';
import { fetchLyrics, LyricsResponse, LyricsFormatType } from '@/services/lyrics';

export const fetchLyricsWithCache = async (
  trackId: string,
  format: LyricsFormatType = 'lrc'
): Promise<LyricsResponse> => {
  return queryClient.fetchQuery({
    queryKey: queryKeys.lyrics.track(trackId, format),
    queryFn: () => fetchLyrics(trackId, format),
    staleTime: Infinity, 
    gcTime: 60 * 60 * 1000, 
  });
};