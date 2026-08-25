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
      <p className="wa-mono text-paper/45">Workability analysis</p>

      <div className="mt-3 flex items-end gap-3">
        {w.score != null ? (
          <span className="font-sans text-[54px] font-semibold leading-none tabular-nums text-paper">
            {shown.toFixed(1)}
          </span>
        ) : (
          <span className="font-display text-[30px] leading-none text-paper/70">
            Limited evidence
          </span>
        )}
        {w.score != null && <span className="pb-2 text-[15px] text-paper/55">/ 5 for working</span>}
      </div>

      {w.score != null && (
        <div className="mt-3 h-[3px] w-full overflow-hidden rounded-full bg-white/12">
          <div
            className="h-full rounded-full bg-paper transition-[width] duration-[900ms] ease-out"
            style={{ width: `${((shown || 0) / 5) * 100}%` }}
          />
        </div>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        <ConfidenceTag work={w} />
        <span className="wa-mono text-paper/35">
          {w.scored.length} of {FACTOR_ORDER.length} factors evidenced · {Math.round(w.coverage * 100)}% of the model
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
        <p className="wa-mono text-paper/45">Workability breakdown</p>
        <p className="wa-mono text-paper/30">score · weight</p>
      </div>

      <ul className="mt-4 flex flex-col gap-3">
        {FACTOR_ORDER.map((k, i) => {
          const f = r.factors[k];
          const pct = f.score != null ? (f.score / 5) * 100 : 0;
          const weight = eff[k];
          return (
            <li key={k}>
              <div className="flex items-baseline justify-between gap-3">
                <span
                  className="text-[13.5px] text-paper/85"
                  title={FACTOR_ASKS[k]}
                >
                  {FACTOR_LABEL[k]}
                </span>
                <span className="wa-mono shrink-0 tabular-nums text-paper/55">
                  {f.score != null ? f.score.toFixed(1) : "—"}
                  <span className="text-paper/25">
                    {"  "}
                    {weight ? `${Math.round(weight * 100)}%` : `(${Math.round(WEIGHTS[k] * 100)}%)`}
                  </span>
                </span>
              </div>
              <div className="mt-1.5 h-[2px] w-full overflow-hidden rounded-full bg-white/[0.09]">
                <div
                  className={`h-full rounded-full ${f.score == null ? "bg-white/15" : "bg-paper/85"}`}
                  style={{
                    width: on ? `${f.score == null ? 100 : pct}%` : "0%",
                    opacity: f.score == null ? 0.35 : 1,
                    transition: `width 700ms cubic-bezier(0.22,1,0.36,1) ${60 + i * 45}ms`,
                  }}
                />
              </div>
              <p className="wa-mono mt-1 text-paper/30">{factorWhy(f)}</p>
            </li>
          );
        })}
      </ul>

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

  const facts = items.filter((e) => e.kind === "fact");
  const shown = open ? items : facts.slice(0, 5);

  return (
    <section className="mt-7">
      <div className="flex items-baseline justify-between gap-3">
        <p className="wa-mono text-paper/45">Evidence reviewed</p>
        <p className="wa-mono text-paper/30">
          {facts.length} stated · {items.length - facts.length} inferred
        </p>
      </div>

      <ul className="mt-3 flex flex-col divide-y divide-white/[0.07]">
        {shown.map((e, i) => (
          <li key={`${e.factor}-${i}`} className="py-3">
            <div className="flex items-baseline gap-2">
              <span className="wa-mono shrink-0 text-paper/35">{FACTOR_LABEL[e.factor]}</span>
              {e.kind === "inference" && (
                <span className="wa-mono rounded border border-accent/40 px-1.5 text-accent">
                  inference
                </span>
              )}
            </div>
            <p className="mt-1.5 text-[14px] leading-snug text-paper/80">{e.claim}</p>
            {e.quote && (
              <p className="mt-1.5 border-l border-white/15 pl-2.5 font-display text-[14px] italic leading-snug text-paper/60">
                &ldquo;{e.quote}&rdquo;
              </p>
            )}
            <a
              href={e.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="wa-mono mt-1.5 inline-block text-paper/40 underline decoration-white/20 underline-offset-2 transition-colors hover:text-paper"
            >
              {e.source}
            </a>
          </li>
        ))}
      </ul>

      {items.length > shown.length && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="wa-mono mt-3 flex items-center gap-1.5 text-accent"
        >
          See all {items.length} findings <ChevronDown className="h-3 w-3" strokeWidth={2.5} />
        </button>
      )}
      {open && items.length > 5 && (
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="wa-mono mt-3 text-paper/45 transition-colors hover:text-paper"
        >
          Show less
        </button>
      )}
    </section>
  );
}

export function PublicRating({ spot }: { spot: Spot }) {
  const r = spot.research;
  const w = spot.work;
  if (!r?.publicRating) return null;
  const pr = r.publicRating;
  const gap = w?.score != null ? pr.value - w.score : null;

  return (
    <section className="mt-7 rounded-xl border border-white/12 p-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="wa-mono text-paper/40">Workability</p>
          <p className="mt-1 font-sans text-[26px] font-semibold leading-none tabular-nums text-paper">
            {w?.score != null ? w.score.toFixed(1) : "—"}
          </p>
          <p className="wa-mono mt-1 text-paper/30">for working</p>
        </div>
        <div>
          <p className="wa-mono text-paper/40">Public rating</p>
          <p className="mt-1 font-sans text-[26px] font-semibold leading-none tabular-nums text-paper/75">
            {pr.value.toFixed(1)}
            {pr.count ? (
              <span className="ml-1.5 font-sans text-[13px] font-normal text-paper/35">
                ({pr.count.toLocaleString("en-IN")})
              </span>
            ) : null}
          </p>
          <p className="wa-mono mt-1 text-paper/30">{pr.source.replace(/^www\./, "")}</p>
        </div>
      </div>

      {/* The gap is the point of the product. A room can be widely loved and
          still be a bad place to open a laptop. */}
      {gap != null && Math.abs(gap) >= 0.6 && (
        <p className="mt-3.5 border-t border-white/10 pt-3 text-[13.5px] leading-relaxed text-paper/65">
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
