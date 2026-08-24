/** Matches the map screen's loading gate so there is no flash between them. */
export default function Loading() {
  return (
    <div className="grid min-h-dvh place-items-center bg-ink">
      <div className="flex flex-col items-center gap-4">
        <p className="font-display text-[clamp(28px,4vw,42px)] text-paper">
          bombay <em className="font-semibold not-italic">cafes</em>
        </p>
        <p className="wa-mono text-paper/45">Loading…</p>
      </div>
    </div>
  );
}
