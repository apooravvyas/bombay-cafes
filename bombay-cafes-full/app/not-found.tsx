import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-ink px-6 text-center text-paper">
      <div className="max-w-md">
        <p className="wa-mono text-paper/40">404</p>
        <h1 className="mt-3 font-display text-[32px] font-light tracking-tight">Not on the map.</h1>
        <p className="mt-3 text-[15.5px] leading-relaxed text-paper/60">
          That page does not exist. Bandra and South Bombay are still where you left them.
        </p>
        <Link href="/" className="wa-btn wa-btn--solid mt-7 !bg-paper !text-ink">
          Back to the map
        </Link>
      </div>
    </main>
  );
}
