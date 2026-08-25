"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AreaGroup } from "@/lib/spots";
import {
  imageCredit,
  imageSrc,
  imageSrcSet,
  initials,
  slugSeed,
  type SpotImage,
} from "@/lib/media";

/**
 * The hero image area at the top of the detail panel.
 *
 * Real photography when we have an image verified as THIS outlet; a drawn
 * plate when we do not. The plate is deliberately graphic — flat bands, the
 * cafe's initials, and a NO PHOTO YET chip — because the one thing this slot
 * must never do is put a stock interior under a cafe's name and let a reader
 * assume it is the room they are about to walk into.
 *
 * Several images become a quiet carousel: swipe or arrow through them, dots
 * and a count to say how many there are, a crossfade between them, no
 * autoplay. Three things keep it cheap:
 *
 *   - only the current frame and its two neighbours are ever mounted, so a
 *     five-image cafe does not pull five files the moment the panel opens;
 *   - the first frame is eager and high priority, the rest lazy;
 *   - every frame is requested at the width it will actually be drawn at,
 *     via srcset, rather than at whatever size the source happens to store.
 *
 * A frame that fails, or that arrives too small to fill the hero without
 * going soft, is dropped from the set rather than shown badly.
 */

/** Below this, an image cannot fill the hero at 1x without visible softness. */
const MIN_USABLE_WIDTH = 420;
const SIZES = "(max-width: 900px) 100vw, 460px";

