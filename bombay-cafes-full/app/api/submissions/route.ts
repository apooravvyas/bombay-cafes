import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Cafe submissions.
 *
 * With Supabase configured, rows land in `spot_submissions` with status
 * 'pending' — nothing is ever auto-published. Without it, the submission is
 * accepted and logged so the flow works end to end in a zero-config demo.
 *
 * Writes use the SERVICE ROLE key, which is server-only. RLS grants the anon
 * key insert on this table too, but routing through the API keeps validation
 * and rate-limiting in one place.
 */

const MAX = { name: 160, location: 240, url: 500, why: 2000, person: 120, email: 200 };

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "That request could not be read." }, { status: 400 });
  }

  const str = (k: string) => (typeof body[k] === "string" ? (body[k] as string).trim() : "");

  const name = str("name");
  const location = str("location");
  const why = str("why");
  const submitterName = str("submitterName");
  const submitterEmail = str("submitterEmail");
  const googleMapsUrl = str("googleMapsUrl");

  if (!name) return NextResponse.json({ error: "Add the cafe's name." }, { status: 400 });
  if (!location) return NextResponse.json({ error: "Add where it is." }, { status: 400 });
  if (why.length < 10)
    return NextResponse.json(
      { error: "Tell us a bit more about why it should be on the map." },
      { status: 400 },
    );
  if (!submitterName) return NextResponse.json({ error: "Add your name." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submitterEmail))
    return NextResponse.json({ error: "That email address does not look right." }, { status: 400 });

  if (
    name.length > MAX.name ||
    location.length > MAX.location ||
    why.length > MAX.why ||
    submitterName.length > MAX.person ||
    submitterEmail.length > MAX.email ||
    googleMapsUrl.length > MAX.url
  ) {
    return NextResponse.json({ error: "One of those fields is too long." }, { status: 400 });
  }

  if (googleMapsUrl && !/^https?:\/\//i.test(googleMapsUrl)) {
    return NextResponse.json({ error: "The maps link needs to start with https://" }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url && serviceKey) {
    const supabase = createClient(url, serviceKey);
    const { error } = await supabase.from("spot_submissions").insert({
      name,
      location,
      google_maps_url: googleMapsUrl || null,
      why,
      submitter_name: submitterName,
      submitter_email: submitterEmail,
      status: "pending",
    });
    if (error) {
      console.error("[submissions] insert failed:", error.message);
      return NextResponse.json(
        { error: "We could not save that. Try again in a minute." },
        { status: 500 },
      );
    }
  } else {
    console.info("[submissions] no database configured; accepted in demo mode:", name);
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
