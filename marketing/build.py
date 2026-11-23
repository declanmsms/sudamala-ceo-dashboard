"""Build marketing/data.js from the raw files collected on 23 Nov 2026.

Raw files (marketing/raw/*.json) stay local: they hold full review text and Google reviewer names.
The published data.js keeps no names and only short excerpts.
Run: python marketing/build.py
"""
import json, re, datetime as dt
from collections import Counter, defaultdict
from pathlib import Path

RAW = Path(__file__).parent / "raw"
OUT = Path(__file__).parent / "data.js"
TODAY = dt.date(2026, 11, 23)
load = lambda n: json.loads((RAW / n).read_text(encoding="utf-8"))

RESORTS = [
    ("ubud", "Ubud", "Bali"), ("sanur", "Sanur", "Bali"), ("amed", "Amed Lodge", "Bali"),
    ("senggigi", "Senggigi", "Lombok"), ("komodo", "Komodo", "Flores"), ("seraya", "Seraya", "Flores"),
]

def excerpt(t, n=170):
    t = re.sub(r"<br\s*/?>", " ", t or "")
    t = re.sub(r"\s+", " ", t).strip()
    if len(t) <= n: return t
    cut = t[:n].rsplit(" ", 1)[0].rstrip(",.;:-")
    return cut + "…"

# ---------- Topic rules (English text) ----------
TOPICS = {
    "Staff and service": r"\bstaff|service|friendly|helpful|welcom|hospitab|team\b|attentive",
    "Breakfast": r"breakfast",
    "Food and restaurant": r"\bfood|restaurant|dinner|lunch|meal|dish|chef|menu|pasta|cocktail",
    "Pool": r"\bpool",
    "Room": r"\broom|suite|villa|bed\b|bathroom|shower|air ?con|aircon",
    "Cleanliness": r"clean|dirty|dust|mould|mold|damp|smell",
    "Location and beach": r"location|beach|snorkel|view|located",
    "Quiet and calm": r"quiet|peace|tranquil|relax|calm|oasis",
    "Noise": r"noise|noisy|loud|barking|dog|rooster|chicken|construction",
    "Upkeep and age": r"dated|tired|old|maintenance|broken|repair|refresh|leak|gap|showing its age",
    "Value": r"value|price|expensive|cost|money",
    "Spa": r"\bspa\b|massage|treatment",
    "Wi-Fi": r"wi-?fi|internet",
    "Insects": r"mosquito|insect|ant\b|ants\b|bug",
    "Transfers and access": r"airport|transfer|traffic|boat|drive|far from",
}
TOPIC_RE = {k: re.compile(v, re.I) for k, v in TOPICS.items()}
def topics_in(text): return [k for k, rx in TOPIC_RE.items() if text and rx.search(text)]

# ---------- Google ----------
listings = load("google-listings.json")["properties"]
by_feature = {p["feature_id"]: p for p in listings}
gdata = load("google-1.json")["data"]["alexandria"] + load("google-2.json")["data"]["alexandria"]
google_reviews, google_sample = [], {}
for block in gdata:
    d = block["data"]; p = by_feature[d["feature_id"]]
    rs = d["reviews"]
    google_sample[p["id"]] = {"n": len(rs), "replied": sum(1 for r in rs if r.get("owner_response")),
                              "avg5": round(sum(r["rating"] for r in rs) / len(rs), 2)}
    for r in rs:
        date = dt.datetime.fromtimestamp(r["published_at_ms"] / 1000, dt.timezone(dt.timedelta(hours=8))).date()
        text = r.get("text") or ""
        google_reviews.append({"resort": p["id"], "site": "Google", "date": date.isoformat(), "score": r["rating"] * 2,
                               "raw": f"{r['rating']}/5", "replied": bool(r.get("owner_response")),
                               "text": excerpt(text), "praise": topics_in(text) if r["rating"] >= 4 else [],
                               "complaints": topics_in(text) if r["rating"] <= 3 else [], "country": "", "traveller": ""})

# ---------- Booking.com ----------
bk = load("booking.json")["hotels"]
def parse_sum(s):
    m = re.match(r"([\d.]+)\s+(.*?)\s+·\s+([\d,]+) reviews", s or "")
    return (float(m.group(1)), int(m.group(3).replace(",", ""))) if m else (None, None)
