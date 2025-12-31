import { useState, useRef, useEffect } from "react";
import { Search, Music, Disc, ListMusic, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AutocompleteSuggestion, SpotifyContentType } from "@/types/spotify";
import { useSpotifySearch } from "@/hooks/queries";
import { useAuth } from "@/contexts/AuthContext";
import { useDebounce } from "@/hooks/useDebounce";

interface SearchBarProps {
  onSearch?: (query: string) => void;
  onSelect?: (suggestion: AutocompleteSuggestion) => void;
  showAutocomplete?: boolean;
  isSearching?: boolean;
}

const getTypeIcon = (type: SpotifyContentType) => {
  switch (type) {
    case "track":
      return <Music className="h-4 w-4" />;
    case "album":
      return <Disc className="h-4 w-4" />;
    case "playlist":
      return <ListMusic className="h-4 w-4" />;
  }
};

const getTypeColor = (type: SpotifyContentType) => {
  switch (type) {
    case "track":
      return "text-blue-400";
    case "album":
      return "text-purple-400";
    case "playlist":
      return "text-green-400";
  }
};

const getTypeBadgeColor = (type: SpotifyContentType) => {
  switch (type) {
    case "track":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "album":
      return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    case "playlist":
      return "bg-green-500/20 text-green-400 border-green-500/30";
  }
};

const isSpotifyLink = (text: string): boolean => {
  return text.includes("spotify.com") || text.includes("spotify:");
};

const SearchBar = ({
  onSearch,
  onSelect,
  showAutocomplete = true,
  isSearching = false,
}: SearchBarProps) => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce the search query
  const debouncedQuery = useDebounce(query, 300);
  
  // Use React Query for search
  const shouldSearch = showAutocomplete && 
    !isSpotifyLink(debouncedQuery) && 
    !authLoading && 
    isAuthenticated;
    
  const { data: suggestions = [], isLoading } = useSpotifySearch(
    debouncedQuery,
    shouldSearch
  );

  // Show suggestions when we have results
  useEffect(() => {
    if (suggestions.length > 0 && shouldSearch) {
      setShowSuggestions(true);
    } else if (!shouldSearch || debouncedQuery.trim().length < 2) {
      setShowSuggestions(false);
    }
  }, [suggestions, shouldSearch, debouncedQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch && query.trim()) {
      onSearch(query.trim());
      setShowSuggestions(false);
    }
  };

  const handleSelect = (suggestion: AutocompleteSuggestion) => {
    setQuery(suggestion.name);
    setShowSuggestions(false);
    if (onSelect) {
      onSelect(suggestion);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : suggestions.length - 1
      );
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[highlightedIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl z-50">
      <form onSubmit={handleSubmit} className="w-full">
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Input
              ref={inputRef}
              type="text"
              placeholder="Enter a Spotify link or search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onKeyDown={handleKeyDown}
              className="w-full bg-card border-border text-foreground pr-10 h-12 text-base"
            />

            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {isLoading ? (
                <Loader2
                  className="h-5 w-5 text-muted-foreground animate-spin origin-center"
                  style={{
                    transformBox: "fill-box",
                  }}
                />
              ) : (
                <Search className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </div>

          <div className="flex justify-center">
            <Button type="submit" variant="glow" size="lg" disabled={isSearching}>
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                'Search'
              )}
            </Button>
          </div>
        </div>
      </form>

      {/* Autocomplete Dropdown */}
      {showAutocomplete && showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-[56px] left-0 right-0 z-[100] bg-card border border-border rounded-lg shadow-xl overflow-hidden max-h-[30vh] overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.type}-${suggestion.id}`}
              className={`w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors ${
                index === highlightedIndex ? "bg-muted/50" : ""
              }`}
              onClick={() => handleSelect(suggestion)}
            >
              {/* Thumbnail image */}
              {suggestion.image ? (
                <img
                  src={suggestion.image}
                  alt={suggestion.name}
                  className="w-10 h-10 rounded object-cover flex-shrink-0"
                />
              ) : (
                <div
                  className={`w-10 h-10 rounded flex items-center justify-center flex-shrink-0 bg-muted ${getTypeColor(
                    suggestion.type
                  )}`}
                >
                  {getTypeIcon(suggestion.type)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">
                  {suggestion.name}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {suggestion.subtitle}
                </p>
              </div>
              <span
                className={`text-xs px-2 py-1 rounded-full border flex-shrink-0 ${getTypeBadgeColor(
                  suggestion.type
                )}`}
              >
                {suggestion.type}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
