import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "node:path";

let clientPromise: Promise<Client> | null = null;

function parseMcpResult<T>(result: unknown): T {
  const value = result as {
    isError?: boolean;
    structuredContent?: unknown;
    content?: Array<{ type?: string; text?: string }>;
  };

  const textContent = value.content?.find((item) => item.type === "text")?.text;

  if (value.isError) {
    throw new Error(textContent ?? "MCP tool returned an error");
  }

  if (value.structuredContent !== undefined) {
    return value.structuredContent as T;
  }

  if (!textContent) {
    throw new Error("MCP tool returned no content");
  }

  try {
    return JSON.parse(textContent) as T;
  } catch {
    throw new Error(`MCP tool returned non-JSON content: ${textContent}`);
  }
}

async function getClient(): Promise<Client> {
  if (clientPromise) {
    return clientPromise;
  }

  clientPromise = (async () => {
    const rootDir = path.resolve(process.cwd(), "..");
    const command = process.platform === "win32" ? "npx.cmd" : "npx";

    const transport = new StdioClientTransport({
      command,
      args: ["tsx", "src/index.ts"],
      cwd: rootDir,
      env: process.env as Record<string, string>
    });

    const client = new Client({
      name: "pokemaster-web-client",
      version: "1.0.0"
    });

    await client.connect(transport);
    return client;
  })();

  return clientPromise;
}

export async function callTool<TInput extends Record<string, unknown>, TOutput>(
  toolName: string,
  input: TInput
): Promise<TOutput> {
  const client = await getClient();
  const result = await client.callTool({ name: toolName, arguments: input });
  return parseMcpResult<TOutput>(result);
}