booking_reviews, booking_summary = [], {}
for rid, h in bk.items():
    score, count = parse_sum(h["sum"]["score"])
    subs = {}
    for part in (h["sum"]["sub"] or "").split(";"):
        m = re.match(r"\s*(.+?)\s+([\d.]+)$", part)
        if m: subs[m.group(1).replace("Free WiFi", "Wi-Fi")] = float(m.group(2))
    booking_summary[rid] = {"score": score, "reviews": count, "subscores": subs}
    for row in h["rows"]:
        f = [x.strip() for x in row.split(" | ")]
        if len(f) < 9: continue
        date = dt.datetime.strptime(f[0], "%d %B %Y").date()
        liked, disliked = f[6], f[7]
        if re.fullmatch(r"(nothing|none|n/?a|-|no)\.?( really)?", disliked.strip(), re.I): disliked = ""
        text = " ".join(x for x in [("Liked: " + liked) if liked else "", ("Disliked: " + disliked) if disliked else ""] if x)
        booking_reviews.append({"resort": rid, "site": "Booking.com", "date": date.isoformat(), "score": float(f[1]),
                                "raw": f"{f[1]}/10", "replied": f[8] == "Y", "text": excerpt(text, 220) or excerpt(f[5]),
                                "title": excerpt(f[5], 90), "praise": topics_in(liked), "complaints": topics_in(disliked),
                                "country": f[2], "traveller": f[3]})

# ---------- Agoda ----------
AG_ID = {"Ubud": "ubud", "Komodo": "komodo", "Sanur": "sanur", "Amed": "amed", "Senggigi": "senggigi", "Seraya": "seraya"}
agoda_reviews, agoda_summary = [], {}
for prop in load("agoda.json")["properties"]:
    rid = next(v for k, v in AG_ID.items() if k in prop["name"])
    rs = prop["reviews"]
    agoda_summary[rid] = {"score": prop["score"], "reviews": prop["count"],
                          "reply": {"n": len(rs), "replied": sum(1 for r in rs if r.get("resp"))} if rs else None}
    for r in rs:
        body = " ".join(x for x in [r.get("x"), r.get("p"), r.get("n")] if x)
        body = re.sub(r"manager, Martin", "manager", body)  # keep staff names out of an accusation
        agoda_reviews.append({"resort": rid, "site": "Agoda", "date": r["d"][:10], "score": float(r["r"]), "raw": f"{r['r']}/10",
                              "replied": bool(r.get("resp")), "text": excerpt(body, 220), "title": excerpt(r.get("t") or "", 90),
                              "praise": topics_in(body) if r["r"] >= 8 else [], "complaints": topics_in(body) if r["r"] < 7 else [],
                              "country": r.get("c") or "", "traveller": r.get("g") or ""})

# ---------- tiket.com (mostly Indonesian guests; reply flag not readable) ----------
tk = load("tiket.json")["resorts"]
tiket_reviews, tiket_summary = [], {}
TK_TRIP = {"Couple Trip": "Couple", "Family Trip": "Family", "Trip with Friends": "Group", "Solo Trip": "Solo traveller", "Business Trip": "Business"}
for rid, v in tk.items():
    hd = v["head"]
    tiket_summary[rid] = {"rating5": float(hd["rating"]), "reviews": int(hd["count"]), "subs": hd.get("subs", {}), "topics": hd.get("topics", [])}
    for r in v["rows"]:
        tiket_reviews.append({"resort": rid, "site": "tiket.com", "date": dt.datetime.strptime(r["date"], "%d %b %Y").date().isoformat(),
                              "score": round(r["score"] * 2, 1), "raw": f"{r['score']}/5", "replied": None,
                              "text": excerpt(r["text"], 220), "praise": [], "complaints": [], "country": "", "traveller": TK_TRIP.get(r.get("trip"), "")})

# ---------- Traveloka (scores only) and forum threads ----------
tv = load("traveloka.json")["resorts"]
community = load("community.json")["threads"]

reviews = sorted(google_reviews + booking_reviews + agoda_reviews + tiket_reviews, key=lambda r: r["date"], reverse=True)

# ---------- Tripadvisor / Agoda ----------
ta = load("tripadvisor-agoda.json")
trip = {p["id"]: p for p in ta["tripadvisor"]["properties"]}

