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
const lc = t => t.charAt(0).toLowerCase() + t.slice(1);
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

/* ---------- data ---------- */
const R = DATA.ratings;
const byId = Object.fromEntries(R.map(r => [r.id, r]));
const NAME = Object.fromEntries(R.map(r => [r.id, r.name]));
const IG = DATA.instagram.accounts;
const IG_OF = { ubud: "sudamalaubud", sanur: "sudamalasanur", amed: "amedlodge", senggigi: "sudamalasenggigi", komodo: "sudamalakomodo", seraya: "sudamalaseraya" };
const ACC_NAME = { sudamalaresorts: "Group", sudamalakomodo: "Komodo", sudamalaseraya: "Seraya", sudamalasenggigi: "Senggigi", sudamalasanur: "Sanur", sudamalaubud: "Ubud", amedlodge: "Amed Lodge" };
const tt = DATA.tiktok;
const DAY = 86400000, NOW = new Date(DATA.collected + "T23:59:59").getTime();
// "No insects" / "not noisy" are not praise: keyword tagging can't tell, so drop them from the praise side.
const NOT_PRAISE = new Set(["Insects", "Noise"]);
const REVIEWS = DATA.reviews.map(r => ({ ...r, praise: r.praise.filter(t => !NOT_PRAISE.has(t)), age: (NOW - new Date(r.date + "T12:00:00").getTime()) / DAY }));

const SITES = { all: "All sites", Google: "Google", "Booking.com": "Booking.com", Tripadvisor: "Tripadvisor" };
const PERIOD_TEXT = { 7: "in the last 7 days", 30: "in the last 30 days", 90: "in the last 90 days", all: "across everything collected" };
const state = { period: "90", resort: "all", site: "all", source: "all", feed: "all", shown: 10 };

const scopeResorts = () => (state.resort === "all" ? R : [byId[state.resort]]);
const scopeText = () => (state.resort === "all" ? "all six resorts" : NAME[state.resort]);
const scopeName = () => (state.resort === "all" ? "All six resorts" : NAME[state.resort]);
const inPeriod = r => state.period === "all" || r.age < +state.period;
const filtered = () => REVIEWS.filter(r => (state.resort === "all" || r.resort === state.resort) && (state.site === "all" || r.site === state.site) && inPeriod(r));
const siteText = () => (state.site === "all" ? "Google and Booking.com" : state.site);

// Overall listing score on a site, converted to /10.
function listing(r, site = state.site) {
  if (site === "all") return { v: r.blended10, n: r.total_reviews };
  if (site === "Google") return r.google ? { v: r.google.rating * 2, n: r.google.reviews } : null;
  if (site === "Booking.com") return r.booking && r.booking.score != null ? { v: r.booking.score, n: r.booking.reviews } : null;
  if (site === "Tripadvisor") return r.tripadvisor ? { v: r.tripadvisor.rating * 2, n: r.tripadvisor.reviews } : null;
}
function weighted(list) { const ok = list.filter(Boolean); const n = ok.reduce((a, x) => a + x.n, 0); return n ? { v: ok.reduce((a, x) => a + x.v * x.n, 0) / n, n } : null; }
function stats(list) {
  const known = list.filter(r => r.replied != null);
  return { n: list.length, avg: list.length ? list.reduce((a, r) => a + r.score, 0) / list.length : null,
    replied: known.filter(r => r.replied).length, known: known.length, low: list.filter(r => r.score < 8).length };
}
const replySev = st => (!st.known ? null : st.replied / st.known < 0.5 ? "critical" : st.replied / st.known < 0.9 ? "watch" : "ok");

/* ---------- bars ---------- */
function bars(listEl, rows, max, empty = "Nothing in this selection.") {
  clear(listEl);
  if (!rows.length) { listEl.append(h("li", { class: "empty", text: empty })); return; }
  for (const r of rows) listEl.append(h("li", { class: "bar-row" + (r.cls ? " " + r.cls : "") },
    h("span", { class: "lbl" }, r.label, r.sub ? h("small", { text: r.sub }) : null),
    h("span", { class: "bar-track", "aria-hidden": "true" }, h("span", { class: "bar-fill", style: { transform: `scaleX(${Math.max(0, Math.min(1, r.v / max))})` } })),
    h("span", { class: "val" }, r.text)));
}

