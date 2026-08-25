import mediaFile from "@/data/media.json";

/**
 * Photography and menu links.
 *
 * Kept in its own file, keyed by slug, so images can be populated later
 * without touching the evidence dataset or any component. Two rules:
 *
 *   1. An entry only exists when someone verified the URL points at THIS
 *      outlet. Chains made that a real hazard during research — three of the
 *      richest "work cafe" write-ups turned out to describe a different Blue
 *      Tokai — and the same trap applies to photographs.
 *   2. No stock photography. An empty images array is the normal state and
 *      renders a deliberate graphic instead. A generic Mumbai interior placed
 *      under a cafe's name is a claim about that cafe, and it would be false.
 */

export interface SpotImage {
  url: string;
  alt: string;
  /** Required whenever the licence asks for attribution. */
  credit?: string;
  creditUrl?: string;
  source?: string;
}

export interface SpotMedia {
  images: SpotImage[];
  menuUrl: string | null;
}

const MEDIA = (mediaFile as { spots: Record<string, SpotMedia> }).spots;

export function mediaFor(slug: string): SpotMedia {
  return MEDIA[slug] ?? { images: [], menuUrl: null };
}

/**
 * A stable 0–1 number from the slug, so a cafe's fallback artwork is the same
 * every visit. Not cryptographic; it only needs to be deterministic.
 */
export function slugSeed(slug: string): number {
  let h = 2166136261;
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

/** Two or three initials for the fallback plate. */
export function initials(name: string): string {
  const words = name
    .replace(/[—–&]/g, " ")
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w) && !["by", "the", "and", "x", "de", "co"].includes(w.toLowerCase()));
  return words.slice(0, 3).map((w) => w[0].toUpperCase()).join("");
}
