import "server-only";
import seed from "@/data/spots.json";
import type { Spot } from "@/lib/spots";
import { isMapped, workability } from "@/lib/spots";
import { getSupabase, supabaseEnabled } from "@/lib/supabase";

/**
 * Data layer, same graceful-degradation pattern the Run Clubs repo uses:
 * Supabase when configured, the bundled seed otherwise, and the seed again if
 * Supabase is configured but unreachable. A cafe map that cannot reach its
 * database should still show cafes.
 */
const seeded: Spot[] = (seed.spots as unknown as Spot[]).map(withScore);

function withScore(s: Spot): Spot {
  return { ...s, workability: workability(s.scores) };
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
