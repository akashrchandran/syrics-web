import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Music, Disc, ListMusic, Settings, Loader2, Check, X, Ban } from 'lucide-react';
import { useState, useRef, useCallback } from 'react';
import JSZip from 'jszip';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { SpotifyData, SpotifyTrack } from '@/types/spotify';
import SettingsDialog from '@/components/SettingsDialog';
import DownloadProgressModal, { TrackProgress, TrackStatus } from '@/components/DownloadProgressModal';
import { useSettings } from '@/contexts/SettingsContext';
import { toast } from 'sonner';
import { fetchLyricsWithCache } from '@/hooks/queries';
import {
  formatLyrics,
  downloadLyricsFile,
  generateFilename,
  LyricsApiError,
} from '@/services/lyrics';

type DownloadStatus = 'idle' | 'loading' | 'success' | 'error' | 'unavailable';

interface TrackDownloadState {
  [trackId: string]: {
    status: DownloadStatus;
    error?: string;
  };
}

// Concurrency limit for parallel downloads
const CONCURRENT_DOWNLOADS = 5;
// Wait time when rate limited (in ms)
const RATE_LIMIT_WAIT = 30000;

const Downloads = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [trackDownloadState, setTrackDownloadState] = useState<TrackDownloadState>({});
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  
  // Progress modal state
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [trackProgress, setTrackProgress] = useState<TrackProgress[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseReason, setPauseReason] = useState<string>('');
  const [successCount, setSuccessCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [isDownloadComplete, setIsDownloadComplete] = useState(false);
  
  // Refs for cancellation and pause control
  const cancelRef = useRef(false);
  const pauseRef = useRef(false);
  const zipRef = useRef<JSZip | null>(null);
  
  const data = location.state?.data as SpotifyData | undefined;

  const handleCancelDownload = useCallback(() => {
    cancelRef.current = true;
    pauseRef.current = false;
    setIsPaused(false);
    setIsDownloadComplete(true);
    setIsDownloadingAll(false);
    toast.info('Download cancelled', {
      description: 'The download was cancelled.',
    });
  }, []);

  const handleCloseProgressModal = useCallback(() => {
    setShowProgressModal(false);
    setTrackProgress([]);
  }, []);

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <Logo />
        <p className="text-muted-foreground mt-8 mb-4">No content to display</p>
        <Button variant="outline" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Search
        </Button>
      </div>
    );
  }

  const getIcon = () => {
    switch (data.type) {
      case 'track': return <Music className="h-5 w-5" />;
      case 'album': return <Disc className="h-5 w-5" />;
      case 'playlist': return <ListMusic className="h-5 w-5" />;
    }
  };

  const getTitle = () => {
    switch (data.type) {
      case 'track': return data.track?.name;
      case 'album': return data.album?.name;
      case 'playlist': return data.playlist?.name;
    }
  };

  const getSubtitle = () => {
    switch (data.type) {
      case 'track': return data.track?.artists.join(', ');
      case 'album': return data.album?.artists.join(', ');
      case 'playlist': return `by ${data.playlist?.owner}`;
    }
  };

  const getImage = () => {
    switch (data.type) {
      case 'track': return data.track?.albumImage;
      case 'album': return data.album?.image;
      case 'playlist': return data.playlist?.image;
    }
  };

  const getTracks = () => {
    switch (data.type) {
      case 'track': return data.track ? [data.track] : [];
      case 'album': return data.album?.tracks || [];
      case 'playlist': return data.playlist?.tracks || [];
    }
  };

  const tracks = getTracks();

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getAlbumName = () => {
    switch (data.type) {
      case 'track': return data.track?.album || '';
      case 'album': return data.album?.name || '';
      case 'playlist': return data.playlist?.name || '';
    }
  };

  /**
   * Download lyrics for a single track
   */
  const handleDownloadTrack = async (track: SpotifyTrack, trackNumber: number) => {
    setTrackDownloadState(prev => ({
      ...prev,
      [track.id]: { status: 'loading' }
    }));

    try {
      const lyrics = await fetchLyricsWithCache(track.id, settings.lyricsType);
      
      const formattedLyrics = formatLyrics(
        lyrics,
        settings.lyricsType,
        track.name,
        track.duration,
        track.artists.join(', '),
        getAlbumName()
      );

      const filename = generateFilename(
        settings.fileNameFormat,
        trackNumber,
        track.name,
        track.artists.join(', '),
        getAlbumName(),
        settings.lyricsType
      );

      downloadLyricsFile(formattedLyrics, filename);

      setTrackDownloadState(prev => ({
        ...prev,
        [track.id]: { status: 'success' }
      }));

      toast.success('Download complete', {
        description: `Downloaded lyrics for "${track.name}"`,
      });

      // Reset status after 3 seconds
      setTimeout(() => {
        setTrackDownloadState(prev => ({
          ...prev,
          [track.id]: { status: 'idle' }
        }));
      }, 3000);

    } catch (error) {
      if (error instanceof LyricsApiError) {
        if (error.isRateLimited) {
          // Rate limited - show specific toast
          setTrackDownloadState(prev => ({
            ...prev,
            [track.id]: { status: 'error', error: 'Rate limited' }
          }));

          toast.error('API Rate Limited', {
            description: 'The lyrics API is rate limited. Please wait a moment and try again.',
          });

          // Reset status after 5 seconds
          setTimeout(() => {
            setTrackDownloadState(prev => ({
              ...prev,
              [track.id]: { status: 'idle' }
            }));
          }, 5000);
        } else if (error.isNotAvailable) {
          // Lyrics not available - permanently disable this track
          setTrackDownloadState(prev => ({
            ...prev,
            [track.id]: { status: 'unavailable', error: 'Lyrics not available on Spotify' }
          }));
          // No toast - just show inline message
        } else {
          // Other error
          setTrackDownloadState(prev => ({
            ...prev,
            [track.id]: { status: 'error', error: error.message }
          }));

          toast.error('Download failed', {
            description: error.message,
          });

          // Reset status after 5 seconds
          setTimeout(() => {
            setTrackDownloadState(prev => ({
              ...prev,
              [track.id]: { status: 'idle' }
            }));
          }, 5000);
        }
      } else {
        // Unknown error
        const message = 'Failed to download lyrics';
        
        setTrackDownloadState(prev => ({
          ...prev,
          [track.id]: { status: 'error', error: message }
        }));

        toast.error('Download failed', {
          description: message,
        });

        // Reset status after 5 seconds
        setTimeout(() => {
          setTrackDownloadState(prev => ({
            ...prev,
            [track.id]: { status: 'idle' }
          }));
        }, 5000);
      }
    }
  };

  /**
   * Download all lyrics as a ZIP file with parallel downloads
   */
  const handleDownloadAll = async () => {
    if (tracks.length === 0) return;

    // Reset state
    cancelRef.current = false;
    pauseRef.current = false;
    setIsDownloadingAll(true);
    setShowProgressModal(true);
    setIsDownloadComplete(false);
    setIsPaused(false);
    setPauseReason('');
    setSuccessCount(0);
    setErrorCount(0);
    
    // Initialize track progress
    const initialProgress: TrackProgress[] = tracks.map((track, index) => ({
      track,
      trackNumber: index + 1,
      status: 'pending' as TrackStatus,
    }));
    setTrackProgress(initialProgress);
    
    // Create ZIP instance
    const zip = new JSZip();
    zipRef.current = zip;
    
    let successTotal = 0;
    let errorTotal = 0;

    // Helper to update a single track's status
    const updateTrackStatus = (trackId: string, status: TrackStatus, error?: string) => {
      setTrackProgress(prev => prev.map(item => 
        item.track.id === trackId ? { ...item, status, error } : item
      ));
    };

    // Helper to wait while paused
    const waitWhilePaused = async () => {
      while (pauseRef.current && !cancelRef.current) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    };

    // Process a single track
    const processTrack = async (track: SpotifyTrack, trackNumber: number): Promise<boolean> => {
      if (cancelRef.current) return false;
      
      await waitWhilePaused();
      if (cancelRef.current) return false;
      
      updateTrackStatus(track.id, 'loading');
      
      try {
        const lyrics = await fetchLyricsWithCache(track.id, settings.lyricsType);
        
        if (cancelRef.current) return false;
        
        const formattedLyrics = formatLyrics(
          lyrics,
          settings.lyricsType,
          track.name,
          track.duration,
          track.artists.join(', '),
          getAlbumName()
        );

        const filename = generateFilename(
          settings.fileNameFormat,
          trackNumber,
          track.name,
          track.artists.join(', '),
          getAlbumName(),
          settings.lyricsType
        );

        zip.file(filename, formattedLyrics);
        updateTrackStatus(track.id, 'success');
        successTotal++;
        setSuccessCount(successTotal);
        return true;

      } catch (error) {
        if (cancelRef.current) return false;
        
        if (error instanceof LyricsApiError && error.isRateLimited) {
          // Rate limited - pause all downloads
          updateTrackStatus(track.id, 'rate-limited');
          pauseRef.current = true;
          setIsPaused(true);
          setPauseReason(`Waiting ${RATE_LIMIT_WAIT / 1000} seconds before retrying...`);
          
          // Wait for the rate limit period
          await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_WAIT));
          
          if (cancelRef.current) return false;
          
          // Resume and retry this track
          pauseRef.current = false;
          setIsPaused(false);
          setPauseReason('');
          
          return processTrack(track, trackNumber);
        }
        
        const message = error instanceof LyricsApiError 
          ? error.message 
          : 'Failed to fetch lyrics';
        
        updateTrackStatus(track.id, 'error', message);
        errorTotal++;
        setErrorCount(errorTotal);
        return false;
      }
    };

    // Process tracks in batches with concurrency limit
    const processBatch = async (batch: { track: SpotifyTrack; trackNumber: number }[]) => {
      await Promise.all(batch.map(({ track, trackNumber }) => processTrack(track, trackNumber)));
    };

    // Create batches
    const trackItems = tracks.map((track, index) => ({ track, trackNumber: index + 1 }));
    
    for (let i = 0; i < trackItems.length; i += CONCURRENT_DOWNLOADS) {
      if (cancelRef.current) break;
      
      const batch = trackItems.slice(i, i + CONCURRENT_DOWNLOADS);
      await processBatch(batch);
    }

    // Generate and download ZIP if not cancelled
    if (!cancelRef.current && successTotal > 0) {
      try {
        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${getTitle()?.replace(/[<>:"/\\|?*]/g, '_') || 'lyrics'}-lyrics.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success('Download complete', {
          description: `Successfully downloaded ${successTotal} lyrics. ${errorTotal > 0 ? `${errorTotal} failed.` : ''}`,
        });
      } catch {
        toast.error('ZIP creation failed', {
          description: 'Failed to create the ZIP file.',
        });
      }
    }
    setIsDownloadComplete(true);
    setIsDownloadingAll(false);
    zipRef.current = null;
  };

  const getTrackButtonContent = (trackId: string) => {
    const state = trackDownloadState[trackId];
    
    if (!state || state.status === 'idle') {
      return <Download className="h-4 w-4" />;
    }
    
    if (state.status === 'loading') {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    
    if (state.status === 'success') {
      return <Check className="h-4 w-4 text-green-500" />;
    }
    
    if (state.status === 'error') {
      return <X className="h-4 w-4 text-destructive" />;
    }

    if (state.status === 'unavailable') {
      return <Ban className="h-4 w-4" />;
    }
    
    return <Download className="h-4 w-4" />;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
      
      <main className="relative px-4 py-8 md:py-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <header className="flex items-center justify-between mb-12">
            <button 
              onClick={() => navigate('/')}
              className="hover:opacity-80 transition-opacity"
            >
              <Logo />
            </button>
            <Button variant="outline" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              New Search
            </Button>
          </header>

          {/* Content Info Card */}
          <div className="bg-card border border-border rounded-xl p-6 mb-8">
            <div className="flex gap-6">
              {getImage() ? (
                <img 
                  src={getImage()} 
                  alt={getTitle()} 
                  className="w-32 h-32 rounded-lg object-cover shadow-lg flex-shrink-0"
                />
              ) : (
                <div className="w-32 h-32 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  {getIcon()}
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 text-primary mb-2">
                  {getIcon()}
                  <span className="text-sm font-medium uppercase">{data.type}</span>
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-1">{getTitle()}</h1>
                <p className="text-muted-foreground">{getSubtitle()}</p>
                {data.type === 'album' && data.album && (
                  <div className="flex gap-4 mt-3 text-sm text-muted-foreground">
                    <span>{data.album.releaseDate}</span>
                    <span>{data.album.totalTracks} tracks</span>
                    {data.album.label && <span>{data.album.label}</span>}
                  </div>
                )}
                {data.type === 'playlist' && data.playlist && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {data.playlist.totalTracks} tracks
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Download All Button - Above tracks for easy access */}
          {tracks.length > 1 && (
            <div className="mb-6 flex justify-center">
              <Button 
                variant="glow" 
                size="lg"
                onClick={handleDownloadAll}
                disabled={isDownloadingAll}
              >
                {isDownloadingAll ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {isDownloadingAll ? 'Downloading...' : 'Download All Lyrics (.zip)'}
              </Button>
            </div>
          )}

          {/* Tracks List */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border">
              <h2 className="font-semibold text-foreground">
                {data.type === 'track' ? 'Track' : 'Tracks'} ({tracks.length})
              </h2>
            </div>
            <div className="divide-y divide-border">
              {tracks.map((track, index) => {
                const trackState = trackDownloadState[track.id];
                const isUnavailable = trackState?.status === 'unavailable';
                
                return (
                  <div 
                    key={track.id} 
                    className={`flex items-center justify-between p-4 hover:bg-muted/50 transition-colors ${isUnavailable ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <span className="w-8 text-center text-muted-foreground text-sm flex-shrink-0">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`font-medium truncate ${isUnavailable ? 'text-muted-foreground' : 'text-foreground'}`}>
                          {track.name}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {track.artists.join(', ')}
                        </p>
                        {isUnavailable && (
                          <p className="text-xs text-amber-500 mt-1 flex items-center gap-1">
                            <Ban className="h-3 w-3" />
                            Lyrics not available on Spotify
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <span className="text-sm text-muted-foreground">
                        {formatDuration(track.duration)}
                      </span>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDownloadTrack(track, index + 1)}
                        disabled={
                          trackState?.status === 'loading' || 
                          trackState?.status === 'unavailable' || 
                          isDownloadingAll
                        }
                        className={isUnavailable ? 'cursor-not-allowed' : ''}
                      >
                        {getTrackButtonContent(track.id)}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-12 text-center text-sm text-muted-foreground">
            made with <span className="text-red-500">❤️</span> by{" "}
            <a 
              href="https://github.com/akashrchandran" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              akashrchandran
            </a>
            .
          </footer>
        </div>
      </main>

      {/* Settings Button */}
      <button
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors z-50"
        onClick={() => setSettingsOpen(true)}
      >
        <Settings className="h-5 w-5" />
      </button>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      
      {/* Download Progress Modal */}
      <DownloadProgressModal
        open={showProgressModal}
        onClose={handleCloseProgressModal}
        tracks={trackProgress}
        isComplete={isDownloadComplete}
        isPaused={isPaused}
        pauseReason={pauseReason}
        totalTracks={tracks.length}
        successCount={successCount}
        errorCount={errorCount}
        onCancel={handleCancelDownload}
      />
    </div>
  );
};

export default Downloads;
