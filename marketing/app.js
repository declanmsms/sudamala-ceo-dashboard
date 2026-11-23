// Sudamala marketing page: real public data collected 23 Nov 2026 (see marketing/build.py).
// All text goes in via textContent (never innerHTML).
import { DATA } from "./data.js";

/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const SVGNS = "http://www.w3.org/2000/svg";
function h(tag, props, ...kids) { const el = document.createElement(tag); set(el, props); add(el, kids); return el; }
function s(tag, props, ...kids) { const el = document.createElementNS(SVGNS, tag); set(el, props); add(el, kids); return el; }
function set(el, p) { if (!p) return; for (const [k, v] of Object.entries(p)) { if (v == null || v === false) continue; if (k === "class") el.setAttribute("class", v); else if (k === "text") el.textContent = v; else if (k === "style") Object.assign(el.style, v); else if (k.startsWith("on")) el.addEventListener(k.slice(2), v); else el.setAttribute(k, v === true ? "" : v); } }
function add(el, kids) { for (const k of kids.flat(Infinity)) { if (k == null || k === false) continue; el.append(k instanceof Node ? k : document.createTextNode(String(k))); } }
const clear = el => { while (el.firstChild) el.removeChild(el.firstChild); return el; };
const nf = new Intl.NumberFormat("en-US");
const fix = (v, dp = 0) => (Math.round(v * 10 ** dp) / 10 ** dp).toFixed(dp);
const pct = (a, b) => (b ? Math.round(a / b * 100) : 0);
const C = { crit: "#b42318", watch: "#b07800", watchInk: "#7a5600", ok: "#2b6e46", okRing: "#7fae92" };
const WORD = { critical: "Fix now", watch: "Watch", ok: "On track" };
function icon(sev, size = 18) {
  const svg = s("svg", { width: size, height: size, viewBox: "0 0 20 20", "aria-hidden": "true", focusable: "false" });
  const bang = f => { const g = s("g", { fill: f }); g.append(s("rect", { x: 8.9, y: 4.4, width: 2.2, height: 7, rx: 1 }), s("rect", { x: 8.9, y: 13, width: 2.2, height: 2.2, rx: 1.1 })); return g; };
  if (sev === "critical") svg.append(s("circle", { cx: 10, cy: 10, r: 9.5, fill: C.crit }), bang("#fff"));
  else if (sev === "watch") svg.append(s("circle", { cx: 10, cy: 10, r: 8.6, fill: "#fff8e6", stroke: C.watch, "stroke-width": 1.9 }), bang(C.watchInk));
  else svg.append(s("circle", { cx: 10, cy: 10, r: 8.6, fill: "#eef6f1", stroke: C.okRing, "stroke-width": 1.6 }), s("path", { d: "M6 10.4 L8.8 13.1 L14.2 7.4", fill: "none", stroke: C.ok, "stroke-width": 1.9, "stroke-linecap": "round", "stroke-linejoin": "round" }));
  return svg;
}
const chip = (sev, word) => h("span", { class: "status status-" + (sev === "ok" ? "ontrack" : sev) }, icon(sev), word || WORD[sev]);
const fmtDate = iso => new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const NAME = Object.fromEntries(DATA.ratings.map(r => [r.id, r.name]));
const ACC_NAME = { sudamalaresorts: "Group", sudamalakomodo: "Komodo", sudamalaseraya: "Seraya", sudamalasenggigi: "Senggigi", sudamalasanur: "Sanur", sudamalaubud: "Ubud", amedlodge: "Amed Lodge" };

/* ---------- derived numbers ---------- */
const R = DATA.ratings;
const totalReviews = R.reduce((a, r) => a + r.total_reviews, 0);
const blended = R.reduce((a, r) => a + r.blended10 * r.total_reviews, 0) / totalReviews;
const replySample = R.reduce((a, r) => { for (const x of [r.google_reply, r.booking_reply]) if (x) { a.n += x.n; a.y += x.replied; } return a; }, { n: 0, y: 0 });
const IG = DATA.instagram.accounts;
const igFollowers = IG.reduce((a, x) => a + x.followers, 0);
const paused = IG.filter(a => a.gap_days >= 25 && a.handle !== "sudamalaresorts");
const ubud = R.find(r => r.id === "ubud");
const noBookingReply = R.filter(r => r.booking_reply && r.booking_reply.n >= 10 && r.booking_reply.replied === 0);
const komodoIG = IG.find(a => a.handle === "sudamalakomodo"), ubudIG = IG.find(a => a.handle === "sudamalaubud");
const tt = DATA.tiktok;
const ttMonths = Math.round((new Date(DATA.collected) - new Date(tt.videos[0].date)) / (30.4 * 86400000));
const complaints = DATA.topics.complaints;

