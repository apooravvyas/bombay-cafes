"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Spot } from "@/lib/spots";
import {
  CONFIDENCE_LABEL,
  FACTOR_ASKS,
  FACTOR_LABEL,
  FACTOR_ORDER,
  WEIGHTS,
  effectiveWeights,
  factorWhy,
  type FactorKey,
} from "@/lib/evidence";

/**
 * The evidence half of the detail panel.
 *
 * Four blocks, in the order a reader actually asks the questions:
 *   ANALYSIS    — the number, how sure we are, and one sentence of why
 *   BREAKDOWN   — the factors behind the number, with their real weights
 *   EVIDENCE    — what sources said, fact and inference kept apart
 *   SOURCES     — where it came from and what we did not check
 *
 * Everything is driven by lib/evidence.ts. Nothing here composes prose: the
 * synthesis sentence is written during research against the sources, and the
 * per-factor lines count sources rather than asserting quality.
 */

/* Motion: bars grow from zero and the score counts up, once, on open.
   Both respect prefers-reduced-motion by simply arriving at the answer. */
function useReveal(key: string) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(false);
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setOn(true)));
    return () => cancelAnimationFrame(r);
  }, [key]);
  return on;
}

function useCountUp(target: number | null, key: string) {
  const [v, setV] = useState(target ?? 0);
  const raf = useRef(0);
  useEffect(() => {
    if (target == null) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setV(target);
      return;
    }
    const from = 0;
    const start = performance.now();
    const dur = 620;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      // easeOutQuart — quick, then settles. No overshoot; nothing bounces.
      const e = 1 - Math.pow(1 - p, 4);
      setV(from + (target - from) * e);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, key]);
  return v;
}

