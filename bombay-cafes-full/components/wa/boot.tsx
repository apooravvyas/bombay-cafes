"use client";

import { useEffect, useState } from "react";

/**
 * The opening beat: identity, then place, then the map.
 *
 * The reference holds a wordmark over the dimming map with a coordinate rail
 * and a bar motif beneath it. Ours does the same three things, but the bars are
 * not decoration — each one is a real workability score from the dataset, sorted
 * low to high, so the loading screen is the first chart in the product rather
 * than a spinner wearing a suit.
 *
 * The coordinates are the centroid of the spots we actually hold, not Mumbai's
 * generic city-centre figures. If the dataset moves, so does the label.
 *
 * It clears when the map says it is ready, with a floor of ~900ms so a fast
 * connection still gets a beat rather than a flash, and a ceiling so a dead
 * tile server cannot trap anyone behind it.
 */
export function Boot({
  ready,
  scores,
  centroid,
}: {
  ready: boolean;
  scores: number[];
  centroid: { lat: number; lng: number } | null;
}) {
  const [gone, setGone] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [floorPassed, setFloor] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setFloor(true), 900);
    // Never hold the product hostage to the basemap.
    const bail = setTimeout(() => setFloor(true), 4200);
    return () => {
      clearTimeout(t);
      clearTimeout(bail);
    };
  }, []);

  useEffect(() => {
    if (!(ready && floorPassed)) return;
    setLeaving(true);
    const t = setTimeout(() => setGone(true), 720);
    return () => clearTimeout(t);
  }, [ready, floorPassed]);

  if (gone) return null;

  const bars = scores.length > 0 ? [...scores].sort((a, b) => a - b) : null;

  return (
    <div
      aria-hidden={leaving}
      className={`pointer-events-none absolute inset-0 z-50 grid place-items-center bg-ink transition-[opacity,backdrop-filter] duration-700 ease-out ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
    >
      <div
        className={`flex flex-col items-center transition-transform duration-700 ease-out ${
          leaving ? "scale-[1.04]" : "scale-100"
        }`}
      >
        <p className="wa-boot-in font-display text-[clamp(30px,5vw,52px)] leading-none text-paper">
          bombay <em className="font-semibold not-italic italic">cafes</em>
        </p>

        {/* Real scores, low to high. Each bar wipes up on its own beat. */}
        {bars && (
          <div className="mt-7 flex h-[76px] items-end gap-[3px]" role="presentation">
            {bars.map((v, i) => (
              <span
                key={i}
                className="wa-boot-bar w-[5px] rounded-[1px] bg-paper/35"
                style={{
                  height: `${Math.max(8, (v / 5) * 76)}px`,
                  animationDelay: `${180 + i * 26}ms`,
                }}
              />
            ))}
          </div>
        )}

        {centroid && (
          <p className="wa-boot-in wa-mono mt-6 flex items-center gap-3 text-paper/40" style={{ animationDelay: "260ms" }}>
            <span>{centroid.lat.toFixed(4)}° N</span>
            <span className="relative block h-px w-16 bg-paper/20">
              <span className="wa-boot-run absolute top-1/2 h-[3px] w-[3px] -translate-y-1/2 rounded-full bg-paper/70" />
            </span>
            <span>{centroid.lng.toFixed(4)}° E</span>
          </p>
        )}
      </div>
    </div>
  );
}
