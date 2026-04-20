import { getPokemonDetail } from "@/lib/pokemon";
import Link from "next/link";

interface DetailPageProps {
  params: Promise<{ name: string }>;
}

function formatLabel(value: string): string {
  return value
    .replace(/-/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export default async function PokemonDetailPage({ params }: DetailPageProps) {
  const resolved = await params;
  const pokemon = await getPokemonDetail(resolved.name);

  return (
    <main className="detail-page">
      <div className="page-shell">
        <Link href="/" className="back-link">
          Back to chat
        </Link>

        <section className="hero-grid">
          <article className="sprite-card">
            <img src={pokemon.artwork || pokemon.sprite} alt={pokemon.name} className="pokemon-art" />
            <h1>{formatLabel(pokemon.name)}</h1>
            <p>{pokemon.description}</p>
          </article>

          <aside className="stats-card">
            <h2>Core Stats</h2>
            <ul>
              {pokemon.stats.map((item) => (
                <li key={item.name}>
                  <span>{formatLabel(item.name)}</span>
                  <strong>{item.value}</strong>
                </li>
              ))}
            </ul>
          </aside>
        </section>

        <section className="accordion-stack">
          <details>
            <summary>Description</summary>
            <p>{pokemon.description}</p>
          </details>

          <details>
            <summary>Moves ({pokemon.moves.length})</summary>
            <div className="chip-grid">
              {pokemon.moves.slice(0, 60).map((move) => (
                <span key={move} className="chip">
                  {formatLabel(move)}
                </span>
              ))}
            </div>
          </details>

          <details>
            <summary>Abilities</summary>
            <div className="chip-grid">
              {pokemon.abilities.map((ability) => (
                <span key={ability} className="chip">
                  {formatLabel(ability)}
                </span>
              ))}
            </div>
          </details>

          <details>
            <summary>Additional Details</summary>
            <div className="meta-grid">
              <div>
                <label>Type</label>
                <p>{pokemon.types.map(formatLabel).join(", ")}</p>
              </div>
              <div>
                <label>Height</label>
                <p>{pokemon.height}</p>
              </div>
              <div>
                <label>Weight</label>
                <p>{pokemon.weight}</p>
              </div>
              <div>
                <label>Base Experience</label>
                <p>{pokemon.baseExperience}</p>
              </div>
            </div>
          </details>
        </section>
      </div>
    </main>
  );
}