export function WorkabilityAnalysis({ spot }: { spot: Spot }) {
  const r = spot.research;
  const w = spot.work;
  const shown = useCountUp(w?.score ?? null, spot.slug);
  if (!r || !w) return null;

  return (
    <section className="mt-7">
      {/* Label left, number right — the reference sets the score as the
          heaviest thing on the line rather than a stacked stat block. */}
      <div className="flex items-start justify-between gap-4">
        <p className="pt-1 text-[15px] text-paper/70">Workability analysis</p>
        {w.score != null ? (
          <p className="shrink-0 font-sans text-[clamp(34px,8vw,46px)] font-semibold leading-none tabular-nums text-paper">
            {shown.toFixed(1)}
            <span className="ml-1 font-sans text-[17px] font-normal text-paper/45">/ 5</span>
          </p>
        ) : (
          <p className="shrink-0 pt-0.5 font-display text-[22px] leading-none text-paper/60">
            Limited evidence
          </p>
        )}
      </div>

      {w.score != null && (
        <div className="mt-3.5 h-px w-full overflow-hidden bg-white/12">
          <div
            className="h-full bg-paper/80 transition-[width] duration-[900ms] ease-out"
            style={{ width: `${((shown || 0) / 5) * 100}%` }}
          />
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <ConfidenceTag work={w} />
        <span className="wa-mono text-paper/35">
          {w.scored.length}/{FACTOR_ORDER.length} factors · {Math.round(w.coverage * 100)}% of the model
        </span>
      </div>

      <p className="mt-4 text-[15px] leading-relaxed text-paper/80">{r.synthesis}</p>
    </section>
  );
}

function ConfidenceTag({ work }: { work: NonNullable<Spot["work"]> }) {
  const tone =
    work.confidence === "high"
      ? "border-white/25 text-paper"
      : work.confidence === "medium"
        ? "border-white/16 text-paper/75"
        : "border-accent/45 text-accent";
  return (
    <span className={`wa-mono rounded-full border px-2.5 py-1 ${tone}`}>
      {CONFIDENCE_LABEL[work.confidence]}
    </span>
  );
}

export function WorkabilityBreakdown({ spot }: { spot: Spot }) {
  const r = spot.research;
  const w = spot.work;
  const on = useReveal(spot.slug);
  if (!r || !w) return null;

  const eff = effectiveWeights(w);

  return (
    <section className="mt-7 rounded-xl border border-white/12 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="wa-mono text-paper/55">Workability breakdown</p>
        <p className="wa-mono text-paper/30">score · weight</p>
      </div>

      <ul className="mt-4 flex flex-col gap-2.5">
        {FACTOR_ORDER.map((k, i) => {
          const f = r.factors[k];
          const pct = f.score != null ? (f.score / 5) * 100 : 0;
          const weight = eff[k];
          return (
            <li key={k} className="grid grid-cols-[minmax(0,4.5rem)_minmax(0,1fr)_auto] items-center gap-x-3">
              <span
                className="truncate text-[13px] font-medium text-paper/85"
                title={FACTOR_ASKS[k]}
              >
                {FACTOR_LABEL[k]}
              </span>
              {/* One long, thin rail per factor — the reference's proportions.
                  An unevidenced factor draws a dashed track, not a full bar,
                  so a blank is never mistaken for a maximum. */}
              <span
                className={`block h-[3px] w-full overflow-hidden rounded-full ${
                  f.score == null ? "wa-rail-unknown" : "bg-white/[0.10]"
                }`}
              >
                {f.score != null && (
                  <span
                    className="block h-full rounded-full bg-paper/85"
                    style={{
                      width: on ? `${pct}%` : "0%",
                      transition: `width 720ms cubic-bezier(0.22,1,0.36,1) ${70 + i * 45}ms`,
                    }}
                  />
                )}
              </span>
              <span className="wa-mono shrink-0 tabular-nums text-paper/60">
                {f.score != null ? f.score.toFixed(1) : "—"}
                <span className="ml-1.5 text-paper/25">
                  {weight ? `${Math.round(weight * 100)}%` : `${Math.round(WEIGHTS[k] * 100)}%`}
                </span>
              </span>
            </li>
          );
        })}
      </ul>

      <p className="wa-mono mt-4 text-paper/30">
        Evidence-weighted traits, not measured on site.
      </p>

      {w.unknown.length > 0 && (
        <p className="mt-4 border-t border-white/10 pt-3 text-[13px] leading-relaxed text-paper/50">
          {w.unknown.map((k) => FACTOR_LABEL[k]).join(", ")}{" "}
          {w.unknown.length === 1 ? "has" : "have"} no published evidence. The score is the
          weighted mean of what is known, renormalised — an unrated factor lowers our confidence,
          never the score.
        </p>
      )}
    </section>
  );
}

export function EvidenceReviewed({ spot }: { spot: Spot }) {
  const r = spot.research;
  const [open, setOpen] = useState(false);
  if (!r) return null;

  const items = FACTOR_ORDER.flatMap((k) =>
    r.factors[k].evidence.map((e) => ({ ...e, factor: k as FactorKey })),
  );
  if (items.length === 0) return null;

  /* Curated, not dumped.
     Facts before inferences, heaviest factors first, and one line per factor
     unless the reader asks for everything — a reader wants four sentences that
     decide the question, not twenty overlapping review snippets. */
  const facts = items.filter((e) => e.kind === "fact");
  const inferences = items.filter((e) => e.kind === "inference");
  const oncePerFactor: typeof items = [];
  const used = new Set<FactorKey>();
  for (const e of facts) {
    if (used.has(e.factor)) continue;
    used.add(e.factor);
    oncePerFactor.push(e);
  }
  const curated = oncePerFactor.slice(0, 5);
  const shown = open ? [...facts, ...inferences] : curated;

  return (
    <section className="mt-7">
      <div className="flex items-baseline justify-between gap-3">
        <p className="wa-mono text-paper/55">Evidence reviewed</p>
        <p className="wa-mono text-paper/30">
          {facts.length} stated{inferences.length ? ` · ${inferences.length} inferred` : ""}
        </p>
      </div>

      <ul className="mt-3.5 flex flex-col gap-3">
        {shown.map((e, i) => (
          <li key={`${e.factor}-${i}`} className="flex gap-2.5">
            <span
              aria-hidden
              className={`mt-[7px] h-[3px] w-[3px] shrink-0 rounded-full ${
                e.kind === "inference" ? "bg-accent" : "bg-paper/45"
              }`}
            />
            <div className="min-w-0">
              <p className="text-[14px] leading-snug text-paper/80">
                {e.claim}
                {e.kind === "inference" && (
                  <span className="wa-mono ml-1.5 align-[1px] text-accent">inferred</span>
                )}
              </p>
              {open && e.quote && (
                <p className="mt-1 border-l border-white/15 pl-2.5 font-display text-[13.5px] italic leading-snug text-paper/55">
                  &ldquo;{e.quote}&rdquo;
                </p>
              )}
              <a
                href={e.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="wa-mono mt-1 inline-block text-paper/35 transition-colors hover:text-paper"
              >
                {FACTOR_LABEL[e.factor]} · {e.source.replace(/^www\./, "")}
              </a>
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="wa-mono mt-3.5 flex items-center gap-1.5 text-accent"
      >
        {open ? (
          <>Show the summary</>
        ) : (
          <>
            All {items.length} findings, with quotes
            <ChevronDown className="h-3 w-3" strokeWidth={2.5} />
          </>
        )}
      </button>
    </section>
  );
}

/**
 * Public rating, kept deliberately separate from workability.
 *
 * The reference sets these as a quiet metadata row rather than a stat card,
 * which is right: the interesting thing is not either number but the distance
 * between them. Cafe Mondegar is rated 4.4 by 5,884 people and scores 1.6 for
 * working, and a reader should be able to see both at a glance.
 */
export function PublicRating({ spot }: { spot: Spot }) {
  const r = spot.research;
  const w = spot.work;
  if (!r) return null;
  const pr = r.publicRating;
  const gap = pr && w?.score != null ? pr.value - w.score : null;

  return (
    <section className="mt-7 border-t border-white/10 pt-5">
      <div className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3">
        <div>
          <p className="wa-mono text-paper/40">Workability</p>
          <p className="mt-1.5 font-sans text-[21px] font-semibold leading-none tabular-nums text-paper">
            {w?.score != null ? w.score.toFixed(1) : "—"}
            <span className="ml-1 text-[12px] font-normal text-paper/35">/ 5</span>
          </p>
        </div>
        <div>
          <p className="wa-mono text-paper/40">Public rating</p>
          <p className="mt-1.5 font-sans text-[21px] font-semibold leading-none tabular-nums text-paper/70">
            {pr ? pr.value.toFixed(1) : "—"}
            {pr?.count ? (
              <span className="ml-1.5 text-[12px] font-normal text-paper/35">
                ({pr.count.toLocaleString("en-IN")})
              </span>
            ) : null}
          </p>
          {pr && <p className="wa-mono mt-1 text-paper/25">{pr.source.replace(/^www\./, "")}</p>}
        </div>
        <div>
          <p className="wa-mono text-paper/40">Avg food cost</p>
          <p className="mt-1.5 font-sans text-[21px] font-semibold leading-none text-paper/70">
            {spot.attrs.avgFoodCost ?? "—"}
          </p>
        </div>
      </div>

      {gap != null && Math.abs(gap) >= 0.6 && (
        <p className="mt-4 text-[13.5px] leading-relaxed text-paper/60">
          {gap > 0
            ? "Rated higher as a cafe than it scores as a place to work — people love the room, not the desk."
            : "Scores better for working than its public rating suggests — unglamorous, but it holds a laptop."}
        </p>
      )}
    </section>
  );
}

export function SourceTransparency({ spot }: { spot: Spot }) {
  const r = spot.research;
  const w = spot.work;
  const [open, setOpen] = useState(false);
  if (!r || !w) return null;

  const hosts = [...new Set(r.sourcesFetched.map((u) => host(u)))];

  return (
    <section className="mt-7 border-t border-white/10 pt-5">
      <p className="wa-mono text-paper/35">
        Based on {w.sourceCount} source{w.sourceCount === 1 ? "" : "s"} ·{" "}
        {w.evidenceCount} finding{w.evidenceCount === 1 ? "" : "s"}
      </p>
      <p className="mt-2 text-[13px] leading-relaxed text-paper/50">
        Scores are read off what publishers and reviewers have written, not from a visit. Names,
        addresses and hours come from the venue or a credible listing. Nothing here is generated:
        every factor above cites the page it came from, and a factor nobody has written about stays
        blank.
      </p>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="wa-mono mt-3 text-accent"
      >
        {open ? "Hide sources" : "See sources reviewed"}
      </button>

      {open && (
        <div className="mt-3">
          <ul className="flex flex-col gap-1.5">
            {r.sourcesFetched.map((u) => (
              <li key={u}>
                <a
                  href={u}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="wa-mono text-paper/55 underline decoration-white/15 underline-offset-2 transition-colors hover:text-paper"
                >
                  {host(u)}
                </a>
              </li>
            ))}
          </ul>
          {r.notes && (
            <p className="mt-3 text-[12.5px] leading-relaxed text-paper/40">
              <span className="wa-mono text-paper/30">Researcher&rsquo;s notes · </span>
              {r.notes}
            </p>
          )}
        </div>
      )}

      {hosts.length === 0 && (
        <p className="wa-mono mt-2 text-paper/30">No sources recorded</p>
      )}
    </section>
  );
}

function host(u: string) {
  try {
    return new URL(u).host.replace(/^www\./, "");
  } catch {
    return u;
  }
}
