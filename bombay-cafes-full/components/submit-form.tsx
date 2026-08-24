"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type State = "idle" | "sending" | "done" | "error";

const EMPTY = {
  name: "",
  location: "",
  googleMapsUrl: "",
  why: "",
  submitterName: "",
  submitterEmail: "",
};

/**
 * Submissions are never auto-published. The copy says so plainly rather than
 * implying an instant listing, because `spot_submissions` rows land as
 * 'pending' and an editor promotes them by hand.
 */
export function SubmitForm() {
  const [form, setForm] = useState(EMPTY);
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("sending");
    setError(null);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "That did not go through.");
      }
      setState("done");
      setForm(EMPTY);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not go through.");
      setState("error");
    }
  };

  if (state === "done") {
    return (
      <div className="rounded-xl border border-white/16 bg-white/[0.05] p-6">
        <p className="flex items-center gap-2 font-display text-[20px] font-normal text-paper">
          <Check className="h-5 w-5 text-paper" strokeWidth={2.5} />
          Got it.
        </p>
        <p className="mt-2 text-[15px] leading-relaxed text-paper/60">
          It goes into the review queue rather than straight onto the map — someone reads every
          submission and checks the address before it appears.
        </p>
        <button
          type="button"
          onClick={() => setState("idle")}
          className="mt-4 text-[14px] font-medium text-accent hover:underline"
        >
          Submit another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <Label htmlFor="name">Cafe name</Label>
        <Input id="name" required value={form.name} onChange={set("name")} placeholder="What it is called" />
      </div>

      <div>
        <Label htmlFor="location">Where it is</Label>
        <Input
          id="location"
          required
          value={form.location}
          onChange={set("location")}
          placeholder="Street and neighbourhood — e.g. Waroda Road, Bandra West"
        />
      </div>

      <div>
        <Label htmlFor="gmaps">Google Maps link</Label>
        <Input
          id="gmaps"
          type="url"
          value={form.googleMapsUrl}
          onChange={set("googleMapsUrl")}
          placeholder="https://maps.app.goo.gl/… (optional, but it saves us an hour)"
        />
      </div>

      <div>
        <Label htmlFor="why">Why it should be on the map</Label>
        <Textarea
          id="why"
          required
          value={form.why}
          onChange={set("why")}
          placeholder="The specific thing. Wifi that holds up, a corner nobody finds, the best filter coffee in Fort — not “nice ambience”."
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="who">Your name</Label>
          <Input id="who" required value={form.submitterName} onChange={set("submitterName")} />
        </div>
        <div>
          <Label htmlFor="email">Your email</Label>
          <Input
            id="email"
            type="email"
            required
            value={form.submitterEmail}
            onChange={set("submitterEmail")}
            placeholder="So we can ask a follow-up"
          />
        </div>
      </div>

      {error && (
        <p className="rounded-md border border-accent/40 bg-accent/10 px-4 py-3 text-[14px] text-paper">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={state === "sending"} className="!bg-paper !text-ink hover:!bg-white">
          {state === "sending" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Sending
            </>
          ) : (
            "Submit cafe"
          )}
        </Button>
        <p className="text-[13px] text-paper/45">
          Reviewed by a person. Nothing is published automatically.
        </p>
      </div>
    </form>
  );
}
