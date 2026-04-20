import { invokePokemonAssistant } from "@/lib/langgraph";
import type { ChatMessage } from "@/lib/types";
import { NextResponse } from "next/server";

interface ChatRequest {
  messages?: ChatMessage[];
}

function getFriendlyError(error: unknown): { message: string; status: number } {
  const raw = (error instanceof Error ? error.message : "Unknown server error").toLowerCase();

  if (raw.includes("status 404")) {
    return {
      message: "I couldn't find that Pokemon or type. Try another name, like 'pikachu', or a type like 'fire'.",
      status: 404
    };
  }

  if (raw.includes("failed to load pokemon list")) {
    return {
      message: "I'm having trouble loading the Pokemon index right now. Please try again in a moment.",
      status: 503
    };
  }

  if (raw.includes("openai request failed") || raw.includes("langchain")) {
    return {
      message: "I couldn't reach the language model right now, but you can still search Pokemon by name or type.",
      status: 502
    };
  }

  if (raw.includes("mcp tool returned")) {
    return {
      message: "I had trouble reading Pokemon data right now. Please try your request again.",
      status: 502
    };
  }

  return {
    message: "Something went wrong while processing your request. Please try again.",
    status: 500
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequest;
    const messages = body.messages ?? [];
    const latestUserMessage = [...messages].reverse().find((item) => item.role === "user");

    if (!latestUserMessage || !latestUserMessage.content.trim()) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    // Use LangGraph-based assistant
    const result = await invokePokemonAssistant(messages);

    return NextResponse.json({
      answer: result.answer,
      pokemon: result.pokemon,
      needsClarification: result.needsClarification,
      clarificationQuestion: result.clarificationQuestion
    });
  } catch (error) {
    console.error("Chat API error:", error);
    const friendly = getFriendlyError(error);
    return NextResponse.json({ error: friendly.message }, { status: friendly.status });
  }
}