/* ---------- verdict ---------- */
function verdict(list, st) {
  const el = clear($("#verdict"));
  if (state.site === "Tripadvisor") {
    const w = weighted(scopeResorts().map(r => listing(r)));
    el.append(h("strong", { text: w ? `${scopeName()}: ${fix(w.v, 1)}/10 on Tripadvisor from ${nf.format(w.n)} reviews.` : `${scopeName()} is not listed on Tripadvisor.` }),
      " Tripadvisor review text could not be collected, so the review sections below are empty.");
    return;
  }
  if (!st.n) { el.append(h("strong", { text: `No ${siteText()} reviews for ${scopeText()} ${PERIOD_TEXT[state.period]}.` }), " Try a longer period or another site."); return; }
  const sev = replySev(st) || "ok";
  el.append(chip(sev, sev === "ok" ? "On track" : sev === "critical" ? "Fix now" : "Watch"), h("br"),
    h("strong", { text: `${scopeName()}: ${fix(st.avg, 1)}/10 from ${st.n} review${st.n === 1 ? "" : "s"} ${PERIOD_TEXT[state.period]}` }),
    st.known ? `, and we replied to ${pct(st.replied, st.known)}% of them.` : ".");
}

/* ---------- tiles ---------- */
function tiles(list, st) {
  const scope = scopeResorts();
  const w = weighted(scope.map(r => listing(r)));
  const accts = state.resort === "all" ? IG : IG.filter(a => a.handle === IG_OF[state.resort]);
  const fol = accts.reduce((a, x) => a + x.followers, 0);
  const posts = accts.reduce((a, x) => a + x.sample, 0);
  const eng = posts ? accts.reduce((a, x) => a + x.avg_engagement * x.sample, 0) / posts : 0;
  const rs = replySev(st);
  const t = [
    { hero: true, label: "Overall score", helper: `${SITES[state.site]}, every review ever posted`, value: w ? fix(w.v, 1) : "–", unit: w ? "/10" : "",
      change: w ? `${nf.format(w.n)} reviews, ${scopeText()}` : "Not listed on this site", sev: w ? (w.v >= 9 ? "ok" : "watch") : null },
    { label: "Reviews in this period", helper: "Newest public reviews we read", value: String(st.n),
      change: st.n ? `Average ${fix(st.avg, 1)}/10` : "None in this period", sev: null },
    { label: "Reply rate", helper: "Reviews with a reply from us", value: st.known ? pct(st.replied, st.known) + "%" : "–", bad: rs === "critical",
      change: st.known ? `${st.replied} of ${st.known} answered` : "No reviews to answer", sev: rs },
    { label: "Scores under 8", helper: "Unhappy or mixed guests", value: String(st.low), bad: st.low > 0 && st.low / Math.max(st.n, 1) > 0.15,
      change: st.n ? `${pct(st.low, st.n)}% of reviews in this period` : "None in this period", sev: st.n ? (st.low / st.n > 0.15 ? "critical" : st.low ? "watch" : "ok") : null },
    { label: "Instagram followers", helper: state.resort === "all" ? "Seven accounts; not affected by period or site" : `@${accts[0].handle}; not affected by period or site`, value: nf.format(fol),
      change: `${fix(fol ? eng / fol * 100 : 0, 2)}% engagement per post`, sev: null },
    { label: "Likes and comments per post", helper: `Average of the ${posts} newest posts`, value: fix(eng, 0),
      change: state.resort === "all" ? "Under 1% of followers on most accounts" : "Across the newest posts", sev: fol && eng / fol < 0.005 ? "watch" : null },
  ];
  const wrap = clear($("#tiles"));
  for (const x of t) {
    wrap.append(h("div", { class: "tile" + (x.hero ? " tile-hero" : ""), tabindex: "0", role: "group", "aria-label": `${x.label}: ${x.value}${x.unit || ""}. ${x.change}.` },
      h("div", { class: "tile-label", text: x.label }), h("div", { class: "helper", text: x.helper }),
      h("div", { class: "tile-num" + (x.bad ? " is-bad" : "") }, x.value, x.unit ? h("small", { text: x.unit }) : null),
      h("div", { class: "tile-change", text: x.change }), x.sev ? chip(x.sev) : null,
      x.hero ? h("div", { class: "spark-box" }, ratingStrip()) : null));
  }
}
function ratingStrip() {
  const rows = R.map(r => ({ r, l: listing(r) })).filter(x => x.l).sort((a, b) => b.l.v - a.l.v);
  const list = h("ol", { class: "bars", "aria-label": `Overall score by resort, ${SITES[state.site]}` });
  bars(list, rows.map(({ r, l }) => ({ label: r.name, v: l.v - 7, text: fix(l.v, 1),
    cls: [state.resort === r.id ? "is-us" : "", l.v < 9 ? "is-behind" : ""].filter(Boolean).join(" ") })), 3, "Not listed on this site.");
  return list;
}

