import Link from "next/link";
import type { Metadata } from "next";
import { getSpots } from "@/lib/spot-data";
import {
  CONFIDENCE_LABEL,
  FACTOR_ASKS,
  FACTOR_LABEL,
  FACTOR_ORDER,
  FILTERS,
  WEIGHTS,
  type Confidence,
  type FactorKey,
} from "@/lib/evidence";

export const metadata: Metadata = {
  title: "About",
  description:
    "How Bombay Cafes rates a cafe for working: the nine factors and their weights, why an unknown factor is left out rather than scored zero, when we publish no number at all, and where every finding comes from.",
  alternates: { canonical: "/about" },
};

/**
 * The methodology page.
 *
 * Everything on it is read from the same module the score itself uses —
 * `lib/evidence.ts` — so the weights printed here cannot drift away from the
 * weights being applied. The counts are computed from the live dataset for the
 * same reason. If the model changes, this page changes with it, without anyone
 * remembering to come and edit prose.
 */
export default async function AboutPage() {
  const spots = await getSpots();

  const researched = spots.filter((s) => s.research && s.work);
  const scored = researched.filter((s) => s.work!.score != null);
  const withheld = researched.filter((s) => s.work!.score == null);

  const conf: Record<string, number> = { high: 0, medium: 0, low: 0 };
  for (const s of scored) conf[s.work!.confidence] = (conf[s.work!.confidence] ?? 0) + 1;

  /** How many live cafes have each factor documented at all. */
  const documented = Object.fromEntries(
    FACTOR_ORDER.map((k) => [
      k,
      researched.filter((s) => s.research!.factors[k]?.score != null).length,
    ]),
  ) as Record<FactorKey, number>;

  let findings = 0;
  const sources = new Set<string>();
  let inferences = 0;
  for (const s of researched) {
    for (const k of FACTOR_ORDER) {
      for (const e of s.research!.factors[k]?.evidence ?? []) {
        findings++;
        if (e.kind === "inference") inferences++;
        if (e.source) sources.add(e.source);
      }
    }
  }

  const approximate = spots.filter((s) => s.locationAccuracy === "approximate").length;
  const verified = spots.filter((s) => s.locationAccuracy === "verified").length;

  /** Which filter, if any, tests each factor — so the two vocabularies line up. */
  const filterFor = (k: FactorKey) =>
    FILTERS.filter((f) => f.factor === k)
      .map((f) => f.label)
      .join(" · ");

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

        {/* ── The model, printed from the module that applies it ───────────── */}
        <section className="mt-12">
          <h2 className="font-display text-[24px] font-normal tracking-tight">
            The nine factors
          </h2>
          <p className="mt-2.5 text-[15px] leading-relaxed text-paper/60">
            One weighted model, the same for all {spots.length} cafes. It is weighted toward the
            two things that end a work session early — nowhere to plug in and a connection that
            drops — and it treats a bathroom as worth noting and almost nothing else.
          </p>

          <ul className="mt-5 divide-y divide-white/10 overflow-hidden rounded-xl border border-white/12">
            {FACTOR_ORDER.map((key) => (
              <li key={key} className="px-4 py-3.5">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-[15px] font-medium">{FACTOR_LABEL[key]}</span>
                  <span className="wa-mono shrink-0 tabular-nums text-paper/55">
                    {Math.round(WEIGHTS[key] * 100)}%
                  </span>
                </div>
                <p className="mt-1 text-[13.5px] leading-snug text-paper-dim">
                  {FACTOR_ASKS[key]}
                </p>
                <p className="wa-mono mt-1.5 text-paper/35">
                  Documented for {documented[key]} of {researched.length}
                  {filterFor(key) ? ` · filter: ${filterFor(key)}` : ""}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[14px] leading-relaxed text-paper/55">
            The percentages are the weights the code actually applies — this list is generated from
            the same table the score is computed from, so it cannot fall out of date.
          </p>
        </section>

        {/* ── Unknowns ─────────────────────────────────────────────────────── */}
        <section className="mt-12">
          <h2 className="font-display text-[24px] font-normal tracking-tight">
            An unknown factor is left out, not scored zero
          </h2>
          <div className="mt-3 space-y-4 text-[15.5px] leading-relaxed text-paper/75">
            <p>
              Almost no Mumbai cafe publishes wifi speed or an outlet count. Power is the heaviest
              factor in the model and it is documented for only {documented.power} of{" "}
              {researched.length} cafes. So the average is taken over the factors a source
              <em> does</em> support and the weights are renormalised across them. A cafe is never
              punished for something nobody has written down.
            </p>
            <p>
              What the gaps move instead is{" "}
              <strong className="font-semibold text-paper">confidence</strong>, which every panel
              prints beside the score along with how much of the model was covered. Of the{" "}
              {scored.length} cafes that carry a number:{" "}
              {(["high", "medium", "low"] as Confidence[])
                .filter((c) => conf[c])
                .map((c) => `${conf[c]} ${CONFIDENCE_LABEL[c].toLowerCase()}`)
                .join(", ")}
              .
            </p>
            <p>
              Below about a third of the model&rsquo;s weight there is not enough to average, and we
              publish no number at all rather than a thin one.{" "}
              {withheld.length > 0 && (
                <>
                  {withheld.length} of {researched.length} cafes are in that state today —{" "}
                  {withheld.map((s) => s.name).join(" and ")} — and their panels say so instead of
                  showing a score.
                </>
              )}
            </p>
          </div>
        </section>

        {/* ── Provenance ───────────────────────────────────────────────────── */}
        <section className="mt-12">
          <h2 className="font-display text-[24px] font-normal tracking-tight">
            Where the factor scores come from
          </h2>
          <div className="mt-3 space-y-4 text-[15.5px] leading-relaxed text-paper/75">
            <p>
              {findings} findings across {sources.size} published sources sit behind these numbers.
              Each one is attached to the factor it speaks to, and each is marked either a{" "}
              <strong className="font-semibold text-paper">fact</strong> — a source states it — or
              an <strong className="font-semibold text-paper">inference</strong>, where we read it
              from what a source describes rather than what it claims outright.{" "}
              {inferences > 0 && <>{inferences} of the {findings} are inferences.</>} Every cafe
              panel lists the findings it was scored on and links out to the sources.
            </p>
            <p>
              Photography follows the same rule. An image only appears where the pairing between
              that image and that exact outlet could be established — a chain&rsquo;s other branch
              is not evidence of this one — and each panel credits and links its source. Where no
              such image exists the panel draws a plate and says{" "}
              <span className="wa-mono">no photo yet</span> rather than borrowing a stock interior.
            </p>
          </div>
        </section>

        {/* ── Positions ────────────────────────────────────────────────────── */}
        <section className="mt-12">
          <h2 className="font-display text-[24px] font-normal tracking-tight">
            What we will not fake
          </h2>
          <div className="mt-3 space-y-4 text-[15.5px] leading-relaxed text-paper/75">
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
            <p>
              Names, addresses, hours and public ratings are what the cafe or a credible source
              publishes, attributed on the panel. A public rating is shown next to the workability
              score, never blended into it: they measure different things, and a cafe people love
              is often a cafe you cannot work in.
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
