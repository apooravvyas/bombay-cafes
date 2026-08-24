#!/usr/bin/env python3
"""
Builds data/cafes.json from the curated research table below.

    python3 scripts/build-seed.py     (or: npm run seed:build)

── Rules this file enforces ─────────────────────────────────────────────────
1. NO COORDINATES. Every cafe ships with latitude/longitude = null. Positions
   come from `npm run geocode` (scripts/geocode-cafes.ts) once, against the
   finalised dataset. No centroids, no nudged duplicates, no "approximate"
   pins — a cafe has a real position or it has none.

2. FACTUAL vs FIT scores. The four factual dimensions (wifi, outlets, noise,
   seating) get a number ONLY where `ev` carries the sentence that supports it.
   No source, no score. The four fit dimensions (coffee, work, meeting, date)
   are the product's editorial judgement and may be scored without a citation —
   that judgement is the thing a reader comes here for.

3. THE ACTIVE SET IS SMALL ON PURPOSE. 30 live listings. Researched cafes
   beyond that are kept with active=False rather than deleted, so no verified
   work is thrown away and an editor can promote one in a single edit.
"""
import json
import re
import unicodedata
from pathlib import Path

S = ["wifi", "outlets", "noise", "seating", "coffee", "work", "meeting", "date"]
FACTUAL = {"wifi", "outlets", "noise", "seating"}


def C(name, hood, area, address, note, desc, why, scores, best_for, tags, ev=None, **kw):
    """One cafe. `scores` is an 8-tuple in S order; None means not rated."""
    ev = ev or {}
    row = {
        "name": name,
        "neighborhood": hood,
        "area": area,
        "address": address,
        "editorialNote": note,
        "description": desc,
        "whyWeRecommend": why,
        "scores": dict(zip(S, scores)),
        "evidence": {k: ev.get(k) for k in S},
        "bestFor": best_for,
        "tags": tags,
    }
    row.update(kw)
    return row


B = "bandra"
SB = "south-bombay"

