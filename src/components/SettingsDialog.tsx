import { useState } from "react";
import { X, LogOut } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSettings } from "@/contexts/SettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { LyricsFormat } from "@/types/spotify";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const lyricsTypeOptions = [
  { value: "lrc", label: "LRC (Synced Lyrics)" },
  { value: "srt", label: "SRT (Subtitle Format)" },
  { value: "raw", label: "RAW (Plain Text)" },
] as const;

const fileNameTokens = [
  { value: "{track_number}", label: "Track Number" },
  { value: "{track_name}", label: "Track Name" },
  { value: "{track_artist}", label: "Artist" },
  { value: "{track_album}", label: "Album" },
  { value: "{track_id}", label: "Track ID" },
] as const;

const separatorTokens = [
  { value: ".", label: "." },
  { value: " - ", label: " - " },
  { value: "_", label: "_" },
  { value: " ", label: "Space" },
];

const DEFAULT_API_BASE = "http://localhost:8080";

const SettingsDialog = ({ open, onOpenChange }: SettingsDialogProps) => {
  const { settings, updateSettings } = useSettings();
  const { authState, logout } = useAuth();
  const [showTokenMenu, setShowTokenMenu] = useState(false);

  const handleLyricsTypeChange = (type: LyricsFormat) => {
    updateSettings({ ...settings, lyricsType: type });
  };

  const handleLogout = () => {
    // Clear OAuth tokens
    logout();

    // Clear client credentials
    localStorage.removeItem("spotify_client_id");
    localStorage.removeItem("spotify_client_secret");

    // Close dialog and navigate to home
    onOpenChange(false);
    window.location.href = "/";
  };

  const handleAddToken = (token: string) => {
    updateSettings({
      ...settings,
      fileNameFormat: [...settings.fileNameFormat, token],
    });
    setShowTokenMenu(false);
  };

  const handleRemoveToken = (index: number) => {
    const newFormat = settings.fileNameFormat.filter((_, i) => i !== index);
    updateSettings({ ...settings, fileNameFormat: newFormat });
  };

  const handleApiBaseChange = (value: string) => {
    updateSettings({ ...settings, lyricsApiBase: value });
  };

  const getTokenLabel = (token: string): string => {
    const found = [...fileNameTokens, ...separatorTokens].find(
      (t) => t.value === token
    );
    return found ? (token.startsWith("{") ? token : found.label) : token;
  };

  const getFileExtension = (format: LyricsFormat): string => {
    switch (format) {
      case "raw":
        return "txt";
      case "lrc":
        return "lrc";
      case "srt":
        return "srt";
      default:
        return "lrc";
    }
  };

  const getPreviewFilename = (): string => {
    const preview = settings.fileNameFormat
      .map((token) => {
        switch (token) {
          case "{track_number}":
            return "01";
          case "{track_name}":
            return "Song Title";
          case "{track_artist}":
            return "Artist Name";
          case "{track_album}":
            return "Album Name";
          case "{track_id}":
            return "4iV5W9uYEdYUVa79Axb7Rh";
          default:
            return token;
        }
      })
      .join("");
    return `${preview}.${getFileExtension(settings.lyricsType)}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Lyrics Settings</DialogTitle>
          <DialogDescription>
            Configure your lyrics download preferences.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* Lyrics Type */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Choose Lyrics Type</h4>
            <div className="flex flex-wrap gap-2">
              {lyricsTypeOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={
                    settings.lyricsType === option.value ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => handleLyricsTypeChange(option.value)}
                  className={
                    settings.lyricsType === option.value ? "bg-primary" : ""
                  }
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* File Name Format */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Lyrics File Name Format</h4>
            <div className="relative">
              <div
                className="flex flex-wrap gap-1.5 p-2 min-h-[44px] border rounded-md bg-background cursor-text"
                onClick={() => setShowTokenMenu(true)}
              >
                {settings.fileNameFormat.map((token, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-2 py-1 text-sm bg-primary text-primary-foreground rounded"
                  >
                    {getTokenLabel(token)}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveToken(index);
                      }}
                      className="hover:bg-primary-foreground/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <span className="text-muted-foreground text-sm py-1">
                  {settings.fileNameFormat.length === 0
                    ? "Click to add tokens..."
                    : ""}
                </span>
              </div>

              {showTokenMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowTokenMenu(false)}
                  />
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg max-h-64 overflow-y-auto">
                    <div className="p-2 border-b">
                      <span className="text-xs font-medium text-muted-foreground">
                        TOKENS
                      </span>
                    </div>
                    {fileNameTokens.map((token) => (
                      <button
                        key={token.value}
                        className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                        onClick={() => handleAddToken(token.value)}
                      >
                        {token.value}
                      </button>
                    ))}
                    <div className="p-2 border-t border-b">
                      <span className="text-xs font-medium text-muted-foreground">
                        SEPARATORS
                      </span>
                    </div>
                    {separatorTokens.map((token) => (
                      <button
                        key={token.value}
                        className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                        onClick={() => handleAddToken(token.value)}
                      >
                        {token.label === token.value
                          ? `"${token.value}"`
                          : `"${token.value}" (${token.label})`}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Preview: <span className="font-mono">{getPreviewFilename()}</span>
            </p>
          </div>

          {/* API Base URL */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">
              Lyrics API Base URL{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </h4>
            <Input
              type="url"
              placeholder={DEFAULT_API_BASE}
              value={settings.lyricsApiBase || ""}
              onChange={(e) => handleApiBaseChange(e.target.value)}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to use the default API. Only change if you're
              self-hosting.
            </p>
          </div>

          {/* Account Section */}
          {authState.isAuthenticated && (
            <div className="space-y-3 pt-4 border-t">
              <h4 className="text-sm font-medium">Account</h4>
              {authState.user && (
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  {authState.user.images?.[0]?.url && (
                    <img
                      src={authState.user.images[0].url}
                      alt={authState.user.display_name}
                      className="h-10 w-10 rounded-full"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {authState.user.display_name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {authState.user.email}
                    </p>
                  </div>
                </div>
              )}
              <Button
                variant="destructive"
                size="sm"
                onClick={handleLogout}
                className="w-full"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out & Clear Credentials
              </Button>
              <p className="text-xs text-muted-foreground">
                This will sign you out and remove all saved credentials.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
