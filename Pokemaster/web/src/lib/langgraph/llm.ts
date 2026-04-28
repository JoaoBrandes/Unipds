import { ChatOpenAI } from "@langchain/openai";

/**
 * Returns true if any LLM API key is configured.
 */
export function hasLLMKey(): boolean {
  return !!(process.env.OPENAI_API_KEY ?? process.env.OPENROUTER_API_KEY);
}

/**
 * Creates a ChatOpenAI instance that works with either OpenAI or OpenRouter.
 * OpenRouter is detected via OPENAI_BASE_URL pointing to openrouter.ai.
 */
export function createLLM(temperature = 0.1): ChatOpenAI {
  const apiKey = process.env.OPENAI_API_KEY ?? process.env.OPENROUTER_API_KEY;
  const baseURL = process.env.OPENAI_BASE_URL;

  const configuration = baseURL
    ? {
        baseURL,
        defaultHeaders: {
          ...(process.env.OPENROUTER_HTTP_REFERER
            ? { "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER }
            : {}),
          ...(process.env.OPENROUTER_X_TITLE
            ? { "X-Title": process.env.OPENROUTER_X_TITLE }
            : {}),
        },
      }
    : undefined;

  return new ChatOpenAI({
    modelName: process.env.OPENAI_MODEL ?? "nvidia/nemotron-3-super-120b-a12b:free",
    temperature,
    apiKey,
    ...(configuration ? { configuration } : {}),
  });
}