# ---------- Ratings table ----------
ratings = []
for rid, short, island in RESORTS:
    g = next(p for p in listings if p["id"] == rid)
    b = booking_summary.get(rid, {})
    t = trip.get(rid)
    parts = [(g["rating"] * 2, g["review_count"]), (b.get("score"), b.get("reviews"))]
    if t: parts.append((t["rating5"] * 2, t["reviews"]))
    a, k, v = agoda_summary.get(rid), tiket_summary.get(rid), tv.get(rid)
    if a: parts.append((a["score"], a["reviews"]))
    if k: parts.append((k["rating5"] * 2, k["reviews"]))
    if v: parts.append((v["rating10"], v["reviews"]))
    tot = sum(n for s, n in parts if s and n)
    blended = round(sum(s * n for s, n in parts if s and n) / tot, 2) if tot else None
    ratings.append({"id": rid, "name": short, "island": island,
                    "google": {"rating": g["rating"], "reviews": g["review_count"]},
                    "booking": {"score": b.get("score"), "reviews": b.get("reviews")},
                    "tripadvisor": {"rating": t["rating5"], "reviews": t["reviews"]} if t else None,
                    "agoda": a, "tiket": k, "traveloka": {"score": v["rating10"], "reviews": v["reviews"]} if v else None,
                    "blended10": blended, "total_reviews": tot,
                    "subscores": b.get("subscores", {}),
                    "google_reply": google_sample.get(rid),
                    "booking_reply": {"n": len(br), "replied": sum(1 for r in br if r["replied"])} if (br := [r for r in booking_reviews if r["resort"] == rid]) else None})
competitors = [{"name": p["name"].replace(", Bali", ""), "rating": p["rating"], "reviews": p["review_count"], "us": not p["competitor"]}
               for p in listings if p["competitor"] or p["id"] == "ubud"]

# ---------- Volume-adjusted score: Google stars x (our reviews / area competitors' average reviews), ratio capped at 1 ----------
cm = load("competitors-maps.json")["areas"]
cm["ubud"] = {"label": "Ubud", "competitors": [[c["name"], c["rating"], c["reviews"]] for c in competitors if not c["us"]]}
def vol_adj(stars, n, avg_n): return round(stars * 2 * min(1, n / avg_n), 2)
areas = {}
for r in ratings:
    comp = cm[r["id"]]["competitors"]
    avg_n = sum(c[2] for c in comp) / len(comp)
    avg_r = sum(c[1] for c in comp) / len(comp)
    g = r["google"]
    r["volume"] = {"area": cm[r["id"]]["label"], "avg_reviews": round(avg_n), "avg_rating": round(avg_r, 2),
                   "ratio": round(g["reviews"] / avg_n, 3), "score10": vol_adj(g["rating"], g["reviews"], avg_n)}
    areas[r["id"]] = [{"name": c[0], "rating": c[1], "reviews": c[2], "score10": vol_adj(c[1], c[2], avg_n)} for c in comp]

# ---------- Topics and guest origin (Booking, last 90 days) ----------
recent = [r for r in booking_reviews if (TODAY - dt.date.fromisoformat(r["date"])).days <= 90]
praise = Counter(t for r in recent for t in r["praise"])
complaints = Counter(t for r in recent for t in r["complaints"])
compl_by_resort = defaultdict(Counter)
for r in recent:
    for t in r["complaints"]: compl_by_resort[t][r["resort"]] += 1
countries = Counter(r["country"] for r in booking_reviews + agoda_reviews if r["country"] and r["country"] not in ("Vaaraki",))
TRAV = {"Couple": "Couple", "Family with young children": "Family", "Family with teens": "Family", "Family": "Family", "Solo traveler": "Solo traveller", "Business traveler": "Business"}
travellers = Counter(TRAV.get(r["traveller"], r["traveller"]) for r in booking_reviews + agoda_reviews if r["traveller"])

# ---------- Instagram ----------
ig = load("instagram.json")
acc = {a["handle"]: a for a in ig["accounts"]}
posts = []
for line in ig["posts_tsv"]:
    h, path, likes, comments, date, cap = line.split("\t")
    posts.append({"handle": h, "url": f"https://www.instagram.com/{path}/", "kind": "Reel" if path.startswith("reel") else "Post",
                  "likes": int(likes), "comments": int(comments), "date": date, "caption": excerpt(cap, 110),
                  "collab": "collab" in cap})
