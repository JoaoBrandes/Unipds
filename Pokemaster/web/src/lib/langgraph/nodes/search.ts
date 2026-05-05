import {
    getPokemonByNameMatch,
    getPokemonByType,
    getPokemonCard
} from "@/lib/pokemon";
import type { PokemonCard } from "@/lib/types";
import type { GraphStateType } from "../state";

/**
 * Node that executes Pokemon search based on classified intent and entities
 */
export async function searchNode(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  const { intent, extractedEntities } = state;
  const { pokemonNames, types } = extractedEntities;

  try {
    let searchResults: PokemonCard[] = [];

    switch (intent) {
      case "name_search": {
        // Search for specific Pokemon by name
        if (pokemonNames.length > 0) {
          // Try to get exact matches first
          const exactResults = await Promise.allSettled(
            pokemonNames.slice(0, 5).map((name) => getPokemonCard(name))
          );

          const exactCards = exactResults
            .filter(
              (r): r is PromiseFulfilledResult<PokemonCard> =>
                r.status === "fulfilled"
            )
            .map((r) => r.value);

          if (exactCards.length > 0) {
            searchResults = exactCards;
          } else {
            // Fall back to fuzzy name matching
            for (const name of pokemonNames.slice(0, 3)) {
              const matches = await getPokemonByNameMatch(name, 5);
              searchResults.push(...matches);
              if (searchResults.length >= 10) break;
            }
          }
        } else {
          // No names extracted, try searching the raw message
          searchResults = await getPokemonByNameMatch(state.userMessage, 10);
        }
        break;
      }

      case "type_search": {
        // If the LLM resolved specific Pokemon names (e.g. gen-constrained queries), use those
        if (pokemonNames.length > 0) {
          const exactResults = await Promise.allSettled(
            pokemonNames.slice(0, 12).map((name) => getPokemonCard(name))
          );
          searchResults = exactResults
            .filter(
              (r): r is PromiseFulfilledResult<PokemonCard> =>
                r.status === "fulfilled"
            )
            .map((r) => r.value);
        }

        // Fall back to generic type search when no specific names were resolved
        if (searchResults.length === 0 && types.length > 0) {
          for (const typeName of types.slice(0, 2)) {
            const typeResults = await getPokemonByType(typeName, 8);
            searchResults.push(...typeResults);
          }
        }
        break;
      }

      case "stats_question":
      case "comparison": {
        // Get detailed info for mentioned Pokemon
        if (pokemonNames.length > 0) {
          const results = await Promise.allSettled(
            pokemonNames.slice(0, 5).map((name) => getPokemonCard(name))
          );

          searchResults = results
            .filter(
              (r): r is PromiseFulfilledResult<PokemonCard> =>
                r.status === "fulfilled"
            )
            .map((r) => r.value);

          // If exact matches failed, try fuzzy matching
          if (searchResults.length === 0) {
            for (const name of pokemonNames.slice(0, 3)) {
              const matches = await getPokemonByNameMatch(name, 3);
              searchResults.push(...matches);
            }
          }
        }
        break;
      }

      case "general":
      default: {
        // Try a general search — if names were resolved by LLM, look them all up
        if (pokemonNames.length > 0) {
          const exactResults = await Promise.allSettled(
            pokemonNames.slice(0, 8).map((name) => getPokemonCard(name))
          );
          searchResults = exactResults
            .filter(
              (r): r is PromiseFulfilledResult<PokemonCard> =>
                r.status === "fulfilled"
            )
            .map((r) => r.value);

          // Fall back to fuzzy if exact found nothing
          if (searchResults.length === 0) {
            for (const name of pokemonNames.slice(0, 3)) {
              const matches = await getPokemonByNameMatch(name, 5);
              searchResults.push(...matches);
              if (searchResults.length >= 10) break;
            }
          }
        } else if (types.length > 0) {
          searchResults = await getPokemonByType(types[0], 10);
        }
        break;
      }
    }

    // Deduplicate results by Pokemon ID
    const seen = new Set<number>();
    const uniqueResults = searchResults.filter((card) => {
      if (seen.has(card.id)) return false;
      seen.add(card.id);
      return true;
    });

    return {
      searchResults: uniqueResults.slice(0, 12),
      error: null
    };
  } catch (error) {
    console.error("Search node error:", error);
    return {
      searchResults: [],
      error:
        error instanceof Error
          ? error.message
          : "Failed to search for Pokemon"
    };
  }
}
