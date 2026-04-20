import { z } from "zod";

/**
 * Schema for intent classification LLM output
 */
export const IntentClassificationSchema = z.object({
  intent: z
    .enum([
      "name_search",
      "type_search",
      "stats_question",
      "comparison",
      "clarification_needed",
      "general"
    ])
    .describe("The classified intent of the user message"),

  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Confidence score for the classification (0-1)"),

  pokemonNames: z
    .array(z.string())
    .describe("Pokemon names mentioned in the message (normalized to lowercase)"),

  types: z
    .array(z.string())
    .describe("Pokemon types mentioned (fire, water, grass, etc.)"),

  attributes: z
    .array(z.string())
    .describe("Attributes mentioned (hp, attack, defense, speed, abilities, moves, etc.)"),

  reasoning: z
    .string()
    .describe("Brief explanation of why this intent was chosen")
});

export type IntentClassification = z.infer<typeof IntentClassificationSchema>;

/**
 * Schema for clarification response
 */
export const ClarificationSchema = z.object({
  question: z
    .string()
    .describe("A friendly clarifying question to ask the user"),

  suggestions: z
    .array(z.string())
    .max(3)
    .describe("Up to 3 example queries the user could try")
});

export type ClarificationResponse = z.infer<typeof ClarificationSchema>;

/**
 * Schema for final response generation
 */
export const ResponseSchema = z.object({
  message: z
    .string()
    .describe("Natural language response summarizing the search results or answering the question"),

  followUpSuggestion: z
    .string()
    .optional()
    .describe("Optional suggestion for what the user could ask next")
});

export type ResponseOutput = z.infer<typeof ResponseSchema>;
