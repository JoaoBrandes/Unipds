import { callTool } from "@/lib/mcpClient";
import type { ChatMessage, PokemonCard, PokemonDetail } from "@/lib/types";

const KNOWN_TYPES = [
  "normal",
  "fire",
  "water",
  "electric",
  "grass",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
  "fairy"
] as const;

const SEARCH_STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "of",
  "for",
  "to",
  "in",
  "on",
  "is",
  "are",
  "me",
  "about",
  "please",
  "show",
  "find",
  "list",
  "tell",
  "all",
  "pokemon",
  "pokemons",
  "most",
  "famous",
  "best"
]);

let pokemonNameCache: string[] | null = null;

interface PokeApiPokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  base_experience: number;
  sprites: {
    front_default: string | null;
    other?: {
      [key: string]: {
        front_default?: string | null;
      };
    };
  };
  types: Array<{ type: { name: string } }>;
  stats: Array<{ base_stat: number; stat: { name: string } }>;
  abilities: Array<{ ability: { name: string } }>;
  moves: Array<{ move: { name: string } }>;
}

interface PokeApiSpecies {
  flavor_text_entries?: Array<{
    flavor_text: string;
    language?: { name: string };
  }>;
}

interface PokeApiType {
  pokemon?: Array<{
    pokemon?: {
      name?: string;
    };
  }>;
}

function toSentenceCase(value: string): string {
  if (!value) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function normalizeDescription(value: string | undefined): string {
  if (!value) {
    return "No description available.";
  }

  return value.replace(/\f|\n/g, " ").replace(/\s+/g, " ").trim();
}

function extractEnglishFlavor(species: PokeApiSpecies): string {
  const entry = species.flavor_text_entries?.find((item) => item.language?.name === "en");
  return normalizeDescription(entry?.flavor_text);
}

async function getPokemonNames(): Promise<string[]> {
  if (pokemonNameCache) {
    return pokemonNameCache;
  }

  const response = await fetch("https://pokeapi.co/api/v2/pokemon?limit=1400", {
    cache: "force-cache"
  });

  if (!response.ok) {
    throw new Error(`Failed to load pokemon list: ${response.status}`);
  }

  const body = (await response.json()) as {
    results?: Array<{ name?: string }>;
  };

  pokemonNameCache = (body.results ?? [])
    .map((item) => item.name?.trim().toLowerCase())
    .filter((name): name is string => Boolean(name));

  return pokemonNameCache;
}

export function resolveTypeFromText(text: string): string | null {
  const lower = text.toLowerCase();
  for (const typeName of KNOWN_TYPES) {
    const matcher = new RegExp(`\\b${typeName}\\b`, "i");
    if (matcher.test(lower)) {
      return typeName;
    }
  }
  return null;
}

async function getPokemonData(name: string): Promise<PokeApiPokemon> {
  return callTool<{ name: string }, PokeApiPokemon>("get_pokemon_by_name", {
    name
  });
}

async function getSpeciesData(name: string): Promise<PokeApiSpecies> {
  try {
    return await callTool<{ name: string }, PokeApiSpecies>("get_pokemon_species_by_name", {
      name
    });
  } catch (error) {
    const baseName = name.split("-")[0];
    if (!baseName || baseName === name) {
      throw error;
    }

    return callTool<{ name: string }, PokeApiSpecies>("get_pokemon_species_by_name", {
      name: baseName
    });
  }
}

async function getPokemonCardsSafe(names: string[], limit: number): Promise<PokemonCard[]> {
  const uniqueNames = [...new Set(names)].slice(0, limit);
  const settled = await Promise.allSettled(uniqueNames.map((name) => getPokemonCard(name)));

  return settled
    .filter((result): result is PromiseFulfilledResult<PokemonCard> => result.status === "fulfilled")
    .map((result) => result.value);
}

export async function getPokemonCard(name: string): Promise<PokemonCard> {
  const [pokemon, species] = await Promise.all([getPokemonData(name), getSpeciesData(name)]);

  return {
    id: pokemon.id,
    name: pokemon.name,
    sprite: pokemon.sprites.front_default ?? "",
    description: extractEnglishFlavor(species),
    types: pokemon.types.map((item) => item.type.name)
  };
}

export async function getPokemonByType(typeName: string, limit = 12): Promise<PokemonCard[]> {
  const typeData = await callTool<{ name: string }, PokeApiType>("get_type_by_name", {
    name: typeName
  });

  const names = (typeData.pokemon ?? [])
    .map((item) => item.pokemon?.name?.toLowerCase())
    .filter((name): name is string => Boolean(name))
    .slice(0, limit * 3);

  return getPokemonCardsSafe(names, limit);
}

export async function getPokemonByNameMatch(query: string, limit = 12): Promise<PokemonCard[]> {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return [];
  }

  const names = await getPokemonNames();
  const exactMatches = names.filter((name) => name === normalizedQuery);
  const prefixMatches = names.filter(
    (name) => name.startsWith(`${normalizedQuery}-`) || name.startsWith(normalizedQuery)
  );
  const includeMatches = names.filter((name) => name.includes(normalizedQuery));

  const matches = [...exactMatches, ...prefixMatches, ...includeMatches];

  return getPokemonCardsSafe(matches, limit);
}

