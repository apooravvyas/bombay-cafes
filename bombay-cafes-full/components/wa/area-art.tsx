import type { AreaGroup } from "@/lib/spots";

/**
 * Drawn artwork for the two area cards.
 *
 * The reference leans on city photography. We do not own equivalent images of
 * Bandra or Fort, and a generic Mumbai skyline from a stock library would say
 * nothing about either place — the whole point of these cards is that the two
 * areas feel different. So they are drawn: low Portuguese-village rooflines and
 * palms for Bandra, stone arcades and a clock tower for South Bombay.
 *
 * Pure SVG, no network, no licence to trace, and it scales to any card size.
 * If real photography is ever licensed, swapping it in touches only this file.
 */

export function AreaArt({ group }: { group: AreaGroup }) {
  return group === "bandra" ? <BandraArt /> : <SouthBombayArt />;
}

/* ── Bandra ────────────────────────────────────────────────────────────────
   Ranwar at dusk: pitched roofs, a chapel spire, verandah posts, palms.
   Warm, low, domestic — the opposite of the arcade below.                   */
function BandraArt() {
  return (
    <div aria-hidden className="absolute inset-0">
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg,#4a3830 0%,#6d4c39 24%,#9a6642 46%,#4a3f39 72%,#181512 100%)",
        }}
      />
      <svg
        viewBox="0 0 1200 420"
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-x-0 bottom-0 h-[72%] w-full"
      >
        {/* far roofline, hazy */}
        <path
          fill="rgba(20,16,14,0.42)"
          d="M0 420V300l70-34 66 34 58-28 74 30 62-26 80 32 60-24 78 30 66-28 72 30 64-26 80 32 62-26 76 30 72-30v106z"
        />
        {/* chapel: a small spire is the one vertical in Ranwar */}
        <path fill="rgba(12,10,9,0.72)" d="M566 420V236l22-46 22 46v184z" />
        <rect x="584" y="150" width="4" height="42" fill="rgba(12,10,9,0.72)" />
        <rect x="574" y="164" width="24" height="4" fill="rgba(12,10,9,0.72)" />
        {/* near village houses: pitched roofs and verandah posts */}
        <path
          fill="rgba(10,9,8,0.88)"
          d="M0 420V330l64-40 64 40v-22l72-42 72 42v-16l68-40 68 40v-30l70-42 70 42v26l66-38 66 38v-20l74-42 74 42v22l70-40 70 40v90z"
        />
        {[80, 268, 452, 700, 892, 1080].map((x) => (
          <g key={x} fill="rgba(255,236,206,0.30)">
            <rect x={x} y={352} width={16} height={22} rx={2} />
            <rect x={x + 30} y={352} width={16} height={22} rx={2} />
          </g>
        ))}
        {[46, 132, 236, 340, 620, 724, 966, 1064].map((x) => (
          <rect key={x} x={x} y={388} width={5} height={32} fill="rgba(8,7,6,0.9)" />
        ))}
        {/* palms */}
        <g fill="rgba(8,8,7,0.9)">
          <rect x="176" y="268" width="6" height="152" />
          <path d="M179 272c-30-22-58-24-76-14 26-4 50 2 70 16zm0 0c30-22 58-24 76-14-26-4-50 2-70 16zm0-4c-8-30-26-48-46-54 18 16 30 34 38 56zm0 0c10-30 28-46 48-52-18 16-32 32-40 54z" />
          <rect x="1012" y="292" width="5" height="128" />
          <path d="M1014 296c-24-18-46-20-60-12 20-3 40 2 56 13zm0 0c24-18 46-20 60-12-20-3-40 2-56 13zm0-3c-7-24-21-38-37-43 15 13 25 27 31 45z" />
        </g>
      </svg>
    </div>
  );
}

/* ── South Bombay ──────────────────────────────────────────────────────────
   Fort at last light: an arcade of arches, a clock tower, Deco horizontals.
   Tall, stone, civic.                                                       */
function SouthBombayArt() {
  return (
    <div aria-hidden className="absolute inset-0">
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg,#22303e 0%,#2e455b 28%,#425f78 50%,#242c35 76%,#101215 100%)",
        }}
      />
      <svg
        viewBox="0 0 1200 420"
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-x-0 bottom-0 h-[80%] w-full"
      >
        {/* far Deco blocks */}
        <path
          fill="rgba(14,18,22,0.45)"
          d="M0 420V238h84v-40h72v40h96v-66h78v66h104v-34h86v34h96v-58h80v58h96v-30h84v30h96v-46h84v46h44v182z"
        />
        {/* clock tower */}
        <g fill="rgba(9,11,14,0.8)">
          <path d="M436 420V150l30-56 30 56v270z" />
          <rect x="462" y="70" width="6" height="30" />
          <circle cx="466" cy="176" r="15" fill="rgba(232,224,206,0.3)" />
          <rect x="464" y="166" width="3" height="11" fill="rgba(14,18,22,0.9)" />
          <rect x="466" y="174" width="9" height="3" fill="rgba(14,18,22,0.9)" />
        </g>
        {/* the arcade — the thing Fort actually looks like at street level */}
        <rect x="0" y="252" width="1200" height="168" fill="rgba(9,11,13,0.9)" />
        <rect x="0" y="244" width="1200" height="12" fill="rgba(24,30,36,0.95)" />
        {Array.from({ length: 15 }, (_, i) => 24 + i * 78).map((x) => (
          <path
            key={x}
            d={`M${x} 420v-84a26 26 0 0 1 52 0v84z`}
            fill="rgba(233,226,209,0.11)"
          />
        ))}
        {/* upper storey windows, lit unevenly */}
        {Array.from({ length: 12 }, (_, i) => 40 + i * 98).map((x, i) => (
          <rect
            key={x}
            x={x}
            y={196}
            width={22}
            height={30}
            rx={2}
            fill={i % 3 === 0 ? "rgba(255,238,206,0.2)" : "rgba(210,222,232,0.09)"}
          />
        ))}
      </svg>
    </div>
  );
}
