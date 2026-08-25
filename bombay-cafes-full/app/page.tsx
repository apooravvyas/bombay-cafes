import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { CITIES } from "@/lib/cities";
import { getSpots } from "@/lib/spot-data";
import { AREA_GROUP_LABEL, groupAreas, groupCounts, type AreaGroup } from "@/lib/spots";
import { AreaArt } from "@/components/wa/area-art";

export const metadata: Metadata = {
  title: "Bombay Cafes — find a cafe you can actually work from",
  alternates: { canonical: "/" },
};

/**
 * The entry screen.
 *
 * It asks "where in Mumbai", not "which city". One city is live, and a chooser
 * offering Delhi and Bengaluru as dashed "not yet" cards advertises a roadmap
 * instead of a product — so the first decision a reader makes is now the one
 * that actually narrows their search: Bandra, or South Bombay.
 *
 * lib/cities.ts still holds a registry and the map still takes a city, so a
 * second city remains a data change. It is simply not advertised.
 *
 * Coverage is read from the dataset. If a seed lands with twenty more Fort
 * cafes the counts and the street lists move on their own — nothing here is
 * typed by hand.
 */

/**
 * The one editorial line per area. Everything else on the card — the count and
 * the streets — comes from the dataset, so coverage cannot drift out of sync
 * with what the map actually holds.
 */
const BLURB: Record<AreaGroup, string> = {
  bandra: "Village lanes, bakeries, and the best odds of a table at 3pm.",
  "south-bombay": "Stone arcades, Irani cafes, and rooms open for a century.",
};

const ORDER: AreaGroup[] = ["bandra", "south-bombay"];

export default async function LandingPage() {
  const spots = await getSpots();
  const counts = groupCounts(spots);
  const streets = groupAreas(spots);
  const city = CITIES.find((c) => c.live) ?? CITIES[0];
  const areas = new Set(spots.map((s) => s.neighborhood)).size;
  const researched = spots.filter((s) => s.research).length;

  return (
    <main className="flex min-h-dvh flex-col bg-ink text-paper">
      <header className="flex items-baseline justify-between gap-4 px-6 pt-7 sm:px-10">
        <h1 className="font-display text-[clamp(1.5rem,3.4vw,2rem)] leading-none tracking-tight">
          bombay <em className="font-semibold not-italic italic">cafes</em>
        </h1>
        <Link
          href={`/${city.slug}`}
          className="wa-mono hidden items-center gap-1.5 text-paper/45 transition-colors hover:text-paper sm:flex"
        >
          Areas <span className="text-[13px] leading-none">+</span>
        </Link>
      </header>

      <div className="flex flex-1 flex-col justify-center px-6 py-10 sm:px-10">
        <p className="wa-mono mb-4 text-paper/45 sm:hidden">Explore Mumbai</p>

        {/* Two cards, side by side on desktop, stacked on a phone. The
            reference uses a horizontal rail because it has more cities than
            fit; with two areas a rail would just hide half the product. */}
        <div className="grid gap-4 md:grid-cols-2">
          {ORDER.map((group, i) => {
            const count = counts[group];
            if (count === 0) return null;
            // Four streets, chosen by coverage and broken by the best cafe on
            // them. Coverage alone ties at one cafe each and then falls back to
            // alphabetical, which puts "24th Road" on the card ahead of Pali
            // Hill — true, and useless to a reader deciding where to go.
            const best = new Map<string, number>();
            for (const s of spots) {
              if (s.area !== group) continue;
              const w = s.workability ?? 0;
              best.set(s.neighborhood, Math.max(best.get(s.neighborhood) ?? 0, w));
            }
            const named = [...streets[group]]
              .sort(
                (a, b) =>
                  b.count - a.count ||
                  (best.get(b.name) ?? 0) - (best.get(a.name) ?? 0) ||
                  a.name.localeCompare(b.name),
              )
              .slice(0, 4)
              .map((a) => a.name);
            return (
              <Link
                key={group}
                href={`/${city.slug}?area=${group}`}
                className="wa-fade group relative flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-2xl border border-white/12 sm:aspect-[16/10]"
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <AreaArt group={group} />

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

                <div className="relative flex items-end justify-between gap-4 p-5 sm:p-7">
                  <div className="min-w-0">
                    <p className="wa-mono text-white/55">
                      {count} {count === 1 ? "cafe" : "cafes"}
                    </p>
                    <h2 className="mt-1.5 font-display text-[clamp(2rem,5.2vw,3.4rem)] font-light leading-none tracking-tight text-white">
                      {AREA_GROUP_LABEL[group]}
                    </h2>
                    <p className="mt-2.5 max-w-[34ch] text-[14px] leading-snug text-white/70">
                      {BLURB[group]}
                    </p>
                    {/* Two lines at most: on a phone four street names wrap to
                        three and start crowding the arrow. */}
                    <p className="wa-mono mt-3 line-clamp-2 text-white/40">{named.join(" · ")}</p>
                  </div>
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/40 text-white transition-all duration-300 group-hover:bg-white group-hover:text-ink sm:h-14 sm:w-14">
                    <ArrowUpRight className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        <p className="mt-8 max-w-lg text-[15px] leading-relaxed text-paper/55">
          {spots.length} cafes across {areas} Mumbai neighbourhoods, scored on what decides whether
          you can actually get three hours of work done.{" "}
          {researched > 0 && (
            <span className="text-paper/40">
              {researched} are graded from published evidence across nine factors, with every
              finding cited; the rest carry our own read until the research reaches them.
            </span>
          )}
        </p>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 px-6 pb-7 sm:px-10">
        <span className="wa-mono text-paper/30">© {new Date().getFullYear()} Bombay Cafes</span>
        <nav className="flex gap-5">
          <Link href={`/${city.slug}`} className="wa-mono text-paper/45 transition-colors hover:text-paper">
            The map
          </Link>
          <Link href="/about" className="wa-mono text-paper/45 transition-colors hover:text-paper">
            About
          </Link>
          <Link href="/submit" className="wa-mono text-paper/45 transition-colors hover:text-paper">
            Submit a cafe
          </Link>
        </nav>
      </footer>
    </main>
  );
}