/* ---------- findings (from everything collected) ---------- */
function allFindings() {
  const items = [];
  const perResort = R.map(r => ({ r, st: stats(REVIEWS.filter(x => x.resort === r.id)) })).filter(x => x.st.known >= 10);
  const weak = perResort.filter(x => x.st.replied / x.st.known < 0.5).sort((a, b) => a.st.replied / a.st.known - b.st.replied / b.st.known);
  const all = stats(REVIEWS);
  const best = [...perResort].sort((a, b) => b.st.replied / b.st.known - a.st.replied / a.st.known)[0];
  if (weak.length) items.push({ where: weak.map(x => x.r.id), sev: "critical", head: "Most reviews never get a reply",
    body: `Newest reviews answered: ${weak.map(x => `${x.r.name} ${x.st.replied} of ${x.st.known}`).join(", ")}. ${best.r.name} shows it can be done (${best.st.replied} of ${best.st.known}).`,
    act: ["Each GM", `reply to every review within 24 hours, starting with ${weak.slice(0, 3).map(x => x.r.name).join(", ")}.`], num: pct(all.replied, all.known) + "%", numSub: "of newest reviews answered, group" });
  const ubud = byId.ubud;
  items.push({ where: ["ubud"], sev: "critical", head: "Ubud is far behind its competitors on Google", body: `Ubud has ${ubud.google.reviews} Google reviews at ${ubud.google.rating}/5. The four nearby competitors have 946 to 4,200 reviews at 4.7 to 4.9.`,
    act: ["Ubud GM + Front Office", "ask every departing guest for a Google review (QR code at checkout) and answer each one."], num: String(ubud.google.reviews), numSub: "Google reviews" });
  const paused = IG.filter(a => a.gap_days >= 25 && a.handle !== "sudamalaresorts");
  if (paused.length) items.push({ where: paused.map(a => Object.keys(IG_OF).find(k => IG_OF[k] === a.handle)), sev: "critical",
    head: `${paused.length} of ${IG.length - 1} resort Instagram accounts stopped posting for a month`,
    body: `${paused.map(a => ACC_NAME[a.handle]).join(", ")} posted nothing between ${fmtDate(paused[0].gap_from)} and ${fmtDate(paused[0].gap_to)}, in the run-up to peak season.`,
    act: ["Social team", "keep a steady calendar of 3 posts a week per resort, planned a month ahead."], num: `${Math.max(...paused.map(a => a.gap_days))} days`, numSub: "longest gap" });
  items.push({ where: null, sev: "critical", head: "TikTok has been dormant since " + new Date(tt.videos[0].date).toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
    body: `@sudamalaresorts has ${tt.account.followers} followers. Its best video (Komodo, ${nf.format(Math.max(...tt.videos.map(v => v.views)))} views) shows destination content works there.`,
    act: ["CMO", "restart TikTok with short destination and room-reveal videos, or close the account so it does not look abandoned."], num: String(tt.account.followers), numSub: "TikTok followers" });
  const kom = IG.find(a => a.handle === "sudamalakomodo"), ub = IG.find(a => a.handle === "sudamalaubud");
  items.push({ where: ["komodo", "seraya", "senggigi", "amed"], sev: "watch", head: "Big audiences, little engagement on Instagram",
    body: `Komodo has ${nf.format(kom.followers)} followers but averages ${fix(kom.avg_engagement)} likes and comments a post (${kom.engagement_rate}%). Ubud, with only ${nf.format(ub.followers)} followers, gets the same (${ub.engagement_rate}%). The best posts show people, service and big news, not scenery alone.`,
    act: ["Social team", "post more people and service moments, reels and offers; check how many Komodo followers are still active."], num: kom.engagement_rate + "%", numSub: "Komodo engagement" });
  const T = DATA.topics, top = T.complaints[0];
  if (top) items.push({ where: (T.complaints_where[top[0]] || []).map(([id]) => id).concat("amed"), sev: "watch", head: "Rooms are the top complaint: air-conditioning, showers, damp",
    body: `Booking.com guests in the last 90 days complained about rooms ${top[1]} times (${(T.complaints_where[top[0]] || []).map(([id, n]) => `${NAME[id]} ${n}`).join(", ")}), then upkeep and age, and insects. Amed scores lowest on facilities (${byId.amed.subscores.Facilities}).`,
    act: ["Engineering + Housekeeping", "fix air-conditioning and water pressure at Amed first, and check for damp in the Sanur garden suites."], num: String(top[1]), numSub: "room complaints, 90 days" });
  const komFb = DATA.facebook.find(p => p.resort === "komodo");
  items.push({ where: ["komodo", "ubud"], sev: "watch", head: "Facebook pages look out of date", body: `The Komodo page still says it is "opening soon in 2019". Ubud, open since October, has no Facebook page we could find.`,
    act: ["Social team", "update every page's About text, photos and links this week, and open an Ubud page."], num: nf.format(komFb.followers), numSub: "Komodo Facebook followers" });
  items.push({ where: null, sev: "watch", head: "Few Indonesian guests review us on Booking.com", body: `Only ${DATA.origin.indonesia} of ${DATA.origin.n} recent Booking.com reviews came from Indonesia, though affluent Indonesians are a core market. They tend to book through Traveloka and tiket.com, which are not in this data yet.`,
    act: ["Revenue + CMO", "add Traveloka and tiket.com to the review tracking, and check those listings' photos and scores."], num: String(DATA.origin.indonesia), numSub: "Indonesian reviews of " + DATA.origin.n });
  return items;
}
const FINDINGS = allFindings();
function findings() {
  const items = FINDINGS.filter(f => state.resort === "all" || !f.where || f.where.includes(state.resort));
  $("#fix-sub").textContent = state.resort === "all"
    ? "What the public data says needs attention, most urgent first. Based on everything collected, so the period and site do not change this list."
    : `What needs attention at ${NAME[state.resort]}, plus group-wide issues. Based on everything collected, so the period and site do not change this list.`;
  const ol = clear($("#findings"));
  for (const f of items) ol.append(h("li", { class: "finding " + (f.sev === "critical" ? "is-crit" : "is-watch") },
    chip(f.sev), h("h3", { text: f.head }), h("p", { text: f.body }), h("p", { class: "act" }, h("b", { text: f.act[0] + ": " }), f.act[1]),
    h("div", { class: "num" }, f.num, h("small", { text: f.numSub }))));
}

