import type { Config } from "tailwindcss";

/**
 * Bombay Cafes — tokens.
 *
 * The reference is a near-black product wrapped around a light map: dark
 * landing, dark side panel, warm-white glass chrome floating on the map. The
 * palette is deliberately almost monochrome so the only saturated thing on
 * screen is the selected pin.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        /* Measured off the reference rather than guessed: its body is #080808,
           its raised dark surfaces sit at #0D0D0C, its off-white is #F7F4EE,
           its secondary text is #E7E1D6 at 72%, and its one accent is a soft
           warm yellow. Nothing here is a Bombay-specific invention. */
        ink: "#080808",
        ink2: "#151515",
        /** Raised dark surface: cards inside the panel, tooltips. */
        surface: "#0D0D0C",
        /** Off-white: glass chrome, panel text. */
        paper: "#F7F4EE",
        chalk: "#FAF9F4",
        /** Section labels in mono sit a shade below paper. */
        label: "#EEE7DB",
        /** Secondary text on dark — the reference's exact value. */
        "paper-dim": "rgba(231, 225, 214, 0.72)",
        /** The one hairline used on every dark border. */
        hairline: "rgba(255, 255, 255, 0.16)",
        stone: { DEFAULT: "#8C8880", light: "#B4B0A8", dark: "#575349" },
        /** Single accent — selected pin, inferred markers, active states. */
        accent: "#F1D879",
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-serif", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      maxWidth: { panel: "460px" },
      aspectRatio: { hero: "408 / 210" },
    },
  },
  plugins: [],
};
export default config;
