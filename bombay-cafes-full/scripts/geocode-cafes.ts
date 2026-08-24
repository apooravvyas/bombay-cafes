/**
 * Fill in coordinates for cafes that do not have them.
 *
 *     Supabase spots (or data/spots.json)
 *             ↓
 *     rows where latitude / longitude IS NULL
 *             ↓
 *     geocoding provider
 *             ↓
 *     latitude / longitude
 *             ↓
 *     write back
 *
 * Usage
 *   GEOCODING_PROVIDER=mapbox GEOCODING_API_KEY=pk.xxx npm run geocode
 *   … npm run geocode -- --dry        report only, write nothing
 *   … npm run geocode -- --limit 5    do the first N, useful for a trial run
 *
 * Target: Supabase when NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 * are set, otherwise data/spots.json. Add `--json` to force the file.
 *
 * ── Guarantees ───────────────────────────────────────────────────────────────
 * · Only touches rows where BOTH latitude and longitude are null. An existing
 *   coordinate is never overwritten, so a hand-corrected pin survives every
 *   future run.
 * · Safe to run repeatedly. Rows already done are skipped, not re-queried.
 * · A result is accepted only inside a Mumbai bounding box. A geocoder
 *   confidently returning a same-named cafe in another city is the main failure
 *   mode, and this is the check that catches it.
 * · Failures are logged and left null. Nothing is guessed, ever.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

/* ── Providers ──────────────────────────────────────────────────────────────
   Adding one means adding an entry here and nothing else. No provider is
   hardcoded as a default, because we may not have credentials for any of them
   yet — the script tells you what it needs and exits cleanly. */
type Coords = { lat: number; lng: number };

interface Provider {
  /** Human name for logs. */
  label: string;
  /** Whether this provider needs GEOCODING_API_KEY. */
  needsKey: boolean;
  /** Requests per second this provider tolerates on a free tier. */
  ratePerSecond: number;
  build: (query: string, key: string) => string;
  parse: (body: unknown) => Coords | null;
}

const MUMBAI = { minLng: 72.75, minLat: 18.85, maxLng: 73.05, maxLat: 19.35 };

const PROVIDERS: Record<string, Provider> = {
  mapbox: {
    label: "Mapbox Geocoding v6",
    needsKey: true,
    ratePerSecond: 5,
    build: (q, key) =>
      "https://api.mapbox.com/search/geocode/v6/forward" +
      `?q=${encodeURIComponent(q)}&country=in&limit=1&proximity=72.83,18.95` +
      `&bbox=${MUMBAI.minLng},${MUMBAI.minLat},${MUMBAI.maxLng},${MUMBAI.maxLat}` +
      `&access_token=${key}`,
    parse: (body) => {
      const f = (body as { features?: { geometry?: { coordinates?: [number, number] } }[] })
        .features?.[0]?.geometry?.coordinates;
      return f ? { lng: f[0], lat: f[1] } : null;
    },
  },
  google: {
    label: "Google Geocoding API",
    needsKey: true,
    ratePerSecond: 10,
    build: (q, key) =>
      "https://maps.googleapis.com/maps/api/geocode/json" +
      `?address=${encodeURIComponent(q)}&region=in&key=${key}`,
    parse: (body) => {
      const r = (body as { results?: { geometry?: { location?: { lat: number; lng: number } } }[] })
        .results?.[0]?.geometry?.location;
      return r ? { lat: r.lat, lng: r.lng } : null;
    },
  },
  opencage: {
    label: "OpenCage",
    needsKey: true,
    ratePerSecond: 1,
    build: (q, key) =>
      "https://api.opencagedata.com/geocode/v1/json" +
      `?q=${encodeURIComponent(q)}&countrycode=in&limit=1&key=${key}`,
    parse: (body) => {
      const g = (body as { results?: { geometry?: { lat: number; lng: number } }[] }).results?.[0]
        ?.geometry;
      return g ? { lat: g.lat, lng: g.lng } : null;
    },
  },
  nominatim: {
    label: "Nominatim (OpenStreetMap)",
    needsKey: false,
    // Nominatim's usage policy is 1 req/s. Do not raise this.
    ratePerSecond: 1,
    build: (q) =>
      "https://nominatim.openstreetmap.org/search" +
      `?q=${encodeURIComponent(q)}&countrycodes=in&format=jsonv2&limit=1`,
    parse: (body) => {
      const r = (body as { lat: string; lon: string }[])[0];
      return r ? { lat: Number(r.lat), lng: Number(r.lon) } : null;
    },
  },
};