/* ---------- tables ---------- */
function table(wrap, caption, rows, cols, head) {
  clear(wrap).append(h("table", { class: "score mk" }, h("caption", { class: "sr", text: caption }),
    h("thead", {}, h("tr", {}, h("th", { scope: "col", text: "Resort" }), cols.map(c => h("th", { scope: "col" }, c.label, c.sub ? [h("br"), h("span", { class: "helper", text: c.sub })] : null)))),
    h("tbody", {}, rows.map(r => h("tr", { class: state.resort === r.id ? "is-focus" : null }, h("th", { scope: "row" }, head(r)),
      cols.map(c => { const bad = c.bad && c.bad(r); return h("td", { class: bad ? "bad" : c.na && c.na(r) ? "na" : null },
        h("span", { class: "v" }, bad ? h("span", { class: "sr", text: "Below target: " }) : null, c.v(r)), c.d && c.d(r) ? h("span", { class: "d", text: c.d(r) }) : null); }))))));
}
function scoreTable(list) {
  const site = state.site;
  const replyOf = r => stats(list.filter(x => x.resort === r.id));
  const cols = [];
  if (site === "all" || site === "Google") cols.push({ label: "Google", sub: "out of 5", v: r => fix(r.google.rating, 1), d: r => nf.format(r.google.reviews) + " reviews" });
  if (site === "all" || site === "Booking.com") cols.push({ label: "Booking.com", sub: "out of 10", v: r => r.booking.score != null ? fix(r.booking.score, 1) : "–", d: r => r.booking.reviews != null ? nf.format(r.booking.reviews) + " reviews" : "" });
  if (site === "all" || site === "Tripadvisor") cols.push({ label: "Tripadvisor", sub: "out of 5", v: r => r.tripadvisor ? fix(r.tripadvisor.rating, 1) : "Not listed", d: r => r.tripadvisor ? nf.format(r.tripadvisor.reviews) + " reviews" : "", na: r => !r.tripadvisor });
  if (site === "all") cols.push({ label: "Average", sub: "out of 10", v: r => fix(r.blended10, 1), d: r => nf.format(r.total_reviews) + " reviews", bad: r => r.blended10 < 9 });
  if (site !== "Tripadvisor") {
    cols.push({ label: "In this period", sub: "average, out of 10", v: r => { const st = replyOf(r); return st.n ? fix(st.avg, 1) : "–"; }, d: r => { const n = replyOf(r).n; return n ? `${n} review${n === 1 ? "" : "s"}` : "no reviews"; }, bad: r => { const st = replyOf(r); return st.n && st.avg < 8.5; } });
    cols.push({ label: "Replied", sub: "in this period", v: r => { const st = replyOf(r); return st.known ? pct(st.replied, st.known) + "%" : "–"; },
      d: r => { const st = replyOf(r); return st.known ? `${st.replied} of ${st.known}` : ""; }, bad: r => { const st = replyOf(r); return st.known && st.replied / st.known < 0.9; } });
  }
  table($("#score-table"), "Scores by resort and site", scopeResorts(), cols, r => h("span", {}, h("span", { class: "rn", text: r.name }), h("span", { class: "helper", text: r.island })));
  $("#scores-sub").textContent = `Overall score on ${site === "all" ? "each site" : site} for every review ever posted, then the newest reviews ${PERIOD_TEXT[state.period]} and how many we answered.`;

  const showSub = site === "all" || site === "Booking.com";
  $("#sub-wrap").hidden = !showSub;
  if (showSub) {
    const cats = ["Cleanliness", "Comfort", "Facilities", "Location", "Staff", "Value for money", "Wi-Fi"];
    table($("#sub-table"), "Booking.com category scores", scopeResorts(), cats.map(c => ({ label: c, sub: "", v: r => r.subscores[c] != null ? fix(r.subscores[c], 1) : "–", bad: r => r.subscores[c] != null && r.subscores[c] < 8.5 })),
      r => h("span", { class: "rn", text: r.name }));
  }
}

