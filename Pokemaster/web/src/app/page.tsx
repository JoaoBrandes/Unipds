"use client";

import type { ChatMessage, PokemonCard } from "@/lib/types";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

interface AssistantPayload {
  answer?: string;
  pokemon?: PokemonCard[];
  error?: string;
}

interface UIMessage {
  role: "user" | "assistant";
  content: string;
  pokemon?: PokemonCard[];
}

function pretty(value: string): string {
  return value
    .replace(/-/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export default function Home() {
  const [messages, setMessages] = useState<UIMessage[]>([
    {
      role: "assistant",
      content:
        "Ask me for Pokemon by name or type. Example: 'show fire pokemon' or 'find pika'."
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const chatMessages = useMemo<ChatMessage[]>(
    () => messages.map((item) => ({ role: item.role, content: item.content })),
    [messages]
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = input.trim();
    if (!trimmed || isLoading) {
      return;
    }

    const nextMessages: UIMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);

    try {
      const genericError = "I couldn't process that request right now. Please try again.";

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...chatMessages, { role: "user", content: trimmed }]
        })
      });

      const payload = (await response.json()) as AssistantPayload;
      if (!response.ok) {
        throw new Error(payload.error?.trim() || genericError);
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: payload.answer ?? "I could not generate an answer.",
          pokemon: payload.pokemon ?? []
        }
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: message || "I couldn't process that request right now. Please try again."
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="chat-page">
      <div className="page-shell">
        <header className="chat-header">
          <p className="eyebrow">POKEMASTER ASSISTANT</p>
          <h1>Catch Data, Not Just Pokemon</h1>
          <p>Search by name or type, then open a card for full stats and deep details.</p>
        </header>

        <section className="chat-window" aria-live="polite">
          {messages.map((message, index) => (
            <article
              key={`${message.role}-${index}`}
              className={`bubble ${message.role === "user" ? "bubble-user" : "bubble-assistant"}`}
            >
              <p>{message.content}</p>

              {message.pokemon && message.pokemon.length > 0 ? (
                <div className="cards-grid">
                  {message.pokemon.map((pokemon) => (
                    <Link href={`/pokemon/${pokemon.name}`} key={pokemon.id} className="pokemon-card">
                      <img src={pokemon.sprite} alt={pokemon.name} loading="lazy" />
                      <div>
                        <h3>{pretty(pokemon.name)}</h3>
                        <p>{pokemon.description}</p>
                        <small>{pokemon.types.map(pretty).join(" • ")}</small>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </section>

        <form onSubmit={submit} className="chat-form">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about pokemon, stats, or types..."
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading}>
            {isLoading ? "Thinking..." : "Send"}
          </button>
        </form>
      </div>
    </main>
  );
}
