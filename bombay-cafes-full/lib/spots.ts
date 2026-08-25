import type { SpotEvidence, Workability } from "@/lib/evidence";
import { FILTER_LABELS, matchesFilter } from "@/lib/evidence";

/**
 * The Workabout-shaped domain model: types, the workability score, and the
 * filter/search logic. Pure — safe to import from client components.
 */

export type AreaGroup = "bandra" | "south-bombay";

export const AREA_GROUP_LABEL: Record<AreaGroup, string> = {
  bandra: "Bandra",
  "south-bombay": "South Bombay",
};

/** Which layer a listing came from. Drives pin fill and the map legend. */
export type DataLayer = "curated" | "ai-analysis";

export type VerificationStatus = "unverified" | "editorial" | "verified" | "needs_review";

/**
 * The five source scores, 1–5 or null.
 *
 * `quiet` is stored as quietness (5 = calmest) so every dimension points the
 * same way and the weighted mean needs no inversion.
 */
export interface SpotScores {
  wifi: number | null;
  charging: number | null;
  quiet: number | null;
  seating: number | null;
  work: number | null;
}

export type ScoreKey = keyof SpotScores;

/**
 * The qualitative layer — what the panel actually prints. The reference
 * communicates in words ("WiFi Fast", "CHARGING Scarce"), not in bars, because
 * "Scarce" tells you to bring a charged laptop and "2/5" does not.
 */
export interface SpotAttrs {
  wifi: string | null;
  charging: string | null;
  chargingNote: string | null;
  noise: string | null;
  seating: string | null;
  seatingStyles: string | null;
  stay: string | null;
  peakCrowd: string | null;
  avgFoodCost: string | null;
}

export type LocationAccuracy = "approximate" | "verified" | null;

export interface Spot {
  slug: string;
  name: string;
  area: AreaGroup;
  neighborhood: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  /**
   * How much to trust the pair above.
   *
   * "approximate" means street/block level — read off the cafe's own verified
   * address, right road and right stretch of it, within a couple of hundred
   * metres of the door. Good enough to answer "what is near me"; not good
   * enough to walk to, and the detail panel says so.
   *
   * "verified" means a geocoder resolved the full address.
   * null means no position at all.
   */
  locationAccuracy: LocationAccuracy;
  /** The street the approximate pin was read from, so the work is checkable. */
  locationAnchor: string | null;
  website: string | null;
  instagram: string | null;
  googleMapsUrl: string | null;
  openingHours: string | null;
  editorialNote: string;
  whyWeRecommend: string;
  scores: SpotScores;
  attrs: SpotAttrs;
  evidence: Record<ScoreKey, string | null>;
  toggles: string[];
  tags: string[];
  dataLayer: DataLayer;
  verificationStatus: VerificationStatus;
  dataNote: string | null;
  sources: string[];
  lastVerifiedAt: string | null;
  isActive: boolean;
  /**
   * The headline number, derived at read time. Prefers the evidence model
   * when a spot has been researched; falls back to the curated dimensions
   * otherwise. See lib/spot-data.ts.
   */
  workability: number | null;
  /**
   * Published sources and per-factor findings. Absent until researched.
   * Named `research` rather than `evidence` because `evidence` above is the
   * older per-dimension sentence map and the two are different things.
   */
  research?: SpotEvidence;
  /** Score, confidence and coverage derived from `research`. */
  work?: Workability;
}

/** A spot with a real position. The map only ever receives these. */
export type MappedSpot = Spot & { latitude: number; longitude: number };

export function isMapped(s: Spot): s is MappedSpot {
  return typeof s.latitude === "number" && typeof s.longitude === "number";
}

/* ── Workability ───────────────────────────────────────────────────────────
   The headline number, shown as "4.0 / 5 for working".

   Weighted toward the two things that end a work session early — nowhere to
   plug in, and nowhere to sit — with wifi close behind. Weights are
   renormalised over whichever dimensions are actually rated, so an unrated
   dimension lowers CONFIDENCE, not the score. Unknown is never zero. */
/**
 * NOT the published model.
 *
 * The score every live cafe carries comes from the nine evidence-weighted
 * factors in `lib/evidence.ts`, and `/about` documents those weights by
 * reading that table directly. These five are an older curated mean, kept only
 * as a fallback for a spot seeded ahead of its evidence — all 30 live cafes are
 * researched, so nothing in production reaches it. If you are looking for the
 * weights the product explains to readers, they are in evidence.ts.
 */
export const WORK_WEIGHTS: Record<ScoreKey, number> = {
  work: 0.3,
  wifi: 0.22,
  charging: 0.2,
  seating: 0.18,
  quiet: 0.1,
};

export const SCORE_LABEL: Record<ScoreKey, string> = {
  wifi: "WiFi",
  charging: "Charging",
  quiet: "Noise",
  seating: "Seating",
  work: "Work friendliness",
};

export function workability(scores: SpotScores): number | null {
  let sum = 0;
  let weight = 0;
  for (const key of Object.keys(WORK_WEIGHTS) as ScoreKey[]) {
    const v = scores[key];
    if (v == null) continue;
    sum += v * WORK_WEIGHTS[key];
    weight += WORK_WEIGHTS[key];
  }
  if (weight === 0) return null;
  return Math.round((sum / weight) * 10) / 10;
}

