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

const STAT_MAX = 255;

const STAT_COLORS: Record<string, string> = {
  hp: "#ff5959",
  attack: "#f5ac78",
  defense: "#fae078",
  "special-attack": "#9db7f5",
  "special-defense": "#a7db8d",
  speed: "#fa92b2",
};

function StatBar({ name, value }: { name: string; value: number }) {
  const pct = Math.min(100, Math.round((value / STAT_MAX) * 100));
  const color = STAT_COLORS[name] ?? "#aaa";
  return (
    <div className="stat-row">
      <span className="stat-label">{formatLabel(name)}</span>
      <span className="stat-value">{value}</span>
      <div className="stat-track">
        <div className="stat-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default async function PokemonDetailPage({ params }: DetailPageProps) {
  const resolved = await params;
  const pokemon = await getPokemonDetail(resolved.name);

  return (
    <main className="detail-page">
      <div className="detail-shell">
        <Link href="/" className="back-link">← Back to chat</Link>

        <section className="detail-hero">
          {/* Left: image, name, types, quick meta */}
          <div className="detail-left">
            <div className="detail-image-wrap">
              <img
                src={pokemon.artwork || pokemon.sprite}
                alt={pokemon.name}
                className="detail-art"
              />
            </div>
            <h1 className="detail-name">{formatLabel(pokemon.name)}</h1>
            <div className="detail-types">
              {pokemon.types.map((type) => (
                <span key={type} className={`type-badge type-${type.toLowerCase()}`}>
                  {formatLabel(type)}
                </span>
              ))}
            </div>
            <div className="detail-meta-pills">
              <span className="meta-pill">
                <span className="meta-pill-label">Height</span>
                {pokemon.height / 10} m
              </span>
              <span className="meta-pill">
                <span className="meta-pill-label">Weight</span>
                {pokemon.weight / 10} kg
              </span>
              <span className="meta-pill">
                <span className="meta-pill-label">Base XP</span>
                {pokemon.baseExperience}
              </span>
            </div>
          </div>

          {/* Right: stat bars */}
          <div className="detail-right">
            <h2 className="detail-section-title">Base Stats</h2>
            <div className="detail-stats">
              {pokemon.stats.map((item) => (
                <StatBar key={item.name} name={item.name} value={item.value} />
              ))}
            </div>
          </div>
        </section>

        <section className="detail-info-grid">
          <div className="detail-info-card">
            <h3 className="detail-info-title">Description</h3>
            <p className="detail-description">{pokemon.description}</p>
          </div>

          <div className="detail-info-card">
            <h3 className="detail-info-title">Abilities</h3>
            <div className="chip-grid">
              {pokemon.abilities.map((ability) => (
                <span key={ability} className="chip">{formatLabel(ability)}</span>
              ))}
            </div>
          </div>

          <div className="detail-info-card detail-info-card--wide">
            <h3 className="detail-info-title">Moves ({pokemon.moves.length})</h3>
            <div className="chip-grid">
              {pokemon.moves.slice(0, 60).map((move) => (
                <span key={move} className="chip">{formatLabel(move)}</span>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
