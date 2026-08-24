/**
 * Push data/spots.json into Supabase.
 *
 *   NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npm run seed
 *
 * Idempotent by design: ONE bulk upsert keyed on `slug`. Running it repeatedly
 * never creates duplicates, and it never loops one insert per row.
 */
import { createClient } from "@supabase/supabase-js";
import seed from "../data/spots.json";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "Missing credentials.\n" +
      "  Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, then run again.\n" +
      "  The service role key is in Supabase under Settings -> API.",
  );
  process.exit(1);
}

interface SeedSpot {
  slug: string;
  name: string;
  area: string;
  neighborhood: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  locationAccuracy: "approximate" | "verified" | null;
  locationAnchor: string | null;
  website: string | null;
  instagram: string | null;
  googleMapsUrl: string | null;
  openingHours: string | null;
  editorialNote: string;
  whyWeRecommend: string;
  scores: Record<string, number | null>;
  attrs: Record<string, string | null>;
  evidence: Record<string, string | null>;
  toggles: string[];
  tags: string[];
  dataLayer: string;
  verificationStatus: string;
  sources: string[];
  lastVerifiedAt: string | null;
  dataNote: string | null;
  isActive: boolean;
}

async function main() {
  const db = createClient(url!, key!);
  const spots = seed.spots as unknown as SeedSpot[];

  const rows = spots.map((s) => ({
    slug: s.slug,
    name: s.name,
    area: s.area,
    neighborhood: s.neighborhood,
    address: s.address,
    latitude: s.latitude,
    longitude: s.longitude,
    location_accuracy: s.locationAccuracy,
    location_anchor: s.locationAnchor,
    website: s.website,
    instagram: s.instagram,
    google_maps_url: s.googleMapsUrl,
    opening_hours: s.openingHours,
    editorial_note: s.editorialNote,
    why_we_recommend: s.whyWeRecommend,
    wifi_score: s.scores.wifi,
    charging_score: s.scores.charging,
    quiet_score: s.scores.quiet,
    seating_score: s.scores.seating,
    work_score: s.scores.work,
    wifi_evidence: s.evidence.wifi,
    charging_evidence: s.evidence.charging,
    quiet_evidence: s.evidence.quiet,
    seating_evidence: s.evidence.seating,
    work_evidence: s.evidence.work,
    wifi_label: s.attrs.wifi,
    charging_label: s.attrs.charging,
    charging_note: s.attrs.chargingNote,
    noise_label: s.attrs.noise,
    seating_label: s.attrs.seating,
    seating_styles: s.attrs.seatingStyles,
    stay_label: s.attrs.stay,
    peak_crowd: s.attrs.peakCrowd,
    avg_food_cost: s.attrs.avgFoodCost,
    toggles: s.toggles,
    tags: s.tags,
    data_layer: s.dataLayer,
    verification_status: s.verificationStatus,
    sources: s.sources,
    last_verified_at: s.lastVerifiedAt,
    data_note: s.dataNote,
    is_active: s.isActive,
  }));

  const { error } = await db.from("spots").upsert(rows, { onConflict: "slug" });
  if (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }

  const mapped = rows.filter((r) => r.latitude != null).length;
  const approx = rows.filter((r) => r.location_accuracy === "approximate").length;
  console.log(`Seeded ${rows.length} spots (${rows.filter((r) => r.is_active).length} active).`);
  console.log(`  ${mapped} have coordinates — ${approx} approximate, ${mapped - approx} verified.`);
  if (approx > 0) {
    console.log("  Run `npm run geocode` with a provider key to upgrade approximate to verified.");
  }
}

main();