export function SpotHero({
  slug,
  name,
  area,
  neighborhood,
  images,
}: {
  slug: string;
  name: string;
  area: AreaGroup;
  neighborhood: string;
  images: SpotImage[];
}) {
  const [rejected, setRejected] = useState<Record<number, boolean>>({});
  const [ready, setReady] = useState<Record<number, boolean>>({});
  const [i, setI] = useState(0);
  const lastShown = useRef<number | null>(null);
  const touchX = useRef<number | null>(null);

  // A new cafe resets everything: index, load state, and the reject list.
  useEffect(() => {
    setRejected({});
    setReady({});
    setI(0);
    lastShown.current = null;
  }, [slug]);

  const usable = useMemo(
    () => images.map((img, n) => ({ img, n })).filter(({ n }) => !rejected[n]),
    [images, rejected],
  );

  const pos = Math.min(i, Math.max(usable.length - 1, 0));
  const current = usable[pos];
  const has = usable.length > 0;

  /**
   * Settle one frame.
   *
   * Called from BOTH the ref callback and onLoad, and that is the whole point.
   * This panel is server-rendered, so the browser frequently finishes decoding
   * the hero before React hydrates and attaches its listener — an onLoad-only
   * component leaves a fully-loaded photograph sitting at opacity 0 forever.
   * `complete` catches that case; onLoad catches the ordinary one.
   */
  const settle = useCallback((el: HTMLImageElement | null, n: number) => {
    if (!el || !el.complete) return;
    // complete with no intrinsic size means it failed, whenever that happened.
    if (el.naturalWidth === 0) {
      setRejected((r) => (r[n] ? r : { ...r, [n]: true }));
      return;
    }
    // Too small to fill the hero without going soft. Better the drawn plate.
    if (el.naturalWidth < MIN_USABLE_WIDTH) {
      setRejected((r) => (r[n] ? r : { ...r, [n]: true }));
      return;
    }
    setReady((r) => (r[n] ? r : { ...r, [n]: true }));
  }, []);

  /**
   * Which frame is at full opacity. The previous frame holds the slot until
   * the next one has actually decoded, so moving through a carousel never
   * flashes the plate underneath.
   */
  const displayed = current && ready[current.n] ? current.n : lastShown.current;
  useEffect(() => {
    if (displayed != null) lastShown.current = displayed;
  }, [displayed]);

  const go = useCallback(
    (next: number) => {
      setI((prev) => {
        const len = usable.length;
        if (len < 2) return prev;
        return (next + len) % len;
      });
    },
    [usable.length],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (usable.length < 2) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(pos + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(pos - 1);
    }
  };

  // Mount only the current frame and its immediate neighbours.
  const mounted = new Set<number>();
  if (has) {
    for (const d of [0, 1, -1]) {
      const n = (pos + d + usable.length) % usable.length;
      mounted.add(usable[n].n);
    }
  }

  return (
    <div
      className="group relative aspect-[408/210] w-full shrink-0 overflow-hidden bg-surface"
      role={usable.length > 1 ? "group" : undefined}
      aria-roledescription={usable.length > 1 ? "carousel" : undefined}
      aria-label={usable.length > 1 ? `Photographs of ${name}` : undefined}
      tabIndex={usable.length > 1 ? 0 : undefined}
      onKeyDown={onKeyDown}
      onTouchStart={(e) => {
        touchX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        touchX.current = null;
        if (start == null) return;
        const dx = (e.changedTouches[0]?.clientX ?? start) - start;
        if (Math.abs(dx) > 44) go(pos + (dx < 0 ? 1 : -1));
      }}
    >
      {/* The plate always sits underneath, so a slow or failed frame never
          leaves an empty box and never flashes white. */}
      <FallbackPlate slug={slug} name={name} area={area} dim={has} />

      {has &&
        images.map((img, n) => {
          if (!mounted.has(n)) return null;
          const first = n === 0;
          return (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={`${slug}-${n}`}
              src={imageSrc(img, 960)}
              srcSet={imageSrcSet(img)}
              sizes={SIZES}
              alt={img.alt || `${name}, ${neighborhood}`}
              loading={first ? "eager" : "lazy"}
              fetchPriority={first ? "high" : "low"}
              decoding="async"
              draggable={false}
              ref={(el) => settle(el, n)}
              onLoad={(e) => settle(e.currentTarget, n)}
              onError={() => setRejected((r) => (r[n] ? r : { ...r, [n]: true }))}
              /* The reference's own treatment, measured off it: a tenth of a
                 stop of grey and a hair of contrast, which settles a set of
                 photographs shot by different people on different cameras
                 into one surface. The hover scale is 1.03 over 900ms — enough
                 to feel alive, not enough to read as an animation. */
              className={`wa-hero-img absolute inset-0 h-full w-full object-cover ${
                displayed === n ? "opacity-100" : "opacity-0"
              }`}
            />
          );
        })}

      {!has && (
        <span className="wa-mono absolute right-3 top-3 z-10 rounded-full border border-white/15 bg-ink/40 px-2 py-0.5 text-paper/45 backdrop-blur-sm">
          No photo yet
        </span>
      )}

      {has && usable.length > 1 && (
        <span className="wa-mono absolute right-3 top-3 z-10 rounded-full border border-white/15 bg-ink/40 px-2 py-0.5 text-paper/60 backdrop-blur-sm">
          {pos + 1} / {usable.length}
        </span>
      )}

      {has && current?.img.caption && (
        <p className="absolute inset-x-3 bottom-7 z-10 text-[12px] leading-snug text-paper/65">
          {current.img.caption}
        </p>
      )}

      {has && current && <Credit img={current.img} />}

      {has && usable.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous photograph"
            onClick={() => go(pos - 1)}
            className="wa-hero-arrow left-2"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2.25} />
          </button>
          <button
            type="button"
            aria-label="Next photograph"
            onClick={() => go(pos + 1)}
            className="wa-hero-arrow right-2"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={2.25} />
          </button>
        </>
      )}

      {has && usable.length > 1 && (
        <div className="absolute bottom-3 left-3 z-10 flex gap-1.5">
          {usable.map(({ n }, k) => (
            <button
              key={n}
              type="button"
              aria-label={`Photograph ${k + 1} of ${usable.length}`}
              aria-current={k === pos}
              onClick={() => go(k)}
              className={`h-[3px] w-6 rounded-full transition-colors ${
                k === pos ? "bg-paper" : "bg-paper/30 hover:bg-paper/55"
              }`}
            />
          ))}
        </div>
      )}

      {/* No gradient scrim and no text over the photograph: the reference
          keeps the image a clean rectangle and starts the copy below it. A
          hairline is all that separates the two. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-hairline" />
    </div>
  );
}

function Credit({ img }: { img: SpotImage }) {
  const credit = imageCredit(img);
  if (!credit) return null;
  if (!credit.href) {
    return (
      <span className="wa-mono absolute bottom-2.5 right-3 z-10 rounded-full border border-white/10 bg-ink/45 px-2 py-0.5 text-paper/55 backdrop-blur-sm">
        {credit.label}
      </span>
    );
  }
  return (
    <a
      href={credit.href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      title={img.verified}
      className="wa-mono absolute bottom-2.5 right-3 z-10 rounded-full border border-white/10 bg-ink/45 px-2 py-0.5 text-paper/60 backdrop-blur-sm transition-colors hover:text-paper"
    >
      {credit.label}
    </a>
  );
}

/**
 * The drawn plate. Two vocabularies matching the landing artwork — pitched
 * village roofs for Bandra, an arcade for South Bombay — over a band whose
 * warmth is seeded from the slug so no two cafes look identical.
 */
function FallbackPlate({
  slug,
  name,
  area,
  dim = false,
}: {
  slug: string;
  name: string;
  area: AreaGroup;
  dim?: boolean;
}) {
  const seed = slugSeed(slug);
  const hue = area === "bandra" ? 24 + seed * 18 : 208 + seed * 22;
  const sat = area === "bandra" ? 26 : 20;

  return (
    <div aria-hidden className={`absolute inset-0 ${dim ? "opacity-60" : ""}`}>
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(168deg, hsl(${hue} ${sat}% 26%) 0%, hsl(${hue} ${sat - 5}% 17%) 55%, #0B0B0A 100%)`,
        }}
      />
      <svg
        viewBox="0 0 400 160"
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-x-0 bottom-0 h-[62%] w-full"
      >
        {area === "bandra" ? (
          <path
            fill="rgba(0,0,0,0.42)"
            d="M0 160v-44l26-17 26 17v-11l28-18 28 18v-8l26-16 26 16v-14l28-18 28 18v12l26-15 26 15v-9l30-17 30 17v44z"
          />
        ) : (
          <>
            <rect x="0" y="96" width="400" height="64" fill="rgba(0,0,0,0.42)" />
            {Array.from({ length: 9 }, (_, n) => 10 + n * 44).map((x) => (
              <path key={x} d={`M${x} 160v-38a12 12 0 0 1 24 0v38z`} fill="rgba(255,250,240,0.07)" />
            ))}
          </>
        )}
      </svg>
      <span
        className="absolute inset-0 grid place-items-center font-display text-[clamp(48px,11vw,86px)] leading-none tracking-tight text-paper/[0.20]"
        style={{ paddingBottom: "6%" }}
      >
        {initials(name)}
      </span>
    </div>
  );
}
