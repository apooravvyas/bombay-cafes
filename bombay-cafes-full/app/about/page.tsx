import Link from "next/link";
import type { Metadata } from "next";
import { getSpots } from "@/lib/spot-data";
import { SCORE_LABEL, WORK_WEIGHTS, ratedCount, type ScoreKey } from "@/lib/spots";

export const metadata: Metadata = {
  title: "About",
  description:
    "How Bombay Cafes rates a cafe for working: what the five signals mean, where the data comes from, and what we will not pretend to know.",
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const spots = await getSpots();
  const avgRated = spots.reduce((s, x) => s + ratedCount(x.scores), 0) / (spots.length || 1);
  const approximate = spots.filter((s) => s.locationAccuracy === "approximate").length;
  const verified = spots.filter((s) => s.locationAccuracy === "verified").length;
  const order: ScoreKey[] = ["work", "wifi", "charging", "seating", "quiet"];

  return (
    <main className="min-h-dvh bg-ink text-paper">
      <div className="mx-auto max-w-2xl px-6 pb-24 pt-10 sm:px-8">
        <Link href="/" className="wa-mono text-paper/45 transition-colors hover:text-paper">
          ← Bombay Cafes
        </Link>

        <h1 className="mt-8 font-display text-[clamp(2rem,5vw,2.9rem)] font-light leading-[1.06] tracking-tight text-balance">
          Find a cafe you can actually work from.
        </h1>

        <div className="mt-7 space-y-5 text-[16.5px] leading-[1.75] text-paper/80">
          <p>
            Every cafe here gets a <strong className="font-semibold text-paper">workability</strong>{" "}
            score out of 5. It answers one question and nothing else: can you sit down and get
            three hours of work done?
          </p>
          <p>
            That is deliberately narrower than a restaurant rating. A room can serve excellent
            coffee and still be useless with a laptop, and the reverse is true more often than
            anyone admits.
          </p>
        </div>

        <section className="mt-12">
          <h2 className="font-display text-[24px] font-normal tracking-tight">The five signals</h2>
          <p className="mt-2.5 text-[15px] leading-relaxed text-paper/60">
            Four measured from sources, plus our own read of how the room treats someone working.
            Weighted toward the two things that end a session early — nowhere to plug in, nowhere
            to sit.
          </p>
          <ul className="mt-5 divide-y divide-white/10 overflow-hidden rounded-xl border border-white/12">
            {order.map((key) => (
              <li key={key} className="flex items-baseline justify-between gap-4 px-4 py-3.5">
                <span className="text-[15px]">{SCORE_LABEL[key]}</span>
                <span className="wa-mono tabular-nums text-paper/50">
                  {Math.round(WORK_WEIGHTS[key] * 100)}%
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[14px] leading-relaxed text-paper/55">
            Noise is stored as quietness, so a high number means calm. That keeps the weighted
            average honest without inverting anything.
          </p>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-[24px] font-normal tracking-tight">
            What we will not fake
          </h2>
          <div className="mt-3 space-y-4 text-[15.5px] leading-relaxed text-paper/70">
            <p>
              Wifi, charging, noise and seating are rated{" "}
              <strong className="font-semibold text-paper">only where a source or a visit
              supports it</strong>. Almost no Mumbai cafe publishes wifi speed or outlet counts, so
              plenty of these are blank — an em dash, not a guessed middle value. Across the{" "}
              {spots.length} live spots we average {avgRated.toFixed(1)} of 5 signals rated, and
              every cafe panel says which ones.
            </p>
            <p>
              Unrated signals lower our confidence, not the score. A cafe is never punished for
              something nobody has written down.
            </p>
            <p>
              Map positions are labelled rather than implied. Every pin is anchored to the street
              named in that cafe&rsquo;s own address — Waroda Road, Tamarind Lane, Sherly Rajan
              Road — which puts it on the right road, usually within a couple of hundred metres of
              the door. Good enough to see what is near you; not good enough to navigate by, so
              each listing says which street it was read from.{" "}
              {approximate > 0 && (
                <>
                  {approximate} of {spots.length} are approximate in that sense
                  {verified > 0 ? ` and ${verified} are geocoded` : " and none are geocoded yet"}.
                </>
              )}{" "}
              What we do not do is invent one. No randomness, no neighbourhood centroid standing in
              for an address, and no two cafes sharing a point.
            </p>
          </div>
        </section>

        <section className="mt-12 rounded-xl border border-white/12 p-6">
          <h2 className="font-display text-[20px] font-normal tracking-tight">
            The scores should get better
          </h2>
          <p className="mt-2.5 text-[15px] leading-relaxed text-paper/65">
            Every cafe panel has a short feedback form — wifi, outlets, noise. It is anonymous and
            takes a few seconds. Reports go into a queue rather than straight onto the score, so a
            handful of votes cannot swing a listing, but enough of them will get it re-rated.
          </p>
          <Link href="/submit" className="wa-btn wa-btn--solid mt-5 !bg-paper !text-ink">
            Submit a cafe
          </Link>
        </section>
      </div>
    </main>
  );
}