# ═══════════════════════════════════════════════════════════════════════════
# ACTIVE — BANDRA (15)
# ═══════════════════════════════════════════════════════════════════════════
ACTIVE = [
    C(
        "Subko Coffee — Mary Lodge", "Chapel Road", B,
        "21A, Ground Floor, Mary Lodge, Ranwar, opposite Saba Heritage Building, Chapel Road, Bandra West",
        "The reference point for Indian specialty coffee, in a Ranwar bungalow that refuses to hurry you.",
        "Subko's Bandra flagship puts a serious roasting and bakehouse programme inside a restored Ranwar house — wooden rafters, tall windows, eight or nine tables. It is the room most Bombay coffee people measure the others against.",
        "Because the coffee genuinely justifies the queue, and because the building does something no glass-fronted cafe manages: it makes an hour feel longer than it is. Come before ten if you want a table and a conversation.",
        (4, None, 4, 3, 5, 4, 4, 4),
        ["coffee", "work", "date", "meeting"],
        ["specialty coffee", "roastery", "bakehouse", "heritage building", "brunch"],
        ev={
            "wifi": "district.in lists “Wifi” and “Work friendly” among its amenities.",
            "noise": "Reported as quiet through the morning, filling up after 10am on weekdays.",
            "seating": "Reviewers consistently describe limited seating — roughly eight to ten tables.",
            "work": "Listed as work friendly by district.in; guides recommend it for deep work and coffee meetings.",
        },
        priceLevel=4, websiteUrl="https://www.subko.coffee",
        instagramUrl="https://instagram.com/subkocoffee",
        openingHours="Mon–Thu 7:30am–10pm · Fri–Sun 7:30am–9:30pm",
        dataSource=["subko.coffee", "district.in", "mumbaipune.co.in"],
        isFeatured=True,
    ),
    C(
        "Bombay Coffee House", "Waterfield Road", B,
        "248, Neelkamal Building, Waterfield Road, opposite National College, Bandra West, Mumbai 400050",
        "Built for people with laptops, and honest about it. The best odds in Bandra of a table, a plug and three quiet hours.",
        "An all-day coffee house with a working patisserie, complimentary internet and more seating than most of its neighbours. It stays workable later into the afternoon than the brunch cafes do.",
        "This is the answer to “where can I work for three hours” more often than anywhere else on this map. Generous tables, findable outlets, and staff who do not hover once your cup is empty.",
        (5, 4, 4, 5, 4, 5, 4, 3),
        ["work", "meeting", "coffee", "study"],
        ["work friendly", "wifi", "patisserie", "all day", "large tables"],
        ev={
            "wifi": "district.in lists complimentary internet and describes the room as designed for remote workers.",
            "outlets": "Remote-work guides report that outlets are easy to find at most tables.",
            "noise": "Reported to stay quieter later into the afternoon than the nearby brunch cafes.",
            "seating": "district.in lists indoor, comfortable and large-group seating.",
            "work": "Described by district.in as built for remote work; appears on multiple work-cafe lists.",
        },
        priceLevel=2, websiteUrl="https://bombaycoffeehouse.com",
        instagramUrl="https://instagram.com/bchbombay",
        openingHours="Daily 9am–midnight",
        dataSource=["bombaycoffeehouse.com", "district.in", "eazydiner.com", "coworkingers.com"],
        isFeatured=True,
    ),
    C(
        "Shelter Cafe x Coffee by Javaphile", "Sherly Rajan Road", B,
        "Ground Floor, Noorie House, 4 Sherly Rajan Road, off Carter Road, Bandra West, Mumbai 400050",
        "Plug points at most tables and light from the right direction. A working cafe that also happens to be pleasant.",
        "The cafe arm of Bandra roaster Javaphile, on a quiet lane off Carter Road. Large windows, indoor and outdoor seating, a breakfast-through-evening menu with real vegan and gluten-free options.",
        "The seating was clearly planned by someone who has tried to work in a cafe. Two to three hours here is comfortable rather than a negotiation — and the road outside is calm enough for a call.",
        (4, 4, 4, 4, 4, 5, 4, 3),
        ["work", "coffee", "meeting", "study"],
        ["work friendly", "wifi", "outlets", "vegan options", "outdoor seating"],
        ev={
            "wifi": "district.in's amenity list explicitly includes “Wifi” and “Work friendly”.",
            "outlets": "Guides note that many tables have plug points.",
            "noise": "Described as peaceful; the lane sits off the Carter Road traffic.",
            "seating": "Indoor and outdoor seating listed; large windows and natural light reported.",
            "work": "Listed work friendly; guides say it is good for a two-to-three-hour session.",
        },
        priceLevel=3, openingHours="Daily 8am–10:30pm",
        dataSource=["district.in", "mumbaipune.co.in"],
    ),
    C(
        "Kitchen Garden by Suzette", "St John Street", B,
        "Shop 8/9, Gasper Enclave, St John Street, opposite Gold's Gym, Pali Naka, Bandra West",
        "Fast wifi and a real salad, until the brunch crowd arrives at one and takes the quiet with them.",
        "Suzette's farm-to-table sibling: salads, sandwiches, a bakery counter, and the most reliably quick internet reported on this stretch.",
        "A genuine morning work cafe with a hard stop. Get in before eleven, take a wall table where the outlets are, and be finished by the time lunch turns the volume up.",
        (5, 3, 3, 4, 3, 4, 4, 3),
        ["work", "study", "meeting", "coffee"],
        ["fast wifi", "salads", "farm to table", "morning pick", "bakery"],
        ev={
            "wifi": "A remote-work blog measured roughly 45–60 Mbps, holding up even at lunch hour.",
            "outlets": "The same blog reports about one outlet per two tables, mostly along the side walls.",
            "noise": "Reported to get loud after 1pm with the brunch crowd; recommended before 11am.",
            "seating": "EazyDiner lists group seating; the room is described as generous for the stretch.",
            "work": "Recommended for morning work sessions by the same remote-work survey.",
        },
        priceLevel=2, websiteUrl="https://www.suzette.in",
        instagramUrl="https://instagram.com/kitchengardenbysuzette",
        openingHours="Daily 8am–11:30pm",
        dataSource=["eazydiner.com", "travelkismat.com"],
    ),
    C(
        "Taj Mahal Tea House", "St John Baptist Road", B,
        "36-A, Ground Floor, Sanatan Pereira Bungalow, St John Baptist Road, Bandra West, Mumbai 400050",
        "Forty teas, eighty seats and soft light in a Bandra bungalow. Does dates and deadlines equally well.",
        "Brooke Bond's tea house, open since 2015 in a converted bungalow designed by Ayaz and Zameer Basrai — 3,500 square feet, more than forty teas, indoor and outdoor seating, free wifi.",
        "The rare Bandra room that is calm enough to work in during the day and flattering enough to bring someone to at night. Sit inside for the quiet, outside for the street.",
        (4, None, 4, 4, 4, 4, 4, 5),
        ["date", "work", "meeting", "chill"],
        ["tea", "heritage building", "wifi", "outdoor seating", "quiet hours"],
        ev={
            "wifi": "Tripadvisor's amenity list includes free WiFi.",
            "noise": "Guides describe calm seating and soft lighting, and recommend it for laptop work in quiet hours.",
            "seating": "Wikipedia records roughly 80 seats across 3,500 sq ft, indoor and outdoor.",
            "date": "district.in tags the room as romantic; multiple guides list it as a date pick.",
        },
        priceLevel=2, openingHours="Daily 7:30am–11:30pm",
        dataSource=["tripadvisor.in", "district.in", "en.wikipedia.org", "eazydiner.com"],
        isFeatured=True,
    ),
    C(
        "Candies", "Pali Hill", B,
        "5AA Pali Hill, next to Learners Academy School, Bandra West, Mumbai 400050",
        "Four decades of Bandra on several floors and a terrace. Closed Mondays, crowded weekends, worth both.",
        "A self-service Bandra institution spread across multiple levels and open terraces. Chicken puffs, mutton rolls, quiche, cold coffee — the menu has barely needed to change.",
        "No other cafe here gives you this much choice of where to sit. Find a terrace corner on a weekday morning and you have the most generous seating in Bandra for the price of a cold coffee.",
        (None, None, 2, 5, 3, 3, 3, 3),
        ["chill", "coffee", "work"],
        ["institution", "terrace", "self service", "cheap", "closed mondays"],
        ev={
            "noise": "Reported as very crowded at weekends and calmer on weekday mornings.",
            "seating": "Tripadvisor and district.in both describe extensive seating across multiple levels and open terraces.",
        },
        priceLevel=2, websiteUrl="https://www.candiescafe.com",
        openingHours="Tue–Sun 8:30am–10:30pm · closed Mondays",
        dataSource=["candiescafe.com", "tripadvisor.com", "district.in"],
        isFeatured=True,
    ),
    C(
        "The Bagel Shop", "Carter Road", B,
        "30, Pali Mala Road, near Carter Road, Bandra West, Mumbai 400050",
        "Quiet, comfortable, and one of the few Bandra rooms where a two-person meeting is not a shouting match.",
        "A long-running bagel and sandwich cafe off Carter Road, with indoor and outdoor seating, wifi and step-free entry.",
        "The noise level is the selling point. If you need to actually hear a client, this is a better bet than anywhere on Linking Road.",
        (4, None, 4, 4, 3, 4, 4, 3),
        ["meeting", "work", "coffee", "study"],
        ["bagels", "wifi", "quiet", "pet friendly", "step-free entry"],
        ev={
            "wifi": "district.in's amenity list includes “Wifi” and “Work friendly”.",
            "noise": "A coworking guide describes a quiet atmosphere suited to meetings and brainstorming.",
            "seating": "Indoor and outdoor seating listed, plus step-free entry and a restroom.",
            "meeting": "Named in a work-cafe guide as an ideal spot for meetings.",
        },
        priceLevel=3, openingHours="Daily 9am–10:30pm",
        verificationStatus="needs_review",
        dataNote="One major listing marks this temporarily closed for dining while others show it trading. Call ahead before making the trip.",
        dataSource=["district.in", "tripadvisor.in", "eazydiner.com", "coworkingers.com"],
    ),
    C(
        "Blue Tokai Coffee Roasters — Perry Road", "Perry Road", B,
        "Shop 1, No. 33, Mayflower Building, Perry Road, New Kantwadi Lane, Bandra West, Mumbai 400050",
        "Small, functional, reliably good — the cafe you go to when you need the coffee to just be right.",
        "Blue Tokai's Bandra room is compact and unfussy: single-origin Indian beans, pour-over and press if you ask, a short food menu. Open from seven in the morning to nearly midnight, which is rarer here than it should be.",
        "For the hours as much as the beans. Very few Bandra cafes will take you at 7am or 11pm, and this one does both without treating either as unusual.",
        (4, None, None, 3, 4, 4, 3, 3),
        ["coffee", "work"],
        ["specialty coffee", "single origin", "pet friendly", "early opening", "late"],
        ev={
            "wifi": "The operator's own store page lists “WiFi available”.",
            "seating": "Described in guides as small but clean and functional, used for short work sessions.",
        },
        priceLevel=2,
        websiteUrl="https://stores.bluetokaicoffee.com/blue-tokai-coffee-roasters-bandra-cafe-bandra-west-mumbai-436738/Home",
        openingHours="Daily 7am–11:30pm",
        dataSource=["bluetokaicoffee.com", "district.in", "mumbaipune.co.in"],
    ),
    C(
        "The Yoga House", "Sherly Rajan Road", B,
        "Nargis Villa, Sherly Rajan Road, off Carter Road, Bandra West",
        "The quietest room in Bandra, in a bungalow behind Carter Road. Vegetarian, ayurvedic, genuinely calm.",
        "A yoga studio with a cafe attached, in an old villa off Carter Road. Pure vegetarian, ayurvedic principles, outdoor seating that reads as a treehouse.",
        "For the calm, which is not a marketing word here — this is the closest Bandra gets to silence at 4pm on a Saturday. Come to read, not to take calls.",
        (None, None, 5, 4, 3, 3, 3, 4),
        ["chill", "date", "study"],
        ["quietest", "vegetarian", "ayurvedic", "bungalow", "outdoor seating"],
        ev={
            "noise": "Guides describe calm surroundings and an outdoor space that “feels like a small treehouse”.",
            "seating": "EazyDiner lists outdoor seating; the cafe occupies an old villa rather than a shopfront.",
        },
        priceLevel=2, websiteUrl="https://www.yogahouse.in",
        openingHours="Daily 8am–9pm",
        verificationStatus="needs_review",
        dataNote="Only the road is published, not a street number. The address may not geocode to the door.",
        dataSource=["yogahouse.in", "eazydiner.com", "mumbaipune.co.in"],
    ),
    C(
        "Earth Cafe", "Waterfield Road", B,
        "Durga Chambers, Waterfield Road, Bandra West, Mumbai 400050",
        "All-vegan, garden-quiet, and unbothered by how long you stay.",
        "A plant-forward cafe with a terrace on Waterfield Road — tofu scramble, quinoa upma, falafel, and a bakery counter that does not treat vegan as a compromise.",
        "The terrace is the quietest outdoor seating on this stretch. It is expensive for what it is, and still the right call when you want to sit outside without traffic in your ear.",
        (None, None, 4, 4, 3, 3, 3, 4),
        ["chill", "date", "coffee"],
        ["vegan", "terrace", "quiet", "healthy", "bakery"],
        ev={
            "noise": "magicpin describes a serene, garden-like setting.",
            "seating": "magicpin lists a terrace for al fresco dining.",
        },
        priceLevel=4, websiteUrl="https://earthcafeindia.com",
        instagramUrl="https://instagram.com/earthcafeindia",
        openingHours="Daily 8am–10:30pm",
        verificationStatus="needs_review",
        dataNote="The operator publishes the building but no street number, so the geocoded pin may land mid-block.",
        dataSource=["earthcafeindia.com", "magicpin.in", "lbb.in"],
    ),
    C(
        "Mokai", "Pali Naka", B,
        "600–602, Hill Crest Building, Ground Floor, Dr Ambedkar Road, next to Arvind Store, Pali Naka, Bandra West",
        "Matcha, curved beige everything, and a queue of people photographing it. Better than that description suggests.",
        "A Japanese-leaning all-day cafe that moved from Chapel Road to Pali Naka in March 2026. Matcha and artisanal coffee, tornado eggs, okonomiyaki, laksa wonton.",
        "The design does most of the talking, but the kitchen is not coasting. Go on a weekday afternoon if you would rather look at the room than queue for it.",
        (None, None, 2, None, 4, 2, 2, 5),
        ["date", "coffee", "chill"],
        ["matcha", "design led", "japanese", "instagram famous", "brunch"],
        ev={
            "noise": "Press coverage and guides report steady crowds since the relocation.",
            "date": "Named a date pick by several Mumbai guides; described as design-led with soft neutral interiors.",
        },
        priceLevel=2, instagramUrl="https://instagram.com/mokaiindia",
        openingHours="Daily 8am–11:30pm",
        dataSource=["timeout.com", "curlytales.com", "district.in"],
    ),
    C(
        "Boojee Cafe", "Perry Road", B,
        "Shop 6, New Kantwadi Road, off Perry Cross Road, Bandra West, Mumbai 400050",
        "Very good breakfast, very little room. A weekday cafe pretending to be a weekend one.",
        "Clean-ingredient all-day breakfast — eggs, hash browns, sandwiches — in a small, social, deliberately unfancy room near Carter Road.",
        "The food earns the reputation. The seating does not: weekends put people on the pavement waiting. Come on a Tuesday morning and it is one of the better breakfasts in Bandra.",
        (None, None, 2, 2, 3, 2, 2, 3),
        ["coffee", "chill"],
        ["breakfast", "all day", "small room", "weekday pick"],
        ev={
            "noise": "Guides describe it as very social and crowded at weekends, with people waiting outside.",
            "seating": "Reported as not large, with limited seating.",
        },
        priceLevel=3, websiteUrl="https://boojeecafe.com",
        instagramUrl="https://instagram.com/boojeecafe",
        openingHours="Daily 7am–11pm",
        dataSource=["boojeecafe.com", "district.in", "mumbaipune.co.in"],
    ),
    C(
        "Veronica's", "Waroda Road", B,
        "Waroda Road, Ranwar, Bandra West, Mumbai 400050",
        "A sandwich shop with the ambition of a restaurant. Eat standing if you have to.",
        "Hunger Inc's artisanal sandwich counter on Waroda Road, ranked in the mid-thirties on an India top-50 restaurants list in 2024.",
        "The sandwiches are the reason and they are worth the trip. Do not plan a working session around it — the room is built for turnover, not for lingering.",
        (4, None, None, 2, 3, 2, 2, 3),
        ["coffee", "chill"],
        ["sandwiches", "wifi", "counter service", "takeaway"],
        ev={
            "wifi": "district.in lists “Wifi” among its amenities.",
            "seating": "A counter-service sandwich shop; reviewers note limited seating.",
        },
        priceLevel=3, websiteUrl="https://veronicasbombay.com",
        instagramUrl="https://instagram.com/veronicasbombay",
        verificationStatus="needs_review",
        dataNote="The operator publishes a Plus Code rather than a street number, and published hours conflict between sources.",
        dataSource=["veronicasbombay.com", "district.in"],
    ),
    C(
        "Poetry by Love and Cheesecake", "24th Road", B,
        "Shop 1–2, Ground Floor, Kamal Vishrantee Kutir, 24th Road, opposite St Theresa's School, Pali Hill, Bandra West",
        "A patisserie that lets you sit down until midnight. Underrated for exactly that.",
        "The Love & Cheesecake group's Bandra cafe, open since 2016 — a dessert-led all-day menu, live music some evenings, pet friendly, step-free.",
        "Almost nowhere in Pali Hill will still seat you at 11pm over a coffee and a slice of something. This will, without making it feel like a favour.",
        (None, None, None, None, 3, 3, 3, 4),
        ["date", "chill", "coffee"],
        ["patisserie", "desserts", "late", "pet friendly", "live music"],
        priceLevel=2, websiteUrl="https://loveandcheesecake.com/pages/poetry",
        instagramUrl="https://instagram.com/loveandcheesecake",
        openingHours="Daily 8am–midnight",
        dataSource=["loveandcheesecake.com", "district.in", "eazydiner.com"],
    ),
    C(
        "KCROASTERS by Koinonia", "Chuim Village", B,
        "66, Chuim Village, off Dr B.R. Ambedkar Road, Khar West, Mumbai 400052",
        "India's first dedicated siphon bar. Come for the brewing, not for the wifi.",
        "Koinonia's coffee lab sits in Chuim Village on the Bandra–Khar border, with live roasting and a siphon bar alongside a separate roastery and tasting room.",
        "If you care how the cup was made, this is the most instructive room in the neighbourhood. Treat it as a tasting stop rather than a place to settle in with a laptop.",
        (None, None, None, None, 5, 2, 2, 3),
        ["coffee"],
        ["specialty coffee", "roastery", "siphon", "tasting room"],
        websiteUrl="https://kcroasters.com",
        openingHours="Coffee Lab daily 8:30am–10pm",
        verificationStatus="needs_review",
        dataNote="Two conflicting street numbers are published, and it sits on the Bandra–Khar boundary rather than inside Bandra proper.",
        dataSource=["kcroasters.com", "lbb.in", "yappe.in"],
    ),

    # ═══════════════════════════════════════════════════════════════════════
    # ACTIVE — SOUTH BOMBAY (15)
    # ═══════════════════════════════════════════════════════════════════════
    C(
        "Kala Ghoda Cafe", "Kala Ghoda", SB,
        "10 Rope Walk Lane, Kala Ghoda, Fort, Mumbai 400001",
        "White walls, enormous glass doors, and the calm that Kala Ghoda's lanes are supposed to have.",
        "A small European-style day cafe in a heritage Kala Ghoda building, on Rope Walk Lane behind the museum. Open from eight in the morning until midnight.",
        "The room does the work: high light, low noise, and a location that puts the Jehangir and the museum within a two-minute walk. The most civilised place in Fort to spend a working morning.",
        (4, None, 4, None, 4, 4, 4, 4),
        ["work", "coffee", "meeting", "date"],
        ["heritage building", "wifi", "quiet", "all day", "art district"],
        ev={
            "wifi": "Listed in a Mumbai coworking guide's roundup of cafes with wifi.",
            "noise": "The same guide describes big white walls and enormous glass doors creating calmness.",
        },
        priceLevel=2, websiteUrl="https://kgcafe.in",
        instagramUrl="https://instagram.com/kgcbar",
        openingHours="Daily 8am–midnight",
        dataSource=["kgcafe.in", "eazydiner.com", "mumbaicoworking.com"],
        isFeatured=True,
    ),
    C(
        "Blue Tokai — New Excelsior", "Fort", SB,
        "Ground Floor, New Excelsior Cinema 1, A.K. Nayak Marg, Azad Maidan, Fort, Mumbai 400001",
        "Specialty coffee inside a 1930s cinema, with a terrace. The best-value work cafe in Fort.",
        "Blue Tokai's Fort outlet occupies the ground floor of the New Excelsior cinema building, with an open terrace, outdoor seating and wireless internet listed among its amenities.",
        "Cinema-building ceilings, a terrace, wifi the operator actually commits to, and a 7am open. For working mornings in Fort this is the first place to try.",
        (4, None, None, 4, 4, 4, 4, 3),
        ["work", "coffee", "meeting", "study"],
        ["specialty coffee", "wifi", "terrace", "heritage building", "early opening"],
        ev={
            "wifi": "The operator's own store page lists wireless internet connectivity as an amenity.",
            "seating": "Operator lists an open terrace and outdoor seating.",
        },
        priceLevel=2,
        websiteUrl="https://bluetokaicoffee.com/pages/blue-tokai-coffee-roasters-new-excelsior-cinema-fort",
        openingHours="Daily 7am–11pm",
        dataSource=["bluetokaicoffee.com"],
        isFeatured=True,
    ),
    C(
        "Araku Coffee", "Apollo Bunder", SB,
        "Ground Floor, Sunny House, Mandlik Road, Apollo Bandar, Colaba, Mumbai",
        "An 1897 building, a modbar, and a reading area someone actually curated. Behind the Taj, and worth finding.",
        "Araku's Mumbai flagship occupies the ground floor of Sunny House, built in 1897 — seed-to-cup coffee from the Araku Valley, an open kitchen, a curated reading area, and an upper level with a bakery and cocktail bar.",
        "The reading area is the tell: this is a cafe built for staying, not turning over. Downstairs in the afternoon for coffee and a book; upstairs in the evening if the evening is going well.",
        (None, None, None, 4, 5, 4, 4, 5),
        ["date", "coffee", "chill", "work"],
        ["specialty coffee", "heritage building", "reading area", "bakery", "cocktails"],
        ev={
            "seating": "The operator publishes a curated reading area and an upper level with bakery and cocktail bar.",
            "date": "EazyDiner describes it as ideal for coffee catch-ups and casual meals; serves alcohol.",
        },
        priceLevel=4, websiteUrl="https://www.arakucoffee.in",
        openingHours="Daily 8am–11pm",
        verificationStatus="needs_review",
        dataNote="Published closing time differs between the operator's site and listings — 11pm versus 9:30pm. Confirm before a late visit.",
        dataSource=["arakucoffee.in", "eazydiner.com", "baristamagazine.com"],
        isFeatured=True,
    ),
    C(
        "Subko — The Cacao Mill", "Colaba", SB,
        "2nd Pasta Lane, Colaba, Mumbai",
        "A cacao mill that also pours coffee. The most single-minded room on this map.",
        "Subko's Colaba site is a bespoke cacao mill working fine cacao alongside direct-trade and experimentally processed Indian coffee. Open nine to eleven, every day.",
        "Come for what you cannot get anywhere else in the city — bean-to-bar cacao made on the premises, next to coffee from the same sourcing discipline. Not a working cafe; a destination.",
        (None, None, None, None, 5, 3, 3, 4),
        ["coffee", "date"],
        ["specialty coffee", "cacao", "bean to bar", "roastery"],
        websiteUrl="https://www.subko.coffee",
        openingHours="Daily 9am–11pm",
        dataSource=["subko.coffee", "baristamagazine.com"],
        isFeatured=True,
    ),
    C(
        "Nandan Coffee", "Kala Ghoda", SB,
        "Mulla House, 34 Homi Modi Street, opposite Central Bank Head Office, Kala Ghoda, Fort, Mumbai",
        "Single-estate coffee from a Kodaikanal wildlife sanctuary, poured by people who want to explain it.",
        "An experience centre rather than a cafe in the usual sense: certified-organic single-estate coffee grown and roasted by the family that owns the estate, with a build-your-own-blend format.",
        "Come for the education. This is the most direct line in Bombay between an Indian coffee estate and the cup, and the staff will take the time if you ask a real question.",
        (None, None, 4, None, 5, 3, 3, 4),
        ["coffee", "date"],
        ["specialty coffee", "single estate", "organic", "pet friendly", "tasting"],
        ev={"noise": "district.in's aggregated reviews describe a very calm and positive vibe."},
        priceLevel=4, websiteUrl="https://www.nandancoffee.com",
        instagramUrl="https://instagram.com/nandancoffee",
        openingHours="Daily 8am–10pm",
        dataSource=["nandancoffee.com", "district.in", "baristamagazine.com"],
    ),
    C(
        "Starbucks — Horniman Circle", "Horniman Circle", SB,
        "Elphinstone Building, Ground Floor, 10 Horniman Circle, Veer Nariman Road, Fort, Mumbai 400001",
        "India's first Starbucks, in a colonial-era banking hall. The building is the reason to choose it.",
        "The chain's first Indian store, opened in October 2012 in the heritage Elphinstone Building, fitted out with Indian teakwood furniture and locally made floor designs.",
        "Nobody needs a recommendation to find a Starbucks. This one earns its place on a Bombay map because of the room it is in — double-height, stone, genuinely beautiful — and because it is the most predictable plug-and-wifi bet in Fort.",
        (4, 4, None, None, 3, 4, 4, 3),
        ["work", "meeting", "study", "coffee"],
        ["heritage building", "wifi", "outlets", "chain", "reliable"],
        ev={
            "wifi": "A city guide states that most Mumbai outlets have all-day free wifi — a chain-level claim, not confirmed for this store.",
            "outlets": "The same guide reports plug points near the tables across the chain's Mumbai outlets.",
        },
        websiteUrl="https://stores.starbucks.in/store-pages/starbucks-mumbai/",
        verificationStatus="needs_review",
        dataNote="Opening hours were not confirmed from an operator-owned page, and the wifi and outlet evidence is a chain-level claim rather than a statement about this store.",
        dataSource=["stories.starbucks.com", "lbb.in"],
    ),
    C(
        "Bombay Coffee House — Ballard Estate", "Ballard Estate", SB,
        "3A Sprotte Road, near Grand Hotel, S.S. Ram Gulam Marg, Ballard Estate, Fort, Mumbai",
        "Old-world room, generous portions, and the best interview table in Ballard Estate.",
        "An all-day coffee-and-desserts cafe in Ballard Estate with an old-world interior, wifi, and a reputation among local guides as a work-meeting and interview venue.",
        "Ballard Estate empties out after office hours and the quiet is the asset. If you have a conversation that needs an hour and no background noise, book this one.",
        (4, None, None, None, 4, 4, 5, 3),
        ["meeting", "work", "coffee"],
        ["wifi", "quiet", "interviews", "old world", "office district"],
        ev={
            "wifi": "LBB lists wifi among its amenities.",
            "meeting": "LBB states it is “a great place for work meetings and interviews”.",
        },
        priceLevel=3, openingHours="Daily 9am–9pm",
        verificationStatus="needs_review",
        dataNote="One listing files this address under Juhu, which appears to be an aggregator error, but the brand has more than one outlet. Confirm which one you are visiting.",
        dataSource=["eazydiner.com", "lbb.in"],
    ),
    C(
        "Kyani & Co.", "Marine Lines", SB,
        "Jer Mahal Estate, Jagannath Shankar Seth Road, Marine Lines, Mumbai 400002",
        "1904. Marble tables, slow fans, bun maska. The oldest room on this map and the least interested in changing.",
        "Widely described as Mumbai's oldest surviving Irani cafe, opened in 1904 opposite Metro Cinema — bun maska and Irani chai, mutton kheema pav, Irani omelette, its own bakery.",
        "Everything modern cafes reconstruct, this one simply kept: marble tops, aged wooden chairs, high ceilings, shared tables. Seating is limited and you may sit with strangers. That is the experience, not a flaw.",
        (1, None, None, 2, 2, 1, 1, 3),
        ["chill"],
        ["irani cafe", "institution", "since 1904", "bun maska", "cheap", "shared tables"],
        ev={
            "wifi": "A food-history account notes the cafe deliberately avoids modern amenities.",
            "seating": "The same account reports marble-top tables and aged wooden chairs, limited seating, and that patrons should expect to share tables.",
        },
        priceLevel=1,
        verificationStatus="needs_review",
        dataNote="Sources disagree on closing time and on whether it trades on Sundays.",
        dataSource=["eazydiner.com", "thetastytales.com"],
        isFeatured=True,
    ),
    C(
        "Cafe Mondegar", "Colaba", SB,
        "Metro House, Colaba Causeway, near Regal Cinema, Apollo Bandar, Colaba, Mumbai 400001",
        "Mario Miranda drew on every wall here in 1932 and the jukebox never really stopped. Loud, and unapologetic.",
        "Open since 1932, with Mario Miranda murals across the interior walls and entrance ceiling, and the first jukebox in Mumbai.",
        "Nobody comes here for the coffee. Come for the murals, the noise and one of the last rooms in Colaba that has not been redesigned — then go elsewhere to work.",
        (None, None, 1, None, 2, 1, 1, 3),
        ["chill"],
        ["irani cafe", "institution", "since 1932", "mario miranda", "loud"],
        ev={"noise": "Wikipedia records the first jukebox in Mumbai; the room is documented as a loud, music-led hangout."},
        openingHours="Daily 8am–11:30pm",
        dataSource=["en.wikipedia.org", "wheree.com"],
    ),
    C(
        "Leopold Cafe & Bar", "Colaba", SB,
        "Shahid Bhagat Singh Road, Colaba Causeway, Colaba, Mumbai",
        "Since 1871. Keeps its bullet marks on the wall as a memorial and its doors open until midnight.",
        "One of Colaba's oldest surviving Irani cafes, established 1871, central to the novel Shantaram, attacked in November 2008 and reopened four days later with the bullet marks preserved.",
        "It is a landmark before it is a cafe, and it knows that. Worth a table for an hour if you understand what you are sitting in; not the place for a quiet conversation.",
        (None, None, None, None, 2, 1, 2, 2),
        ["chill"],
        ["irani cafe", "institution", "since 1871", "landmark", "loud"],
        priceLevel=3, openingHours="Daily 7:30am–midnight",
        dataSource=["en.wikipedia.org", "eazydiner.com"],
    ),
    C(
        "Cafe Military", "Fort", SB,
        "Ali Chambers, Tamarind Lane, Fort, Mumbai",
        "One of the last real Irani cafes in Fort. Berry pulao, bare walls, no concessions.",
        "A surviving Irani-Parsi cafe on Tamarind Lane off Flora Fountain, serving berry pulao, keema and Parsi staples in a plain room. Closed Sundays.",
        "This is not a cafe in the sense the rest of this map means it — it is a canteen with ninety years of muscle memory. Go for the food and the fact that it still exists.",
        (None, None, None, None, 2, 1, 1, 2),
        ["chill"],
        ["irani cafe", "institution", "parsi food", "cheap", "closed sundays"],
        priceLevel=1, openingHours="Mon–Sat 8:30am–9:30pm · closed Sundays",
        dataSource=["eazydiner.com", "lbb.in"],
    ),
    C(
        "Ideal Corner", "Fort", SB,
        "12 F/G, Hornby View, Gunbow Street, Fort, Mumbai",
        "A twelve-table Parsi lunch room with a menu that changes by the day of the week. Get there by one.",
        "A tiny family-run Parsi canteen off Gunbow Street with a day-rotating menu — dhansak, sali boti — and a heavy office-lunch crowd. Closed Mondays.",
        "The rotating menu is the whole idea: turn up on the right day for the dish you want. Not a place to sit with a laptop, and it would be strange to try.",
        (None, None, 2, None, 2, 1, 1, 2),
        ["chill"],
        ["parsi food", "institution", "lunch only", "cheap", "closed mondays"],
        ev={"noise": "Guides describe a tiny room with a heavy office-lunch crowd and fast turnover."},
        priceLevel=1, openingHours="Tue–Sun 9am–4:30pm",
        dataSource=["eazydiner.com", "lbb.in"],
    ),
    C(
        "Yazdani Bakery", "Fort", SB,
        "Cawasji Patel Street, Fort, Mumbai",
        "Diesel-oven brun maska since 1953, in a building that started life as a Japanese bank.",
        "A Persian-style Irani bakery founded in 1953, baking in diesel ovens in an early twentieth-century building originally built for a Japanese bank. Passed to a new-generation owner in 2025.",
        "One of the genuinely irreplaceable rooms in the city. Go early, take the bread seriously, and check before you plan to sit down.",
        (None, None, None, 1, 2, 1, 1, 2),
        ["chill"],
        ["irani bakery", "institution", "since 1953", "brun maska", "cheap"],
        ev={"seating": "Wikipedia records that as of 2023 it was operating take-out only, with sit-down service closed."},
        priceLevel=1, openingHours="Daily 7am–7pm",
        verificationStatus="needs_review",
        dataNote="Reported as take-out only with sit-down service closed as of 2023. Confirm whether there is seating before going to sit.",
        dataSource=["en.wikipedia.org", "eazydiner.com"],
    ),
    C(
        "Third Wave Coffee — Churchgate", "Churchgate", SB,
        "Unit 116A, HP Petrol Pump, Jamshedji Tata Road, near Eros Cinema, Churchgate, Mumbai",
        "Two minutes from Churchgate station and open absurdly late. The commuter's coffee.",
        "A full Third Wave outlet by Eros Cinema — standard espresso and pour-over menu, air conditioning, table seating.",
        "Location is the entire argument: you can be off the train and into a seat in three minutes. Useful before a South Bombay meeting, and one of the later options in the area.",
        (None, None, None, 4, 4, 4, 3, 2),
        ["work", "coffee", "study"],
        ["specialty coffee", "chain", "near station", "late", "air conditioned"],
        ev={"seating": "The operator's store page lists air conditioning and table seating."},
        priceLevel=2,
        websiteUrl="https://stores.thirdwavecoffeeroasters.com/store-pages/third-wave-coffee-churchgate-mumbai/",
        verificationStatus="needs_review",
        dataNote="The operator's own page publishes an implausible round-the-clock schedule, so hours are unconfirmed here rather than guessed.",
        dataSource=["thirdwavecoffeeroasters.com"],
    ),
    C(
        "Blue Tokai — Nariman Point", "Nariman Point", SB,
        "Unit 25 & 26, Commercial Centre, CR2 Mall, Barrister Rajni Patel Marg, Nariman Point, Mumbai",
        "The closest decent coffee to Marine Drive, and the nearest thing Nariman Point has to a third place.",
        "Blue Tokai inside CR2 Mall at Nariman Point, with wireless internet listed among its amenities, pet friendly, mall parking.",
        "Nariman Point is an office district with almost nowhere to sit. This has wifi, air conditioning and a 7:30am open, and the promenade is a five-minute walk when you need to stop looking at a screen.",
        (4, None, None, None, 4, 4, 4, 2),
        ["work", "meeting", "coffee", "study"],
        ["specialty coffee", "wifi", "office district", "near marine drive", "parking"],
        ev={"wifi": "The operator's store page lists wireless internet as an amenity."},
        priceLevel=2,
        websiteUrl="https://stores.bluetokaicoffee.com/blue-tokai-coffee-roasters-nariman-point-cafe-nariman-point-mumbai-436767/Home",
        openingHours="Daily 7:30am–10pm",
        dataSource=["bluetokaicoffee.com", "eazydiner.com"],
    ),
]

