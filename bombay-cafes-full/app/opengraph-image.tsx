import { ImageResponse } from "next/og";

/**
 * The share card.
 *
 * Drawn, not photographed. The obvious thing to put here would be a Mumbai
 * cafe interior, and we do not have one we can prove is a Mumbai cafe
 * interior — so the card says what the site is in the site's own vocabulary
 * instead: paper ground, the wordmark, the two areas, and the one sentence
 * that explains the score.
 */

export const alt = "Bombay Cafes — find a cafe you can actually work from";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0B0B0A",
          padding: "68px 76px",
          color: "#FAF9F4",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ fontSize: 26, letterSpacing: 6, color: "rgba(250,249,244,0.55)" }}>
            BOMBAY CAFES
          </div>
          <div style={{ fontSize: 22, letterSpacing: 3, color: "rgba(250,249,244,0.42)" }}>
            BANDRA · SOUTH BOMBAY
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <div style={{ fontSize: 84, lineHeight: 1.03, letterSpacing: -2, maxWidth: 900 }}>
            Find a cafe you can actually work from.
          </div>
          <div
            style={{
              fontSize: 30,
              lineHeight: 1.35,
              color: "rgba(250,249,244,0.6)",
              maxWidth: 860,
            }}
          >
            Thirty cafes, scored on outlets, Wi-Fi, seating and how long you can stay — from what
            published sources actually say, with the evidence printed underneath.
          </div>
        </div>

        <div style={{ display: "flex", gap: 14, alignItems: "flex-end", height: 84 }}>
          {[5, 4, 4, 3, 5, 2, 4, 3, 5, 4, 3, 4].map((n, i) => (
            <div
              key={i}
              style={{
                width: 46,
                height: n * 16,
                background: i % 3 === 0 ? "#E4572E" : "rgba(250,249,244,0.16)",
                borderRadius: 3,
              }}
            />
          ))}
        </div>
      </div>
    ),
    size,
  );
}
