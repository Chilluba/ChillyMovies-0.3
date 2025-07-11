// src/components/features/search/LiveSearch.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchIcon, Loader2, AlertTriangleIcon, ListXIcon } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { handleSearch, type SearchActionResult } from "@/lib/actions/search.actions";
import type { ClientTMDBMultiSearchResultItem } from "@/types/tmdb";
import { SearchResultItem } from "./SearchResultItem";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

function detectLanguage(query: string): string {
  // Simple heuristic: if query contains Swahili-specific characters/words, return 'sw', else use browser or default to 'en-US'
  // For now, use browser language
  if (typeof navigator !== 'undefined') {
    const lang = navigator.language || (navigator.languages && navigator.languages[0]);
    if (lang && lang.startsWith('sw')) return 'sw';
    return lang || 'en-US';
  }
  return 'en-US';
}

export function LiveSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClientTMDBMultiSearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  
  const debouncedQuery = useDebounce(query, 500);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Close results when clicking outside
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    async function fetchResults() {
      setIsLoading(true);
      setError(null);
      const language = detectLanguage(debouncedQuery);
      const actionResult: SearchActionResult = await handleSearch({ query: debouncedQuery, language });
      if (actionResult.error) {
        setError(actionResult.error);
        setResults([]);
      } else {
        setResults(actionResult.results || []);
      }
      setIsLoading(false);
    }

    fetchResults();
  }, [debouncedQuery]);

  const showResultsDropdown = isFocused && (query.length > 0 || isLoading || error || (results.length === 0 && debouncedQuery.length > 0));

  const handleItemClick = () => {
    setIsFocused(false); // Close dropdown on item click
    setQuery(""); // Optionally clear query
  };

  return (
    <div className="relative w-full" ref={searchContainerRef}>
      <div className="relative flex w-full items-center">
        <SearchIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground z-10" /> {/* Ensure icon is above input */}
        <Input
          type="search"
          placeholder="Search movies & TV shows..."
          className="h-14 text-base flex-grow pl-10 pr-4" // Adjusted pr
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          aria-label="Search movies and TV shows"
        />
      </div>

      {showResultsDropdown && (
        <Card className="absolute top-full mt-2 w-full z-50 shadow-2xl border-border/60 bg-card backdrop-blur-sm"> {/* z-50 should be high enough */}
          <ScrollArea className="max-h-[60vh] overflow-y-auto">
            <CardContent className="p-2 space-y-1">
              {isLoading && (
                <div className="flex items-center justify-center p-4 text-muted-foreground">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Searching...
                </div>
              )}
              {error && !isLoading && (
                <div className="flex flex-col items-center justify-center p-4 text-destructive text-center">
                  <AlertTriangleIcon className="mr-2 h-6 w-6 mb-2" />
                  <p className="font-semibold">Error loading results</p>
                  <p className="text-sm">{error}</p>
                </div>
              )}
              {!isLoading && !error && results.length === 0 && debouncedQuery.trim().length > 0 && (
                <div className="flex flex-col items-center justify-center p-4 text-muted-foreground text-center">
                  <ListXIcon className="h-8 w-8 mb-2" />
                  <p className="font-semibold">No results found for &quot;{debouncedQuery}&quot;</p>
                  <p className="text-sm">Try a different search term.</p>
                </div>
              )}
              {!isLoading && !error && results.length > 0 && (
                <ul>
                  {results.map((item) => (
                    <li key={`${item.media_type}-${item.id}`}>
                      <SearchResultItem item={item} onItemClick={handleItemClick} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
}