/* ---------- competitors, topics, guests ---------- */
function compare() {
  const show = (state.resort === "all" || state.resort === "ubud") && (state.site === "all" || state.site === "Google");
  $("#compare").hidden = !show;
  if (!show) return;
  const set = [...DATA.competitors].sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
  const rank = set.findIndex(x => x.us) + 1;
  $("#compare-h").textContent = rank === set.length ? "Ubud is last of five nearby resorts on Google, with the fewest reviews" : `Ubud ranks ${rank} of ${set.length} nearby resorts on Google`;
  bars($("#compare-bars"), set.map(x => ({ label: x.us ? "Sudamala Resort Ubud" : x.name, sub: nf.format(x.reviews) + " reviews", v: x.rating - 4, text: fix(x.rating, 1), cls: x.us ? "is-us is-behind" : "" })), 1);
}
function count(list, key) {
  const c = {}, where = {};
  for (const r of list) for (const t of r[key]) { c[t] = (c[t] || 0) + 1; (where[t] ??= {})[r.resort] = (where[t][r.resort] || 0) + 1; }
  return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([t, n]) => ({ t, n, where: Object.entries(where[t]).sort((a, b) => b[1] - a[1]) }));
}
function topics(list) {
  const tagged = list.filter(r => r.praise.length || r.complaints.length).length;
  $("#topics-sub").textContent = list.length
    ? `From ${list.length} ${siteText()} reviews ${PERIOD_TEXT[state.period]}, ${scopeText()}. ${tagged} of them mention a topic we track.`
    : `No ${siteText()} reviews ${PERIOD_TEXT[state.period]} for ${scopeText()}.`;
  const love = count(list, "praise").slice(0, 6), hate = count(list, "complaints").slice(0, 6);
  $("#love-h").textContent = love.length ? `Most praised: ${lc(love[0].t)}` : "No praise to count here";
  bars($("#love-bars"), love.map(x => ({ label: x.t, v: x.n, text: String(x.n) })), love[0]?.n || 1, "No praise in this selection.");
  $("#hate-h").textContent = hate.length ? `Most complained about: ${lc(hate[0].t)}` : "No complaints in this selection";
  bars($("#hate-bars"), hate.map(x => ({ label: x.t, sub: state.resort === "all" ? x.where.map(([id, c]) => `${NAME[id]} ${c}`).join(", ") : null, v: x.n, text: String(x.n) })), hate[0]?.n || 1, "No complaints in this selection.");
}
const PLURAL = { Couple: "couples", "Solo traveller": "solo travellers", Family: "families", Group: "groups" };
function tally(list, key) { const c = {}; for (const r of list) if (r[key]) c[r[key]] = (c[r[key]] || 0) + 1; return Object.entries(c).sort((a, b) => b[1] - a[1]); }
function guests(list) {
  const withOrigin = list.filter(r => r.country || r.traveller);
  const countries = tally(withOrigin, "country"), trav = tally(withOrigin, "traveller");
  $("#guests-sub").textContent = withOrigin.length
    ? `From ${withOrigin.length} Booking.com reviews ${PERIOD_TEXT[state.period]}, ${scopeText()}. Google does not show where reviewers come from.`
    : state.site === "Booking.com" || state.site === "all" ? `No Booking.com reviews ${PERIOD_TEXT[state.period]} for ${scopeText()}.` : `${SITES[state.site]} does not show where reviewers come from. Choose Booking.com or All sites.`;
  $("#country-h").textContent = countries.length ? `${countries[0][0]} sends the most reviewers` : "Home country";
  bars($("#country-bars"), countries.slice(0, 7).map(([k, n]) => ({ label: k, v: n, text: String(n) })), countries[0]?.[1] || 1, "No reviewer countries in this selection.");
  $("#trav-h").textContent = trav.length ? `Most are ${PLURAL[trav[0][0]] || lc(trav[0][0])} (${pct(trav[0][1], withOrigin.length)}%)` : "Type of trip";
  bars($("#trav-bars"), trav.map(([k, n]) => ({ label: k, v: n, text: pct(n, withOrigin.length) + "%" })), trav[0]?.[1] || 1, "No trip types in this selection.");
}

