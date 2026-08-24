import Link from "next/link";
import type { Metadata } from "next";
import { SubmitForm } from "@/components/submit-form";

export const metadata: Metadata = {
  title: "Submit a cafe",
  description:
    "Know a cafe in Bandra or South Bombay that belongs on the map? Tell us what makes it worth the trip.",
  alternates: { canonical: "/submit" },
  robots: { index: true, follow: true },
};

export default function SubmitPage() {
  return (
    <main className="min-h-dvh bg-ink text-paper">
      <div className="mx-auto max-w-2xl px-6 pb-24 pt-10 sm:px-8">
        <Link href="/" className="wa-mono text-paper/45 transition-colors hover:text-paper">
          ← Bombay Cafes
        </Link>
        <h1 className="mt-8 font-display text-[clamp(2rem,5vw,2.9rem)] font-light leading-[1.06] tracking-tight text-balance">
          Tell us what we&rsquo;re missing.
        </h1>
        <p className="mt-4 text-[16.5px] leading-relaxed text-paper/70">
          The map only works if it is right. If a cafe belongs on it — or if one on it has closed,
          moved, or quietly stopped being somewhere you can work — this is the fastest way to say so.
        </p>

        <div className="mt-9">
          <SubmitForm />
        </div>
      </div>
    </main>
  );
}
