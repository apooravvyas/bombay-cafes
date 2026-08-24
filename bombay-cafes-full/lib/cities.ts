/**
 * City registry.
 *
 * The reference opens on a city chooser and scopes everything under /<city>,
 * which is worth keeping even with one city live: it makes the second city a
 * data change rather than a refactor.
 */
export interface City {
  slug: string;
  name: string;
  /** Shown on the landing card. */
  tagline: string;
  /** Map camera when the city loads. */
  center: { lat: number; lng: number };
  zoom: number;
  live: boolean;
}

export const CITIES: City[] = [
  {
    slug: "mumbai",
    name: "Mumbai",
    tagline: "Bandra and South Bombay",
    // Between Bandra and Fort, so both clusters are in frame on load.
    center: { lat: 18.995, lng: 72.833 },
    zoom: 11.4,
    live: true,
  },
];

export function getCity(slug: string): City | null {
  return CITIES.find((c) => c.slug === slug) ?? null;
}

export const DEFAULT_CITY = CITIES[0];
