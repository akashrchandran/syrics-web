import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, Library } from "lucide-react";
import Logo from "@/components/Logo";
import SearchBar from "@/components/SearchBar";
import SettingsDialog from "@/components/SettingsDialog";
import AuthModal from "@/components/AuthModal";
import LibraryPanel from "@/components/LibraryPanel";
import { AutocompleteSuggestion } from "@/types/spotify";
import { 
  parseSpotifyLink,
  SpotifyApiError 
} from "@/services/spotify";
import { 
  useFetchSpotifyDataFromLink, 
  useFetchSpotifyData 
} from "@/hooks/queries";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Animation styles as constants to avoid re-creating objects on each render
const animationStyles = {
  logo: {
    animation: "scale-in 0.6s ease-out forwards, float 6s ease-in-out 0.6s infinite",
  },
  fadeIn03: {
    animation: "fade-in 0.6s ease-out 0.3s forwards",
    opacity: 0,
  },
  fadeIn05: {
    animation: "fade-in 0.6s ease-out 0.5s forwards",
    opacity: 0,
  },
  fadeIn07: {
    animation: "fade-in 0.6s ease-out 0.7s forwards",
    opacity: 0,
  },
  fadeIn09: {
    animation: "fade-in 0.6s ease-out 0.9s forwards",
    opacity: 0,
  },
} as const;

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isOAuthUser, isLoading: authLoading } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);

  // React Query mutations for fetching Spotify data
  const fetchFromLinkMutation = useFetchSpotifyDataFromLink();
  const fetchDataMutation = useFetchSpotifyData();
  
  // Combined loading state
  const isLoading = fetchFromLinkMutation.isPending || fetchDataMutation.isPending;

  const handleSearch = (query: string) => {
    // Check if query is a Spotify link
    const parsed = parseSpotifyLink(query);
    
    if (parsed) {
      // It's a Spotify link - fetch the data directly
      fetchFromLinkMutation.mutate(query, {
        onSuccess: (data) => {
          navigate('/downloads', { state: { data } });
        },
        onError: (err) => {
          console.error('Failed to fetch:', err);
          const message = err instanceof SpotifyApiError 
            ? err.message 
            : 'Failed to fetch data. Please try again.';
          toast.error(message);
        },
      });
    } else {
      // It's a search query - show a helpful message
      toast.info("Search tip", {
        description: "Start typing to see autocomplete suggestions, or paste a Spotify link directly.",
      });
    }
  };

  const handleSelect = (suggestion: AutocompleteSuggestion) => {
    fetchDataMutation.mutate(
      { id: suggestion.id, type: suggestion.type },
      {
        onSuccess: (data) => {
          navigate('/downloads', { state: { data } });
        },
        onError: (err) => {
          console.error('Failed to fetch:', err);
          const message = err instanceof SpotifyApiError 
            ? err.message 
            : 'Failed to fetch data. Please try again.';
          toast.error(message);
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Auth Modal - shown when not authenticated */}
      <AuthModal open={!authLoading && !isAuthenticated} />
      
      {/* Subtle background gradient */}
      <div className="fixed inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
      
      {/* Library Panel */}
      <LibraryPanel open={libraryOpen} onClose={() => setLibraryOpen(false)} />
      
      {/* Library Button - shown for OAuth users */}
      {isOAuthUser && (
        <button
          className="fixed bottom-6 left-6 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors z-50"
          style={animationStyles.fadeIn09}
          onClick={() => setLibraryOpen(!libraryOpen)}
        >
          <Library className="h-5 w-5" />
          {/* Blinking badge - only show when panel is closed */}
          {!libraryOpen && (
            <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          )}
        </button>
      )}
      
      <main className="relative">
        {/* Hero Section */}
        <section className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
          <div 
            className="mb-8 animate-float"
            style={animationStyles.logo}
          >
            <Logo />
          </div>
          
          <p 
            className="text-muted-foreground text-center mb-8 max-w-md"
            style={animationStyles.fadeIn03}
          >
            Get synced lyrics for any Spotify track. Just paste the link or search.
          </p>
          
          <div
            className="w-full max-w-2xl px-4"
            style={animationStyles.fadeIn05}
          >
            <SearchBar 
              onSearch={handleSearch} 
              onSelect={handleSelect}
              showAutocomplete={true}
              isSearching={isLoading}
            />
          </div>
          
          {/* Footer */}
          <footer 
            className="absolute bottom-2 text-sm text-muted-foreground"
            style={animationStyles.fadeIn07}
          >
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

          {/* Settings Button */}
          <button
            className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors z-50"
            style={animationStyles.fadeIn09}
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="h-5 w-5" />
          </button>
        </section>
      </main>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
};

export default Index;
