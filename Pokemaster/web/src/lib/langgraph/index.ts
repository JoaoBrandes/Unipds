import type { ChatMessage, PokemonCard } from "@/lib/types";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { pokemonGraph } from "./graph";

export interface PokemonAssistantResult {
  /** The assistant's response text */
  answer: string;

  /** Pokemon cards from search (empty if clarification needed) */
  pokemon: PokemonCard[];

  /** Whether the assistant is asking for clarification */
  needsClarification: boolean;

  /** The clarification question if applicable */
  clarificationQuestion: string | null;
}

/**
 * Invoke the Pokemon assistant graph with a conversation
 *
 * @param messages - Full conversation history
 * @returns Assistant response with Pokemon cards or clarification question
 */
export async function invokePokemonAssistant(
  messages: ChatMessage[]
): Promise<PokemonAssistantResult> {
  // Get the latest user message
  const latestUserMessage = [...messages]
    .reverse()
    .find((msg) => msg.role === "user");

  if (!latestUserMessage) {
    return {
      answer: "I didn't catch that. What would you like to know about Pokemon?",
      pokemon: [],
      needsClarification: true,
      clarificationQuestion: null
    };
  }

  // Convert messages to LangChain format
  const langchainMessages = messages.map((msg) =>
    msg.role === "user"
      ? new HumanMessage(msg.content)
      : new AIMessage(msg.content)
  );

  try {
    // Invoke the graph
    const result = await pokemonGraph.invoke({
      messages: langchainMessages,
      userMessage: latestUserMessage.content
    });

    return {
      answer: result.responseText || "I found some Pokemon for you!",
      pokemon: result.searchResults || [],
      needsClarification: result.needsClarification || false,
      clarificationQuestion: result.clarificationQuestion || null
    };
  } catch (error) {
    console.error("Pokemon assistant graph error:", error);

    return {
      answer:
        "I ran into an issue processing your request. Please try again with a simpler query like 'show me pikachu' or 'fire pokemon'.",
      pokemon: [],
      needsClarification: false,
      clarificationQuestion: null
    };
  }
}

// Re-export types for convenience
export type { ChatMessage, PokemonCard };

