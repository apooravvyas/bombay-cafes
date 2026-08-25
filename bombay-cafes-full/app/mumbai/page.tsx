import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCity } from "@/lib/cities";
import { getSpots } from "@/lib/spot-data";
import { isAreaGroup } from "@/lib/spots";
import { MapScreen } from "@/components/wa/map-screen";

/**
 * One static route per city rather than a [city] segment.
 *
 * A root-level dynamic segment makes Next serve every unknown path — /nope,
 * /favicon-typo, anything — through this route, and its cached not-found render
 * comes back as HTTP 200. That soft 404 is read by search engines as a real
 * page. Adding a city is a four-line file, which is a fair price for honest
 * status codes.
 */
const CITY_SLUG = "mumbai";

export async function generateMetadata(): Promise<Metadata> {
  const city = getCity(CITY_SLUG);
  if (!city) return { title: "Not found" };
  return {
    title: `${city.name} — cafes you can work from`,
    description: `Every cafe in ${city.tagline} ranked on wifi, power outlets, noise and seating. Find one you can actually work from.`,
    alternates: { canonical: `/${city.slug}` },
  };
}

type SP = Promise<{ area?: string; spot?: string }>;

export default async function MumbaiPage({ searchParams }: { searchParams: SP }) {
  const city = getCity(CITY_SLUG);
  if (!city || !city.live) notFound();

  const [spots, sp] = await Promise.all([getSpots(), searchParams]);

  // ?area= carries either an area-group slug from the landing page
  // ("bandra") or a single neighbourhood from the AREAS menu ("Waroda Road").
  // Validate against both, and drop anything else rather than rendering a
  // filter that silently matches nothing.
  const areaNames = new Set(spots.map((s) => s.neighborhood));
  const initialArea =
    sp.area && (isAreaGroup(sp.area) || areaNames.has(sp.area)) ? sp.area : null;
  const initialSpot = sp.spot && spots.some((s) => s.slug === sp.spot) ? sp.spot : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Cafes to work from in ${city.name}`,
    numberOfItems: spots.length,
    itemListElement: spots.slice(0, 20).map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "CafeOrCoffeeShop",
        name: s.name,
        address: {
          "@type": "PostalAddress",
          streetAddress: s.address,
          addressLocality: "Mumbai",
          addressRegion: "Maharashtra",
          addressCountry: "IN",
        },
        ...(s.website ? { url: s.website } : {}),
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MapScreen city={city} spots={spots} initialArea={initialArea} initialSpot={initialSpot} />
    </>
  );
}