# ═══════════════════════════════════════════════════════════════════════════
# PARKED — researched and real, held back to keep the live set at 30.
#
# Factual scores are null here rather than carried over: they were editorial
# guesses in an earlier pass and have not been re-sourced. An editor promoting
# one of these should source the four factual dimensions first.
# ═══════════════════════════════════════════════════════════════════════════
def P(name, hood, area, address, note, best_for, tags, fit, **kw):
    """A parked listing. `fit` is (coffee, work, meeting, date)."""
    coffee, work, meeting, date = fit
    return C(
        name, hood, area, address, note,
        kw.pop("desc", note),
        kw.pop("why", "Researched and real, held out of the live set to keep it tight. Source the factual dimensions before promoting it."),
        (None, None, None, None, coffee, work, meeting, date),
        best_for, tags,
        verificationStatus=kw.pop("verificationStatus", "unverified"),
        dataNote=kw.pop("dataNote", "Held out of the live set. Wi-Fi, outlets, noise and seating have not been sourced."),
        isActive=False,
        **kw,
    )


PARKED = [
    P("abCoffee — Hill Road", "Hill Road", B, "Ground Floor, Lumbini Building, Jarimari Road, Mandir Road, Bandra West",
      "A counter, not a cafe. Good espresso in ninety seconds and back out onto Hill Road.",
      ["coffee"], ["specialty coffee", "takeaway", "quick"], (4, 1, 1, 1),
      priceLevel=1, websiteUrl="https://www.abcoffee.in", openingHours="Daily 7am–11pm",
      dataSource=["abcoffee.in"]),
    P("Third Wave Coffee — BKC", "Bandra East", B, "Ground Floor, Platina, C-59, G Block, Bandra Kurla Complex, Bandra East, Mumbai 400098",
      "The BKC default. Predictable in the way you want when the meeting is in ten minutes.",
      ["work", "meeting", "coffee"], ["specialty coffee", "chain", "office district"], (4, 4, 4, 2),
      priceLevel=1, websiteUrl="https://cafe.thirdwavecoffee.in", dataSource=["thirdwavecoffee.in", "magicpin.in"]),
    P("Suzette Creperie & Cafe", "St John Street", B, "St John Street, Pali Naka, Bandra West",
      "Crepes done properly, in a room small enough that you will overhear the next table.",
      ["date", "coffee", "chill"], ["crepes", "french", "small room"], (3, 2, 3, 4),
      priceLevel=2, websiteUrl="https://www.suzette.in", instagramUrl="https://instagram.com/suzettemumbai",
      openingHours="Daily 9am–10:30pm", verificationStatus="needs_review",
      dataNote="No street or shop number is published for this outlet, and the factual dimensions are unsourced.",
      dataSource=["suzette.in", "eazydiner.com"]),
    P("Bombay Salad Co.", "16th Road", B, "Shop 1, 16th Road, Linking Road, Bandra West",
      "A salad bar that behaves like a canteen. Efficient, bright, not somewhere you settle in.",
      ["chill", "work"], ["salads", "healthy", "quick"], (2, 3, 3, 2),
      websiteUrl="https://bombaysaladco.com", openingHours="Daily 11am–11pm", dataSource=["bombaysaladco.com"]),
    P("The Nutcracker — Bandra", "St John Baptist Road", B, "C/2, Diamond Arch Cooperative Housing Society, John Baptist Road, Reclamation, Bandra West",
      "All-day breakfast that never went out of fashion because it never tried to be in it.",
      ["chill", "coffee", "date"], ["all day breakfast", "outdoor seating", "late"], (3, 3, 3, 3),
      priceLevel=2, openingHours="Daily 8am–midnight", dataSource=["district.in", "magicpin.in"]),
    P("Sequel — Bandra", "33rd Road", B, "Shop 2, Solace Building, 33rd Road, Bandra West, Mumbai 400050",
      "Gluten-free without the smugness. A health bistro you would go to even if you did not have to.",
      ["chill", "coffee", "meeting"], ["gluten free", "healthy", "juice bar"], (3, 3, 3, 3),
      websiteUrl="https://sequelmumbai.in", openingHours="Daily 8am–10:30pm", dataSource=["sequelmumbai.in", "lbb.in"]),
    P("Birdsong — The Organic Cafe", "Waroda Road", B, "Shop 1–5, Waroda Road, near Hill Road, Ranwar, Bandra West, Mumbai 400050",
      "All-organic, and historically unenthusiastic about laptops.",
      ["chill", "coffee"], ["organic", "vegan", "gluten free"], (3, 3, 3, 3),
      priceLevel=3, instagramUrl="https://instagram.com/birdsong.cafe", verificationStatus="needs_review",
      dataNote="Listed as temporarily closed by two aggregators; trading status unconfirmed.",
      dataSource=["district.in", "eazydiner.com", "tripadvisor.in"]),
    P("Bombay Sweet Shop — Kala Ghoda", "Kala Ghoda", SB, "Seksaria Chambers, 139 Nagindas Master Road, Kala Ghoda, Fort, Mumbai 400001",
      "Mithai redesigned from scratch, in a room that treats it like a patisserie should be treated.",
      ["chill", "date"], ["mithai", "desserts", "design led"], (2, 2, 2, 3),
      websiteUrl="https://bombaysweetshop.com/pages/kala-ghoda-cafe-retail-store",
      verificationStatus="needs_review", dataNote="Opening hours are not published for this outlet.",
      dataSource=["bombaysweetshop.com"]),
    P("Sequel — Kala Ghoda", "Kala Ghoda", SB, "Shop 6, Raja Bahadur Compound, Tamarind Lane, Kala Ghoda, Fort, Mumbai 400001",
      "Farm-to-table in the Fort lanes, for when the alternative is a thali or a chain.",
      ["meeting", "chill", "work"], ["farm to table", "healthy", "juice bar"], (3, 3, 3, 3),
      priceLevel=3, websiteUrl="https://sequelmumbai.in", openingHours="Daily 8am–10:30pm",
      verificationStatus="needs_review",
      dataNote="Two different addresses are published for this outlet — Tamarind Lane and VB Gandhi Marg.",
      dataSource=["sequelmumbai.in", "eazydiner.com"]),
    P("The Nutcracker — Kala Ghoda", "Kala Ghoda", SB, "Ground Floor, Unit 9, Modern House, Dr V.B. Gandhi Marg, opposite One Forbes Building, Kala Ghoda, Fort, Mumbai",
      "A small brunch room in the gallery lanes. Get there early on a Sunday or do not bother.",
      ["chill", "date", "coffee"], ["all day breakfast", "brunch", "small room"], (3, 3, 3, 4),
      priceLevel=4, websiteUrl="https://www.thenutcracker.in", openingHours="Daily 8am–11:30pm",
      dataSource=["eazydiner.com", "tripadvisor.com"]),
    P("abCoffee — Colaba Causeway", "Colaba", SB, "49A, Roman House, Colaba Causeway, opposite 3rd Pasta Lane, Apollo Bandar, Colaba, Mumbai 400005",
      "An espresso deck on the Causeway. In and out in two minutes, which is the point.",
      ["coffee"], ["specialty coffee", "takeaway", "quick"], (4, 1, 1, 1),
      websiteUrl="https://www.abcoffee.in", openingHours="Daily 8:30am–9:30pm", dataSource=["abcoffee.in"]),
    P("Mag St. — Colaba", "Colaba", SB, "Mandlik Road, Colaba, Mumbai",
      "All-day comfort food from the Magazine Street bakers, with a weekend brunch that fills up fast.",
      ["chill", "coffee", "date"], ["bakery", "all day", "weekend brunch"], (3, 3, 3, 3),
      instagramUrl="https://instagram.com/magstbreadco_", openingHours="Daily 8am–11:30pm",
      verificationStatus="needs_review", dataNote="Only the street is published for this outlet, with no building or number.",
      dataSource=["foodmatters.in"]),
    P("Mockingbird Cafe Bar", "Churchgate", SB, "80, Veer Nariman Road, Churchgate, Mumbai",
      "Books, a real record collection and wifi. A cafe-bar that reads better in the afternoon than the evening.",
      ["date", "chill", "work"], ["books", "music", "cafe bar"], (3, 3, 3, 4),
      priceLevel=4, openingHours="Daily 9:30am–12:30am", verificationStatus="needs_review",
      dataNote="Published hours differ between sources by around an hour at each end.",
      dataSource=["eazydiner.com", "mumbaicoworking.com"]),
    P("Suzette — Nariman Point", "Nariman Point", SB, "A1, Atlanta Building, Ground Floor, Nariman Point, Mumbai",
      "Buckwheat crepes a short walk from Marine Drive. Small, and better for two than for four.",
      ["date", "coffee", "chill"], ["crepes", "french", "gluten free"], (3, 2, 3, 4),
      priceLevel=3, websiteUrl="https://www.suzette.in", openingHours="Daily 9:30am–midnight",
      dataSource=["eazydiner.com", "suzette.in"]),
    P("Sassanian Restaurant & Bakery", "Marine Lines", SB, "98, Marine View, near Dhobi Talao, Marine Lines, Mumbai",
      "Serving the flavours of Iran near Dhobi Talao since 1913, with the bakery still in the building.",
      ["chill"], ["irani cafe", "institution", "since 1913", "bakery"], (2, 1, 1, 2),
      priceLevel=2, openingHours="Daily 8am–8:45pm", dataSource=["district.in"]),
    P("Cafe Dela Paix", "Girgaon", SB, "67, Avantikabai Gokhale Marg, Opera House, Girgaum, Mumbai",
      "A neighbourhood Parsi cafe near Opera House that nobody has thought to gentrify yet.",
      ["chill"], ["parsi", "neighbourhood cafe", "cheap"], (2, 2, 2, 2),
      priceLevel=1, openingHours="Daily 10am–10pm", dataSource=["eazydiner.com", "district.in"]),
    P("B. Merwan & Co.", "Grant Road", SB, "Opposite Grant Road Station, Alibhai Premji Road, Grant Road East, Mumbai",
      "Come for the mawa cake, before it runs out. Cash only, wooden chairs, marble tops.",
      ["chill"], ["parsi bakery", "institution", "mawa cake", "cash only"], (2, 1, 1, 2),
      priceLevel=1, openingHours="Daily 7am–6pm", dataSource=["district.in"]),
    P("Subko — The Craftery", "Byculla", SB, "Unit 2, JAK Compound, Byculla East, Mumbai",
      "The production side of Subko, open to anyone who turns up. Byculla's best argument for going to Byculla.",
      ["coffee", "chill", "work"], ["specialty coffee", "roastery", "production site"], (5, 3, 3, 3),
      websiteUrl="https://www.subko.coffee", openingHours="Daily 8am–10pm", dataSource=["subko.coffee"]),
    P("Cafe Excelsior", "Fort", SB, "23, A.K. Nayak Marg, Fort, Mumbai",
      "An old corner cafe opposite an old cinema, now serving more Chinese than Irani. Still the room it always was.",
      ["chill"], ["institution", "irani lineage", "cheap"], (2, 2, 2, 2),
      priceLevel=2, openingHours="Daily 8am–11pm", dataSource=["eazydiner.com", "district.in"]),
]