/* ---------- social ---------- */
function social() {
  const one = state.resort !== "all";
  const handle = one ? IG_OF[state.resort] : null;
  const accts = one ? IG.filter(a => a.handle === handle || a.handle === "sudamalaresorts") : IG;
  $("#social-sub").textContent = (one ? `${NAME[state.resort]}'s Instagram account, with the group account for comparison. ` : `Instagram: ${DATA.instagram.posts_sampled} newest posts across ${IG.length} accounts. `)
    + "Engagement = average likes and comments per post, as a share of followers. The period and site filters do not apply here.";
  const cols = [
    { label: "Followers", sub: "", v: a => (a.followers_approx ? "≈ " : "") + nf.format(a.followers) },
    { label: "Likes + comments", sub: "per post", v: a => fix(a.avg_engagement, 0) },
    { label: "Engagement", sub: "of followers", v: a => a.engagement_rate + "%", bad: a => a.engagement_rate < 0.5 },
    { label: "Last post", sub: "", v: a => fmtDate(a.last_post), d: a => a.days_since_last === 1 ? "yesterday" : a.days_since_last + " days ago", bad: a => a.days_since_last > 14 },
    { label: "Longest gap", sub: "between posts", v: a => a.gap_days + " days", bad: a => a.gap_days >= 21, d: a => `${fmtDate(a.gap_from)} – ${fmtDate(a.gap_to)}` },
  ];
  table($("#ig-table"), "Instagram accounts", accts, cols, a => h("span", {}, h("span", { class: "rn", text: ACC_NAME[a.handle] }), h("span", { class: "helper", text: "@" + a.handle })));
  const posts = DATA.instagram.top_posts.filter(p => !one || p.handle === handle);
  $("#top-h").textContent = one ? `${NAME[state.resort]} among the best-performing Instagram posts` : "Best-performing Instagram posts";
  const ol = clear($("#top-posts"));
  if (!posts.length) ol.append(h("li", { class: "empty", text: `None of ${NAME[state.resort]}'s posts made the group's top ${DATA.instagram.top_posts.length}.` }));
  posts.forEach((p, i) => ol.append(h("li", { class: "post" },
    h("span", { class: "rank", "aria-hidden": "true", text: String(DATA.instagram.top_posts.indexOf(p) + 1) }),
    h("div", {}, h("p", { class: "cap" }, h("a", { href: p.url, target: "_blank", rel: "noopener", text: p.caption })),
      h("p", { class: "meta", text: `${ACC_NAME[p.handle]} · ${p.kind} · ${fmtDate(p.date)}` })),
    h("p", { class: "eng" }, `${p.likes} likes`, h("small", { text: `${p.comments} comment${p.comments === 1 ? "" : "s"}` })))));
  const cards = clear($("#social-cards"));
  const best = [...tt.videos].sort((a, b) => b.views - a.views)[0];
  cards.append(h("div", { class: "s-card" }, h("h3", { text: "TikTok (whole group)" }), h("p", { class: "big", text: nf.format(tt.account.followers) }), h("p", { class: "helper", text: "followers on @sudamalaresorts" }),
    h("ul", {}, h("li", {}, h("b", { text: "Last video: " }), fmtDate(tt.videos[0].date)), h("li", {}, h("b", { text: "Best video: " }), `${best.caption} (${nf.format(best.views)} views)`),
      h("li", {}, h("b", { text: "Videos found: " }), `${tt.videos.length}, ${nf.format(tt.videos.reduce((a, v) => a + v.views, 0))} views in total`))));
  const fb = DATA.facebook.filter(p => !one || p.resort === state.resort);
  cards.append(h("div", { class: "s-card" }, h("h3", { text: "Facebook" }),
    fb.length ? [h("p", { class: "big", text: nf.format(fb.reduce((a, p) => a + p.followers, 0)) }), h("p", { class: "helper", text: one ? "followers" : `followers across ${fb.length} pages` }),
      h("ul", {}, fb.map(p => h("li", {}, h("b", { text: NAME[p.resort] + ": " }), `${nf.format(p.followers)} followers` + (p.recommend_pct ? `, ${p.recommend_pct}% recommend (${p.recommend_reviews} reviews)` : "") + (p.note ? `. ${p.note}` : "")))) ]
      : [h("p", { class: "big", text: "–" }), h("p", { class: "helper", text: `No Facebook page found for ${NAME[state.resort]}.` })]));
}

