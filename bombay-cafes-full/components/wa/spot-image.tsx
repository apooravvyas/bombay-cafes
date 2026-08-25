"use client";

import { useEffect, useState } from "react";
import type { AreaGroup } from "@/lib/spots";
import { initials, slugSeed, type SpotImage } from "@/lib/media";

/**
 * The hero image area at the top of the detail panel.
 *
 * Real photography when we have a verified image for this outlet; a drawn
 * plate when we do not. The plate is deliberately graphic — flat bands, the
 * cafe's initials, and a NO PHOTO YET chip — because the one thing this slot
 * must never do is put a stock interior under a cafe's name and let a reader
 * assume it is the room they are about to walk into.
 *
 * Multiple images become a quiet carousel: dots, crossfade, no autoplay. The
 * architecture is here so photography can be dropped into data/media.json
 * later with no component change.
 */
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
  const [i, setI] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setI(0);
    setLoaded(false);
    setFailed({});
  }, [slug]);

  const usable = images.filter((_, n) => !failed[n]);
  const has = usable.length > 0;
  const shown = has ? usable[Math.min(i, usable.length - 1)] : null;

  return (
    <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-ink2">
      {shown ? (
        <>
          {/* Plate underneath, so a slow image never flashes an empty box. */}
          <FallbackPlate slug={slug} name={name} area={area} dim />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={shown.url}
            src={shown.url}
            alt={shown.alt || `${name}, ${neighborhood}`}
            loading="lazy"
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed((f) => ({ ...f, [i]: true }))}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[600ms] ease-out ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
          />
          {shown.credit && (
            <a
              href={shown.creditUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="wa-mono absolute bottom-2 right-3 z-10 text-paper/45 transition-colors hover:text-paper"
            >
              {shown.credit}
            </a>
          )}
          {usable.length > 1 && (
            <div className="absolute bottom-3 left-3 z-10 flex gap-1.5">
              {usable.map((_, n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={`Image ${n + 1} of ${usable.length}`}
                  aria-current={n === i}
                  onClick={() => {
                    setLoaded(false);
                    setI(n);
                  }}
                  className={`h-[3px] w-6 rounded-full transition-colors ${
                    n === i ? "bg-paper" : "bg-paper/30 hover:bg-paper/55"
                  }`}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <FallbackPlate slug={slug} name={name} area={area} />
          <span className="wa-mono absolute right-3 top-3 z-10 rounded-full border border-white/15 bg-ink/40 px-2 py-0.5 text-paper/45 backdrop-blur-sm">
            No photo yet
          </span>
        </>
      )}
      {/* Bottom fade, so the name below always sits on a dark ground. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink via-ink/55 to-transparent" />
    </div>
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