ig_accounts = []
for h, a in acc.items():
    mine = [p for p in posts if p["handle"] == h]
    avg = sum(p["likes"] + p["comments"] for p in mine) / len(mine) if mine else 0
    last = max((p["date"] for p in mine), default=None)
    ds = sorted({p["date"] for p in mine})
    gap = max(((dt.date.fromisoformat(ds[i + 1]) - dt.date.fromisoformat(ds[i])).days, ds[i], ds[i + 1]) for i in range(len(ds) - 1)) if len(ds) > 1 else None
    ig_accounts.append({"gap_days": gap[0] if gap else None, "gap_from": gap[1] if gap else None, "gap_to": gap[2] if gap else None,
                        "days_since_last": (TODAY - dt.date.fromisoformat(last)).days if last else None, "handle": h, "name": a["name"], "resort": a["resort"], "followers": a["followers"],
                        "followers_approx": a.get("followers_approx", False), "posts_total": a["posts"],
                        "sample": len(mine), "avg_engagement": round(avg, 1),
                        "engagement_rate": round(avg / a["followers"] * 100, 2) if a["followers"] else None,
                        "last_post": last})
ig_accounts.sort(key=lambda a: -a["followers"])
top_posts = sorted([p for p in posts if not p["collab"]], key=lambda p: -(p["likes"] + p["comments"]))[:6]
dates = sorted({p["date"] for p in posts if p["handle"] != "sudamalaresorts"})
gaps = [(dates[i], dates[i + 1], (dt.date.fromisoformat(dates[i + 1]) - dt.date.fromisoformat(dates[i])).days) for i in range(len(dates) - 1)]
biggest_gap = max(gaps, key=lambda g: g[2])

# ---------- TikTok / Facebook ----------
tf = load("tiktok-facebook.json")
tt = tf["tiktok"]
tt_videos = [{"id": v[0], "views": v[1], "caption": v[2],
              "date": dt.datetime.fromtimestamp(int(v[0]) >> 32, dt.timezone.utc).date().isoformat()} for v in tt["videos"]]
fb = tf["facebook"]["pages"]

data = {
    "collected": "2026-11-23",
    "ratings": ratings, "competitors": competitors, "areas": areas,
    "reviews": reviews,
    "topics": {"praise": praise.most_common(8), "complaints": complaints.most_common(8),
               "complaints_where": {k: v.most_common(3) for k, v in compl_by_resort.items()},
               "window_reviews": len(recent)},
    "origin": {"countries": countries.most_common(10), "indonesia": countries.get("Indonesia", 0), "travellers": travellers.most_common(6), "n": len(booking_reviews) + len(agoda_reviews)},
    "community": community,
    "instagram": {"accounts": ig_accounts, "top_posts": top_posts, "posts_sampled": len(posts),
                  "biggest_gap": {"from": biggest_gap[0], "to": biggest_gap[1], "days": biggest_gap[2]}},
    "tiktok": {"account": tt["accounts"][0], "videos": tt_videos},
    "facebook": fb,
    "gaps": [
        "Tripadvisor review text: its review pages refuse automated visits (HTTP 403); only overall ratings and forum thread titles are included.",
        "Traveloka: scores for Sanur and Komodo only; the other four pages were not found before Firecrawl credits ran out.",
        "tiket.com: the page does not show whether the hotel replied, so reply rates are not counted there.",
        "Expedia and Hotels.com: not collected yet.",
        "Reddit: not reachable with the current tools.",
        "TikTok guest videos: TikTok search asked for a CAPTCHA, so only Sudamala's own account is included.",
        "Instagram and Facebook reach, saves and video views need access to Sudamala's own Meta Business Suite.",
    ],
}
OUT.write_text("// Generated by marketing/build.py from public data collected on 23 Nov 2026. No reviewer names.\n"
               "export const DATA = " + json.dumps(data, ensure_ascii=False, indent=1) + ";\n", encoding="utf-8")
print("reviews", len(reviews), "| booking 90d", len(recent), "| praise", praise.most_common(5), "| complaints", complaints.most_common(6))
print("countries", countries.most_common(6)); print("travellers", travellers.most_common(4))
print("gap", biggest_gap, [(a["handle"], a["gap_days"], a["gap_from"], a["gap_to"]) for a in ig_accounts]); print("indonesia", countries.get("Indonesia",0), "booking reply", [(r["id"], r["booking_reply"]) for r in ratings]); print("top", [(p["handle"], p["likes"]) for p in top_posts])
print("ig", [(a["handle"], a["engagement_rate"], a["last_post"]) for a in ig_accounts])
print("volume", [(r["id"], r["volume"]["score10"], r["volume"]["avg_reviews"]) for r in ratings])
print("tiktok last", tt_videos[0]["date"], "| blended", [(r["id"], r["blended10"], r["total_reviews"]) for r in ratings])
print("booking replied flags", Counter(row.split(' | ')[-1] for h in bk.values() for row in h['rows']))
