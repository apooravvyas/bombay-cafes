"use client";

import { ArrowRight, ArrowUpRight, X } from "lucide-react";
import type { Spot } from "@/lib/spots";
import {
  AREA_GROUP_LABEL,
  isMapped,
  pad,
  scoreLogic,
} from "@/lib/spots";
import { SpotFeedback } from "@/components/wa/feedback";
import { SpotHero } from "@/components/wa/spot-image";
import { mediaFor } from "@/lib/media";
import {
  EvidenceReviewed,
  PublicRating,
  SourceTransparency,
  WorkabilityAnalysis,
  WorkabilityBreakdown,
} from "@/components/wa/workability";

/**
 * The dark side panel. Two modes, same shell — list, then detail — because
 * that is how the reference works: you never lose the map, and "← ALL SPOTS"
 * walks you back rather than reloading.
 *
 * Desktop: full-height, pinned right, ~460px.
 * Mobile:  bottom sheet at 78vh. Same content, same order.
 */

export function SpotPanel({
  mode,
  spots,
  spot,
  areaLabel,
  onClose,
  onBack,
  onPick,
}: {
  mode: "list" | "detail";
  spots: Spot[];
  spot: Spot | null;
  areaLabel: string;
  onClose: () => void;
  onBack: () => void;
  onPick: (spot: Spot) => void;
}) {
  return (
    <aside
      className="wa-panel wa-panel-grid wa-panel-enter pointer-events-auto absolute inset-x-0 bottom-0 z-30 flex max-h-[78dvh] flex-col overflow-hidden rounded-t-2xl md:inset-y-3 md:left-auto md:right-3 md:max-h-none md:w-[min(460px,42vw)] md:rounded-2xl"
      aria-label={mode === "detail" ? spot?.name : "Cafe list"}
    >
      {/* Header bar — sticky so the close control never scrolls away. */}
      <div className="relative z-10 flex shrink-0 items-center justify-between gap-3 px-6 pt-6 pb-2">
        {mode === "detail" ? (
          <button
            type="button"
            onClick={onBack}
            className="wa-mono text-paper/60 transition-colors hover:text-paper"
          >
            ← All spots
          </button>
        ) : (
          <p className="wa-mono text-paper/60">Select a spot</p>
        )}
        <button type="button" onClick={onClose} className="wa-round wa-round--dark" aria-label="Close">
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {mode === "list" ? (
          <SpotList spots={spots} areaLabel={areaLabel} onPick={onPick} />
        ) : spot ? (
          <SpotDetail spot={spot} />
        ) : null}
      </div>
    </aside>
  );
}

