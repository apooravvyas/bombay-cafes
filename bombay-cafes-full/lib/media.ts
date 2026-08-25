import mediaFile from "@/data/media.json";

/**
 * Photography and menu links.
 *
 * Kept in its own file, keyed by slug, so images can be populated later
 * without touching the evidence dataset or any component. Three rules:
 *
 *   1. An entry only exists when someone verified the URL points at THIS
 *      outlet. Chains made that a real hazard during research — three of the
 *      richest "work cafe" write-ups turned out to describe a different Blue
 *      Tokai — and the same trap applies to photographs. Blue Tokai Perry Road
 *      is not Blue Tokai Fort. Poetry Khar is not Poetry 24th Road.
 *   2. No stock photography. An empty images array is the normal state and
 *      renders a deliberate graphic instead. A generic Mumbai interior placed
 *      under a cafe's name is a claim about that cafe, and it would be false.
 *   3. Every image records HOW the outlet identity was established, in
 *      `verified`, and WHERE, in `sourceUrl`. If that sentence cannot be
 *      written, the image does not go in the file.
 */

/** Where the bytes come from. Ordered by how much we trust the pairing. */
export type ImageSource =
  | "official-website"
  | "official-instagram"
  | "google-places"
  | "other-verified";

export interface SpotImage {
  /**
   * Absolute, directly displayable URL. Optional because Google Places photos
   * are addressed by resource name and proxied — Places media URLs are
   * short-lived redirects and must never be stored as if they were assets.
   */
  url?: string;
  /** Google Places photo resource name: `places/{id}/photos/{ref}`. */
  photoName?: string;
  /** What a reader who cannot see the image needs to know. */
  alt: string;
  /** Optional line shown under the hero. Facts only. */
  caption?: string;
  credit?: string;
  creditUrl?: string;
  source: ImageSource;
  /** The page on which this image was found paired with THIS outlet. */
  sourceUrl?: string;
  /** One sentence: how we know this is the right outlet. */
  verified?: string;
}

export interface SpotMedia {
  images: SpotImage[];
  menuUrl: string | null;
}

const MEDIA = (mediaFile as { spots: Record<string, SpotMedia> }).spots;

export function mediaFor(slug: string): SpotMedia {
  const m = MEDIA[slug];
  if (!m) return { images: [], menuUrl: null };
  // Defensive: an entry with neither a url nor a photoName cannot render.
  return { ...m, images: (m.images ?? []).filter((i) => i.url || i.photoName) };
}

const WIDTHS = [480, 720, 960, 1280] as const;

/** Does this URL let us ask the origin for a specific width? */
function isResizable(img: SpotImage): boolean {
  return Boolean(img.photoName) || /[?&]width=\d+/.test(img.url ?? "");
}

/**
 * The src for a given rendered width.
 *
 * Shopify and most CDN-backed operator sites accept a `width` query parameter,
 * so the same verified asset can be requested at hero size instead of the
 * 480px thumbnail their locations page happens to use. Where the origin offers
 * no such handle we send the one URL we have and let the size guard in
 * SpotHero reject it if it turns out to be too small to show.
 */
export function imageSrc(img: SpotImage, width: number): string {
  if (img.photoName) {
    return `/api/place-photo?name=${encodeURIComponent(img.photoName)}&w=${width}`;
  }
  const url = img.url ?? "";
  if (/[?&]width=\d+/.test(url)) return url.replace(/([?&]width=)\d+/, `$1${width}`);
  return url;
}

export function imageSrcSet(img: SpotImage): string | undefined {
  if (!isResizable(img)) return undefined;
  return WIDTHS.map((w) => `${imageSrc(img, w)} ${w}w`).join(", ");
}

/** Attribution line, when the source asks for one. */
export function imageCredit(img: SpotImage): { label: string; href?: string } | null {
  if (img.credit) return { label: img.credit, href: img.creditUrl ?? img.sourceUrl };
  if (img.source === "official-website") return { label: "Operator's site", href: img.sourceUrl };
  if (img.source === "official-instagram") return { label: "Operator's Instagram", href: img.sourceUrl };
  if (img.source === "google-places") return { label: "Google", href: img.sourceUrl };
  return null;
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
