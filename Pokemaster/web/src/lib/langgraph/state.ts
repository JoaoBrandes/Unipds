import type { PokemonCard } from "@/lib/types";
import type { BaseMessage } from "@langchain/core/messages";
import { Annotation } from "@langchain/langgraph";

/**
 * Intent types the assistant can classify
 */
export type IntentType =
  | "name_search" // Looking for a specific Pokemon by name
  | "type_search" // Looking for Pokemon of a certain type
  | "stats_question" // Asking about stats/abilities/moves
  | "comparison" // Comparing Pokemon
  | "clarification_needed" // Intent is unclear, need to ask
  | "general"; // General Pokemon question

/**
 * Entities extracted from user message
 */
export interface ExtractedEntities {
  pokemonNames: string[];
  types: string[];
  attributes: string[]; // stats, abilities, moves mentioned
}

/**
 * Graph state annotation for LangGraph
 */
export const GraphState = Annotation.Root({
  /**
   * Full conversation history as LangChain messages
   */
  messages: Annotation<BaseMessage[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => []
  }),

  /**
   * The latest user message text (convenience field)
   */
  userMessage: Annotation<string>({
    reducer: (_, update) => update,
    default: () => ""
  }),

  /**
   * Classified intent from the user message
   */
  intent: Annotation<IntentType>({
    reducer: (_, update) => update,
    default: () => "general"
  }),

  /**
   * Confidence score for the classified intent (0-1)
   */
  intentConfidence: Annotation<number>({
    reducer: (_, update) => update,
    default: () => 0
  }),

  /**
   * Entities extracted from the user message
   */
  extractedEntities: Annotation<ExtractedEntities>({
    reducer: (_, update) => update,
    default: () => ({ pokemonNames: [], types: [], attributes: [] })
  }),

  /**
   * Pokemon cards from search results
   */
  searchResults: Annotation<PokemonCard[]>({
    reducer: (_, update) => update,
    default: () => []
  }),

  /**
   * Whether the assistant needs to ask for clarification
   */
  needsClarification: Annotation<boolean>({
    reducer: (_, update) => update,
    default: () => false
  }),

  /**
   * Clarification question to ask the user
   */
  clarificationQuestion: Annotation<string | null>({
    reducer: (_, update) => update,
    default: () => null
  }),

  /**
   * Final response text to return to the user
   */
  responseText: Annotation<string>({
    reducer: (_, update) => update,
    default: () => ""
  }),

  /**
   * Error message if something went wrong
   */
  error: Annotation<string | null>({
    reducer: (_, update) => update,
    default: () => null
  })
});

export type GraphStateType = typeof GraphState.State;
