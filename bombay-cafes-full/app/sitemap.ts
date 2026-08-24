import type { MetadataRoute } from "next";
import { CITIES } from "@/lib/cities";
import { getSpots } from "@/lib/spot-data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bombay-cafes.vercel.app";
  const spots = await getSpots();
  const live = CITIES.filter((c) => c.live);

  return [
    { url: base, priority: 1, changeFrequency: "weekly" },
    { url: `${base}/about`, priority: 0.5 },
    { url: `${base}/submit`, priority: 0.5 },
    ...live.map((c) => ({
      url: `${base}/${c.slug}`,
      priority: 0.9 as const,
      changeFrequency: "weekly" as const,
    })),
    // Deep links into a spot are real, shareable views worth indexing.
    ...live.flatMap((c) =>
      spots.map((s) => ({
        url: `${base}/${c.slug}?spot=${s.slug}`,
        lastModified: s.lastVerifiedAt ?? undefined,
        priority: 0.7 as const,
        changeFrequency: "monthly" as const,
      })),
    ),
  ];
}
