import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE_URL = "https://pokeapi.co/api/v2/";

const NameInputSchema = z.object({
  name: z.string().trim().min(1, "name is required")
});

const PokeApiObjectSchema = z.object({}).passthrough();

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function toJsonText(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

async function fetchPokeApiObject(path: string): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; error: string }> {
  const endpoint = new URL(path, BASE_URL).toString();

  try {
    const response = await fetch(endpoint);

    if (!response.ok) {
      return {
        ok: false,
        error: `PokeAPI request failed with status ${response.status} for ${path}`
      };
    }

    const body = await response.json();
    const parsedBody = PokeApiObjectSchema.safeParse(body);

    if (!parsedBody.success) {
      return {
        ok: false,
        error: `PokeAPI response for ${path} was not a JSON object`
      };
    }

    return { ok: true, data: parsedBody.data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      ok: false,
      error: `Failed to call PokeAPI for ${path}: ${message}`
    };
  }
}

const server = new McpServer({
  name: "pokemaster-mcp",
  version: "1.0.0"
});

server.registerTool(
  "get_pokemon_by_name",
  {
    title: "Get Pokemon by Name",
    description: "Search for a Pokemon by name using pokemon/{name}",
    inputSchema: NameInputSchema
  },
  async ({ name }) => {
    const normalizedName = normalizeName(name);
    const result = await fetchPokeApiObject(`pokemon/${normalizedName}`);

    if (!result.ok) {
      return {
        isError: true,
        content: [{ type: "text", text: result.error }]
      };
    }

    return {
      content: [{ type: "text", text: toJsonText(result.data) }],
      structuredContent: result.data
    };
  }
);

server.registerTool(
  "get_move_by_name",
  {
    title: "Get Move by Name",
    description: "Search for a move by name using move/{name}/",
    inputSchema: NameInputSchema
  },
  async ({ name }) => {
    const normalizedName = normalizeName(name);
    const result = await fetchPokeApiObject(`move/${normalizedName}/`);

    if (!result.ok) {
      return {
        isError: true,
        content: [{ type: "text", text: result.error }]
      };
    }

    return {
      content: [{ type: "text", text: toJsonText(result.data) }],
      structuredContent: result.data
    };
  }
);

server.registerTool(
  "get_type_by_name",
  {
    title: "Get Type by Name",
    description: "Search for a type by name using type/{name}/",
    inputSchema: NameInputSchema
  },
  async ({ name }) => {
    const normalizedName = normalizeName(name);
    const result = await fetchPokeApiObject(`type/${normalizedName}/`);

    if (!result.ok) {
      return {
        isError: true,
        content: [{ type: "text", text: result.error }]
      };
    }

    return {
      content: [{ type: "text", text: toJsonText(result.data) }],
      structuredContent: result.data
    };
  }
);

server.registerTool(
  "get_pokemon_species_by_name",
  {
    title: "Get Pokemon Species by Name",
    description: "Search for a pokemon species by name using pokemon-species/{name}/",
    inputSchema: NameInputSchema
  },
  async ({ name }) => {
    const normalizedName = normalizeName(name);
    const result = await fetchPokeApiObject(`pokemon-species/${normalizedName}/`);

    if (!result.ok) {
      return {
        isError: true,
        content: [{ type: "text", text: result.error }]
      };
    }

    return {
      content: [{ type: "text", text: toJsonText(result.data) }],
      structuredContent: result.data
    };
  }
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exit(1);
});
