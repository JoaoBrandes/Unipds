import { getPokemonByNameMatch, getPokemonByType, resolveTypeFromText } from "@/lib/pokemon";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("query")?.trim() ?? "";

    if (!query) {
      return NextResponse.json({ pokemon: [] });
    }

    const explicitType = url.searchParams.get("type")?.trim().toLowerCase();
    const typeName = explicitType || resolveTypeFromText(query);

    const pokemon = typeName
      ? await getPokemonByType(typeName, 12)
      : await getPokemonByNameMatch(query, 12);

    return NextResponse.json({ pokemon });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
