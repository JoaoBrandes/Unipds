"use client";

import type { ChatMessage, PokemonCard } from "@/lib/types";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

interface AssistantPayload {
  answer?: string;
  pokemon?: PokemonCard[];
  error?: string;
  needsClarification?: boolean;
}

interface UIMessage {
  role: "user" | "assistant";
  content: string;
  pokemon?: PokemonCard[];
  isClarification?: boolean;
}

function pretty(value: string): string {
  return value
    .replace(/-/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span className={`type-badge type-${type.toLowerCase()}`}>
      {pretty(type)}
    </span>
  );
}

function PokeballAvatar() {
  return (
    <div className="pokeball-avatar" aria-hidden="true">
      <div className="pokeball-half pokeball-top" />
      <div className="pokeball-stripe" />
      <div className="pokeball-half pokeball-bottom" />
      <div className="pokeball-button" />
    </div>
  );
}

function TypingIndicator() {
  return (
    <article className="bubble bubble-assistant">
      <PokeballAvatar />
      <div className="bubble-body">
        <div className="typing-dots">
          <span />
          <span />
          <span />
        </div>
      </div>
    </article>
  );
}

export default function Home() {
  const [messages, setMessages] = useState<UIMessage[]>([
    {
      role: "assistant",
      content:
        "Hello, Trainer! I'm your Pokédex companion. Ask me about any Pokémon — by name, type, stats, or compare them!\n\nTry: \"Show me fire Pokémon\" or \"What are Charizard's stats?\""
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chatMessages = useMemo<ChatMessage[]>(
    () => messages.map((item) => ({ role: item.role, content: item.content })),
    [messages]
  );

  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = input.trim();
    if (!trimmed || isLoading) {
      return;
    }

    const nextMessages: UIMessage[] = [
      ...messages,
      { role: "user", content: trimmed }
    ];
    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);

    try {
      const genericError =
        "I couldn't process that request right now. Please try again.";

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
          pokemon: payload.pokemon ?? [],
          isClarification: payload.needsClarification ?? false
        }
      ]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            message ||
            "I couldn't process that request right now. Please try again."
        }
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }

  return (
    <main className="chat-page">
      <header className="chat-header">
        <div className="header-pokeball" aria-hidden="true">
          <div className="pokeball-half pokeball-top" />
          <div className="pokeball-stripe" />
          <div className="pokeball-half pokeball-bottom" />
          <div className="pokeball-button" />
        </div>
        <div className="header-text">
          <p className="eyebrow">POKÉDEX COMPANION</p>
          <h1>Pokémaster</h1>
          <p className="header-subtitle">
            Your AI Trainer — ask about types, stats, moves, and more.
          </p>
        </div>
      </header>

      <div className="chat-shell">
        <section
          ref={chatWindowRef}
          className="chat-window"
          aria-live="polite"
          aria-label="Chat conversation"
        >
          {messages.map((message, index) => (
            <article
              key={`${message.role}-${index}`}
              className={`bubble ${message.role === "user" ? "bubble-user" : "bubble-assistant"
                }${message.isClarification ? " bubble-clarification" : ""}`}
            >
              {message.role === "assistant" && <PokeballAvatar />}
              <div className="bubble-body">
                <p className="bubble-text">{message.content}</p>

                {message.pokemon && message.pokemon.length > 0 ? (
                  <div className="cards-grid">
                    {message.pokemon.map((pokemon) => (
                      <Link
                        href={`/pokemon/${pokemon.name}`}
                        key={pokemon.id}
                        className="pokemon-card"
                      >
                        <img
                          src={pokemon.sprite}
                          alt={pokemon.name}
                          loading="lazy"
                        />
                        <div className="card-info">
                          <h3>{pretty(pokemon.name)}</h3>
                          <p className="card-desc">{pokemon.description}</p>
                          <div className="card-types">
                            {pokemon.types.map((type) => (
                              <TypeBadge key={type} type={type} />
                            ))}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            </article>
          ))}
          {isLoading && <TypingIndicator />}
        </section>

        <form onSubmit={submit} className="chat-form">
          <input
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about a Pokémon, type, or stats..."
            disabled={isLoading}
            autoComplete="off"
          />
          <button type="submit" disabled={isLoading}>
            {isLoading ? "Thinking…" : "Send"}
          </button>
        </form>
      </div>
    </main>
  );
}

