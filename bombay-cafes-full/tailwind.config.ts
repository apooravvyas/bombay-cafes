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
        /** Near-black ground: landing, side panel. */
        ink: "#0B0B0A",
        ink2: "#171614",
        /** Warm white: glass chrome, panel text. */
        paper: "#F4F1EA",
        chalk: "#FAF9F4",
        stone: { DEFAULT: "#8C8880", light: "#B4B0A8", dark: "#575349" },
        /** Single accent — selected pin ring, active filter underline. */
        accent: "#C8412F",
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-serif", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      maxWidth: { panel: "460px" },
    },
  },
  plugins: [],
};
export default config;
