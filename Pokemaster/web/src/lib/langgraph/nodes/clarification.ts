import { createLLM, hasLLMKey } from "../llm";
import { ClarificationSchema } from "../schemas";
import type { GraphStateType } from "../state";

const CLARIFICATION_SYSTEM_PROMPT = `You are a friendly Pokemon assistant. The user's message was unclear or too vague.

Generate a helpful clarifying question to understand what they're looking for.

**Guidelines:**
- Be friendly and conversational
- Give 2-3 example queries they could try
- Don't be condescending
- Keep it brief (1-2 sentences for the question)

**Examples of good clarifications:**
- "Are you looking for a specific Pokemon, or would you like to explore Pokemon by type? For example, you could ask 'show me Pikachu' or 'list fire Pokemon'."
- "I'd love to help! Are you interested in a particular Pokemon's stats, or comparing different Pokemon? Try something like 'what are Charizard's stats' or 'compare Bulbasaur and Squirtle'."`;

/**
 * Node that generates a clarifying question when intent is unclear
 */
export async function clarificationNode(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  // Fallback to static clarification if no API key
  if (!hasLLMKey()) {
    return {
      clarificationQuestion: generateStaticClarification(state),
      responseText: generateStaticClarification(state),
      needsClarification: true
    };
  }

  try {
    const model = createLLM(0.7);

    const structuredModel = model.withStructuredOutput(ClarificationSchema);

    const result = await structuredModel.invoke([
      { role: "system", content: CLARIFICATION_SYSTEM_PROMPT },
      {
        role: "user",
        content: `The user said: "${state.userMessage}"\n\nGenerate a clarifying question with suggestions.`
      }
    ]);

    const fullResponse = result.suggestions.length > 0
      ? `${result.question}\n\nTry something like:\n${result.suggestions.map((s) => `• "${s}"`).join("\n")}`
      : result.question;

    return {
      clarificationQuestion: result.question,
      responseText: fullResponse,
      needsClarification: true
    };
  } catch (error) {
    console.error("Clarification generation failed:", error);
    return {
      clarificationQuestion: generateStaticClarification(state),
      responseText: generateStaticClarification(state),
      needsClarification: true
    };
  }
}

/**
 * Generate a static clarification message when LLM is unavailable
 */
function generateStaticClarification(state: GraphStateType): string {
  const intent = state.intent;

  if (intent === "stats_question" && state.extractedEntities.pokemonNames.length === 0) {
    return "Which Pokemon would you like to know about? Try asking something like 'what are Pikachu's stats' or 'show me Charizard's moves'.";
  }

  if (intent === "comparison" && state.extractedEntities.pokemonNames.length < 2) {
    return "Which Pokemon would you like to compare? Try something like 'compare Charizard and Blastoise' or 'Pikachu vs Raichu'.";
  }

  return "I can help you discover Pokemon! Try:\n• \"Show me Pikachu\" to find a specific Pokemon\n• \"Fire Pokemon\" to see all fire types\n• \"What are Charizard's stats\" to learn about a Pokemon";
}
