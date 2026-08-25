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
/**
 * One editorial line per area — the character of the place, not its position
 * on a map. Everything else on the card is read from the dataset.
 */
const BLURB: Record<AreaGroup, string> = {
  bandra:
    "Bungalow lanes and bakeries turned coffee rooms. Independent, unhurried, and the best odds in the city of a table at three in the afternoon.",
  "south-bombay":
    "Stone arcades, Irani cafes that have kept the same tables for a century, and new roasters in the old banking streets.",
};

const ORDER: AreaGroup[] = ["bandra", "south-bombay"];

export default async function LandingPage() {
  const spots = await getSpots();
  const counts = groupCounts(spots);
  const streets = groupAreas(spots);
  const city = CITIES.find((c) => c.live) ?? CITIES[0];
  const researched = spots.filter((s) => s.research).length;

  return (
    <main className="wa-grid flex min-h-dvh flex-col bg-ink text-paper">
      <header className="wa-rise relative z-10 flex items-baseline justify-between gap-4 px-6 pt-7 sm:px-10">
        <h1 className="font-display text-[clamp(1.5rem,3.4vw,2rem)] leading-none tracking-tight">
          bombay <em className="font-semibold not-italic italic">cafes</em>
        </h1>
        <Link
          href={`/${city.slug}`}
          className="wa-mono hidden items-center gap-1.5 text-paper/45 transition-colors hover:text-paper sm:flex"
        >
          Explore Mumbai <span className="text-[13px] leading-none">+</span>
        </Link>
      </header>

      <div className="relative z-10 flex flex-1 flex-col justify-center px-6 py-10 sm:px-10">
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
                <span className="absolute inset-0 transition-transform duration-[900ms] ease-out group-hover:scale-[1.035]">
                  <AreaArt group={group} />
                </span>

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/22 to-transparent" />

                <div className="relative flex items-end justify-between gap-4 p-5 sm:p-7">
                  <div className="min-w-0">
                    {/* No cafe count here. A database figure is the least
                        interesting thing about a neighbourhood, and it is the
                        first thing a reader would have read. */}
                    <p className="wa-mono text-white/45">Mumbai</p>
                    <h2 className="mt-2 font-sans text-[clamp(2.1rem,5.4vw,3.5rem)] font-normal leading-[0.96] tracking-[-0.02em] text-white">
                      {AREA_GROUP_LABEL[group]}
                    </h2>
                    <p className="mt-3 max-w-[38ch] text-[14.5px] leading-relaxed text-white/70">
                      {BLURB[group]}
                    </p>
                    <p className="wa-mono mt-3.5 line-clamp-2 text-white/35">{named.join(" · ")}</p>
                  </div>
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/35 text-white transition-all duration-[420ms] ease-out group-hover:scale-[1.06] group-hover:border-white group-hover:bg-white group-hover:text-ink sm:h-14 sm:w-14">
                    <ArrowUpRight className="h-5 w-5 transition-transform duration-[420ms] ease-out group-hover:translate-x-[2px] group-hover:-translate-y-[2px]" strokeWidth={1.75} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        <p className="wa-rise mt-8 max-w-lg text-[15px] leading-relaxed text-paper/70" style={{ animationDelay: "260ms" }}>
          Cafes you can actually work from, scored on what decides whether you last three hours:
          somewhere to plug in, somewhere to sit, a connection that holds, and whether anyone
          minds you staying.{" "}
          {researched > 0 && (
            <span className="text-paper/50">
              All {researched} are graded on the same nine weighted factors, from published
              evidence, with every finding cited — and where the sources are too thin to average,
              the panel says so instead of printing a number.
            </span>
          )}
        </p>
      </div>

      <footer className="relative z-10 flex flex-wrap items-center justify-between gap-3 px-6 pb-7 sm:px-10">
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
