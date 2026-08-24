import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Anonymous feedback on how a cafe was for working.
 *
 * Writes to `spot_feedback` with status 'pending'. Nothing here mutates a
 * published score — an editor rolls reports in — so a handful of submissions
 * cannot swing a listing, and a brigade cannot either.
 *
 * No accounts: the reference does not need them for this, and asking someone to
 * sign up before saying "the wifi was bad" would kill the whole mechanism.
 */
const ALLOWED = {
  wifi: ["Poor", "Okay", "Good", "Great"],
  charging: ["None", "Few", "Good", "Plenty"],
  noise: ["Very quiet", "Quiet", "Moderate", "Loud"],
} as const;

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "That request could not be read." }, { status: 400 });
  }

  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  if (!slug || slug.length > 120 || !/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: "Unknown cafe." }, { status: 400 });
  }

  // Only the exact option strings the form offers. Anything else is a bug or a
  // script, and either way it is not data.
  const answers: Record<string, string> = {};
  for (const [key, options] of Object.entries(ALLOWED)) {
    const v = body[key];
    if (v == null || v === "") continue;
    if (typeof v !== "string" || !(options as readonly string[]).includes(v)) {
      return NextResponse.json({ error: `That is not a valid ${key} answer.` }, { status: 400 });
    }
    answers[key] = v;
  }

  if (Object.keys(answers).length === 0) {
    return NextResponse.json({ error: "Answer at least one question." }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // No database, no promise. Returning 201 here and telling the reader "noted"
  // would discard their report while claiming to have filed it — the one thing
  // this project will not do. Say it is not accepting reports yet instead.
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "Reports are not being collected yet — nothing was saved." },
      { status: 503 },
    );
  }

  {
    const supabase = createClient(url, serviceKey);
    const { error } = await supabase.from("spot_feedback").insert({
      spot_slug: slug,
      wifi: answers.wifi ?? null,
      charging: answers.charging ?? null,
      noise: answers.noise ?? null,
      status: "pending",
    });
    if (error) {
      console.error("[feedback] insert failed:", error.message);
      return NextResponse.json(
        { error: "We could not save that. Try again in a minute." },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
