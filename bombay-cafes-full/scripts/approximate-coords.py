#!/usr/bin/env python3
"""
Area-level coordinates for the live dataset.

Every entry below is anchored to the street named in the cafe's own verified
address — the street the listing already claims, not a guess about which part of
Mumbai it might be in. Accuracy is street/block level: the pin lands on the
right road, in the right stretch of it, within roughly 100-250m of the door.
That is enough to answer "is this near me, and what else is nearby", which is
what the map is for. It is NOT enough to walk to, and the data says so:
every row is written with location_accuracy = "approximate".

Two rules this file exists to enforce:

  · No two cafes share a point. Cafes on the same street are placed at
    different stretches of it, in the order the addresses imply, so Waterfield
    Road reads as a road rather than a stack.
  · No cafe is placed anywhere its address does not put it. There is no
    jitter, no randomness and no neighbourhood centroid — each pair is written
    out by hand against the address, and `anchor` records what it was read from
    so the next person can check the work.

When a real geocoder is available, scripts/geocode-cafes.ts overwrites these
and flips the row to "verified". Nothing else in the app changes.
"""

import json
import pathlib

# slug -> (latitude, longitude, anchor read from the address)
COORDS = {
    # ── Bandra West ──────────────────────────────────────────────────────────
    "subko-coffee-mary-lodge-chapel-road":
        (19.0575, 72.8264, "Chapel Road, Ranwar"),
    "veronica-s-waroda-road":
        (19.0584, 72.8271, "Waroda Road, Ranwar"),
    "taj-mahal-tea-house-st-john-baptist-road":
        (19.0566, 72.8256, "St John Baptist Road"),
    "bombay-coffee-house-waterfield-road":
        (19.0568, 72.8316, "Waterfield Road, opposite National College"),
    "earth-cafe-waterfield-road":
        (19.0580, 72.8299, "Waterfield Road, Durga Chambers — west of National College"),
    "the-bagel-shop-carter-road":
        (19.0633, 72.8221, "Pali Mala Road, off Carter Road"),
    "shelter-cafe-x-coffee-by-javaphile-sherly-rajan-road":
        (19.0659, 72.8236, "Sherly Rajan Road, off Carter Road"),
    "the-yoga-house-sherly-rajan-road":
        (19.0667, 72.8228, "Sherly Rajan Road, sea end"),
    "blue-tokai-coffee-roasters-perry-road-perry-road":
        (19.0666, 72.8267, "Perry Road at New Kantwadi Lane"),
    "boojee-cafe-perry-road":
        (19.0673, 72.8258, "New Kantwadi Road, off Perry Cross Road"),
    "candies-pali-hill":
        (19.0701, 72.8259, "Pali Hill, by Learners Academy"),
    "mokai-pali-naka":
        (19.0660, 72.8301, "Pali Naka, Dr Ambedkar Road"),
    "kitchen-garden-by-suzette-st-john-street":
        (19.0671, 72.8288, "St John Street, off Pali Naka"),
    "poetry-by-love-and-cheesecake-24th-road":
        (19.0707, 72.8349, "24th Road, Khar West"),
    "kcroasters-by-koinonia-chuim-village":
        (19.0654, 72.8361, "Chuim Village, off Dr B.R. Ambedkar Road"),

    # ── South Bombay ─────────────────────────────────────────────────────────
    "kala-ghoda-cafe-kala-ghoda":
        (18.9276, 72.8317, "Rope Walk Lane, Kala Ghoda"),
    "nandan-coffee-kala-ghoda":
        (18.9298, 72.8339, "Homi Modi Street, opposite Central Bank"),
    "cafe-military-fort":
        (18.9329, 72.8349, "Tamarind Lane, Fort"),
    "yazdani-bakery-fort":
        (18.9336, 72.8332, "Cawasji Patel Street, Fort"),
    "ideal-corner-fort":
        (18.9343, 72.8353, "Gunbow Street, Fort"),
    "blue-tokai-new-excelsior-fort":
        (18.9383, 72.8324, "A.K. Nayak Marg by Azad Maidan"),
    "starbucks-horniman-circle-horniman-circle":
        (18.9301, 72.8364, "Horniman Circle, Elphinstone Building"),
    "bombay-coffee-house-ballard-estate-ballard-estate":
        (18.9343, 72.8397, "Sprotte Road, Ballard Estate"),
    "kyani-co-marine-lines":
        (18.9451, 72.8269, "Jagannath Shankar Seth Road, Marine Lines"),
    "third-wave-coffee-churchgate-churchgate":
        (18.9341, 72.8264, "Jamshedji Tata Road, near Eros"),
    "blue-tokai-nariman-point-nariman-point":
        (18.9286, 72.8237, "CR2, Barrister Rajni Patel Marg, Nariman Point"),
    "araku-coffee-apollo-bunder":
        (18.9224, 72.8331, "Mandlik Road, Apollo Bunder"),
    "cafe-mondegar-colaba":
        (18.9226, 72.8320, "Colaba Causeway by Regal"),
    "leopold-cafe-bar-colaba":
        (18.9218, 72.8311, "Shahid Bhagat Singh Road, Colaba Causeway"),
    "subko-the-cacao-mill-colaba":
        (18.9153, 72.8288, "2nd Pasta Lane, Colaba"),
}