/* ---------- verdict ---------- */
function verdict() {
  const el = $("#verdict");
  el.append(chip("critical", "Fix now"), h("br"),
    h("strong", { text: `Guests love us (${fix(blended, 1)}/10 from ${nf.format(totalReviews)} reviews), but we answer only ${pct(replySample.y, replySample.n)}% of them` }),
    `, and ${paused.length} of ${IG.length - 1} resort Instagram accounts went quiet for a month.`);
}

/* ---------- tiles ---------- */
function tiles() {
  const t = [
    { hero: true, label: "Average review score", helper: "Google, Booking.com and Tripadvisor, weighted by number of reviews", value: fix(blended, 1), unit: "/10",
      change: `${nf.format(totalReviews)} public reviews across the six resorts`, sev: "ok" },
    { label: "Reply rate", helper: "Newest reviews with a reply from us", value: pct(replySample.y, replySample.n) + "%", bad: true,
      change: `${replySample.y} of ${replySample.n} newest Google and Booking.com reviews`, sev: "critical" },
    { label: "Ubud on Google", helper: "Newest resort, 4 strong competitors", value: fix(ubud.google.rating, 1), unit: "/5",
      change: `${ubud.google.reviews} reviews; competitors have 946 to 4,200`, sev: "watch" },
    { label: "Instagram followers", helper: "Seven accounts combined", value: nf.format(igFollowers),
      change: `Komodo has ${nf.format(komodoIG.followers)} of them`, sev: null },
    { label: "Likes per post", helper: "Average likes and comments, 76 newest posts", value: fix(DATA.instagram.top_posts && avgEng(), 0),
      change: "Under 1% of followers on most accounts", sev: "watch" },
    { label: "TikTok followers", helper: "@sudamalaresorts, the only account", value: nf.format(tt.account.followers), bad: true,
      change: `No new video for ${ttMonths} months`, sev: "critical" },
  ];
  const wrap = $("#tiles");
  for (const x of t) {
    wrap.append(h("div", { class: "tile" + (x.hero ? " tile-hero" : ""), tabindex: "0", role: "group", "aria-label": `${x.label}: ${x.value}${x.unit || ""}. ${x.change}.` },
      h("div", { class: "tile-label", text: x.label }), h("div", { class: "helper", text: x.helper }),
      h("div", { class: "tile-num" + (x.bad ? " is-bad" : "") }, x.value, x.unit ? h("small", { text: x.unit }) : null),
      h("div", { class: "tile-change", text: x.change }), x.sev ? chip(x.sev) : null,
      x.hero ? h("div", { class: "spark-box" }, ratingStrip()) : null));
  }
}
function avgEng() { const all = DATA.instagram.accounts; const sum = all.reduce((a, x) => a + x.avg_engagement * x.sample, 0); return sum / all.reduce((a, x) => a + x.sample, 0); }
function ratingStrip() {
  const list = h("ol", { class: "bars", "aria-label": "Average score by resort" });
  bars(list, [...R].sort((a, b) => b.blended10 - a.blended10).map(r => ({ label: r.name, v: r.blended10 - 8, text: fix(r.blended10, 1), cls: r.blended10 < 9 ? "is-us is-behind" : "" })), 2);
  return list;
}

/* ---------- bars ---------- */
function bars(listEl, rows, max) {
  clear(listEl);
  for (const r of rows) listEl.append(h("li", { class: "bar-row" + (r.cls ? " " + r.cls : "") },
    h("span", { class: "lbl" }, r.label, r.sub ? h("small", { text: r.sub }) : null),
    h("span", { class: "bar-track", "aria-hidden": "true" }, h("span", { class: "bar-fill", style: { transform: `scaleX(${Math.max(0, Math.min(1, r.v / max))})` } })),
    h("span", { class: "val" }, r.text)));
}

