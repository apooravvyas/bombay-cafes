#!/usr/bin/env python3
"""
research/*.json  →  data/evidence.json

Merges the research batches into one keyed document the app can read, and
refuses to merge anything that breaks the evidence contract. The point of the
checks is that a fabricated or malformed row should fail the build, not reach
the UI.
"""
import json, pathlib, sys, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
FACTORS = ["wifi","power","seating","longStay","focus","calls","food","outdoor","bathroom"]
CONF = {"high","medium","low","none"}
KIND = {"fact","inference"}

def fail(msg):
    print("FAIL:", msg); sys.exit(1)

live = {s["slug"] for s in json.loads((ROOT/"data/spots.json").read_text())["spots"] if s.get("isActive")}

merged, seen = {}, set()
for path in sorted((ROOT/"research").glob("batch*.json")):
    rows = json.loads(path.read_text())
    for c in rows:
        slug = c["slug"]
        if slug in seen: fail(f"{slug} appears twice")
        if slug not in live: fail(f"{slug} is not a live spot")
        seen.add(slug)

        fs = c.get("factors") or {}
        for k in FACTORS:
            f = fs.get(k)
            if f is None: fail(f"{slug}: missing factor {k}")
            sc, cf, ev = f.get("score"), f.get("confidence"), f.get("evidence") or []
            if cf not in CONF: fail(f"{slug}.{k}: bad confidence {cf!r}")
            # The contract, enforced: a score needs evidence, and evidence
            # without a score is fine (we saw something, it did not move us).
            if sc is not None:
                if not (1 <= sc <= 5): fail(f"{slug}.{k}: score {sc} out of range")
                if not ev: fail(f"{slug}.{k}: scored {sc} with no evidence")
                if cf == "none": fail(f"{slug}.{k}: scored but confidence 'none'")
            else:
                if cf != "none": fail(f"{slug}.{k}: null score must be confidence 'none'")
            for e in ev:
                if e.get("kind") not in KIND: fail(f"{slug}.{k}: bad kind {e.get('kind')!r}")
                if not e.get("url","").startswith("http"): fail(f"{slug}.{k}: evidence without a url")
                q = e.get("quote")
                if q and len(q.split()) > 25: fail(f"{slug}.{k}: quote over 25 words")

        pr = c.get("publicRating")
        if pr is not None:
            if not (0 < pr.get("value", 0) <= 5): fail(f"{slug}: publicRating out of range")
            if not pr.get("source"): fail(f"{slug}: publicRating without a source")

        syn = (c.get("synthesis") or "").strip()
        if not syn: fail(f"{slug}: no synthesis")
        if len(syn.split()) > 45: fail(f"{slug}: synthesis too long")

        merged[slug] = {
            "trading": c.get("trading","unconfirmed"),
            "hours": c.get("hours"),
            "publicRating": pr,
            "factors": {k: fs[k] for k in FACTORS},
            "synthesis": syn,
            "sourcesFetched": c.get("sourcesFetched") or [],
            "notes": c.get("notes") or "",
        }

out = {"researched": len(merged), "liveSpots": len(live), "spots": merged}
(ROOT/"data/evidence.json").write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n")

# ── report ────────────────────────────────────────────────────────────────
print(f"merged {len(merged)} of {len(live)} live spots")
tally = {k: 0 for k in FACTORS}
facts = infer = quotes = 0
srcs = set()
for c in merged.values():
    for k in FACTORS:
        f = c["factors"][k]
        if f["score"] is not None: tally[k] += 1
        for e in f["evidence"]:
            if e["kind"] == "fact": facts += 1
            else: infer += 1
            if e.get("quote"): quotes += 1
            m = re.match(r"https?://([^/]+)", e["url"])
            if m: srcs.add(m.group(1).replace("www.",""))
    for u in c["sourcesFetched"]:
        m = re.match(r"https?://([^/]+)", u)
        if m: srcs.add(m.group(1).replace("www.",""))
print("scored per factor:", " ".join(f"{k}={v}" for k,v in tally.items()))
print(f"evidence items: {facts} fact, {infer} inference, {quotes} carry a quote")
print(f"distinct source domains: {len(srcs)}")
print("  " + ", ".join(sorted(srcs)))
print("public rating present:", sum(1 for c in merged.values() if c['publicRating']))
