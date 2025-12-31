import { Loader2, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { SpotifyTrack } from '@/types/spotify';

export type TrackStatus = 'pending' | 'loading' | 'success' | 'error' | 'rate-limited';

export interface TrackProgress {
  track: SpotifyTrack;
  trackNumber: number;
  status: TrackStatus;
  error?: string;
}

interface DownloadProgressModalProps {
  open: boolean;
  onClose: () => void;
  tracks: TrackProgress[];
  isComplete: boolean;
  isPaused: boolean;
  pauseReason?: string;
  totalTracks: number;
  successCount: number;
  errorCount: number;
  onCancel?: () => void;
}

const DownloadProgressModal = ({
  open,
  onClose,
  isComplete,
  isPaused,
  pauseReason,
  totalTracks,
  successCount,
  errorCount,
  onCancel,
}: DownloadProgressModalProps) => {
  const completedCount = successCount + errorCount;
  const progressPercent = totalTracks > 0 ? (completedCount / totalTracks) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md bg-card border-border"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-center">
            {isComplete ? 'Download Complete' : 'Downloading Lyrics'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Progress Bar */}
          <div className="space-y-3">
            <Progress value={progressPercent} className="h-3" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{completedCount} of {totalTracks} tracks</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
          </div>

          {/* Status Message */}
          <div className="text-center">
            {!isComplete && !isPaused && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span>Fetching lyrics...</span>
              </div>
            )}

            {isPaused && pauseReason && (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="flex items-center justify-center gap-2 text-yellow-500">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-medium">Rate Limited</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{pauseReason}</p>
              </div>
            )}

            {isComplete && (
              <div className="space-y-2">
                {successCount > 0 && (
                  <div className="flex items-center justify-center gap-2 text-green-500">
                    <CheckCircle2 className="h-5 w-5" />
                    <span>{successCount} lyrics downloaded successfully</span>
                  </div>
                )}
                {errorCount > 0 && (
                  <div className="flex items-center justify-center gap-2 text-destructive">
                    <XCircle className="h-5 w-5" />
                    <span>{errorCount} tracks failed (lyrics not available)</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-center gap-3">
            {!isComplete && onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            {isComplete && (
              <Button variant="glow" onClick={onClose}>
                Done
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DownloadProgressModal;
