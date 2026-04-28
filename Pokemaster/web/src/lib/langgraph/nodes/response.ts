import { createLLM, hasLLMKey } from "../llm";
import type { GraphStateType } from "../state";

const RESPONSE_SYSTEM_PROMPT = `You are Pokemaster, a knowledgeable and friendly Pokemon expert companion.

Generate a natural, conversational response based on the search results and the user's question.

**Guidelines:**
- Answer the user's actual question directly — don't just acknowledge that results were found
- If the user asked a descriptive/trait question (e.g., "which pokemon mimics others"), explain WHY the found Pokemon match (e.g., "Ditto is famous for its ability to transform into any Pokémon it encounters")
- Mention the Pokemon found by name and briefly explain the connection to the question
- Keep responses concise (2-4 sentences) but informative
- Mention that they can click any card to see full details
- If comparing Pokemon, highlight key differences

**Do NOT:**
- Just say "I found X pokemon" without explaining why they match
- List out all the Pokemon stats (the cards will show that)
- Use excessive punctuation or emojis
- Be vague — always tie the answer back to what the user asked`;

/**
 * Node that generates the final response based on search results
 */
export async function responseNode(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  const { searchResults, intent, extractedEntities, userMessage, error } = state;

  // Handle errors
  if (error) {
    return {
      responseText: `I had trouble searching for that. ${getErrorSuggestion(error)}`
    };
  }

  // Handle no results
  if (searchResults.length === 0) {
    return {
      responseText: generateNoResultsResponse(intent, extractedEntities)
    };
  }

  // Fallback to static response if no API key
  if (!hasLLMKey()) {
    return {
      responseText: generateStaticResponse(state)
    };
  }

  try {
    const model = createLLM(0.6);

    const context = {
      intent,
      resultCount: searchResults.length,
      pokemonFound: searchResults.slice(0, 5).map((p) => ({
        name: p.name,
        types: p.types,
        description: p.description.slice(0, 100)
      })),
      extractedEntities
    };

    const response = await model.invoke([
      { role: "system", content: RESPONSE_SYSTEM_PROMPT },
      {
        role: "user",
        content: `User asked: "${userMessage}"

Search context: ${JSON.stringify(context)}

Generate a brief, friendly response.`
      }
    ]);

    const content = response.content;
    const text = typeof content === "string" ? content : JSON.stringify(content);

    return {
      responseText: text.trim() || generateStaticResponse(state)
    };
  } catch (error) {
    console.error("Response generation failed:", error);
    return {
      responseText: generateStaticResponse(state)
    };
  }
}

/**
 * Generate a static response when LLM is unavailable
 */
function generateStaticResponse(state: GraphStateType): string {
  const { searchResults, intent } = state;
  const count = searchResults.length;

  if (count === 0) {
    return "I couldn't find any Pokemon matching that. Try a different name or type!";
  }

  switch (intent) {
    case "name_search":
      if (count === 1) {
        return `Found ${searchResults[0].name}! Click the card to see full stats and details.`;
      }
      return `Found ${count} Pokemon matching your search. Click any card to see more details.`;

    case "type_search":
      return `Here are ${count} ${state.extractedEntities.types[0] ?? ""} type Pokemon. Click any card to explore their stats and moves.`;

    case "comparison":
      return `Here are the Pokemon you wanted to compare. Click each card to see their full stats side by side.`;

    case "stats_question":
      return `Found ${count} Pokemon. Click a card to see detailed stats, abilities, and moves.`;

    default:
      return `I found ${count} Pokemon for you. Click any card to learn more about them!`;
  }
}

/**
 * Generate a helpful no-results response
 */
function generateNoResultsResponse(
  intent: GraphStateType["intent"],
  entities: GraphStateType["extractedEntities"]
): string {
  if (intent === "name_search" && entities.pokemonNames.length > 0) {
    return `I couldn't find a Pokemon called "${entities.pokemonNames[0]}". Check the spelling, or try searching by type like "fire Pokemon".`;
  }

  if (intent === "type_search" && entities.types.length > 0) {
    return `I couldn't find any ${entities.types[0]} type Pokemon right now. Try another type like "water" or "grass".`;
  }

  return "I couldn't find any Pokemon matching that. Try searching by name like \"pikachu\" or by type like \"fire pokemon\".";
}

/**
 * Get a suggestion based on the error type
 */
function getErrorSuggestion(error: string): string {
  if (error.includes("404")) {
    return "That Pokemon doesn't seem to exist. Check the spelling and try again.";
  }
  if (error.includes("rate") || error.includes("limit")) {
    return "Please wait a moment and try again.";
  }
  return "Please try again in a moment.";
}