/* ── List ─────────────────────────────────────────────────────────────────── */
function SpotList({
  spots,
  areaLabel,
  onPick,
}: {
  spots: Spot[];
  areaLabel: string;
  onPick: (s: Spot) => void;
}) {
  return (
    <div className="px-6 pb-8">
      <h2 className="font-sans text-[32px] font-medium leading-[1.04] tracking-tight text-paper">
        {pad(spots.length)} {spots.length === 1 ? "spot" : "spots"} in {areaLabel}
      </h2>

      {spots.length === 0 ? (
        <p className="mt-6 max-w-[36ch] text-[14.5px] leading-relaxed text-paper/55">
          Nothing matches that combination. Loosen a filter, or drop the score threshold — asking
          for every feature at once narrows this fast.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col">
          {spots.map((s) => (
            <li key={s.slug}>
              <button
                type="button"
                onClick={() => onPick(s)}
                className="group flex w-full items-start justify-between gap-4 border-b border-white/[0.07] py-4 text-left transition-colors hover:bg-white/[0.04]"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[17px] font-medium text-paper">{s.name}</span>
                  <span className="mt-0.5 block text-[13px] text-paper/50">
                    {s.neighborhood}
                    {s.openingHours ? ` · ${shortHours(s.openingHours)}` : ""}
                  </span>
                </span>
                <span className="shrink-0 pt-0.5 text-right">
                  <span className="block font-sans text-[17px] font-semibold tabular-nums text-paper">
                    {s.workability != null ? s.workability.toFixed(1) : "—"}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** "Daily 9am–midnight" → "Open until midnight" where we can say it cheaply. */
function shortHours(hours: string): string {
  const m = hours.match(/–\s*([^·]+)$/);
  return m ? `Open until ${m[1].trim()}` : hours;
}

/* ── Detail ───────────────────────────────────────────────────────────────── */
function SpotDetail({ spot }: { spot: Spot }) {
  const media = mediaFor(spot.slug);
  const logic = scoreLogic(spot);
  const researched = Boolean(spot.research && spot.work);
  const pct = spot.workability != null ? (spot.workability / 5) * 100 : 0;

  return (
    <div className="pb-10">
      {/* Photography leads, as the reference does. Full-bleed, edge to edge,
          pulled up under the sticky header. */}
      <SpotHero
        slug={spot.slug}
        name={spot.name}
        area={spot.area}
        neighborhood={spot.neighborhood}
        images={media.images}
      />

      <div className="px-6 pt-5">
        <p className="wa-mono text-paper/45">{spot.neighborhood}</p>
        <h2 className="mt-2 font-sans text-[34px] font-medium leading-[1.04] tracking-[-0.015em] text-white text-balance">
          {spot.name}
        </h2>
        <p className="mt-2.5 font-mono text-[12.5px] leading-relaxed tracking-[0.03em] text-paper-dim">
          {spot.address || `${spot.neighborhood}, Mumbai`}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {spot.openingHours && (
            <span className="wa-mono rounded-full bg-paper px-3 py-1.5 text-ink">
              {spot.openingHours}
            </span>
          )}
        </div>
        <p className="wa-mono mt-3 text-paper/40">
          {spot.dataLayer === "curated" ? "Curated · Bombay Cafes" : "Community scored"}
        </p>

        {/* The headline.

            A researched spot gets the evidence model — score, confidence,
            coverage and a synthesis sentence written against the sources. A
            spot still awaiting research shows a provisional editorial read,
            labelled as one, rather than an empty analysis. Every live cafe is
            researched, so this branch is a safety net for a spot seeded ahead
            of its evidence — it is not a second published model. */}
        {researched && <PublicRating spot={spot} />}

        {researched ? (
          <WorkabilityAnalysis spot={spot} />
        ) : (
          <>
            <div className="mt-6 flex items-end gap-3">
              <span className="font-mono text-[40px] font-bold leading-none tracking-[0.01em] tabular-nums text-white">
                {spot.workability != null ? spot.workability.toFixed(1) : "—"}
              </span>
              <span className="pb-1.5 text-[12px] text-paper-dim">/ 5 for working</span>
            </div>
            <div className="mt-3 h-[3px] w-full overflow-hidden rounded-full bg-white/12">
              <div
                className="h-full rounded-full bg-paper transition-[width] duration-[900ms] ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="wa-mono mt-2 text-paper/35">
              Provisional editorial read · not scored on the nine factors yet
            </p>
          </>
        )}

        {/* Work score logic — the three chips the reference leads with. */}
        {logic.length > 0 && (
          <div className="mt-6 rounded-[10px] border border-hairline bg-surface/70 p-4">
            <p className="wa-mono text-label/60">Work score logic</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {logic.map((l) => (
                <span
                  key={l.label}
                  className="rounded-md border border-white/12 bg-white/[0.05] px-2.5 py-1.5 text-[13px] text-paper/80"
                >
                  <strong className="font-semibold text-paper">{l.label}</strong> {l.value}
                </span>
              ))}
            </div>
          </div>
        )}

        <p className="mt-6 font-display text-[19px] italic leading-relaxed text-paper/90">
          {spot.editorialNote}
        </p>

        {researched && (
          <>
            <WorkabilityBreakdown spot={spot} />
            <EvidenceReviewed spot={spot} />
          </>
        )}

        {/* Attribute grid: mono label, plain-language value. An em dash where
            nothing is known — never a guessed middle value.

            These are the older curated room notes, and they are labelled as
            such because they are NOT what the score is computed from. The two
            can legitimately disagree about what is known — a note can say
            "Charging Good" where the nine-factor evidence has nothing citable
            on power, and the score then leaves power out entirely. Printing
            them under a heading that says so is the honest fix; silently
            mixing them would let a reader take one for the other. */}
        <p className="wa-mono mt-8 text-label/55">Room notes · not part of the score</p>
        <dl className="mt-3.5 grid grid-cols-2 gap-x-6 gap-y-5">
          <Attr label="Noise" value={spot.attrs.noise} />
          <Attr label="Peak crowd" value={spot.attrs.peakCrowd} />
          <Attr label="Seating" value={spot.attrs.seating} />
          <Attr label="Seating styles" value={spot.attrs.seatingStyles} />
          <Attr label="Charging" value={spot.attrs.charging} />
          <Attr label="Charging slots" value={spot.attrs.chargingNote} />
          <Attr label="WiFi" value={spot.attrs.wifi} />
          <Attr label="Avg food cost" value={spot.attrs.avgFoodCost} />
        </dl>

        {spot.toggles.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {spot.toggles.map((t) => (
              <span
                key={t}
                className="rounded-md border border-white/12 px-2.5 py-1.5 font-mono text-[11.5px] text-paper/70"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Feedback — the mechanism that lets the scores improve. */}
        <div className="mt-8">
          <SpotFeedback slug={spot.slug} name={spot.name} />
        </div>

        {/* Source transparency, for researched spots: how many sources, how
            many findings, and every URL on request. */}
        {researched && <SourceTransparency spot={spot} />}

        {/* Provenance. The reference footnotes which layer is which; ours says
            what is sourced and what is an editorial read. */}
        <div className="mt-8 border-t border-white/10 pt-5">
          {spot.dataNote && (
            <p className="mb-3 font-mono text-[11.5px] leading-relaxed text-paper/60">
              Heads up — {spot.dataNote}
            </p>
          )}
          <p className="font-mono text-[11.5px] leading-relaxed text-paper/40">
            Names, addresses and hours come from what the cafe or a credible source publishes.
            {researched
              ? " Every factor above is scored only where a fetched source supports it."
              : " This cafe has not been through the evidence research yet, so the number above is a provisional editorial read rather than a score on the nine factors."}
            {!isMapped(spot)
              ? " The map position has not been verified yet, so this spot has no pin."
              : spot.locationAccuracy === "approximate"
                ? ` The pin is placed at street level from the address${
                    spot.locationAnchor ? ` (${spot.locationAnchor})` : ""
                  }, not surveyed — expect it within a couple of hundred metres.`
                : ""}
          </p>
          {spot.sources.length > 0 && (
            <p className="mt-2.5 font-mono text-[11px] leading-relaxed text-paper/30">
              {spot.sources.join(" · ")}
              {spot.lastVerifiedAt ? ` · checked ${spot.lastVerifiedAt}` : ""}
            </p>
          )}
        </div>

        {/* Actions. Open in Maps is the primary — discovery is our job, not
            navigation. */}
        <div className="mt-8 flex flex-col gap-2.5">
          {spot.googleMapsUrl && (
            <a
              href={spot.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl border border-white/16 bg-white/[0.06] px-5 py-4 text-[15px] font-medium text-paper transition-colors hover:bg-white/[0.12]"
            >
              Open in Google Maps
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </a>
          )}
          {/* Outbound links, compact. Each one renders only when the URL
              actually exists — a Menu button that leads nowhere is worse than
              no Menu button, and none of these are constructed. */}
          {(spot.website || spot.instagram || media.menuUrl) && (
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2.5">
              {media.menuUrl && (
                <a
                  href={media.menuUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="flex items-center justify-between rounded-xl border border-white/16 px-4 py-3.5 text-[14px] text-paper transition-colors hover:bg-white/[0.08]"
                >
                  Menu
                  <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} />
                </a>
              )}
              {spot.website && (
                <a
                  href={spot.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-xl border border-white/16 px-4 py-3.5 text-[14px] text-paper transition-colors hover:bg-white/[0.08]"
                >
                  Website
                  <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} />
                </a>
              )}
              {spot.instagram && (
                <a
                  href={spot.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-xl border border-white/16 px-4 py-3.5 text-[14px] text-paper transition-colors hover:bg-white/[0.08]"
                >
                  Instagram
                  <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} />
                </a>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

function Attr({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="wa-mono text-label/55">{label}</dt>
      <dd className={`mt-1 text-[15px] leading-snug ${value ? "text-paper" : "text-paper/30"}`}>
        {value ?? "—"}
      </dd>
    </div>
  );
}

export { AREA_GROUP_LABEL };