/* ---------- findings ---------- */
function findings() {
  const items = [];
  const replyLine = [
    ubud.google_reply ? `Ubud ${ubud.google_reply.replied} of ${ubud.google_reply.n} on Google` : null,
    ...noBookingReply.map(r => `${r.name} ${r.booking_reply.replied} of ${r.booking_reply.n} on Booking.com`)].filter(Boolean).join(", ");
  items.push({ sev: "critical", head: "Most reviews never get a reply", body: `Newest reviews answered: ${replyLine}. Senggigi shows it can be done (${R.find(r => r.id === "senggigi").booking_reply.replied} of 30 on Booking.com).`,
    act: ["Each GM", "reply to every review within 24 hours, starting with Ubud, Sanur and Komodo."], num: pct(replySample.y, replySample.n) + "%", numSub: "of newest reviews answered" });
  items.push({ sev: "critical", head: "Ubud is far behind its competitors on Google", body: `Ubud has ${ubud.google.reviews} Google reviews at ${ubud.google.rating}/5. The four nearby competitors have 946 to 4,200 reviews at 4.7 to 4.9.`,
    act: ["Ubud GM + Front Office", "ask every departing guest for a Google review (QR code at checkout) and answer each one."], num: String(ubud.google.reviews), numSub: "Google reviews" });
  if (paused.length) {
    const g = paused[0];
    items.push({ sev: "critical", head: `${paused.length} of ${IG.length - 1} resort Instagram accounts stopped posting for a month`, body: `${paused.map(a => ACC_NAME[a.handle]).join(", ")} posted nothing between ${fmtDate(g.gap_from)} and ${fmtDate(g.gap_to)}, in the run-up to peak season.`,
      act: ["Social team", "keep a steady calendar of 3 posts a week per resort, planned a month ahead."], num: `${Math.max(...paused.map(a => a.gap_days))} days`, numSub: "longest gap" });
  }
  items.push({ sev: "critical", head: "TikTok has been dormant since " + new Date(tt.videos[0].date).toLocaleDateString("en-GB", { month: "long", year: "numeric" }), body: `@sudamalaresorts has ${tt.account.followers} followers. Its best video (Komodo, ${nf.format(Math.max(...tt.videos.map(v => v.views)))} views) shows destination content works there.`,
    act: ["CMO", "restart TikTok with short destination and room-reveal videos, or close the account so it does not look abandoned."], num: String(tt.account.followers), numSub: "TikTok followers" });
  items.push({ sev: "watch", head: "Big audiences, little engagement on Instagram", body: `Komodo has ${nf.format(komodoIG.followers)} followers but averages ${fix(komodoIG.avg_engagement)} likes and comments a post (${komodoIG.engagement_rate}%). Ubud, with only ${nf.format(ubudIG.followers)} followers, gets the same (${ubudIG.engagement_rate}%). The best posts show people, service and big news, not scenery alone.`,
    act: ["Social team", "post more people and service moments, reels and offers; check how many Komodo followers are still active."], num: komodoIG.engagement_rate + "%", numSub: "Komodo engagement" });
  const top = complaints[0];
  if (top) {
    const where = (DATA.topics.complaints_where[top[0]] || []).map(([id, n]) => `${NAME[id]} ${n}`).join(", ");
    items.push({ sev: "watch", head: `Rooms are the top complaint: air-conditioning, showers, damp`, body: `Booking.com guests in the last 90 days complained about rooms ${top[1]} times (${where}), then upkeep and age, and insects. Amed scores lowest on facilities (${R.find(r => r.id === "amed").subscores.Facilities}).`,
      act: ["Engineering + Housekeeping", "fix air-conditioning and water pressure at Amed first, and check for damp in the Sanur garden suites."], num: String(top[1]), numSub: "room complaints, 90 days" });
  }
  const komFb = DATA.facebook.find(p => p.resort === "komodo");
  items.push({ sev: "watch", head: "Facebook pages look out of date", body: `The Komodo page still says it is "opening soon in 2019". Ubud, open since October, has no Facebook page we could find.`,
    act: ["Social team", "update every page's About text, photos and links this week, and open an Ubud page."], num: nf.format(komFb.followers), numSub: "Komodo Facebook followers" });
  items.push({ sev: "watch", head: "Few Indonesian guests review us on Booking.com", body: `Only ${DATA.origin.indonesia} of ${DATA.origin.n} recent Booking.com reviews came from Indonesia, though affluent Indonesians are a core market. They tend to book through Traveloka and tiket.com, which are not in this data yet.`,
    act: ["Revenue + CMO", "add Traveloka and tiket.com to the review tracking, and check those listings' photos and scores."], num: String(DATA.origin.indonesia), numSub: "Indonesian reviews of " + DATA.origin.n });

  const ol = $("#findings");
  for (const f of items) ol.append(h("li", { class: "finding " + (f.sev === "critical" ? "is-crit" : "is-watch") },
    chip(f.sev), h("h3", { text: f.head }), h("p", { text: f.body }), h("p", { class: "act" }, h("b", { text: f.act[0] + ": " }), f.act[1]),
    h("div", { class: "num" }, f.num, h("small", { text: f.numSub }))));
}

