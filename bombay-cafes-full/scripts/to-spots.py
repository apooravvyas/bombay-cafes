#!/usr/bin/env python3
"""
Transform data/cafes.json into data/spots.json — the Workabout-shaped model.

    python3 scripts/to-spots.py     (or: npm run spots)

No new research. This maps the 1-5 scores we already sourced onto the
QUALITATIVE vocabulary the reference product uses, because that is how it
communicates: "WiFi Fast", "CHARGING Scarce", "NOISE Medium" — not 4/5 bars.

Mapping rules, and why:
· A null score maps to null, never to a middle value. "We do not know" stays
  "we do not know" — the panel prints an em dash.
· `noise` is stored as QUIETNESS (5 = calm), so it inverts into the label.
· `workability` is the headline number, 0-5 with one decimal. It leans on the
  four things that actually decide whether you can work: wifi, charging,
  quiet, seating — plus our editorial `work` read. Weights live in
  lib/workability.ts so the UI and this script cannot disagree; this script
  only carries the source scores across.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

WIFI = {1: "Slow", 2: "Slow", 3: "Okay", 4: "Fast", 5: "Fast"}
CHARGING = {1: "None", 2: "Scarce", 3: "Okay", 4: "Good", 5: "Plenty"}
# stored as quietness: 5 = calmest
NOISE = {5: "Very quiet", 4: "Quiet", 3: "Medium", 2: "Loud", 1: "Very loud"}
SEATING = {
    1: "Very limited",
    2: "Limited tables",
    3: "Some tables",
    4: "Plenty of tables",
    5: "Lots of room",
}
# How long the room lets you stay, read off the editorial `work` score.
STAY = {1: "short", 2: "short", 3: "moderate", 4: "long", 5: "long"}

# Advice strings keyed off charging, mirroring the reference's CHARGING SLOTS.
CHARGING_NOTE = {
    "None": "Come fully charged — there is nothing to plug into",
    "Scarce": "Bring a charged laptop",
    "Okay": "A plug if you pick your table",
    "Good": "Most tables can charge",
    "Plenty": "Plug in anywhere",
}

# Filter toggles, derived rather than hand-tagged so they cannot drift.
def toggles(s):
    out = []
    if (s.get("outlets") or 0) >= 4:
        out.append("Outlets")
    if (s.get("wifi") or 0) >= 4:
        out.append("Fast WiFi")
    if (s.get("seating") or 0) >= 4:
        out.append("Roomy")
    if (s.get("work") or 0) >= 4:
        out.append("No time limit")
    return out


def peak_crowd(cafe):
    """Only from something we actually noted; otherwise null."""
    ev = " ".join(v for v in cafe["evidence"].values() if v).lower()
    note = (cafe.get("dataNote") or "").lower()
    text = f"{ev} {note} {cafe['editorialNote'].lower()}"
    if "after 1pm" in text or "brunch crowd" in text or "lunch" in text:
        return "Afternoons"
    if "weekend" in text:
        return "Weekends"
    if "morning" in text and "quiet" in text:
        return "Afternoons"
    return None


def food_cost(level):
    return {1: "₹100–250", 2: "₹250–500", 3: "₹500–900", 4: "₹900+"}.get(level)


def build():
    src = json.loads((ROOT / "data" / "cafes.json").read_text())["cafes"]
    spots = []

    for c in src:
        s = c["scores"]
        ev = c["evidence"]

        spots.append(
            {
                "slug": c["slug"],
                "name": c["name"],
                "area": c["area"],
                "neighborhood": c["neighborhood"],
                "address": c["address"],
                # Still null. scripts/geocode-cafes.ts is the only writer.
                "latitude": c["lat"],
                "longitude": c["lng"],
                "website": c["websiteUrl"],
                "instagram": c["instagramUrl"],
                "googleMapsUrl": c["googleMapsUrl"],
                "openingHours": c["openingHours"],
                "editorialNote": c["editorialNote"],
                "whyWeRecommend": c["whyWeRecommend"],
                # Raw 1-5 source scores; lib/workability.ts derives the headline.
                "scores": {
                    "wifi": s["wifi"],
                    "charging": s["outlets"],
                    "quiet": s["noise"],
                    "seating": s["seating"],
                    "work": s["work"],
                },
                # The qualitative layer the UI actually prints.
                "attrs": {
                    "wifi": WIFI.get(s["wifi"]),
                    "charging": CHARGING.get(s["outlets"]),
                    "chargingNote": CHARGING_NOTE.get(CHARGING.get(s["outlets"])),
                    "noise": NOISE.get(s["noise"]),
                    "seating": SEATING.get(s["seating"]),
                    "seatingStyles": None,
                    "stay": STAY.get(s["work"]),
                    "peakCrowd": peak_crowd(c),
                    "avgFoodCost": food_cost(c["priceLevel"]),
                },
                "evidence": {
                    "wifi": ev["wifi"],
                    "charging": ev["outlets"],
                    "quiet": ev["noise"],
                    "seating": ev["seating"],
                    "work": ev["work"],
                },
                "toggles": toggles(s),
                "tags": c["tags"],
                # Reference splits its pins into a curated layer and an
                # AI-analysis layer. Everything we have is hand-curated, so
                # nothing is mislabelled as machine-derived.
                "dataLayer": "curated",
                "verificationStatus": c["verificationStatus"],
                "dataNote": c["dataNote"],
                "sources": c["dataSource"],
                "lastVerifiedAt": c["lastVerifiedAt"],
                "isActive": c["isActive"],
            }
        )

    out = ROOT / "data" / "spots.json"
    out.write_text(json.dumps({"spots": spots}, indent=2, ensure_ascii=False) + "\n")

    active = [s for s in spots if s["isActive"]]
    print(f"wrote {len(spots)} spots ({len(active)} active) -> {out}")
    for a in ("bandra", "south-bombay"):
        sub = [s for s in active if s["area"] == a]
        print(f"  {a}: {len(sub)} across {len({s['neighborhood'] for s in sub})} areas")
    print(f"  with coordinates: {len([s for s in spots if s['latitude'] is not None])}")
    for k in ("wifi", "charging", "noise", "seating", "stay"):
        known = len([s for s in active if s["attrs"][k]])
        print(f"  {k:9} known on {known}/{len(active)}")


if __name__ == "__main__":
    build()