# Nothing may be written outside Bandra/Khar or the island city. A typo in a
# decimal place is the failure mode here, and it is silent without this.
BOXES = {
    "bandra":       (19.045, 19.078, 72.815, 72.842),
    "south-bombay": (18.905, 18.955, 72.815, 72.845),
}

ROOT = pathlib.Path(__file__).resolve().parent.parent


def check(rows):
    seen = {}
    for r in rows:
        slug = r["slug"]
        if slug not in COORDS:
            continue
        lat, lng, _ = COORDS[slug]
        lo_lat, hi_lat, lo_lng, hi_lng = BOXES[r["area"]]
        if not (lo_lat <= lat <= hi_lat and lo_lng <= lng <= hi_lng):
            raise SystemExit(f"{slug}: {lat},{lng} is outside {r['area']}")
        key = (round(lat, 5), round(lng, 5))
        if key in seen:
            raise SystemExit(f"{slug} shares a point with {seen[key]}")
        seen[key] = slug


def write(path, key, lat_key, lng_key):
    """
    The two files use different names for the same pair: data/cafes.json is the
    research shape and calls them lat/lng, data/spots.json is the UI shape and
    calls them latitude/longitude. Write whichever this file expects rather than
    adding a third spelling.
    """
    doc = json.loads(path.read_text())
    rows = doc[key]
    check([r for r in rows if r.get("isActive")])
    touched = 0
    for r in rows:
        # Drop any stray spelling a previous run may have left behind.
        for stale in ("latitude", "longitude", "lat", "lng"):
            if stale not in (lat_key, lng_key):
                r.pop(stale, None)
        hit = COORDS.get(r["slug"])
        if not hit:
            # Not in the live set. Leave it null rather than inventing a point
            # for a listing nobody is publishing.
            r[lat_key] = None
            r[lng_key] = None
            r["locationAccuracy"] = None
            r.pop("locationAnchor", None)
            continue
        lat, lng, anchor = hit
        r[lat_key] = lat
        r[lng_key] = lng
        r["locationAccuracy"] = "approximate"
        r["locationAnchor"] = anchor
        touched += 1
    path.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n")
    return touched, len(rows)


def main():
    missing = set()
    doc = json.loads((ROOT / "data" / "spots.json").read_text())
    live = {r["slug"] for r in doc["spots"] if r.get("isActive")}
    missing = live - set(COORDS)
    if missing:
        raise SystemExit("live spots with no coordinate: " + ", ".join(sorted(missing)))

    for name, key, lat_key, lng_key in (
        ("data/cafes.json", "cafes", "lat", "lng"),
        ("data/spots.json", "spots", "latitude", "longitude"),
    ):
        touched, total = write(ROOT / name, key, lat_key, lng_key)
        print(f"{name}: {touched} positioned, {total - touched} left null")

    lats = [c[0] for c in COORDS.values()]
    lngs = [c[1] for c in COORDS.values()]
    print(f"bounds  lat {min(lats):.4f}–{max(lats):.4f}  lng {min(lngs):.4f}–{max(lngs):.4f}")
    print(f"all {len(COORDS)} live spots anchored, none sharing a point")


if __name__ == "__main__":
    main()
