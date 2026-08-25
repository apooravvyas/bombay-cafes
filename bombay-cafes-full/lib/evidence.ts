/**
 * The evidence layer.
 *
 * Everything here answers one question — can someone work here for three
 * hours — and answers it from things other people have published, not from
 * our impressions. A factor carries a score only when at least one fetched
 * source says something about it; otherwise it is null and stays null.
 *
 * The three rules this file exists to enforce:
 *
 *   1. Unknown is not zero. The weighted mean is renormalised over the
 *      factors that actually have evidence, so a cafe is never punished for
 *      something nobody has written down. Missing evidence lowers CONFIDENCE.
 *   2. No fake precision. One decimal place, and when coverage is too thin we
 *      decline to print a number at all rather than inventing one.
 *   3. Fact and inference are different things and are labelled differently
 *      all the way to the screen.
 */

export type Confidence = "high" | "medium" | "low" | "none";

export type FactorKey =
  | "wifi" | "power" | "seating" | "longStay"
  | "focus" | "calls" | "food" | "outdoor" | "bathroom";

export interface EvidenceItem {
  /** Our one-line reading of what the source says. */
  claim: string;
  /** The source's own words, ≤25 words. Absent when we are paraphrasing. */
  quote?: string;
  /** Publisher, e.g. "tripadvisor.com". */
  source: string;
  url: string;
  /** "fact" = the source states it. "inference" = we are reading between lines. */
  kind: "fact" | "inference";
}

export interface Factor {
  score: number | null;
  confidence: Confidence;
  evidence: EvidenceItem[];
}

export interface PublicRating {
  value: number;
  count?: number | null;
  source: string;
  url?: string;
}

export interface SpotEvidence {
  trading: "confirmed" | "unconfirmed" | "closed";
  hours: string | null;
  publicRating: PublicRating | null;
  factors: Record<FactorKey, Factor>;
  /** One sentence, derived from the evidence above. Never generated prose. */
  synthesis: string;
  sourcesFetched: string[];
  notes: string;
}

/* ── Weights ────────────────────────────────────────────────────────────────
   Tuned for Mumbai rather than lifted from the reference.

   Power leads. In Bandra and Fort the thing that actually ends a session is a
   dead battery — plenty of rooms have usable wifi and nowhere to plug in.

   Outdoor is near-worthless here and priced accordingly: eight months of heat
   and two of monsoon make a courtyard table a poor place for a laptop, which
   is not true of New York. Bathroom stays in the model because people asked
   for it, at a weight that reflects how rarely it decides anything.

   They sum to 1. Renormalisation over scored factors happens at read time. */
export const WEIGHTS: Record<FactorKey, number> = {
  power: 0.22,
  wifi: 0.20,
  seating: 0.16,
  longStay: 0.16,
  focus: 0.14,
  calls: 0.05,
  food: 0.04,
  outdoor: 0.02,
  bathroom: 0.01,
};

export const FACTOR_LABEL: Record<FactorKey, string> = {
  power: "Power",
  wifi: "Wi-Fi",
  seating: "Seating",
  longStay: "Long stay",
  focus: "Focus",
  calls: "Calls",
  food: "Food",
  outdoor: "Outdoor",
  bathroom: "Bathroom",
};

/** What each factor is actually asking, for the UI to explain itself. */
export const FACTOR_ASKS: Record<FactorKey, string> = {
  power: "Can you plug in?",
  wifi: "Will the connection hold for a call or an upload?",
  seating: "Is there a table you can work at, comfortably?",
  longStay: "Will they let you stay three hours?",
  focus: "Can you concentrate?",
  calls: "Can you take a call without annoying everyone?",
  food: "Can you eat a real meal without leaving?",
  outdoor: "Is there usable outdoor seating?",
  bathroom: "Is there a bathroom?",
};

export const FACTOR_ORDER: FactorKey[] = [
  "power", "wifi", "seating", "longStay", "focus", "calls", "food", "outdoor", "bathroom",
];

/** How much a confidence tier is worth when judging the whole. */
const CONF_VALUE: Record<Confidence, number> = { high: 1, medium: 0.65, low: 0.35, none: 0 };

export interface Workability {
  /** Rounded to 1dp, or null when the evidence is too thin to publish one. */
  score: number | null;
  confidence: Confidence;
  /** Share of total weight backed by evidence, 0–1. */
  coverage: number;
  /** Factors carrying a score. */
  scored: FactorKey[];
  /** Factors with nothing published either way. */
  unknown: FactorKey[];
  evidenceCount: number;
  sourceCount: number;
  /** True when we have some evidence but not enough to put a number on it. */
  tooThin: boolean;
}

