import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { CITIES } from "@/lib/cities";
import { getCityStats } from "@/lib/spot-data";

export const metadata: Metadata = {
  title: "Bombay Cafes — find a cafe you can actually work from",
  alternates: { canonical: "/" },
};

/**
 * The city chooser.
 *
 * Mirrors the reference's entry screen: near-black ground, the wordmark
 * top-left, a mono instruction centred, and one large photographic-weight card
 * per city. With a single city live this is a one-card rail — but it is the
 * screen that makes the product feel like a series rather than a one-off, and
 * adding a city stays a data change.
 */
export default async function LandingPage() {
  const stats = await getCityStats();
  const live = CITIES.filter((c) => c.live);
  const soon = ["Delhi", "Bengaluru"];

  return (
    <main className="flex min-h-dvh flex-col bg-ink text-paper">
      <header className="flex items-baseline justify-between gap-4 px-6 pt-7 sm:px-10">
        <h1 className="font-display text-[clamp(1.5rem,3.4vw,2rem)] leading-none tracking-tight">
          bombay <em className="font-semibold not-italic italic">cafes</em>
        </h1>
        <p className="wa-mono hidden text-paper/45 sm:block">Select your city</p>
      </header>

      <div className="flex flex-1 flex-col justify-center px-6 py-10 sm:px-10">
        <p className="wa-mono mb-4 text-paper/45 sm:hidden">Select your city</p>

        <div className="wa-rail -mx-6 flex gap-4 px-6 sm:-mx-10 sm:px-10">
          {live.map((city, i) => (
            <Link
              key={city.slug}
              href={`/${city.slug}`}
              className="wa-fade group relative flex aspect-[4/3] w-[min(84vw,760px)] shrink-0 flex-col justify-end overflow-hidden rounded-2xl border border-white/12 sm:aspect-[16/9]"
              style={{ animationDelay: `${i * 90}ms` }}
            >
              {/* A drawn ground rather than a stock photo: the reference leans
                  on city photography we do not own, so this is our own mark —
                  a night-sky wash over a skyline silhouette. */}
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg,#1c2a3a 0%,#243447 38%,#2f3b46 62%,#141414 100%)",
                }}
              />
              <svg
                aria-hidden
                viewBox="0 0 1200 300"
                preserveAspectRatio="none"
                className="absolute bottom-0 left-0 h-[46%] w-full"
              >
                <path
                  fill="rgba(8,10,12,0.88)"
                  d="M0 300V196h44v-38h30v38h34v-62h40v62h28v-24h46v24h30v-88h38v88h26v-46h44v46h34v-70h42v70h30v-30h40v30h32v-104h40v104h28v-52h44v52h32v-34h42v34h30v-76h38v76h28v-40h46v40h30v-22h40v22h34v-58h40v58h30v-30h44v30h32v-46h40v46h30v-24h42v24h32V300z"
                />
              </svg>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

              <div className="relative flex items-end justify-between gap-6 p-6 sm:p-8">
                <div>
                  <h2 className="font-display text-[clamp(2.4rem,7vw,4.5rem)] font-light leading-none tracking-tight text-white">
                    {city.name}
                  </h2>
                  <p className="wa-mono mt-2.5 text-white/65">{city.tagline}</p>
                </div>
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/40 text-white transition-all duration-300 group-hover:bg-white group-hover:text-ink sm:h-14 sm:w-14">
                  <ArrowUpRight className="h-5 w-5" strokeWidth={1.75} />
                </span>
              </div>
            </Link>
          ))}

          {soon.map((name) => (
            <div
              key={name}
              className="flex aspect-[4/3] w-[min(60vw,420px)] shrink-0 flex-col justify-end overflow-hidden rounded-2xl border border-dashed border-white/12 bg-white/[0.02] sm:aspect-[16/9]"
            >
              <div className="p-6 sm:p-8">
                <h2 className="font-display text-[clamp(1.8rem,4vw,2.6rem)] font-light leading-none text-white/25">
                  {name}
                </h2>
                <p className="wa-mono mt-2 text-white/25">Not yet</p>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-8 max-w-md text-[15px] leading-relaxed text-paper/55">
          {stats.spots} cafes across {stats.areas} areas, each rated on the five things that decide
          whether you can actually get three hours of work done.
        </p>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 px-6 pb-7 sm:px-10">
        <span className="wa-mono text-paper/30">© {new Date().getFullYear()} Bombay Cafes</span>
        <nav className="flex gap-5">
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