export async function getPokemonDetail(name: string): Promise<PokemonDetail> {
  const [pokemon, species] = await Promise.all([getPokemonData(name), getSpeciesData(name)]);
  const artwork = pokemon.sprites.other?.["official-artwork"]?.front_default ?? pokemon.sprites.front_default ?? "";

  return {
    id: pokemon.id,
    name: pokemon.name,
    sprite: pokemon.sprites.front_default ?? "",
    artwork,
    description: extractEnglishFlavor(species),
    height: pokemon.height,
    weight: pokemon.weight,
    baseExperience: pokemon.base_experience,
    types: pokemon.types.map((item) => item.type.name),
    abilities: pokemon.abilities.map((item) => item.ability.name),
    stats: pokemon.stats.map((item) => ({
      name: item.stat.name,
      value: item.base_stat
    })),
    moves: pokemon.moves.map((item) => item.move.name)
  };
}

export async function searchPokemonCardsFromMessage(message: string): Promise<PokemonCard[]> {
  const trimmed = message.trim();
  if (!trimmed) {
    return [];
  }

  const typeName = resolveTypeFromText(trimmed);
  if (typeName) {
    return getPokemonByType(typeName, 10);
  }

  const cleaned = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\b(pokemon|pokemons|show|find|list|about|tell|me|all|type)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return [];
  }

  const directMatches = await getPokemonByNameMatch(cleaned, 10);
  if (directMatches.length > 0) {
    return directMatches;
  }

  const names = await getPokemonNames();
  const tokens = cleaned
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !SEARCH_STOPWORDS.has(token));

  if (tokens.length === 0) {
    return [];
  }

  const exactTokenNames = tokens.filter((token) => names.includes(token));
  if (exactTokenNames.length > 0) {
    return getPokemonCardsSafe(exactTokenNames, 10);
  }

  const rankedNames: string[] = [];
  for (const token of tokens) {
    const tokenMatches = names.filter((name) => name.includes(token));
    for (const match of tokenMatches) {
      if (!rankedNames.includes(match)) {
        rankedNames.push(match);
      }

      if (rankedNames.length >= 10) {
        break;
      }
    }

    if (rankedNames.length >= 10) {
      break;
    }
  }

  if (rankedNames.length === 0) {
    return [];
  }

  return getPokemonCardsSafe(rankedNames, 10);
}

export async function buildAssistantAnswer(messages: ChatMessage[], cards: PokemonCard[]): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    if (cards.length > 0) {
      return `I found ${cards.length} matching Pokemon. Click any card to open full stats and details.`;
    }

    return "I can help you search by Pokemon name or type. Try asking something like 'show fire pokemon' or 'find pikachu'.";
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const systemPrompt = [
    "You are Pokemaster Assistant.",
    "You help users discover Pokemon and explain stats, abilities, and moves.",
    "If search results are provided, summarize them in plain language and guide users to click a card for full details.",
    "Keep answers concise and factual."
  ].join(" ");

  const context = cards.length
    ? `Search results: ${JSON.stringify(cards.map((item) => ({ name: item.name, types: item.types, description: item.description })))}.`
    : "Search results: none.";

  const payload = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages.map((item) => ({ role: item.role, content: item.content })),
      { role: "system", content: context }
    ],
    temperature: 0.4
  };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${bodyText}`);
  }

  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return (
    body.choices?.[0]?.message?.content?.trim() ||
    "I found some results for you. Click a Pokemon card to view full details."
  );
}

export function formatLabel(value: string): string {
  return toSentenceCase(value.replace(/-/g, " "));
}