/* ---------- tables ---------- */
function scoreTable() {
  const cols = [
    { label: "Google", sub: "out of 5", v: r => fix(r.google.rating, 1), d: r => nf.format(r.google.reviews) + " reviews" },
    { label: "Booking.com", sub: "out of 10", v: r => r.booking.score != null ? fix(r.booking.score, 1) : "–", d: r => r.booking.reviews != null ? nf.format(r.booking.reviews) + " reviews" : "" },
    { label: "Tripadvisor", sub: "out of 5", v: r => r.tripadvisor ? fix(r.tripadvisor.rating, 1) : "Not listed", d: r => r.tripadvisor ? nf.format(r.tripadvisor.reviews) + " reviews" : "", na: r => !r.tripadvisor },
    { label: "Average", sub: "out of 10", v: r => fix(r.blended10, 1), d: r => nf.format(r.total_reviews) + " reviews", bad: r => r.blended10 < 9 },
    { label: "Replied", sub: "newest reviews", v: r => { const x = [r.google_reply, r.booking_reply].filter(Boolean); const n = x.reduce((a, y) => a + y.n, 0), y = x.reduce((a, z) => a + z.replied, 0); return n ? pct(y, n) + "%" : "–"; },
      d: r => [r.google_reply ? `Google ${r.google_reply.replied}/${r.google_reply.n}` : null, r.booking_reply ? `Booking ${r.booking_reply.replied}/${r.booking_reply.n}` : null].filter(Boolean).join(" · "),
      bad: r => { const x = [r.google_reply, r.booking_reply].filter(Boolean); const n = x.reduce((a, y) => a + y.n, 0); return n && x.reduce((a, z) => a + z.replied, 0) / n < 0.9; } },
  ];
  table($("#score-table"), "Scores by resort and site", R, cols, r => h("span", {}, h("span", { class: "rn", text: r.name }), h("span", { class: "helper", text: r.island })));
  const cats = ["Cleanliness", "Comfort", "Facilities", "Location", "Staff", "Value for money", "Wi-Fi"];
  table($("#sub-table"), "Booking.com category scores", R, cats.map(c => ({ label: c, sub: "", v: r => r.subscores[c] != null ? fix(r.subscores[c], 1) : "–", bad: r => r.subscores[c] != null && r.subscores[c] < 8.5 })),
    r => h("span", { class: "rn", text: r.name }));
}
function table(wrap, caption, rows, cols, head) {
  wrap.append(h("table", { class: "score mk" }, h("caption", { class: "sr", text: caption }),
    h("thead", {}, h("tr", {}, h("th", { scope: "col", text: "Resort" }), cols.map(c => h("th", { scope: "col" }, c.label, c.sub ? [h("br"), h("span", { class: "helper", text: c.sub })] : null)))),
    h("tbody", {}, rows.map(r => h("tr", {}, h("th", { scope: "row" }, head(r)),
      cols.map(c => { const bad = c.bad && c.bad(r); return h("td", { class: bad ? "bad" : c.na && c.na(r) ? "na" : null },
        h("span", { class: "v" }, bad ? h("span", { class: "sr", text: "Below target: " }) : null, c.v(r)), c.d && c.d(r) ? h("span", { class: "d", text: c.d(r) }) : null); }))))));
}

