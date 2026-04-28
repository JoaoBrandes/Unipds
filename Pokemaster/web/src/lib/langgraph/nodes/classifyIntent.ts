import { createLLM, hasLLMKey } from "../llm";
import { IntentClassificationSchema } from "../schemas";
import type { GraphStateType } from "../state";

const KNOWN_TYPES = [
  "normal", "fire", "water", "electric", "grass", "ice",
  "fighting", "poison", "ground", "flying", "psychic", "bug",
  "rock", "ghost", "dragon", "dark", "steel", "fairy"
];

const INTENT_SYSTEM_PROMPT = `You are a Pokemon expert assistant that classifies user intents AND resolves descriptive questions into specific Pokemon names using your knowledge.

Analyze the user's message and determine their intent:

**Intent Types:**
- "name_search": User wants a specific Pokemon, OR you can identify which Pokemon(s) match a described trait/behavior/characteristic
- "type_search": User wants Pokemon of a certain type (e.g., "fire pokemon", "what water types are there")
- "stats_question": User asks about stats, abilities, or moves of named Pokemon (e.g., "what are charizard's stats")
- "comparison": User wants to compare Pokemon (e.g., "charizard vs blastoise", "who is stronger")
- "clarification_needed": Intent is completely unclear and you cannot guess any relevant Pokemon (e.g., "pokemon", "help")
- "general": General Pokemon world question with no specific Pokemon answer (e.g., "how many generations are there")

**CRITICAL — Resolve traits to Pokemon names:**
Users often describe Pokemon by behavior, appearance, or lore instead of naming them. Use your Pokemon knowledge to identify which Pokemon they mean and populate pokemonNames accordingly.

Examples:
- "which pokemon mimics other pokemon" → pokemonNames: ["ditto"], intent: "name_search"
- "the pokemon that evolves with a moon stone" → pokemonNames: ["nidorino", "nidorina", "clefairy", "jigglypuff"], intent: "name_search"
- "pokemon that sleeps all day" → pokemonNames: ["snorlax"], intent: "name_search"
- "smallest pokemon" → pokemonNames: ["joltik", "flabebe"], intent: "name_search"
- "ghost pokemon that steals life force" → pokemonNames: ["haunter", "gengar", "gastly"], intent: "name_search"
- "pokemon inspired by a fox" → pokemonNames: ["vulpix", "ninetales", "eevee", "fennekin"], intent: "name_search"

**Entity Extraction:**
- pokemonNames: Always include Pokemon names — both explicitly mentioned AND resolved from descriptions
- Extract types mentioned from: ${KNOWN_TYPES.join(", ")}
- Extract attributes: hp, attack, defense, speed, special-attack, special-defense, abilities, moves, height, weight

**Guidelines:**
- ALWAYS try to identify relevant Pokemon before falling back to "clarification_needed"
- If the user describes a trait and you can identify matching Pokemon, use "name_search" with those names
- Only use "clarification_needed" when the question is so vague that no Pokemon can be inferred
- Confidence should reflect how certain you are (0.9+ for clear intents, 0.5-0.7 for ambiguous)`;

/**
 * Node that classifies user intent and extracts entities
 */
export async function classifyIntentNode(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  // Fallback to simple heuristics if no API key
  if (!hasLLMKey()) {
    return classifyWithHeuristics(state.userMessage);
  }

  try {
    const model = createLLM(0.1);

    const structuredModel = model.withStructuredOutput(IntentClassificationSchema);

    const result = await structuredModel.invoke([
      { role: "system", content: INTENT_SYSTEM_PROMPT },
      { role: "user", content: state.userMessage }
    ]);

    // Determine if we need clarification based on confidence and entities
    const needsClarification =
      result.intent === "clarification_needed" ||
      (result.confidence < 0.6 &&
        result.pokemonNames.length === 0 &&
        result.types.length === 0);

    return {
      intent: result.intent,
      intentConfidence: result.confidence,
      extractedEntities: {
        pokemonNames: result.pokemonNames,
        types: result.types,
        attributes: result.attributes
      },
      needsClarification
    };
  } catch (error) {
    console.error("Intent classification failed, using heuristics:", error);
    return classifyWithHeuristics(state.userMessage);
  }
}

/**
 * Fallback heuristic-based classification when LLM is unavailable
 */
function classifyWithHeuristics(message: string): Partial<GraphStateType> {
  const lower = message.toLowerCase().trim();
  const pokemonNames: string[] = [];
  const types: string[] = [];

  // Check for type mentions
  for (const typeName of KNOWN_TYPES) {
    if (new RegExp(`\\b${typeName}\\b`, "i").test(lower)) {
      types.push(typeName);
    }
  }

  // Extract potential Pokemon names (words that aren't common English words)
  const commonWords = new Set([
    "show", "me", "find", "the", "a", "an", "all", "what", "which",
    "are", "is", "pokemon", "pokemons", "type", "types", "with",
    "about", "tell", "list", "search", "get", "please", "can", "you",
    "i", "want", "to", "see", "know", "stats", "moves", "abilities"
  ]);

  const words = lower
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !commonWords.has(w) && !KNOWN_TYPES.includes(w));

  // Add potential Pokemon names
  pokemonNames.push(...words);

  // Determine intent
  let intent: GraphStateType["intent"] = "general";
  let confidence = 0.5;

  if (pokemonNames.length > 1 && /\bvs\b|compare|between|or\b/i.test(lower)) {
    intent = "comparison";
    confidence = 0.8;
  } else if (pokemonNames.length > 0) {
    intent = "name_search";
    confidence = 0.7;
  } else if (types.length > 0) {
    intent = "type_search";
    confidence = 0.8;
  } else if (/\bstats?\b|\babilities?\b|\bmoves?\b/i.test(lower)) {
    intent = "stats_question";
    confidence = 0.6;
  } else if (lower.length < 10 || /^(hi|hello|help|pokemon)$/i.test(lower)) {
    intent = "clarification_needed";
    confidence = 0.4;
  }

  const needsClarification =
    intent === "clarification_needed" ||
    (confidence < 0.6 && pokemonNames.length === 0 && types.length === 0);

  return {
    intent,
    intentConfidence: confidence,
    extractedEntities: {
      pokemonNames,
      types,
      attributes: []
    },
    needsClarification
  };
}
