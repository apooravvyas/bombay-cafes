# Bombay Cafes

**Find a cafe you can actually work from.** A map-first guide to cafes in Bandra
and South Bombay, scored on the five things that decide whether a work session
lasts twenty minutes or four hours: wifi, power, noise, seating, and whether the
place tolerates a laptop at all.

The experience is modelled on [Workabout NYC](https://workaboutnyc.vercel.app/) —
one full-screen tilted map, floating chrome, a dark detail panel, and community
feedback that improves the scores over time. Same shape, our own implementation,
our own data and assets.

The build reuses the architecture of
[`apooravvyas/run-clubs`](https://github.com/apooravvyas/run-clubs): the same
Next.js layout, the same Supabase-or-seed data layer, the same `wa-*` design
tokens, the same dual Mapbox/MapLibre basemap.

---

## Contents

- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Supabase setup](#supabase-setup)
- [Coordinates: approximate, and labelled as such](#coordinates-approximate-and-labelled-as-such)
- [Deploying](#deploying)
- [Project structure](#project-structure)
- [The data pipeline](#the-data-pipeline)
- [How the score works](#how-the-score-works)
- [Data honesty rules](#data-honesty-rules)

---

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000.

**It runs with zero configuration.** An empty `.env.local` is a supported state:

- No Supabase credentials → it serves the bundled seed in `data/spots.json`.
- No Mapbox token → it renders MapLibre GL over OpenFreeMap Positron, keyless.

Both are real paths, not stubs. Credentials upgrade the app; they do not switch
it on.

### Checks

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # next lint
npm run build       # production build
```

---

## Environment variables

Every one is optional. See [`.env.example`](.env.example) for the full
annotated list.

| Variable | Needed for | Without it |
| --- | --- | --- |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox Standard basemap | MapLibre + OpenFreeMap, keyless |
| `NEXT_PUBLIC_SUPABASE_URL` | Live data | Bundled `data/spots.json` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Live data, feedback writes | As above |
| `SUPABASE_SERVICE_ROLE_KEY` | `npm run seed`, `npm run geocode`, API routes | Seeding and feedback are unavailable |
| `GEOCODING_PROVIDER` / `GEOCODING_API_KEY` | `npm run geocode` only | Spots stay off the map |
| `NEXT_PUBLIC_SITE_URL` | Canonical URLs, sitemap | Defaults to localhost |

`SUPABASE_SERVICE_ROLE_KEY` bypasses row-level security. It is read only in
server files (`scripts/`, `app/api/`), is never prefixed `NEXT_PUBLIC_`, and
must never be committed.

---

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
   in the SQL editor. It creates `spots`, `spot_feedback` and `spot_submissions`,
   the CHECK constraints that keep the data honest, and the RLS policies.
3. Put the three keys in `.env.local`.
4. `npm run seed` — one bulk upsert on `slug`, so it is idempotent. Run it as
   many times as you like; it will never duplicate a row.

### What RLS allows

| Table | Anonymous visitor |
| --- | --- |
| `spots` | `select` where `is_active` |
| `spot_feedback` | `insert` only — cannot read it back |
| `spot_submissions` | `insert` only — it carries an email address |

Everything else goes through the service role, server-side.

---

## Coordinates: approximate, and labelled as such

Every live spot has a position, and every one is marked
`location_accuracy: "approximate"`.

**What approximate means here.** Each pin is anchored to the street named in
that cafe's own verified address — Waroda Road, Tamarind Lane, Sherly Rajan
Road — placed on the right road, in the right stretch of it, typically within
100–250m of the door. It answers *"what is near me, and what else is around
it"*, which is what a discovery map is for. It will not walk you to the door,
and the product never claims it will.

**What it is not.** There is no jitter, no randomness, and no neighbourhood
centroid. `scripts/approximate-coords.py` holds one hand-written pair per slug
with an `anchor` string recording the street it was read from, so the work is
checkable line by line. The script refuses to run if any pair falls outside the
Bandra or island-city bounding box, or if two cafes land on the same point —
cafes sharing a street are placed along it rather than stacked.

```bash
npm run coords      # writes latitude/longitude/locationAccuracy into both data files
npm run seed        # upserts to Supabase, idempotent
```

**How the honesty is enforced.**

- Postgres: `(latitude is null) = (location_accuracy is null)` — a coordinate
  cannot exist without declaring how good it is.
- Postgres: `(latitude is null) = (longitude is null)` — the pair travels
  together.
- `MappedSpot` is a distinct TypeScript type behind an `isMapped()` guard, so an
  unpositioned spot cannot reach the map component. A type error, not a runtime
  check.
- The UI says so where it matters and nowhere it does not: one quiet
  *"Approximate locations"* line by the legend, a paragraph in the legend
  popover, and a sentence in each spot's provenance footnote naming the street
  the pin was read from. No full-page banner — the map is the product.

### Upgrading to verified

```bash
GEOCODING_PROVIDER=google GEOCODING_API_KEY=… npm run geocode
```

The script targets every row that is not yet `verified` — both unpositioned rows
and approximate ones — checks each result against a Mumbai bounding box, logs
failures by slug, writes nothing it could not resolve, and flips what it does
resolve to `location_accuracy: "verified"`. Providers: `mapbox`, `google`,
`opencage`, `nominatim`. Nothing else in the codebase changes.

---

## Deploying

```bash
npx vercel --prod
```

The app deploys with no environment variables at all (seed data + keyless
basemap). Add Supabase keys in the Vercel dashboard to switch to live data and
enable feedback, and set `NEXT_PUBLIC_SITE_URL` to the deployed origin so the
sitemap and OpenGraph tags are right.

---

## Project structure

```
app/
  page.tsx              City chooser. Dark, one card per live city.
  mumbai/page.tsx       The city route. One static file per city — see below.
  about/page.tsx        The method, the weights, and what we will not fake.
  submit/page.tsx       Suggest a cafe. Queued, never auto-published.
  api/feedback/         Anonymous work-quality reports → spot_feedback
  api/submissions/      New-cafe suggestions → spot_submissions
  globals.css           The wa-* design system: cards, pills, pins, panels.

components/wa/
  map-screen.tsx        The whole city experience. Map + floating chrome.
  wa-map.tsx            Shared Mapbox/MapLibre implementation. DOM markers.
  mapbox.tsx            Thin wrapper: Mapbox Standard, native 3D buildings.
  maplibre.tsx          Thin wrapper: OpenFreeMap Positron, keyless.
  spot-panel.tsx        The dark right-hand panel. List mode and detail mode.
  feedback.tsx          Three questions, anonymous, no account.

lib/
  spots.ts              Domain model: scoring, filtering, ranking, guards.
  spot-data.ts          Supabase → bundled seed, with graceful degradation.
  cities.ts             The city registry. Adding a city is a data change.

scripts/
  build-seed.py         Research notes  → data/cafes.json
  approximate-coords.py Street-level positions, one hand-written pair per slug
  to-spots.py           data/cafes.json → data/spots.json (the UI shape)
  seed.ts               data/spots.json → Supabase, one idempotent upsert
  geocode-cafes.ts      Upgrades approximate → verified, one provider at a time
```

### Why `app/mumbai/` and not `app/[city]/`

A root-level dynamic segment catches *every* unmatched path — `/nope`,
`/favicon-typo`, anything — and Next serves its cached not-found render with
HTTP **200**. Search engines read that soft 404 as a real page. Adding a city is
a four-line file, which is a fair price for honest status codes. `/mumbai`
returns 200; `/delhi` returns 404, and will keep doing so until somebody adds
the data.

---

## The data pipeline

```
research notes → data/cafes.json → data/spots.json → Supabase
                 (build-seed.py)   (to-spots.py)     (seed.ts)
```

`cafes.json` holds the 1–5 signals and the sourced evidence sentence behind each
one. `to-spots.py` maps those numbers onto the qualitative vocabulary the panel
actually prints — `4 → "Fast"`, `2 → "Scarce"` — because *"Scarce, bring a
charged laptop"* tells you what to do and *"2/5"* does not. **Null in, null out**
at every stage.

Current seed: 49 rows, 30 active. Signals known: stay 30/30, seating 17/30,
noise 15/30, wifi 14/30, charging 4/30. Positions: 30/30 approximate, 0 verified.

---

## How the score works

A weighted mean over five signals, each stored 1–5, all pointing the same
direction (noise is stored as *quietness*, so 5 is calmest and no inversion is
needed):

| Signal | Weight |
| --- | --- |
| Work friendliness | 0.30 |
| Wifi | 0.22 |
| Power | 0.20 |
| Seating | 0.18 |
| Quiet | 0.10 |

**Unknown is not zero.** The mean is renormalised over the signals that are
actually rated, so a cafe with three known signals is scored on those three. A
missing signal lowers our *confidence*, which the panel prints as "Based on 3 of
5 signals" — it never lowers the score. Nothing is punished for something nobody
has published.

The score is computed in `lib/spots.ts`, not stored, so the weighting can be
retuned without a migration or a backfill.

`rankSpots()` sorts unrated spots last rather than treating them as 0.0, which
would put them below genuinely bad cafes.

---

## Data honesty rules

These are enforced in three places — the build scripts, the TypeScript types,
and Postgres CHECK constraints — so a violation cannot be introduced by
carelessness in any one layer.

1. **No invented coordinates.** Positions are read off the address, street by
   street, and stamped `approximate` until a geocoder verifies them. No
   randomness, no neighbourhood centroids, no two cafes on one point — and no
   coordinate may exist without its accuracy flag.
2. **No factual score without evidence.** `spots_factual_scores_need_evidence`
   rejects a wifi, charging, quiet or seating score whose `*_evidence` column is
   null. Work friendliness is exempt — it is our editorial read, which is the
   product, not a measurement.
3. **No fabricated hours, websites, Instagram handles or ratings.** A field we
   could not source renders as an em dash, never as a guessed middle value.
4. **A flag must say what is in doubt.** `spots_flagged_needs_note` rejects
   `needs_review` with no `data_note`, because an unexplained flag is worse than
   no flag.
5. **Feedback never mutates a published score.** Reports land as `pending`. An
   editor rolls them in, so a handful of votes cannot swing a listing.
6. **Google Maps is an action, not a competitor.** Every detail panel links out
   to it for directions.

---

## Attribution

Basemaps: © Mapbox / © OpenStreetMap contributors, or OpenFreeMap when running
keyless. The interaction model is modelled on Workabout NYC; the code, the
copy, the dataset and the artwork here are our own.