/* ---------- competitors, topics, guests ---------- */
function compare() {
  const set = [...DATA.competitors].sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
  const rank = set.findIndex(x => x.us) + 1;
  $("#compare-h").textContent = rank === set.length ? "Ubud is last of five nearby resorts on Google, with the fewest reviews" : `Ubud ranks ${rank} of ${set.length} nearby resorts on Google`;
  bars($("#compare-bars"), set.map(x => ({ label: x.us ? "Sudamala Resort Ubud" : x.name, sub: nf.format(x.reviews) + " reviews", v: x.rating - 4, text: fix(x.rating, 1), cls: x.us ? "is-us is-behind" : "" })), 1);
}
function topics() {
  const T = DATA.topics;
  $("#topics-sub").textContent = `From ${T.window_reviews} Booking.com reviews in the last 90 days, all six resorts.`;
  $("#love-h").textContent = `Guests praise our ${T.praise[0][0].toLowerCase()} most`;
  bars($("#love-bars"), T.praise.filter(([k]) => !["Insects", "Noise"].includes(k)).slice(0, 6).map(([k, n]) => ({ label: k, v: n, text: String(n) })), T.praise[0][1]);
  $("#hate-h").textContent = `Rooms and upkeep are the main complaints`;
  bars($("#hate-bars"), T.complaints.slice(0, 6).map(([k, n]) => ({ label: k, sub: (T.complaints_where[k] || []).map(([id, c]) => `${NAME[id]} ${c}`).join(", "), v: n, text: String(n) })), T.complaints[0][1]);
}
function guests() {
  const O = DATA.origin;
  $("#guests-sub").textContent = `From the ${O.n} newest Booking.com reviews across the six resorts.`;
  $("#country-h").textContent = `${O.countries[0][0]} sends the most reviewers`;
  bars($("#country-bars"), O.countries.slice(0, 7).map(([k, n]) => ({ label: k, v: n, text: String(n) })), O.countries[0][1]);
  $("#trav-h").textContent = `Most are couples (${pct(O.travellers[0][1], O.n)}%)`;
  bars($("#trav-bars"), O.travellers.map(([k, n]) => ({ label: k, v: n, text: pct(n, O.n) + "%" })), O.travellers[0][1]);
}

/* ---------- social ---------- */
function social() {
  $("#social-sub").textContent = `Instagram: ${DATA.instagram.posts_sampled} newest posts across ${IG.length} accounts. Engagement = average likes and comments per post, as a share of followers.`;
  const cols = [
    { label: "Followers", sub: "", v: a => (a.followers_approx ? "≈ " : "") + nf.format(a.followers) },
    { label: "Likes + comments", sub: "per post", v: a => fix(a.avg_engagement, 0) },
    { label: "Engagement", sub: "of followers", v: a => a.engagement_rate + "%", bad: a => a.engagement_rate < 0.5 },
    { label: "Last post", sub: "", v: a => fmtDate(a.last_post), d: a => a.days_since_last === 1 ? "yesterday" : a.days_since_last + " days ago", bad: a => a.days_since_last > 14 },
    { label: "Longest gap", sub: "between posts", v: a => a.gap_days + " days", bad: a => a.gap_days >= 21, d: a => `${fmtDate(a.gap_from)} – ${fmtDate(a.gap_to)}` },
  ];
  table($("#ig-table"), "Instagram accounts", IG, cols, a => h("span", {}, h("span", { class: "rn", text: ACC_NAME[a.handle] }), h("span", { class: "helper", text: "@" + a.handle })));
  const ol = $("#top-posts");
  DATA.instagram.top_posts.forEach((p, i) => ol.append(h("li", { class: "post" },
    h("span", { class: "rank", "aria-hidden": "true", text: String(i + 1) }),
    h("div", {}, h("p", { class: "cap" }, h("a", { href: p.url, target: "_blank", rel: "noopener", text: p.caption })),
      h("p", { class: "meta", text: `${ACC_NAME[p.handle]} · ${p.kind} · ${fmtDate(p.date)}` })),
    h("p", { class: "eng" }, `${p.likes} likes`, h("small", { text: `${p.comments} comment${p.comments === 1 ? "" : "s"}` })))));
  const cards = $("#social-cards");
  const best = [...tt.videos].sort((a, b) => b.views - a.views)[0];
  cards.append(h("div", { class: "s-card" }, h("h3", { text: "TikTok" }), h("p", { class: "big", text: nf.format(tt.account.followers) }), h("p", { class: "helper", text: "followers on @sudamalaresorts" }),
    h("ul", {}, h("li", {}, h("b", { text: "Last video: " }), fmtDate(tt.videos[0].date)), h("li", {}, h("b", { text: "Best video: " }), `${best.caption} (${nf.format(best.views)} views)`),
      h("li", {}, h("b", { text: "Videos found: " }), `${tt.videos.length}, ${nf.format(tt.videos.reduce((a, v) => a + v.views, 0))} views in total`))));
  cards.append(h("div", { class: "s-card" }, h("h3", { text: "Facebook" }), h("p", { class: "big", text: nf.format(DATA.facebook.reduce((a, p) => a + p.followers, 0)) }), h("p", { class: "helper", text: "followers across five pages" }),
    h("ul", {}, DATA.facebook.map(p => h("li", {}, h("b", { text: NAME[p.resort] + ": " }), `${nf.format(p.followers)} followers` + (p.recommend_pct ? `, ${p.recommend_pct}% recommend (${p.recommend_reviews} reviews)` : "") + (p.note ? `. ${p.note}` : ""))))));
}

