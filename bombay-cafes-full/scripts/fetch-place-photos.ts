/**
 * Attach outlet-verified photography from Google Places to data/media.json.
 *
 *   GOOGLE_PLACES_API_KEY=… npx tsx scripts/fetch-place-photos.ts            # dry run
 *   GOOGLE_PLACES_API_KEY=… npx tsx scripts/fetch-place-photos.ts --write
 *   …                                                                --only=slug
 *
 * The whole point of this script is the verification gate, not the fetching.
 * Mumbai's cafe scene is full of chains — Blue Tokai has three outlets in this
 * dataset alone, Subko three, Poetry thirteen citywide — and a photograph of
 * the wrong branch is worse than no photograph, because it looks like an
 * answer. So a Places result is only accepted when BOTH hold:
 *
 *   1. the returned display name matches the outlet name we already hold, and
 *   2. the returned formatted address contains the distinctive street token
 *      from the address we already hold.
 *
 * Anything else is logged as a rejection with the reason, and nothing is
 * written for that slug. A run that verifies four cafes and rejects twenty-six
 * has done its job correctly.
 *
 * What gets stored is the photo RESOURCE NAME, never a media URL: Places
 * media URLs are short-lived signed redirects. /api/place-photo resolves them
 * per request.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const KEY = process.env.GOOGLE_PLACES_API_KEY;
const WRITE = process.argv.includes("--write");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7);
const MAX_PER_SPOT = 4;

if (!KEY) {
  console.error(
    "GOOGLE_PLACES_API_KEY is not set.\n" +
      "Create a key in Google Cloud with the Places API (New) enabled, then:\n" +
      "  echo 'GOOGLE_PLACES_API_KEY=…' >> .env.local\n" +
      "It is server-only. Do not prefix it with NEXT_PUBLIC_.",
  );
  process.exit(1);
}

const root = resolve(import.meta.dirname ?? ".", "..");
const spotsPath = resolve(root, "data/spots.json");
const mediaPath = resolve(root, "data/media.json");

interface Spot {
  slug: string;
  name: string;
  address: string;
  isActive?: boolean;
}
interface Attribution {
  displayName?: string;
  uri?: string;
}
interface Photo {
  name: string;
  widthPx?: number;
  heightPx?: number;
  authorAttributions?: Attribution[];
}
interface Place {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  photos?: Photo[];
}

const spots: Spot[] = (JSON.parse(readFileSync(spotsPath, "utf8")).spots as Spot[]).filter(
  (s) => s.isActive !== false && (!ONLY || s.slug === ONLY),
);
const media = JSON.parse(readFileSync(mediaPath, "utf8")) as {
  spots: Record<string, { images: unknown[]; menuUrl: string | null }>;
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Words that identify nothing — every third address in Mumbai has them. */
const STOP = new Set([
  "road","rd","street","st","lane","marg","cross","opposite","opp","near","ground","floor",
  "shop","no","unit","building","bldg","mumbai","maharashtra","india","west","east","w","e",
  "the","and","cafe","coffee","by","of","gr","fl","behind","next","to","above","400050","400001",
  "400023","400005","400020","400021",
]);

const tokens = (s: string) => norm(s).split(" ").filter((t) => t.length > 2 && !STOP.has(t));

/** Does the Places result describe the outlet we already hold? */
function verify(spot: Spot, place: Place): { ok: true } | { ok: false; why: string } {
  const gotName = norm(place.displayName?.text ?? "");
  const gotAddr = norm(place.formattedAddress ?? "");
  if (!gotName || !gotAddr) return { ok: false, why: "result carried no name or address" };

  const wantName = tokens(spot.name);
  const nameHits = wantName.filter((t) => gotName.includes(t)).length;
  if (wantName.length && nameHits === 0) {
    return { ok: false, why: `name mismatch: “${place.displayName?.text}”` };
  }

  const wantAddr = tokens(spot.address);
  const addrHits = wantAddr.filter((t) => gotAddr.includes(t));
  if (addrHits.length < 1) {
    return {
      ok: false,
      why: `address mismatch — nothing distinctive shared with “${place.formattedAddress}”`,
    };
  }
  return { ok: true };
}

async function search(spot: Spot): Promise<Place[]> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-Goog-Api-Key": KEY!,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.photos",
    },
    body: JSON.stringify({
      textQuery: `${spot.name}, ${spot.address}, Mumbai`,
      maxResultCount: 5,
      languageCode: "en",
      regionCode: "IN",
    }),
  });
  if (!res.ok) throw new Error(`searchText ${res.status}: ${await res.text()}`);
  return ((await res.json()) as { places?: Place[] }).places ?? [];
}

let verified = 0;
let rejected = 0;

for (const spot of spots) {
  const existing = media.spots[spot.slug];
  if (existing?.images?.length) {
    console.log(`·  ${spot.slug} — already has photography, left alone`);
    continue;
  }

  let places: Place[];
  try {
    places = await search(spot);
  } catch (err) {
    console.log(`✕  ${spot.slug} — search failed: ${(err as Error).message}`);
    rejected++;
    continue;
  }

  if (!places.length) {
    console.log(`✕  ${spot.slug} — no Places result`);
    rejected++;
    continue;
  }

  const checked = places.map((p) => ({ p, v: verify(spot, p) }));
  const hit = checked.find((c) => c.v.ok);
  if (!hit) {
    const why = checked.map((c) => (c.v.ok ? "" : (c.v as { why: string }).why)).join("; ");
    console.log(`✕  ${spot.slug} — rejected: ${why}`);
    rejected++;
    continue;
  }

  const photos = (hit.p.photos ?? []).filter((ph) => (ph.widthPx ?? 0) >= 640).slice(0, MAX_PER_SPOT);
  if (!photos.length) {
    console.log(`✕  ${spot.slug} — verified as ${hit.p.formattedAddress} but carries no usable photo`);
    rejected++;
    continue;
  }

  const images = photos.map((ph, n) => {
    const author = ph.authorAttributions?.[0];
    return {
      photoName: ph.name,
      alt:
        n === 0
          ? `${spot.name}, ${spot.address.split(",").slice(-2).join(",").trim()}`
          : `${spot.name} — photograph ${n + 1}`,
      source: "google-places",
      sourceUrl: `https://www.google.com/maps/place/?q=place_id:${hit.p.id}`,
      credit: author?.displayName ? `Photo: ${author.displayName}` : "Photo via Google",
      creditUrl: author?.uri,
      verified: `Places returned this record for “${spot.name}, ${spot.address}”; its address reads “${hit.p.formattedAddress}”, which matches this outlet and not another branch.`,
    };
  });

  console.log(`✓  ${spot.slug} — ${images.length} photo(s) · ${hit.p.formattedAddress}`);
  verified++;

  if (WRITE) {
    media.spots[spot.slug] = {
      images,
      menuUrl: existing?.menuUrl ?? null,
    };
  }
}

console.log(`\n${verified} verified · ${rejected} rejected · ${spots.length} considered`);

if (WRITE) {
  writeFileSync(mediaPath, `${JSON.stringify(media, null, 2)}\n`);
  console.log(`Wrote ${mediaPath}`);
} else {
  console.log("Dry run. Re-run with --write to apply.");
}
