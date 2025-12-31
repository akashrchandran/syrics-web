import { useState, useEffect } from 'react';
import { Heart, ListMusic, Loader2, ChevronRight, Disc, Library, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SpotifyPlaylist, SpotifyAlbum } from '@/types/spotify';
import { 
  fetchPlaylist,
  fetchAlbum,
  fetchUserSavedTracks,
} from '@/services/spotify';
import { 
  useUserSavedTracks,
  useUserPlaylists,
  useUserSavedAlbums,
} from '@/hooks/queries';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface LibraryPanelProps {
  open: boolean;
  onClose: () => void;
}

const LibraryPanel = ({ open, onClose }: LibraryPanelProps) => {
  const navigate = useNavigate();
  const { isOAuthUser, authState } = useAuth();
  
  const [isClosing, setIsClosing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Only fetch for OAuth users
  // React Query hooks for library data
  const { data: likedData, isLoading: isLoadingLiked, error: likedError } = useUserSavedTracks(
    1, 0, // Just to get total count
    isOAuthUser && open
  );
  
  const { data: playlistData, isLoading: isLoadingPlaylists, error: playlistError } = useUserPlaylists(
    50, 0,
    isOAuthUser && open
  );
  
  const { data: albumData, isLoading: isLoadingAlbums, error: albumError } = useUserSavedAlbums(
    50, 0,
    isOAuthUser && open
  );

  // Combined loading and error states
  const isLoading = isLoadingLiked || isLoadingPlaylists || isLoadingAlbums;
  const error = likedError || playlistError || albumError;
  
  // Derived data
  const likedSongsTotal = likedData?.total ?? 0;
  const playlists = playlistData?.playlists ?? [];
  const albums = albumData?.albums ?? [];

  // Handle open/close with animation
  useEffect(() => {
    if (open) {
      setIsVisible(true);
      setIsClosing(false);
    } else if (isVisible) {
      // Trigger close animation
      setIsClosing(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setIsClosing(false);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [open, isVisible]);

  // Handle close with animation (for backdrop/X click)
  const handleClose = () => {
    onClose();
  };

  const handlePlaylistClick = async (playlist: SpotifyPlaylist) => {
    onClose();
    try {
      const fullPlaylist = await fetchPlaylist(playlist.id);
      navigate('/downloads', { 
        state: { 
          data: { 
            type: 'playlist', 
            playlist: fullPlaylist 
          } 
        } 
      });
    } catch (err) {
      console.error('Failed to fetch playlist:', err);
      toast.error('Failed to load playlist', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    }
  };

  const handleAlbumClick = async (album: SpotifyAlbum) => {
    onClose();
    try {
      const fullAlbum = await fetchAlbum(album.id);
      navigate('/downloads', { 
        state: { 
          data: { 
            type: 'album', 
            album: fullAlbum 
          } 
        } 
      });
    } catch (err) {
      console.error('Failed to fetch album:', err);
      toast.error('Failed to load album', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    }
  };

  const handleLikedSongsClick = async () => {
    onClose();
    try {
      const allLiked = await fetchUserSavedTracks(50, 0);
      navigate('/downloads', { 
        state: { 
          data: { 
            type: 'playlist', 
            playlist: {
              id: 'liked-songs',
              name: 'Liked Songs',
              owner: authState.user?.display_name || 'You',
              image: '',
              totalTracks: allLiked.total,
              tracks: allLiked.tracks,
            }
          } 
        } 
      });
    } catch (err) {
      console.error('Failed to fetch liked songs:', err);
      toast.error('Failed to load liked songs', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    }
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-250 ${
          isClosing ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={handleClose}
      />
      
      {/* Panel */}
      <div 
        className="fixed left-0 top-0 bottom-0 w-80 bg-card border-r border-border z-50 shadow-xl"
        style={{
          animation: isClosing 
            ? "slide-out-left 0.25s ease-in forwards" 
            : "slide-in-left 0.3s ease-out forwards",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Library className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-foreground">Your Library</h2>
          </div>
          <button 
            onClick={handleClose}
            className="p-1 rounded-md hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <ScrollArea className="h-[calc(100vh-65px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="p-4 text-sm text-destructive text-center">
              {error instanceof Error ? error.message : 'Failed to load library'}
            </div>
          ) : (
            <div className="p-4 space-y-6">
              {/* Liked Songs */}
              <section>
                <button
                  onClick={handleLikedSongsClick}
                  className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors"
                >
                  <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Heart className="h-7 w-7 text-white fill-white" />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="font-semibold text-foreground">Liked Songs</p>
                    <p className="text-sm text-muted-foreground">{likedSongsTotal} songs</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
              </section>

              {/* Albums */}
              {albums.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
                    Saved Albums
                  </h3>
                  <div className="space-y-1">
                    {albums.map((album) => (
                      <button
                        key={album.id}
                        onClick={() => handleAlbumClick(album)}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                      >
                        {album.image ? (
                          <img 
                            src={album.image} 
                            alt={album.name}
                            className="w-11 h-11 rounded object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded bg-muted flex items-center justify-center flex-shrink-0">
                            <Disc className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{album.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {album.artists.join(', ')} • {album.totalTracks} songs
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Playlists */}
              {playlists.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
                    Playlists
                  </h3>
                  <div className="space-y-1">
                    {playlists.map((playlist) => (
                      <button
                        key={playlist.id}
                        onClick={() => handlePlaylistClick(playlist)}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                      >
                        {playlist.image ? (
                          <img 
                            src={playlist.image} 
                            alt={playlist.name}
                            className="w-11 h-11 rounded object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded bg-muted flex items-center justify-center flex-shrink-0">
                            <ListMusic className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{playlist.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {playlist.totalTracks} songs • {playlist.owner}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {albums.length === 0 && playlists.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Your library is empty
                </p>
              )}
            </div>
          )}
        </ScrollArea>
      </div>

      <style>{`
        @keyframes slide-in-left {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }
        @keyframes slide-out-left {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-100%);
          }
        }
      `}</style>
    </>
  );
};

export default LibraryPanel;