/* ---------- feed ---------- */
const feed = { filter: "all", resort: "all", shown: 10 };
function renderFeed() {
  const chips = clear($("#feed-chips"));
  const base = DATA.reviews.filter(r => feed.resort === "all" || r.resort === feed.resort);
  const sets = { all: base, low: base.filter(r => r.score < 8), noreply: base.filter(r => r.replied === false) };
  for (const [k, label] of [["all", "All"], ["low", "Scores under 8"], ["noreply", "No reply yet"]])
    chips.append(h("button", { type: "button", class: "chip", "aria-pressed": String(feed.filter === k), onclick: () => { feed.filter = k; feed.shown = 10; renderFeed(); } }, `${label} (${sets[k].length})`));
  const list = sets[feed.filter];
  const ol = clear($("#feed-list"));
  for (const r of list.slice(0, feed.shown)) {
    const sc = r.score <= 4 ? "rate-low" : r.score < 8 ? "rate-mid" : "";
    ol.append(h("li", { class: "rv" },
      h("div", { class: "rv-top" },
        h("div", { class: "rate " + sc, role: "img", "aria-label": `Score ${fix(r.score, r.score % 1 ? 1 : 0)} out of 10 (${r.raw} on ${r.site})` }, h("span", {}, fix(r.score, r.score % 1 ? 1 : 0), h("small", { text: "/10" }))),
        h("div", { class: "rv-meta" }, h("h3", { class: "rv-title", text: r.title || (r.score >= 8 ? "Happy guest" : "Mixed review") }),
          h("p", { class: "rv-who" }, h("b", { text: NAME[r.resort] }), " · ", h("span", { class: "rv-src", text: r.site }), ` · ${fmtDate(r.date)}` + (r.country ? ` · ${r.country}` : "") + (r.traveller ? `, ${r.traveller.toLowerCase()}` : ""))),
        h("div", { class: "rv-state" }, r.replied === true ? chip("ok", "Replied") : r.replied === false ? chip(r.score < 8 ? "critical" : "watch", "No reply") : null)),
      r.text ? h("p", { class: "rv-body", text: r.text }) : h("p", { class: "rv-body", text: "Score only, no text." }),
      (r.praise.length || r.complaints.length) ? h("div", { class: "tags" },
        r.praise.map(t => h("span", { class: "tag tag-pos" }, h("span", { "aria-hidden": "true", text: "+" }), h("span", { class: "sr", text: "Praise: " }), t)),
        r.complaints.map(t => h("span", { class: "tag tag-neg" }, h("span", { "aria-hidden": "true", text: "−" }), h("span", { class: "sr", text: "Complaint: " }), t))) : null));
  }
  if (!list.length) ol.append(h("li", { class: "empty", text: "No reviews match." }));
  const more = $("#more"); more.hidden = list.length <= feed.shown; more.textContent = `Show more (${list.length - feed.shown} left)`;
}

/* ---------- init ---------- */
verdict(); tiles(); findings(); scoreTable(); compare(); topics(); guests(); social();
const sel = $("#resort"); for (const r of R) sel.append(h("option", { value: r.id, text: r.name }));
sel.addEventListener("change", () => { feed.resort = sel.value; feed.shown = 10; renderFeed(); });
$("#more").addEventListener("click", () => { feed.shown += 10; renderFeed(); });
renderFeed();
for (const g of DATA.gaps) $("#gaps").append(h("li", { text: g }));
