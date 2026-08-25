# Workability evidence brief

Research ONE question per cafe: **can someone work here for three hours?**

## Hard rules
1. **Never fabricate.** No invented quotes, ratings, wifi, outlets, hours, seating.
2. **Absence of evidence is not negative evidence.** If nothing credible mentions
   outlets, `power.score = null`, `confidence = "none"`. Do NOT score it 1 or 0.
3. **Separate fact from inference.** `kind: "fact"` = a source states it.
   `kind: "inference"` = you are reading between the lines. Label honestly.
4. Quotes ≤ 25 words. Summarise rather than copying blocks.
5. Only sources you actually fetched. Record the real URL.
6. If a cafe has closed or you cannot confirm it trades, say so in `notes`.

## Score rubric (1–5, or null)
- 5 explicitly excellent and corroborated by 2+ sources
- 4 positive, stated plainly by at least one credible source
- 3 mixed or merely "present/adequate"
- 2 explicitly limited/problematic
- 1 explicitly bad or actively prevents working
- null no credible mention at all

## Confidence
- `high` 3+ independent sources agree
- `medium` 2 sources, or 1 strong source (official / detailed review)
- `low` 1 weak or indirect mention
- `none` no evidence

## Factors
wifi, power (outlets/charging), seating (comfort + tables), longStay
(tolerance of multi-hour laptop sessions), focus (noise/distraction),
calls (whether calls are practical), food (a real meal while working),
outdoor, bathroom

## Sources worth trying
official site; official Instagram; laptopfriendlycafe.com; Zomato; Wanderlog;
restaurant-guru; Tripadvisor; LBB; Time Out; Condé Nast Traveller India;
Reddit (r/mumbai, r/india); local Mumbai publications; Google Maps review
snippets that appear in search results. Do not attempt to bypass paywalls or
robots restrictions — if a fetch is blocked, move on and note it.

## Output — JSON only, no prose
```json
{"slug":"…",
 "trading":"confirmed|unconfirmed|closed",
 "hours":"Daily 9am–11pm"|null,
 "publicRating":{"value":4.3,"count":1240,"source":"zomato.com","url":"…"}|null,
 "factors":{"wifi":{"score":4,"confidence":"medium","evidence":[
     {"claim":"Reviewers describe the wifi as reliable for laptop work",
      "quote":"wifi was stable for three hours",
      "source":"laptopfriendlycafe.com","url":"https://…","kind":"fact"}]},
   "power":{"score":null,"confidence":"none","evidence":[]}, "…":"…"},
 "synthesis":"One sentence, ≤35 words, grounded only in the evidence above.",
 "sourcesFetched":["https://…","https://…"],
 "notes":"anything the editor needs to know, incl. blocked fetches"}
```
Every factor key must be present. Return the JSON and nothing else.