def slugify(name, hood):
    base = unicodedata.normalize("NFKD", f"{name} {hood}").encode("ascii", "ignore").decode()
    return re.sub(r"-+", "-", re.sub(r"[^a-zA-Z0-9]+", "-", base).strip("-").lower())


def gmaps(name, address):
    q = f"{name}, {address}, Mumbai"
    return "https://www.google.com/maps/search/?api=1&query=" + q.replace(" ", "%20").replace(",", "%2C")


def build():
    rows, seen = [], set()
    for raw in ACTIVE + PARKED:
        slug = slugify(raw["name"], raw["neighborhood"])
        if slug in seen:
            raise SystemExit(f"Duplicate slug {slug!r}")
        seen.add(slug)

        scores = raw["scores"]
        evidence = raw["evidence"]

        # Rule 2, enforced at build time: a factual score without evidence is a
        # guess, and this is where it gets caught rather than shipped.
        for key in FACTUAL:
            if scores[key] is not None and not evidence.get(key):
                raise SystemExit(
                    f"{slug}: '{key}' is scored {scores[key]} with no evidence. "
                    f"Add a sourced sentence to ev={{}} or set the score to None."
                )

        rows.append({
            "id": slug,
            "slug": slug,
            "name": raw["name"],
            "editorialNote": raw["editorialNote"],
            "description": raw["description"],
            "whyWeRecommend": raw["whyWeRecommend"],
            "area": raw["area"],
            "neighborhood": raw["neighborhood"],
            "address": raw["address"],
            # No coordinates, by design. scripts/geocode-cafes.ts fills these.
            "lat": None,
            "lng": None,
            "googleMapsUrl": raw.get("googleMapsUrl") or gmaps(raw["name"], raw["address"]),
            "websiteUrl": raw.get("websiteUrl"),
            "instagramUrl": raw.get("instagramUrl"),
            "imageUrl": raw.get("imageUrl"),
            "priceLevel": raw.get("priceLevel"),
            "scores": scores,
            "evidence": evidence,
            "bestFor": raw["bestFor"],
            "tags": raw["tags"],
            "openingHours": raw.get("openingHours"),
            "verificationStatus": raw.get("verificationStatus", "editorial"),
            "dataSource": raw.get("dataSource", []),
            "lastVerifiedAt": raw.get("lastVerifiedAt", "2026-08-23"),
            "dataNote": raw.get("dataNote"),
            "isFeatured": raw.get("isFeatured", False),
            "isActive": raw.get("isActive", True),
        })

    out = Path(__file__).resolve().parent.parent / "data" / "cafes.json"
    out.write_text(json.dumps({"cafes": rows}, indent=2, ensure_ascii=False) + "\n")

    active = [r for r in rows if r["isActive"]]
    print(f"wrote {len(rows)} cafes -> {out}")
    print(f"  active {len(active)}  ·  parked {len(rows) - len(active)}")
    for a in ("bandra", "south-bombay"):
        sub = [r for r in active if r["area"] == a]
        print(f"  {a}: {len(sub)} across {len({r['neighborhood'] for r in sub})} neighbourhoods")
    print(f"  with coordinates: {len([r for r in rows if r['lat'] is not None])} (expected 0 before geocoding)")
    ev_counts = {k: len([r for r in active if r["evidence"][k]]) for k in S}
    print(f"  evidence coverage (active): {ev_counts}")


if __name__ == "__main__":
    build()