/** Share of the weight that is actually rated, 0–1. Drives the "based on N of 5" note. */
export function confidence(scores: SpotScores): number {
  let weight = 0;
  for (const key of Object.keys(WORK_WEIGHTS) as ScoreKey[]) {
    if (scores[key] != null) weight += WORK_WEIGHTS[key];
  }
  return Math.round(weight * 100) / 100;
}

export function ratedCount(scores: SpotScores): number {
  return (Object.keys(WORK_WEIGHTS) as ScoreKey[]).filter((k) => scores[k] != null).length;
}

/** The three chips under "WORK SCORE LOGIC". */
export function scoreLogic(spot: Spot): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  if (spot.attrs.charging) out.push({ label: "Power", value: spot.attrs.charging.toLowerCase() });
  if (spot.attrs.wifi) out.push({ label: "WiFi", value: spot.attrs.wifi.toLowerCase() });
  if (spot.attrs.stay) out.push({ label: "Stay", value: spot.attrs.stay });
  return out;
}

/* ── Filters ──────────────────────────────────────────────────────────────── */
/**
 * The filter rail. Sourced from lib/evidence.ts so a label cannot drift from
 * the threshold behind it. The old four-tag array is gone; those tags survive
 * inside FILTERS as the `legacy` fallback for spots awaiting research.
 */
export const TOGGLES = FILTER_LABELS;
export type Toggle = string;

export interface SpotFilters {
  /** Minimum workability, 0 = "Any score". */
  minScore: number;
  toggles: string[];
  /**
   * Either an area-group slug ("bandra", "south-bombay") or a single
   * neighbourhood name ("Waroda Road"). One field carries both because the URL
   * has one `?area=` parameter and a reader should be able to type either:
   * the landing page links to the group, the AREAS menu drills into a street.
   */
  area: string | null;
  query: string;
}

const AREA_GROUPS = Object.keys(AREA_GROUP_LABEL) as AreaGroup[];

/** True when `area` names a whole group rather than one neighbourhood. */
export function isAreaGroup(area: string | null): area is AreaGroup {
  return area != null && (AREA_GROUPS as string[]).includes(area);
}

/** What to print for whatever `?area=` holds. Falls back to the city name. */
export function areaLabel(area: string | null, cityName: string): string {
  if (!area) return cityName;
  return isAreaGroup(area) ? AREA_GROUP_LABEL[area] : area;
}

/** Live counts per group, so nothing about coverage is hardcoded. */
export function groupCounts(spots: Spot[]): Record<AreaGroup, number> {
  const out = { bandra: 0, "south-bombay": 0 } as Record<AreaGroup, number>;
  for (const s of spots) out[s.area] += 1;
  return out;
}

export const EMPTY_FILTERS: SpotFilters = { minScore: 0, toggles: [], area: null, query: "" };

export function filterSpots(spots: Spot[], f: SpotFilters): Spot[] {
  const terms = f.query.trim().toLowerCase().split(/\s+/).filter(Boolean);

  return spots.filter((s) => {
    if (f.area) {
      const hit = isAreaGroup(f.area) ? s.area === f.area : s.neighborhood === f.area;
      if (!hit) return false;
    }
    // A spot with no score is not excluded by "Any score", but any real
    // threshold is a claim we cannot make about an unrated spot.
    if (f.minScore > 0 && (s.workability ?? 0) < f.minScore) return false;
    // Every active filter must hold, evaluated against the evidence model.
    if (f.toggles.length > 0 && !f.toggles.every((t) => matchesFilter(t, s.research, s.toggles)))
      return false;

    if (terms.length === 0) return true;
    const hay = [
      s.name,
      s.neighborhood,
      AREA_GROUP_LABEL[s.area],
      s.address,
      s.editorialNote,
      ...s.tags,
      ...s.toggles,
      s.attrs.wifi ?? "",
      s.attrs.noise ?? "",
      s.attrs.seating ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return terms.every((t) => hay.includes(t));
  });
}

/** Highest workability first, then name. Unrated spots sort last, not zero-th. */
export function rankSpots(spots: Spot[]): Spot[] {
  return [...spots].sort((a, b) => {
    const av = a.workability;
    const bv = b.workability;
    if (av == null && bv == null) return a.name.localeCompare(b.name);
    if (av == null) return 1;
    if (bv == null) return -1;
    return bv - av || a.name.localeCompare(b.name);
  });
}

/** Areas present in the data, grouped for the AREAS menu. */
export function groupAreas(spots: Spot[]): Record<AreaGroup, { name: string; count: number }[]> {
  const out: Record<AreaGroup, { name: string; count: number }[]> = {
    bandra: [],
    "south-bombay": [],
  };
  for (const group of Object.keys(out) as AreaGroup[]) {
    const counts = new Map<string, number>();
    for (const s of spots.filter((x) => x.area === group)) {
      counts.set(s.neighborhood, (counts.get(s.neighborhood) ?? 0) + 1);
    }
    out[group] = [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }
  return out;
}

/** "OPEN NOW · 8:00am–10pm" style status, or null when hours are unpublished. */
export function hoursLabel(spot: Spot): string | null {
  return spot.openingHours;
}

/** Zero-padded count, as the reference prints it ("02 spots in …"). */
export function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}