/* ---------- feed ---------- */
function renderFeed(base) {
  const chips = clear($("#feed-chips"));
  const mine = base.filter(r => state.source === "all" || r.site === state.source);
  const sets = { all: mine, low: mine.filter(r => r.score < 8), noreply: mine.filter(r => r.replied === false) };
  for (const [k, label] of [["all", "All"], ["low", "Scores under 8"], ["noreply", "No reply yet"]])
    chips.append(h("button", { type: "button", class: "chip", "aria-pressed": String(state.feed === k), onclick: () => { state.feed = k; state.shown = 10; renderFeed(base); } }, `${label} (${sets[k].length})`));
  const list = sets[state.feed];
  $("#feed-sub").textContent = `Newest first: reviews ${PERIOD_TEXT[state.period]}, ${scopeText()}. Short extracts only; reviewer names are left out.`;
  const ol = clear($("#feed-list"));
  for (const r of list.slice(0, state.shown)) {
    const sc = r.score <= 4 ? "rate-low" : r.score < 8 ? "rate-mid" : "";
    const num = fix(r.score, r.score % 1 ? 1 : 0);
    ol.append(h("li", { class: "rv" },
      h("div", { class: "rv-top" },
        h("div", { class: "rate " + sc, role: "img", "aria-label": `Score ${num} out of 10 (${r.raw} on ${r.site})` }, h("span", {}, num, h("small", { text: "/10" }))),
        h("div", { class: "rv-meta" }, h("h3", { class: "rv-title", text: r.title || (r.score >= 8 ? "Happy guest" : "Mixed review") }),
          h("p", { class: "rv-who" }, h("b", { text: NAME[r.resort] }), " · ", h("span", { class: "rv-src", text: r.site }), ` · ${fmtDate(r.date)}` + (r.country ? ` · ${r.country}` : "") + (r.traveller ? `, ${r.traveller.toLowerCase()}` : ""))),
        h("div", { class: "rv-state" }, r.replied === true ? chip("ok", "Replied") : r.replied === false ? chip(r.score < 8 ? "critical" : "watch", "No reply") : null)),
      h("p", { class: "rv-body", text: r.text || "Score only, no text." }),
      (r.praise.length || r.complaints.length) ? h("div", { class: "tags" },
        r.praise.map(t => h("span", { class: "tag tag-pos" }, h("span", { "aria-hidden": "true", text: "+" }), h("span", { class: "sr", text: "Praise: " }), t)),
        r.complaints.map(t => h("span", { class: "tag tag-neg" }, h("span", { "aria-hidden": "true", text: "−" }), h("span", { class: "sr", text: "Complaint: " }), t))) : null));
  }
  if (!list.length) ol.append(h("li", { class: "empty", text: "No reviews match. Try another site, “All” or a longer period." }));
  const more = $("#more"); more.hidden = list.length <= state.shown; more.textContent = `Show more (${list.length - state.shown} left)`;
}

