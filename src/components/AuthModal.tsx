import { useState } from "react";
import { Eye, EyeOff, ExternalLink, Music, Key, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { clearTokenCache, validateClientCredentials } from "@/services/spotify";

interface AuthModalProps {
  open: boolean;
}

const AuthModal = ({ open }: AuthModalProps) => {
  const { login, isLoading: authLoading } = useAuth();

  // Client credentials
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [showClientId, setShowClientId] = useState(false);
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [credentialsError, setCredentialsError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const handleSpotifyLogin = async () => {
    await login();
  };

  const handleClientCredentialsSave = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      setCredentialsError("Both Client ID and Client Secret are required.");
      return;
    }

    setIsValidating(true);
    setCredentialsError(null);

    try {
      // Validate credentials before saving
      await validateClientCredentials(clientId.trim(), clientSecret.trim());

      // If validation passes, save and reload
      localStorage.setItem("spotify_client_id", clientId.trim());
      localStorage.setItem("spotify_client_secret", clientSecret.trim());
      clearTokenCache();

      // Reload to trigger auth check
      window.location.reload();
    } catch (err) {
      setCredentialsError(
        err instanceof Error
          ? err.message
          : "Invalid credentials. Please check your Client ID and Client Secret."
      );
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-lg bg-card border-border"
        hideCloseButton
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <svg
              className="h-8 w-8 text-primary"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
            </svg>
          </div>
          <DialogTitle className="text-2xl font-bold">
            Connect to Spotify
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            To get started, please authenticate with your Spotify account to
            fetch your saved songs and playlists.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="oauth" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="oauth" className="gap-2">
              <Music className="h-4 w-4" />
              Sign in with Spotify
            </TabsTrigger>
            <TabsTrigger value="credentials" className="gap-2">
              <Key className="h-4 w-4" />
              Client Credentials
            </TabsTrigger>
          </TabsList>

          {/* OAuth Tab */}
          <TabsContent value="oauth" className="space-y-4 mt-4">
            <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-4">
              <p className="text-sm text-muted-foreground">
                Sign in with your Spotify account for the fastest setup. This
                also enables access to your liked songs and playlists.
              </p>

              <Button
                variant="glow"
                onClick={handleSpotifyLogin}
                disabled={authLoading}
                className="w-full"
                size="lg"
              >
                {authLoading ? (
                  "Connecting..."
                ) : (
                  <>
                    Sign in with Spotify
                    <svg
                      className="h-5 w-5 mr-2"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                    </svg>
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Client Credentials Tab */}
          <TabsContent value="credentials" className="space-y-4 mt-4">
            <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Use your own Spotify API credentials.
                </p>
                <a
                  href="https://developer.spotify.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  Get credentials <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {credentialsError && (
                <p className="text-sm text-destructive">{credentialsError}</p>
              )}

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    Client ID
                  </label>
                  <div className="relative">
                    <Input
                      type={showClientId ? "text" : "password"}
                      value={clientId}
                      onChange={(e) => {
                        setClientId(e.target.value);
                        setCredentialsError(null);
                      }}
                      placeholder="Enter your Spotify Client ID"
                      className="pr-10 bg-background"
                    />
                    <button
                      type="button"
                      onClick={() => setShowClientId(!showClientId)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showClientId ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    Client Secret
                  </label>
                  <div className="relative">
                    <Input
                      type={showClientSecret ? "text" : "password"}
                      value={clientSecret}
                      onChange={(e) => {
                        setClientSecret(e.target.value);
                        setCredentialsError(null);
                      }}
                      placeholder="Enter your Spotify Client Secret"
                      className="pr-10 bg-background"
                    />
                    <button
                      type="button"
                      onClick={() => setShowClientSecret(!showClientSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showClientSecret ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Create an app on Spotify Developer Dashboard to get your Client
                ID and Secret. This method doesn't provide access to your
                personal library.
              </p>

              <Button
                variant="glow"
                onClick={handleClientCredentialsSave}
                disabled={isValidating}
                className="w-full"
                size="lg"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Validating...
                  </>
                ) : (
                  "Continue with Credentials"
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
