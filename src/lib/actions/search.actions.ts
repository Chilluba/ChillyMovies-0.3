// src/lib/actions/search.actions.ts
"use server";

import { z } from "zod";
import { searchMulti } from "@/lib/tmdb";
import type { ClientTMDBMultiSearchResultItem, TMDBMultiSearchResultItem } from "@/types/tmdb";

const SearchActionInputSchema = z.object({
  query: z.string().min(1, "Search query cannot be empty."),
});

export interface SearchActionResult {
  results?: ClientTMDBMultiSearchResultItem[];
  error?: string;
}

export async function handleSearch(
  input: z.infer<typeof SearchActionInputSchema> & { language?: string }
): Promise<SearchActionResult> {
  try {
    const validatedInput = SearchActionInputSchema.parse(input);
    
    if (!validatedInput.query.trim()) {
      return { results: [] };
    }

    const searchData = await searchMulti(validatedInput.query, 1, input.language || 'en-US');

    const filteredResults = searchData.results.filter(
      (item): item is ClientTMDBMultiSearchResultItem =>
        item.media_type === "movie" || item.media_type === "tv"
    ).filter(item => {
        // Further filter out items without poster_path for better UI
        if (item.media_type === 'movie') return item.poster_path;
        if (item.media_type === 'tv') return item.poster_path;
        return false;
    }).slice(0, 10); // Limit to 10 results for performance in dropdown

    return { results: filteredResults as ClientTMDBMultiSearchResultItem[] };

  } catch (error) {
    console.error("Error in handleSearch action:", error);
    if (error instanceof z.ZodError) {
      return { error: `Invalid input: ${error.errors.map((e) => e.message).join(", ")}` };
    }
    if (error instanceof Error) {
      return { error: error.message || "An unexpected error occurred during search." };
    }
    return { error: "An unknown error occurred during search." };
  }
}