/* ── Config ─────────────────────────────────────────────────────────────── */
const providerName = (process.env.GEOCODING_PROVIDER ?? "").trim().toLowerCase();
const apiKey = process.env.GEOCODING_API_KEY ?? process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
const DRY = process.argv.includes("--dry");
const FORCE_JSON = process.argv.includes("--json");
const limitArg = process.argv.indexOf("--limit");
const LIMIT = limitArg > -1 ? Number(process.argv[limitArg + 1]) || Infinity : Infinity;

if (!providerName) {
  console.error(
    "No geocoding provider configured.\n\n" +
      `  GEOCODING_PROVIDER=<${Object.keys(PROVIDERS).join("|")}> GEOCODING_API_KEY=… npm run geocode\n\n` +
      "Nothing else in the app needs this — cafes without coordinates simply do\n" +
      "not appear on the map, and every other feature works. Configure it when\n" +
      "you have a key.",
  );
  process.exit(1);
}

const provider = PROVIDERS[providerName];
if (!provider) {
  console.error(`Unknown provider "${providerName}". Known: ${Object.keys(PROVIDERS).join(", ")}`);
  process.exit(1);
}
if (provider.needsKey && !apiKey) {
  console.error(`${provider.label} needs GEOCODING_API_KEY. Set it and run again.`);
  process.exit(1);
}

const THROTTLE_MS = Math.ceil(1000 / provider.ratePerSecond) + 40;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ── Row shape, shared by both targets ──────────────────────────────────── */
interface Row {
  slug: string;
  name: string;
  address: string;
  neighborhood: string;
  /** data/spots.json uses latitude/longitude; the Supabase path maps onto these. */
  lat: number | null;
  lng: number | null;
  latitude?: number | null;
  longitude?: number | null;
}

async function geocodeOnce(query: string): Promise<Coords | null> {
  const res = await fetch(provider.build(query, apiKey), {
    headers: { "User-Agent": "bombay-cafe-map/1.0 (geocoding script)" },
  });

  if (res.status === 401 || res.status === 403) {
    console.error(`\n${provider.label} rejected the credential (${res.status}). Check GEOCODING_API_KEY.`);
    process.exit(1);
  }
  if (res.status === 429) {
    console.warn("  rate limited — backing off 3s");
    await sleep(3000);
    return geocodeOnce(query);
  }
  if (!res.ok) return null;

  const hit = provider.parse(await res.json());
  if (!hit || !Number.isFinite(hit.lat) || !Number.isFinite(hit.lng)) return null;

  const inMumbai =
    hit.lng >= MUMBAI.minLng &&
    hit.lng <= MUMBAI.maxLng &&
    hit.lat >= MUMBAI.minLat &&
    hit.lat <= MUMBAI.maxLat;
  if (!inMumbai) return null;

  return { lat: Math.round(hit.lat * 1e6) / 1e6, lng: Math.round(hit.lng * 1e6) / 1e6 };
}

/** Most specific query first, then progressively looser. */
async function resolveCafe(row: Row): Promise<Coords | null> {
  const queries = [
    `${row.name}, ${row.address}, Mumbai, India`,
    `${row.address}, Mumbai, India`,
    `${row.name}, ${row.neighborhood}, Mumbai, India`,
  ].filter((q) => !q.includes(", , "));

  for (const q of queries) {
    const hit = await geocodeOnce(q);
    await sleep(THROTTLE_MS);
    if (hit) return hit;
  }
  return null;
}

