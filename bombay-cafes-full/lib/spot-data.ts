import "server-only";
import seed from "@/data/spots.json";
import evidenceFile from "@/data/evidence.json";
import type { Spot } from "@/lib/spots";
import { isMapped, workability } from "@/lib/spots";
import type { SpotEvidence } from "@/lib/evidence";
import { scoreFromEvidence } from "@/lib/evidence";
import { getSupabase, supabaseEnabled } from "@/lib/supabase";

const EVIDENCE = (evidenceFile as { spots: Record<string, SpotEvidence> }).spots;

/**
 * Data layer, same graceful-degradation pattern the Run Clubs repo uses:
 * Supabase when configured, the bundled seed otherwise, and the seed again if
 * Supabase is configured but unreachable. A cafe map that cannot reach its
 * database should still show cafes.
 */
const seeded: Spot[] = (seed.spots as unknown as Spot[]).map(withScore);

/**
 * Attach the evidence layer and settle on one headline number.
 *
 * Where a spot has been researched, the evidence model wins — it is built from
 * what sources actually say, and it disagrees with our earlier editorial guess
 * in useful ways (Bombay Coffee House drops from 4.7 to 3.6 once you notice
 * that nothing published mentions a power outlet). Where it has not been
 * researched yet, the curated dimensions still carry the spot, so the map
 * keeps working while the research backfills.
 *
 * `work.tooThin` is the third state: evidence exists but covers too little of
 * the model to put a number on, in which case we print no score at all.
 */
function withScore(s: Spot): Spot {
  const research = EVIDENCE[s.slug];
  if (!research) return { ...s, workability: workability(s.scores) };
  const work = scoreFromEvidence(research);
  return {
    ...s,
    research,
    work,
    workability: work.score ?? (work.tooThin ? null : workability(s.scores)),
  };
}

export async function getSpots(): Promise<Spot[]> {
  if (supabaseEnabled()) {
    try {
      const { data, error } = await getSupabase().from("spots").select("*").eq("is_active", true);
      if (!error && data && data.length > 0) {
        return (data as unknown as Spot[]).map(withScore);
      }
    } catch {
      // fall through to the bundled seed
    }
  }
  return seeded.filter((s) => s.isActive);
}

export async function getSpot(slug: string): Promise<Spot | null> {
  const spots = await getSpots();
  return spots.find((s) => s.slug === slug) ?? null;
}

export async function getCityStats() {
  const spots = await getSpots();
  return {
    spots: spots.length,
    areas: new Set(spots.map((s) => s.neighborhood)).size,
    mapped: spots.filter(isMapped).length,
  };
}