export function scoreFromEvidence(ev: SpotEvidence): Workability {
  const scored: FactorKey[] = [];
  const unknown: FactorKey[] = [];
  let weighted = 0;
  let weight = 0;
  let confWeighted = 0;
  let evidenceCount = 0;
  const sources = new Set<string>(ev.sourcesFetched);

  for (const k of FACTOR_ORDER) {
    const f = ev.factors[k];
    evidenceCount += f.evidence.length;
    for (const e of f.evidence) sources.add(e.url);
    if (f.score == null) {
      unknown.push(k);
      continue;
    }
    scored.push(k);
    const w = WEIGHTS[k];
    weighted += f.score * w;
    weight += w;
    confWeighted += CONF_VALUE[f.confidence] * w;
  }

  const coverage = weight; // weights sum to 1, so covered weight *is* coverage
  if (weight === 0) {
    return {
      score: null, confidence: "none", coverage: 0,
      scored, unknown, evidenceCount, sourceCount: sources.size, tooThin: false,
    };
  }

  const raw = weighted / weight;
  const depth = confWeighted / weight;

  // Below roughly a third of the model, a single number would be a guess
  // dressed as a measurement. Say "limited evidence" instead.
  const tooThin = coverage < 0.34;

  let confidence: Confidence;
  if (coverage >= 0.7 && depth >= 0.7) confidence = "high";
  else if (coverage >= 0.45 && depth >= 0.45) confidence = "medium";
  else confidence = "low";

  return {
    score: tooThin ? null : Math.round(raw * 10) / 10,
    confidence,
    coverage,
    scored,
    unknown,
    evidenceCount,
    sourceCount: sources.size,
    tooThin,
  };
}

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
  none: "No evidence yet",
};

/**
 * Why a factor scored what it did, in one line, for the breakdown card.
 * Counts sources rather than asserting — "3 sources mention reliable wifi"
 * is checkable; "the wifi is good" is not.
 */
export function factorWhy(f: Factor): string {
  const n = f.evidence.length;
  if (f.score == null) return n === 0 ? "No evidence found" : `${n} mention${n === 1 ? "" : "s"}, none conclusive`;
  const facts = f.evidence.filter((e) => e.kind === "fact").length;
  const inf = n - facts;
  const parts: string[] = [];
  if (facts) parts.push(`${facts} source${facts === 1 ? "" : "s"}`);
  if (inf) parts.push(`${inf} inference${inf === 1 ? "" : "s"}`);
  return parts.join(" + ");
}

/** Effective weight of a factor once unknowns are excluded — what the bar shows. */
export function effectiveWeights(w: Workability): Record<string, number> {
  const total = w.scored.reduce((a, k) => a + WEIGHTS[k], 0);
  const out: Record<string, number> = {};
  for (const k of w.scored) out[k] = total > 0 ? WEIGHTS[k] / total : 0;
  return out;
}

/* ── Filters ────────────────────────────────────────────────────────────────
   Every filter is a threshold on a scored factor, so "Fast Wi-Fi" means the
   wifi factor cleared 4.0 on published evidence — not that the word "wifi"
   appears somewhere in the copy.

   `legacy` names the older derived tag to fall back on for spots that have not
   been researched yet. Where there is no sensible fallback the filter simply
   does not match an unresearched spot: we are not going to claim a cafe has a
   bathroom because nobody said it hasn't.

   Deliberately absent: "Open now". Our hours are free text from mixed sources
   ("Daily 7:30am–11:30pm", and three sources disagreeing) — parsing that into
   a live open/closed state would be a guess wearing a clock. */
export interface FilterDef {
  label: string;
  factor: FactorKey;
  min: number;
  /** Shown in the UI so the threshold is never a mystery. */
  definition: string;
  legacy?: string;
}

export const FILTERS: FilterDef[] = [
  { label: "Outlets", factor: "power", min: 3,
    definition: "Power evidence at 3.0 or better — sockets exist and are reachable",
    legacy: "Outlets" },
  { label: "Outlet heavy", factor: "power", min: 4.5,
    definition: "Power at 4.5+ — sources describe an outlet at nearly every table" },
  { label: "Fast Wi-Fi", factor: "wifi", min: 4,
    definition: "Wi-Fi at 4.0+ — described as reliable or fast by a source",
    legacy: "Fast WiFi" },
  { label: "Quiet", factor: "focus", min: 4,
    definition: "Focus at 4.0+ — sources describe a calm room" },
  { label: "Roomy", factor: "seating", min: 4,
    definition: "Seating at 4.0+ — space and tables you can spread out on",
    legacy: "Roomy" },
  { label: "Long session", factor: "longStay", min: 4,
    definition: "Long stay at 4.0+ — multi-hour laptop sessions actually reported",
    legacy: "No time limit" },
  { label: "Calls ok", factor: "calls", min: 3,
    definition: "Calls at 3.0+ — taking a call here is practical" },
  { label: "Food meal", factor: "food", min: 4,
    definition: "Food at 4.0+ — a real meal, not just a pastry" },
  { label: "Outdoor", factor: "outdoor", min: 3,
    definition: "Outdoor at 3.0+ — usable outside seating" },
  { label: "Bathroom", factor: "bathroom", min: 3,
    definition: "Bathroom at 3.0+ — confirmed by a source" },
];

export const FILTER_LABELS = FILTERS.map((f) => f.label);

/**
 * Does this spot satisfy the named filter?
 *
 * `research` present → threshold on the scored factor. A factor with no
 * evidence never satisfies a filter: unknown is not a yes.
 * `research` absent → the legacy derived tag, where one exists.
 */
export function matchesFilter(
  label: string,
  research: SpotEvidence | undefined,
  legacyToggles: string[],
): boolean {
  const def = FILTERS.find((f) => f.label === label);
  if (!def) return false;
  if (research) {
    const score = research.factors[def.factor]?.score;
    return score != null && score >= def.min;
  }
  return def.legacy ? legacyToggles.includes(def.legacy) : false;
}