/* ---------- render + filters ---------- */
function render() {
  const list = filtered().sort((a, b) => a.age - b.age);
  const st = stats(list);
  verdict(list, st); tiles(list, st); findings(); scoreTable(list); compare(); topics(list); guests(list); social(); renderFeed(list);
  $(".masthead").dataset.filters = `${PERIOD_TEXT[state.period]}, ${scopeText()}`;
  syncUrl();
}
function syncUrl() {
  const q = new URLSearchParams();
  if (state.period !== "90") q.set("period", state.period);
  if (state.resort !== "all") q.set("resort", state.resort);
  const qs = q.toString();
  history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
}
function readUrl() {
  const q = new URLSearchParams(location.search);
  if (["7", "30", "90", "all"].includes(q.get("period"))) state.period = q.get("period");
  if (byId[q.get("resort")]) state.resort = q.get("resort");
}
function placeThumbs(animate = true) {
  for (const seg of document.querySelectorAll(".seg-options")) {
    let thumb = seg.querySelector(".seg-thumb");
    if (!thumb) { thumb = h("span", { class: "seg-thumb", "aria-hidden": "true" }); seg.prepend(thumb); }
    const on = seg.querySelector("input:checked + span");
    if (!on) continue;
    if (!animate) thumb.style.transition = "none";
    const a = on.getBoundingClientRect(), b = seg.getBoundingClientRect();
    thumb.style.width = a.width + "px";
    thumb.style.height = a.height + "px";
    thumb.style.transform = `translate(${a.left - b.left - seg.clientLeft}px, ${a.top - b.top - seg.clientTop}px)`;
    if (!animate) { thumb.getBoundingClientRect(); thumb.style.transition = ""; }
  }
}
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
function softSwap() {
  for (const el of document.querySelectorAll("#verdict, #tiles, #findings, #score-table, #topics .topic-grid, #guests .topic-grid, #social, #feed-list")) {
    el.animate(reduceMotion.matches ? [{ opacity: 0.6 }, { opacity: 1 }] : [{ opacity: 0.35, filter: "blur(3px)" }, { opacity: 1, filter: "blur(0)" }],
      { duration: 220, easing: "cubic-bezier(0.23, 1, 0.32, 1)" });
  }
}
function init() {
  readUrl();
  const sel = $("#resort"), src = $("#source");
  for (const r of R) sel.append(h("option", { value: r.id, text: `${r.name} (${r.island})` }));
  for (const k of ["Google", "Booking.com"]) src.append(h("option", { value: k, text: k }));
  const form = $("#filters");
  form.querySelector(`input[name=period][value="${state.period}"]`).checked = true;
  sel.value = state.resort;
  form.addEventListener("submit", e => e.preventDefault());
  form.addEventListener("change", e => {
    const t = e.target;
    if (t.name === "period") { state.period = t.value; placeThumbs(); }
    else if (t.id === "resort") state.resort = t.value;
    state.shown = 10;
    render(); softSwap();
  });
  src.addEventListener("change", () => { state.source = src.value; state.shown = 10; renderFeed(filtered().sort((a, b) => a.age - b.age)); });
  $("#more").addEventListener("click", () => { state.shown += 10; renderFeed(filtered().sort((a, b) => a.age - b.age)); });
  render();
  for (const g of DATA.gaps) $("#gaps").append(h("li", { text: g }));
  placeThumbs(false);
  document.fonts?.ready.then(() => placeThumbs(false));
  new ResizeObserver(() => placeThumbs(false)).observe(form);
}
init();
