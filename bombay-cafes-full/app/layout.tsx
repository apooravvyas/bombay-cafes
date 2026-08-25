import type { Metadata } from "next";
import "./globals.css";

/**
 * Typography
 *   Fraunces     — the display serif the brand mark and cafe names use.
 *   Inter          — UI, list rows, the big score numerals.
 *   IBM Plex Mono  — micro-labels, addresses, provenance.
 *
 * Loaded as a runtime stylesheet rather than through `next/font/google`, which
 * fetches font files at BUILD time — a dependency that stops CI or any sandbox
 * without egress to fonts.googleapis.com from building the app at all.
 * `display=swap` plus the fallback stacks in globals.css keep first paint fine.
 */
const FONT_CSS =
  "https://fonts.googleapis.com/css2" +
  "?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..600" +
  "&family=Inter:wght@400;500;600;700" +
  "&family=IBM+Plex+Mono:wght@400;500;600;700" +
  "&display=swap";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bombay-cafes.vercel.app";

const DESCRIPTION =
  "A map of Mumbai cafes ranked by how good they actually are to work from — wifi, power outlets, noise and seating, across Bandra and South Bombay.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "Bombay Cafes — find a cafe you can actually work from",
    template: "%s · Bombay Cafes",
  },
  description: DESCRIPTION,
  keywords: [
    "work friendly cafes Mumbai",
    "cafes with wifi Mumbai",
    "laptop friendly cafes Bandra",
    "cafes to work from South Bombay",
    "best cafes Bandra",
    "coworking cafes Mumbai",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Bombay Cafes",
    title: "Bombay Cafes — find a cafe you can actually work from",
    description: DESCRIPTION,
    url: SITE,
    locale: "en_IN",
  },
  twitter: { card: "summary_large_image", title: "Bombay Cafes", description: DESCRIPTION },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // No global chrome: the city screen is a full-bleed map that owns the
  // viewport, and the marketing pages carry their own header.
  return (
    <html lang="en-IN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONT_CSS} />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