/* ── Targets ────────────────────────────────────────────────────────────── */
const useSupabase =
  !FORCE_JSON &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log(`Provider: ${provider.label}`);
  console.log(`Target:   ${useSupabase ? "Supabase" : "data/cafes.json"}${DRY ? " (dry run)" : ""}\n`);

  let pending: Row[];
  let commit: (updates: { slug: string; lat: number; lng: number }[]) => Promise<void>;

  if (useSupabase) {
    const { createClient } = await import("@supabase/supabase-js");
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Only rows missing BOTH coordinates. An existing pin is never touched.
    const { data, error } = await db
      .from("spots")
      .select("slug, name, address, neighborhood, latitude, longitude")
      .is("latitude", null)
      .is("longitude", null);
    if (error) {
      console.error("Could not read spots:", error.message);
      process.exit(1);
    }
    pending = (data ?? []).map((r) => ({
      slug: r.slug as string,
      name: r.name as string,
      address: (r.address as string) ?? "",
      neighborhood: (r.neighborhood as string) ?? "",
      lat: null,
      lng: null,
    }));

    commit = async (updates) => {
      for (const u of updates) {
        const { error: e } = await db
          .from("spots")
          .update({ latitude: u.lat, longitude: u.lng })
          .eq("slug", u.slug)
          // Belt and braces: even here, refuse to clobber a coordinate that
          // appeared while this script was running.
          .is("latitude", null);
        if (e) console.error(`  ! ${u.slug}: ${e.message}`);
      }
    };
  } else {
    const path = resolve(__dirname, "..", "data", "spots.json");
    const file = JSON.parse(readFileSync(path, "utf8")) as { spots: Row[] };
    pending = file.spots
      .map((c) => ({ ...c, lat: c.latitude ?? null, lng: c.longitude ?? null }))
      .filter((c) => c.lat == null && c.lng == null);

    commit = async (updates) => {
      const bySlug = new Map(updates.map((u) => [u.slug, u]));
      for (const cafe of file.spots) {
        const u = bySlug.get(cafe.slug);
        if (u && cafe.latitude == null && cafe.longitude == null) {
          cafe.latitude = u.lat;
          cafe.longitude = u.lng;
        }
      }
      writeFileSync(path, `${JSON.stringify(file, null, 2)}\n`);
    };
  }

  if (pending.length === 0) {
    console.log("Every cafe already has coordinates. Nothing to do.");
    return;
  }

  const work = pending.slice(0, LIMIT);
  console.log(`${pending.length} cafe(s) without coordinates; attempting ${work.length}.\n`);

  const resolved: { slug: string; lat: number; lng: number }[] = [];
  const failed: string[] = [];

  for (const row of work) {
    const hit = await resolveCafe(row);
    if (hit) {
      resolved.push({ slug: row.slug, ...hit });
      console.log(`  ✓ ${row.slug} → ${hit.lat}, ${hit.lng}`);
    } else {
      failed.push(row.slug);
      console.log(`  ✗ ${row.slug} — no result inside Mumbai; left null`);
    }
  }

  if (!DRY && resolved.length > 0) await commit(resolved);

  console.log("");
  console.log(`Resolved ${resolved.length}. Failed ${failed.length}. Skipped ${pending.length - work.length}.`);
  if (failed.length > 0) {
    console.log("\nThese need a human — the address is probably ambiguous or incomplete:");
    for (const slug of failed) console.log(`  · ${slug}`);
  }
  if (DRY) console.log("\nDry run — nothing was written.");
  else if (resolved.length > 0 && !useSupabase) {
    console.log("\nWrote data/spots.json. Run `npm run seed` to push it to Supabase.");
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
