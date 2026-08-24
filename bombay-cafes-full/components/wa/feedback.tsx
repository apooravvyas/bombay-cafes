"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";

/**
 * Feedback — the mechanism that lets the scores improve over time, which is
 * the reference product's central idea.
 *
 * v1 is deliberately minimal: three questions, anonymous, no account. It posts
 * to /api/feedback, which writes to `spot_feedback` in Supabase. Submissions
 * never change a published score on their own — an editor rolls them in — so a
 * handful of votes cannot swing a listing.
 */

const QUESTIONS = [
  { key: "wifi", label: "Wi-Fi", options: ["Poor", "Okay", "Good", "Great"] },
  { key: "charging", label: "Outlets", options: ["None", "Few", "Good", "Plenty"] },
  { key: "noise", label: "Noise", options: ["Very quiet", "Quiet", "Moderate", "Loud"] },
] as const;

type Answers = Partial<Record<(typeof QUESTIONS)[number]["key"], string>>;
type State = "idle" | "open" | "sending" | "done" | "error";

export function SpotFeedback({ slug, name }: { slug: string; name: string }) {
  const [state, setState] = useState<State>("idle");
  const [answers, setAnswers] = useState<Answers>({});
  const [error, setError] = useState<string | null>(null);

  const answered = Object.keys(answers).length;

  const submit = async () => {
    setState("sending");
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, ...answers }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "That did not go through.");
      }
      setState("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not go through.");
      setState("error");
    }
  };

  if (state === "done") {
    return (
      <div className="rounded-xl border border-white/16 bg-white/[0.05] p-4">
        <p className="flex items-center gap-2 text-[15px] font-medium text-paper">
          <Check className="h-4 w-4" strokeWidth={2.5} />
          Thanks — noted.
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-paper/55">
          It goes into the review queue rather than straight onto the score. Enough reports and
          we&rsquo;ll re-rate {name}.
        </p>
      </div>
    );
  }

  if (state === "idle") {
    return (
      <button
        type="button"
        onClick={() => setState("open")}
        className="w-full rounded-xl border border-dashed border-white/20 px-5 py-4 text-left text-[14.5px] text-paper/75 transition-colors hover:border-white/35 hover:text-paper"
      >
        Been here? <span className="text-paper/50">Tell us how it was for working →</span>
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-white/14 p-4">
      <p className="wa-mono text-paper/45">How was it for working?</p>

      <div className="mt-4 flex flex-col gap-4">
        {QUESTIONS.map((q) => (
          <fieldset key={q.key}>
            <legend className="text-[13.5px] font-medium text-paper/85">{q.label}</legend>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {q.options.map((opt) => {
                const active = answers[q.key] === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      setAnswers((a) => ({ ...a, [q.key]: a[q.key] === opt ? undefined : opt }))
                    }
                    className={`rounded-md border px-2.5 py-1.5 font-mono text-[11.5px] transition-colors ${
                      active
                        ? "border-paper bg-paper text-ink"
                        : "border-white/14 text-paper/65 hover:border-white/30 hover:text-paper"
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      {error && (
        <p className="mt-3 font-mono text-[11.5px] leading-relaxed text-accent">{error}</p>
      )}

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          disabled={answered === 0 || state === "sending"}
          onClick={submit}
          className="wa-btn wa-btn--solid !h-9 !bg-paper !text-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          {state === "sending" ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Sending
            </>
          ) : (
            "Send"
          )}
        </button>
        <button
          type="button"
          onClick={() => setState("idle")}
          className="text-[13px] text-paper/50 transition-colors hover:text-paper"
        >
          Cancel
        </button>
        <span className="ml-auto font-mono text-[11px] text-paper/35">
          {answered}/3 · anonymous
        </span>
      </div>
    </div>
  );
}
