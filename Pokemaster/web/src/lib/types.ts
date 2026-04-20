export interface PokemonCard {
  id: number;
  name: string;
  sprite: string;
  description: string;
  types: string[];
}

export interface PokemonStat {
  name: string;
  value: number;
}

export interface PokemonDetail {
  id: number;
  name: string;
  sprite: string;
  artwork: string;
  description: string;
  height: number;
  weight: number;
  baseExperience: number;
  types: string[];
  abilities: string[];
  stats: PokemonStat[];
  moves: string[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
