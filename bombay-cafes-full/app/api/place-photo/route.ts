import { NextResponse } from "next/server";

/**
 * Proxy for Google Places photographs.
 *
 * Places (New) does not hand out durable image URLs. `…/media` returns a
 * short-lived redirect to a signed URI, and Google's terms are explicit that
 * those URIs are not to be stored and re-served as if they were our own
 * assets. So `data/media.json` stores the stable photo *resource name* and
 * this route resolves it at request time, keeping the API key server-side.
 *
 * Without a key the route is honest about it: 503 and a sentence, not a
 * placeholder image and not a silent 200.
 */

const NAME = /^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/;
const MIN_W = 200;
const MAX_W = 1600;

export const revalidate = 3600;

export async function GET(request: Request) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) {
    return new NextResponse(
      "Photography from Google Places is not configured on this deployment.",
      { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }

  const url = new URL(request.url);
  const name = url.searchParams.get("name") ?? "";
  if (!NAME.test(name)) {
    return new NextResponse("Bad photo reference.", { status: 400 });
  }

  const requested = Number(url.searchParams.get("w") ?? "960");
  const width = Math.min(MAX_W, Math.max(MIN_W, Number.isFinite(requested) ? requested : 960));

  const media = new URL(`https://places.googleapis.com/v1/${name}/media`);
  media.searchParams.set("maxWidthPx", String(width));
  media.searchParams.set("skipHttpRedirect", "true");

  try {
    const meta = await fetch(media, {
      headers: { "X-Goog-Api-Key": key },
      next: { revalidate: 3600 },
    });
    if (!meta.ok) return new NextResponse("Photo unavailable.", { status: 502 });

    const { photoUri } = (await meta.json()) as { photoUri?: string };
    if (!photoUri) return new NextResponse("Photo unavailable.", { status: 502 });

    const bytes = await fetch(photoUri, { next: { revalidate: 3600 } });
    if (!bytes.ok || !bytes.body) return new NextResponse("Photo unavailable.", { status: 502 });

    return new NextResponse(bytes.body, {
      status: 200,
      headers: {
        "content-type": bytes.headers.get("content-type") ?? "image/jpeg",
        // Short, so we are re-resolving rather than warehousing Google's imagery.
        "cache-control": "public, max-age=1800, s-maxage=3600",
      },
    });
  } catch {
    return new NextResponse("Photo unavailable.", { status: 502 });
  }
}
