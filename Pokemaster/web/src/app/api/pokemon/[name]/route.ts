import { getPokemonDetail } from "@/lib/pokemon";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ name: string }> }
) {
  try {
    const params = await context.params;
    const detail = await getPokemonDetail(params.name);
    return NextResponse.json(detail);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
