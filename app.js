// Sudamala CEO dashboard. Vanilla JS, no dependencies.
// Rule: black = needs attention. All text goes in via textContent (never innerHTML).
import { RESORTS, DAYS, TARGETS, MONTHS, PORTFOLIO, UBUD_RAMP, LANDMARKS } from "./data.js";
import { MAP_DATA } from "./map-data.js";

/* ============================== State ============================== */
const state = { period: "mtd", cmp: "budget", focus: "all", explain: true, showAll: false };
const PERIOD_LABEL = { mtd: "month to date", qtd: "quarter to date", ytd: "year to date" };
const SEV_RANK = { critical: 3, serious: 2, watch: 1, ok: 0 };
const SEV_WORD = { critical: "Critical", serious: "Serious", watch: "Watch", ok: "On track" };
const SEV_MEANING = { critical: "fix this week", serious: "fix this month", watch: "keep an eye on it", ok: "no action" };
const MINUS = "−";
const byId = Object.fromEntries(RESORTS.map(r => [r.id, r]));

/* ============================== DOM helpers ============================== */
const $ = (sel, root = document) => root.querySelector(sel);
function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  setProps(el, props);
  append(el, kids);
  return el;
}
const SVGNS = "http://www.w3.org/2000/svg";
function s(tag, props, ...kids) {
  const el = document.createElementNS(SVGNS, tag);
  setProps(el, props);
  append(el, kids);
  return el;
}
function setProps(el, props) {
  if (!props) return;
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === "class") el.setAttribute("class", v);
    else if (k === "text") el.textContent = v;
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
}
function append(el, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false) continue;
    el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
}
const clear = el => { while (el.firstChild) el.removeChild(el.firstChild); return el; };

/* ============================== Formatting ============================== */
const nf0 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const round = (v, dp = 0) => { const m = 10 ** dp; return Math.round(v * m) / m; };
function fix(v, dp = 0) { return round(v, dp).toFixed(dp); }
function signed(v, dp = 0) {
  const r = round(v, dp);
  if (r === 0) return (0).toFixed(dp);
  return (r > 0 ? "+" : MINUS) + Math.abs(r).toFixed(dp);
}
// values are IDR thousands
function idr(k, dp = 2) {
  if (k == null || isNaN(k)) return "n/a";
  if (Math.abs(k) >= 1e6) return "IDR " + (k / 1e6).toFixed(1) + "B";
  if (Math.abs(k) >= 1000) return "IDR " + (k / 1000).toFixed(dp) + "M";
  return "IDR " + nf0.format(k) + "K";
}
function money(k) {
  if (!k) return null;
  if (k >= 1e6) return "≈ IDR " + (k / 1e6).toFixed(1) + "B";
  return "≈ IDR " + nf0.format(Math.round(k / 1000)) + "M";
}
const arrowFor = d => (round(d, 1) > 0 ? "▲" : round(d, 1) < 0 ? "▼" : "");

/* ============================== Status icons ============================== */
function statusIcon(sev, size = 18) {
  const svg = s("svg", { width: size, height: size, viewBox: "0 0 20 20", "aria-hidden": "true", focusable: "false" });
  if (sev === "critical") {
    svg.append(s("circle", { cx: 10, cy: 10, r: 9.5, fill: "#111" }), bang("#fff"));
  } else if (sev === "serious") {
    svg.append(s("path", { d: "M10 0.8 L19.6 18.6 H0.4 Z", fill: "#111", "stroke-linejoin": "round" }), bang("#fff", 3.2));
  } else if (sev === "watch") {
    svg.append(s("circle", { cx: 10, cy: 10, r: 8.6, fill: "#fff", stroke: "#111", "stroke-width": 1.8 }), bang("#111"));
  } else {
    svg.append(s("circle", { cx: 10, cy: 10, r: 8.6, fill: "#fff", stroke: "#8a8a8a", "stroke-width": 1.6 }),
      s("path", { d: "M6 10.4 L8.8 13.1 L14.2 7.4", fill: "none", stroke: "#5e5e5e", "stroke-width": 1.9, "stroke-linecap": "round", "stroke-linejoin": "round" }));
  }
  return svg;
}
function bang(fill, dy = 0) {
  const g = s("g", { fill });
  g.append(s("rect", { x: 8.9, y: 4.4 + dy, width: 2.2, height: 7, rx: 1 }), s("rect", { x: 8.9, y: 13 + dy, width: 2.2, height: 2.2, rx: 1.1 }));
  return g;
}
function statusEl(sev, extra) {
  return h("span", { class: "status status-" + (sev === "ok" ? "ontrack" : sev) }, statusIcon(sev), SEV_WORD[sev], extra || null);
}

/* ============================== Maths ============================== */
const cmpIdxFor = r => (state.cmp === "ly" && !r.isNew ? 2 : 1);
const cmpWord = idx => (idx === 2 ? "last year" : "budget");

// A new resort has only traded since opening (Ubud: 1 October), so its days are capped at quarter to date.
const daysFor = (r, p) => (r.isNew ? Math.min(DAYS[p], DAYS.qtd) : DAYS[p]);

function aggregate(list, p, idx) {
  let rooms = 0, nights = 0, rev = 0, gopW = 0;
  for (const r of list) {
    const d = r.p[p];
    const occ = d.occ[idx], adr = d.adr[idx], gop = d.gop[idx];
    if (occ == null || adr == null) return null;
    const days = daysFor(r, p), n = occ / 100 * r.rooms * days, rv = n * adr;
    rooms += r.rooms * days; nights += n; rev += rv; gopW += gop * rv;
  }
  if (!rooms) return null;
  const occ = nights / rooms * 100, adr = rev / nights; // rooms = room-days available
  return { occ, adr, revpar: occ / 100 * adr, gop: gopW / rev, rev, nights, rooms };
}
function mixAgg(list, p) {
  let nights = 0, direct = 0, ota = 0, g0 = 0, g1 = 0, resp = 0;
  for (const r of list) {
    const n = r.p[p].occ[0] / 100 * r.rooms * daysFor(r, p);
    nights += n; direct += r.ch[0] * n; ota += r.ch[1] * n; g0 += r.gss[0] * n; g1 += r.gss[1] * n; resp += r.resp * n;
  }
  return { direct: direct / nights, ota: ota / nights, gss: g0 / nights, gssLast: g1 / nights, resp: resp / nights };
}
function roomRevenue(r, p) {
  const d = r.p[p];
  return d.occ[0] / 100 * r.rooms * daysFor(r, p) * d.adr[0];
}

/* Scope used by KPI tiles */
function tileScope() {
  if (state.focus !== "all") {
    const r = byId[state.focus];
    const idx = cmpIdxFor(r);
    return { list: [r], idx, word: r.isNew ? "ramp-up plan" : cmpWord(idx),
      note: r.isNew && state.cmp === "ly" ? "New resort, no last year: compared with its ramp-up plan" : null };
  }
  if (state.cmp === "ly") return { list: RESORTS.filter(r => !r.isNew), idx: 2, word: "last year", note: "Like-for-like, excludes Ubud" };
  return { list: RESORTS, idx: 1, word: "budget", note: null };
}

/* ============================== Issue engine ============================== */
function issuesFor(r, p) {
  const d = r.p[p], days = daysFor(r, p), idx = cmpIdxFor(r), tWord = cmpWord(idx);
  const rev = roomRevenue(r, p);
  const plan = r.isNew ? " (ramp-up plan)" : "";
  const out = [];
  const add = o => out.push(Object.assign({ resort: r, money: null }, o));

  const occGap = round(d.occ[idx] - d.occ[0], 1);
  if (occGap >= 5) add({
    key: "occ", sev: occGap >= 10 ? "critical" : "serious",
    head: `${r.name}: occupancy ${fix(occGap)} points under ${tWord}`,
    detail: `${d.occ[0]}% vs ${d.occ[idx]}% ${PERIOD_LABEL[p]}${plan}`,
    owner: r.isNew ? "CMO + GM" : "GM + Revenue",
    action: r.isNew ? "launch metasearch, honeymoon packages and a creator campaign this week"
                    : "open tactical packages and member rates for the next 30 days",
    money: occGap / 100 * r.rooms * days * d.adr[0], moneyWhat: "room revenue gap"
  });
  if (d.rgi < 95) add({
    key: "rgi", sev: d.rgi < 85 ? "critical" : "serious",
    head: `${r.name}: earning ${100 - d.rgi}% less per room than competitors`,
    detail: `RevPAR index ${d.rgi} (100 = fair share of the local market), ${PERIOD_LABEL[p]}`,
    owner: "Revenue + CMO", action: "re-check rates against competitors and fund demand for weak dates",
    money: (100 - d.rgi) / 100 * rev, moneyWhat: "below fair share"
  });
  const gopGap = round(d.gop[idx] - d.gop[0], 1);
  if (gopGap >= 3) add({
    key: "gop", sev: "serious",
    head: `${r.name}: profit margin ${fix(gopGap)} points under ${tWord}`,
    detail: `GOP margin ${d.gop[0]}% vs ${d.gop[idx]}% ${PERIOD_LABEL[p]}${plan}`,
    owner: "CFO + GM", action: "review labour scheduling and costs against occupancy",
    money: gopGap / 100 * rev, moneyWhat: "profit gap"
  });
  if (d.pace != null && d.pace <= -5) add({
    key: "pace", sev: "serious",
    head: `${r.name}: next 90 days are ${Math.abs(d.pace)}% behind last year`,
    detail: "Room nights already booked for the next 90 days, vs the same point last year",
    owner: "CMO", action: "retargeting and an early-booking offer in top markets",
    money: Math.abs(d.pace) / 100 * rev * (90 / days), moneyWhat: "revenue at risk, next 90 days"
  });
  if (r.ch[0] < 20) add({
    key: "direct", sev: "watch",
    head: `${r.name}: only ${r.ch[0]}% of bookings are direct`,
    detail: `Target ${TARGETS.direct}%. Online travel agents bring ${r.ch[1]}%, at 18–30% commission`,
    owner: "CMO", action: "member-only rates, Google Hotel Ads and WhatsApp booking",
    money: rev * r.ch[1] / 100 * 0.2, moneyWhat: "commission paid to agents"
  });
  const drop = round(r.gss[1] - r.gss[0], 1);
  if (drop >= 0.2) add({
    key: "gss", sev: "watch",
    head: `${r.name}: guest score down ${drop.toFixed(1)} to ${r.gss[0].toFixed(1)}`,
    detail: `Out of 10, vs ${r.gss[1].toFixed(1)} last period`,
    owner: "GM", action: "read review themes and set a service-recovery plan for each department"
  });
  if (r.resp < 65) add({
    key: "resp", sev: "watch",
    head: `${r.name}: only ${r.resp}% of reviews answered`,
    detail: `Target ${TARGETS.reviewReplies}%`,
    owner: "GM", action: "turn on AI-drafted replies with manager approval"
  });
  return out;
}
const sortIssues = (a, b) => SEV_RANK[b.sev] - SEV_RANK[a.sev] || (b.money || 0) - (a.money || 0);

function brightFor(r, p) {
  const d = r.p[p], idx = cmpIdxFor(r), tWord = r.isNew ? "plan" : cmpWord(idx);
  const out = [];
  if (d.rgi >= 104) out.push({ r, score: d.rgi - 100, text: `${r.name}: RevPAR index ${d.rgi}`, detail: `earning ${d.rgi - 100}% more per room than competitors` });
  const adrPct = (d.adr[0] / d.adr[idx] - 1) * 100;
  if (round(adrPct, 1) >= 3) out.push({ r, score: adrPct, text: `${r.name}: average rate ${fix(adrPct, 1)}% above ${tWord}`, detail: `${idr(d.adr[0])} vs ${idr(d.adr[idx])}` });
  const gopUp = d.gop[0] - d.gop[idx];
  if (gopUp >= 2) out.push({ r, score: gopUp, text: `${r.name}: profit margin ${fix(gopUp)} points above ${tWord}`, detail: `GOP margin ${d.gop[0]}% vs ${d.gop[idx]}%` });
  return out;
}

function computeAll() {
  const p = state.period;
  const all = RESORTS.flatMap(r => issuesFor(r, p)).sort(sortIssues);
  const status = {};
  for (const r of RESORTS) {
    const mine = all.filter(i => i.resort === r);
    status[r.id] = mine.length ? mine[0].sev : "ok";
  }
  const resortOrder = [...RESORTS].sort((a, b) => {
    const ia = all.filter(i => i.resort === a), ib = all.filter(i => i.resort === b);
    return SEV_RANK[status[b.id]] - SEV_RANK[status[a.id]]
      || ib.reduce((t, i) => t + (i.money || 0), 0) - ia.reduce((t, i) => t + (i.money || 0), 0)
      || a.p[p].rgi - b.p[p].rgi;
  });
  return { all, status, resortOrder };
}

/* ============================== Tooltip ============================== */
const tip = $("#tooltip");
function showTip(x, y, title, rows) {
  clear(tip);
  tip.append(h("b", { text: title }));
  for (const row of rows) {
    if (typeof row === "string") tip.append(h("div", { text: row }));
    else tip.append(h("div", { class: "tt-row" }, h("span", { text: row[0] }), h("strong", { text: row[1] })));
  }
  tip.hidden = false;
  const tw = tip.offsetWidth, th = tip.offsetHeight, vw = window.innerWidth;
  let left = Math.min(Math.max(8, x - tw / 2), vw - tw - 8);
  let top = y - th - 14;
  if (top < 8) top = y + 18;
  tip.style.left = left + "px";
  tip.style.top = top + "px";
}
const hideTip = () => { tip.hidden = true; };
window.addEventListener("scroll", hideTip, { passive: true });

/* ============================== Header / verdict ============================== */
function renderVerdict(ctx) {
  const el = clear($("#verdict"));
  const p = state.period;
  if (state.focus !== "all") {
    const r = byId[state.focus];
    const mine = ctx.all.filter(i => i.resort === r);
    if (!mine.length) { el.append(h("strong", { text: r.name }), `: no problems found ${PERIOD_LABEL[p]}. On track.`); return; }
    el.append(h("strong", { text: r.name }), `: ${mine.length} ${mine.length === 1 ? "problem" : "problems"} ${PERIOD_LABEL[p]}. Worst: ${lc(mine[0].head.split(": ")[1])}.`);
    return;
  }
  const worst = ctx.resortOrder[0];
  const mine = ctx.all.filter(i => i.resort === worst);
  if (!mine.length) { el.append("All six resorts are on track ", PERIOD_LABEL[p], "."); return; }
  const parts = mine.slice(0, 2).map(i => lc(i.head.split(": ")[1]));
  const next = ctx.resortOrder[1];
  el.append(h("strong", { text: `${worst.name} needs the most help` }), `: ${parts.join(", and ")}. `);
  if (mine[0].money) el.append(`Biggest gap ${money(mine[0].money).replace("≈ ", "≈ ")}. `);
  if (next && ctx.status[next.id] !== "ok") el.append(`Next: ${next.name} (${SEV_WORD[ctx.status[next.id]]}).`);
}
const lc = t => t.charAt(0).toLowerCase() + t.slice(1);

/* ============================== KPI tiles ============================== */
function renderTiles(ctx) {
  const wrap = clear($("#tiles"));
  const p = state.period;
  const sc = tileScope();
  const A = aggregate(sc.list, p, 0), T = aggregate(sc.list, p, sc.idx);
  const M = mixAgg(sc.list, p);
  const scopeName = state.focus === "all" ? "the group" : byId[state.focus].name;
  $("#kpis-sub").textContent = sc.note && state.focus !== "all" ? `${cap(PERIOD_LABEL[p])} for ${scopeName}. ${sc.note}.`
    : `${cap(PERIOD_LABEL[p])} for ${scopeName}, compared with ${sc.word}.` + (sc.note ? ` ${sc.note}.` : "");

  const revDiff = (A.revpar / T.revpar - 1) * 100;
  const adrDiff = (A.adr / T.adr - 1) * 100;
  const occDiff = A.occ - T.occ, gopDiff = A.gop - T.gop, dirDiff = M.direct - TARGETS.direct, gssDiff = M.gss - M.gssLast;
  const hist = historyFor(state.focus);
  const live = liveMtd(state.focus);
  const tiles = [
    { key: "revpar", hero: true, label: "RevPAR", helper: "Revenue per available room (occupancy × average rate)",
      value: idr(A.revpar), diff: revDiff, unit: "%", dp: 1, vs: sc.word,
      sev: revDiff <= -10 ? "critical" : revDiff <= -5 ? "serious" : revDiff <= -2 ? "watch" : "ok",
      spark: hist.revpar.slice(0, 11).concat(live.revpar), sparkRef: hist.revparB.slice(0, 11).concat(live.revparB) },
    { key: "occ", label: "Occupancy", helper: "Share of rooms sold",
      value: fix(A.occ) + "%", diff: occDiff, unit: "pts", dp: 1, vs: sc.word,
      sev: occDiff <= -10 ? "critical" : occDiff <= -5 ? "serious" : occDiff <= -3 ? "watch" : "ok",
      spark: hist.occ.slice(0, 11).concat(live.occ) },
    { key: "adr", label: "ADR", helper: "Average daily rate per room sold",
      value: idr(A.adr), diff: adrDiff, unit: "%", dp: 1, vs: sc.word,
      sev: adrDiff <= -6 ? "serious" : adrDiff <= -2 ? "watch" : "ok",
      spark: hist.revpar.slice(0, 11).map((v, i) => v == null || !hist.occ[i] ? null : v / (hist.occ[i] / 100)).concat(live.adr) },
    { key: "gop", label: "GOP margin", helper: "Gross operating profit as a share of revenue",
      value: fix(A.gop) + "%", diff: gopDiff, unit: "pts", dp: 1, vs: sc.word,
      sev: gopDiff <= -5 ? "critical" : gopDiff <= -3 ? "serious" : gopDiff <= -2 ? "watch" : "ok",
      spark: hist.gop.slice(0, 11).concat(live.gop) },
    { key: "direct", label: "Direct booking share", helper: "Booked on our own website, phone or WhatsApp",
      value: fix(M.direct) + "%", diff: dirDiff, unit: "pts", dp: 1, vs: `the ${TARGETS.direct}% target`,
      sev: dirDiff <= -12 ? "serious" : dirDiff <= -4 ? "watch" : "ok",
      spark: hist.direct.slice(0, 11).concat(live.direct) },
    { key: "gss", label: "Guest score", helper: "Average review score, out of 10",
      value: M.gss.toFixed(1), diff: gssDiff, unit: "", dp: 1, vs: "last period",
      sev: gssDiff <= -0.3 ? "serious" : round(gssDiff, 1) <= -0.2 ? "watch" : "ok",
      spark: hist.gss.slice(0, 11).concat(live.gss) }
  ];

  for (const t of tiles) {
    const d = round(t.diff, t.dp);
    const words = d === 0 ? `On ${t.vs === "last period" ? "par with" : ""} ${t.vs}`.replace("On  ", "On ") :
      `${arrowFor(d)} ${Math.abs(d).toFixed(t.dp)}${t.unit === "%" ? "%" : t.unit ? " " + t.unit : ""} ${d > 0 ? "above" : "below"} ${t.vs}`;
    const attn = t.sev === "critical" || t.sev === "serious";
    const el = h("div", { class: "tile" + (t.hero ? " tile-hero" : "") + (attn ? " tile-attn" : ""), tabindex: "0", role: "group",
      "aria-label": `${t.label}: ${t.value}. ${words.replace(/[▲▼]\s?/g, "")}. Status: ${SEV_WORD[t.sev]}.` },
      h("div", { class: "tile-label", text: t.label }),
      h("div", { class: "helper", text: t.helper }),
      h("div", { class: "tile-num", text: t.value }),
      h("div", { class: "tile-change", text: words }),
      statusEl(t.sev),
      sc.note && (t.key !== "direct" && t.key !== "gss") ? h("div", { class: "tile-note", text: sc.note }) : null,
      t.hero ? h("div", { class: "spark-box" }, sparkline(t.spark, t.sparkRef), h("span", { class: "spark-cap", text: `Last 12 months: solid = actual, dashed = ${state.focus !== "all" && byId[state.focus].isNew ? "ramp-up plan" : "budget"}` }))
             : sparkline(t.spark, t.sparkRef)
    );
    wrap.append(el);
  }
}
const cap = t => t.charAt(0).toUpperCase() + t.slice(1);

function sparkline(vals, ref) {
  const W = 200, H = 40, pad = 3;
  const all = vals.concat(ref || []).filter(v => v != null);
  const mean = all.reduce((a, b) => a + b, 0) / all.length;
  const span = Math.max(Math.max(...all) - Math.min(...all), Math.abs(mean) * 0.08) || 1;
  const min = (Math.max(...all) + Math.min(...all)) / 2 - span / 2;
  const x = i => pad + i * (W - pad * 2) / (vals.length - 1);
  const y = v => H - pad - (v - min) / span * (H - pad * 2);
  const path = arr => { let d = "", pen = false; arr.forEach((v, i) => { if (v == null) { pen = false; return; } d += (pen ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1); pen = true; }); return d; };
  const svg = s("svg", { class: "spark", viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "none", "aria-hidden": "true", focusable: "false" });
  if (ref) svg.append(s("path", { d: path(ref), fill: "none", stroke: "#8a8a8a", "stroke-width": 1.4, "stroke-dasharray": "4 3", "vector-effect": "non-scaling-stroke" }));
  svg.append(s("path", { d: path(vals), fill: "none", stroke: "#111", "stroke-width": 1.6, "stroke-linejoin": "round", "vector-effect": "non-scaling-stroke" }));
  const li = vals.length - 1;
  if (vals[li] != null) svg.append(s("circle", { cx: x(li), cy: y(vals[li]), r: 2.6, fill: "#111" }));
  return svg;
}

/* Monthly history. The group series comes from data.js; a resort's history is the group
   trend scaled to that resort's year-to-date level (sample data has no per-resort history). */
function historyFor(focus) {
  if (focus === "all") return PORTFOLIO;
  const r = byId[focus];
  const G = aggregate(RESORTS, "ytd", 0), GB = aggregate(RESORTS, "ytd", 1);
  const R = aggregate([r], "ytd", 0), RB = aggregate([r], "ytd", 1);
  const k = R.revpar / G.revpar, kb = RB.revpar / GB.revpar, ko = R.occ / G.occ;
  const opened = r.isNew ? MONTHS.indexOf("Oct") : 0;
  const scale = (arr, f, add = 0) => arr.map((v, i) => v == null || i < opened ? null : add ? v + f : v * f);
  const M = mixAgg(RESORTS, "ytd");
  return {
    revpar: scale(PORTFOLIO.revpar, k), revparB: scale(PORTFOLIO.revparB, kb), occ: scale(PORTFOLIO.occ, ko),
    gop: scale(PORTFOLIO.gop, R.gop - G.gop, 1), direct: scale(PORTFOLIO.direct, r.ch[0] - M.direct, 1),
    gss: scale(PORTFOLIO.gss, r.gss[0] - M.gss, 1)
  };
}
function liveMtd(focus) {
  const list = focus === "all" ? RESORTS : [byId[focus]];
  const A = aggregate(list, "mtd", 0), B = aggregate(list, "mtd", 1), M = mixAgg(list, "mtd");
  return { revpar: A.revpar, revparB: B.revpar, occ: A.occ, adr: A.adr, gop: A.gop, direct: M.direct, gss: M.gss };
}

/* ============================== Issues ============================== */
function renderIssues(ctx) {
  const list = clear($("#issue-list"));
  const scoped = state.focus === "all" ? ctx.all : ctx.all.filter(i => i.resort.id === state.focus);
  const shown = state.showAll ? scoped : scoped.slice(0, 5);
  if (!scoped.length) list.append(h("li", { class: "empty", text: "No problems found for this resort in this period." }));
  for (const i of shown) {
    const m = money(i.money);
    const btn = h("button", { type: "button", class: "issue-btn",
      "aria-label": `${SEV_WORD[i.sev]}: ${i.head}. ${i.detail}. ${i.owner}: ${i.action}. ${m ? m.replace("≈", "about") + " " + i.moneyWhat : "No direct cost"}. Select to focus the page on ${i.resort.name}.`,
      onclick: () => setFocus(i.resort.id, true) },
      statusEl(i.sev),
      h("span", { class: "issue-head", text: i.head }),
      h("span", { class: "issue-detail", text: i.detail }),
      h("span", { class: "issue-act" }, h("strong", { text: i.owner + ":" }), " " + i.action),
      h("span", { class: "issue-money" }, m || "No direct cost", h("small", { text: m ? i.moneyWhat : "measured in reviews, not rupiah" }))
    );
    list.append(h("li", { class: "issue" + (state.focus === i.resort.id ? " issue-sel" : "") }, btn));
  }
  const more = $("#show-all");
  more.hidden = scoped.length <= 5;
  more.textContent = state.showAll ? "Show top 5 only" : `Show all ${scoped.length} problems`;
  more.setAttribute("aria-expanded", String(state.showAll));

  const bl = clear($("#bright-list"));
  const cands = RESORTS.filter(r => state.focus === "all" || r.id === state.focus).flatMap(r => brightFor(r, state.period)).sort((a, b) => b.score - a.score);
  const picked = [], used = new Set();
  for (const c of cands) if (picked.length < 4 && !used.has(c.r.id)) { picked.push(c); used.add(c.r.id); }
  for (const c of cands) if (picked.length < 4 && !picked.includes(c)) picked.push(c);
  if (!picked.length) bl.append(h("li", {}, h("span", { text: "—" }), h("span", { text: "Nothing stands out above target in this view." })));
  for (const c of picked) bl.append(h("li", {}, h("span", { class: "check", "aria-hidden": "true" }, statusIcon("ok", 16)),
    h("span", {}, h("strong", { text: c.text }), h("br"), h("span", { class: "helper", text: c.detail }))));
}

/* ============================== Map ============================== */
const PIN_PREF = {
  sanur: ["r", "b", "l"], ubud: ["l", "t", "r"], amed: ["r", "t", "l"], senggigi: ["b", "r", "t"],
  komodo: ["l", "b", "r"], seraya: ["l", "r", "t"]
};
const REG_NAME = { "Karang Asem": "Karangasem", "Kota Denpasar": "Denpasar", "Kota Mataram": "Mataram" };
const REG_NUDGE = { "Badung": [8, -30], "Kota Denpasar": [-14, 6], "Klungkung": [0, 0], "Lombok Barat": [-6, 30], "Gianyar": [10, -30], "Kota Mataram": [-30, 2], "Bangli": [0, -6] };
const SEAS = {
  main: [["Bali Sea", 115.62, -8.06], ["Indian Ocean", 115.75, -8.93], ["Lombok Strait", 115.80, -8.58]],
  close: [["Flores Sea", 119.76, -8.35]]
};
const MOBILE_VIEW = { main: [180, 830] }; // horizontal crop (x units) on narrow screens: west Bali and east Lombok have no resorts

const mapState = { built: false, panels: {} };

function project(P, lat, lon) { return [(lon - P.lon0) * P.k * P.scale, (P.lat0 - lat) * P.scale]; }

function buildMaps() {
  for (const key of ["main", "close"]) {
    const P = MAP_DATA[key];
    const fig = $(key === "main" ? "#map-main" : "#map-close");
    const stage = h("div", { class: "map-stage" });
    const svg = s("svg", { class: "geo", viewBox: `0 0 ${P.width} ${P.height}`, preserveAspectRatio: "xMidYMid slice", role: "img",
      "aria-label": key === "main" ? "Map of Bali and Lombok with regency borders and four resort pins" : "Close-up map of Labuan Bajo, Flores, with two resort pins" });
    const coast = s("g"), regs = s("g");
    for (const r of P.regions) { coast.append(s("path", { class: "coast", d: r.d })); regs.append(s("path", { class: "reg", d: r.d })); }
    svg.append(coast, regs);
    stage.append(svg);
    const items = [];
    // seas
    for (const [name, lon, lat] of SEAS[key]) {
      const [x, y] = project(P, lat, lon);
      const el = h("span", { class: "ov ov-text ov-sea", text: name, "aria-hidden": "true" });
      items.push({ el, x, y, prio: 3 }); stage.append(el);
    }
    // landmarks
    for (const L of LANDMARKS.filter(l => l.panel === key)) {
      if (L.kind === "town") { // place name, set just east of the town on land so it clears the Komodo pin
        const [x, y] = project(P, L.lat - 0.012, L.lon + 0.04);
        const el = h("span", { class: "ov ov-text ov-town halo", text: L.name, "aria-hidden": "true" });
        items.push({ el, x, y, prio: 2 }); stage.append(el); continue;
      }
      const [x, y] = project(P, L.lat, L.lon);
      const mark = L.kind === "volcano" ? s("svg", { width: 11, height: 10, viewBox: "0 0 11 10" }, s("path", { d: "M5.5 0.5 L10.5 9.5 H0.5 Z", fill: "#7a7a7a" }))
        : L.kind === "airport" ? s("svg", { width: 9, height: 9, viewBox: "0 0 9 9" }, s("rect", { x: 0.5, y: 0.5, width: 8, height: 8, fill: "#fff", stroke: "#6a6a6a", "stroke-width": 1.4 }))
        : s("svg", { width: 8, height: 8, viewBox: "0 0 8 8" }, s("circle", { cx: 4, cy: 4, r: 3, fill: "#6a6a6a" }));
      const el = h("span", { class: "ov ov-mark", "aria-hidden": "true" }, mark, h("span", { class: "ov-text halo", text: L.kind === "airport" ? L.name + " airport" : L.name }));
      el.style.transform = "translate(-5px, -50%)"; // marker sits on the point, label runs right
      items.push({ el, x, y, prio: 2 }); stage.append(el);
    }
    // regency names
    for (const r of P.regions) {
      if (!r.label) continue;
      const nudge = REG_NUDGE[r.name] || [0, 0];
      const el = h("span", { class: "ov ov-text ov-reg halo", text: REG_NAME[r.name] || r.name, "aria-hidden": "true" });
      items.push({ el, x: r.label[0] + nudge[0], y: r.label[1] + nudge[1], prio: 4 }); stage.append(el);
    }
    // north arrow + scale bar
    stage.append(h("div", { class: "north", "aria-hidden": "true" },
      s("svg", { width: 14, height: 18, viewBox: "0 0 14 18" }, s("path", { d: "M7 1 L12.5 16 L7 12.5 L1.5 16 Z", fill: "#6a6a6a" })), h("div", { text: "N" })));
    const km = key === "main" ? 20 : 5;
    const bar = h("div", { class: "scalebar", "aria-hidden": "true" }, h("i"), h("span", { text: km + " km" }));
    stage.append(bar);

    const pins = {}, labels = {};
    for (const r of RESORTS.filter(r => (key === "main") === (r.island !== "Flores"))) {
      const [x, y] = project(P, r.lat, r.lon);
      const pin = h("button", { type: "button", class: "pin", onclick: () => setFocus(r.id === state.focus ? "all" : r.id, false) });
      const lab = h("span", { class: "pin-label halo", "aria-hidden": "true" });
      pin.addEventListener("pointerenter", () => pinTip(r, pin));
      pin.addEventListener("pointerleave", hideTip);
      pin.addEventListener("focus", () => pinTip(r, pin));
      pin.addEventListener("blur", hideTip);
      pins[r.id] = { el: pin, x, y, r }; labels[r.id] = lab;
      stage.append(pin, lab);
    }
    fig.insertBefore(stage, fig.querySelector(".map-cap").nextSibling);
    mapState.panels[key] = { P, stage, svg, items, pins, labels, bar, km };
  }
  const ro = new ResizeObserver(() => layoutMaps());
  for (const k in mapState.panels) ro.observe(mapState.panels[k].stage);
  mapState.built = true;
}

function pinTip(r, pin) {
  const ctx = currentCtx;
  const d = r.p[state.period];
  const b = pin.getBoundingClientRect();
  showTip(b.left + b.width / 2, b.top, `${r.name}, ${r.island}`, [
    ["Status", SEV_WORD[ctx.status[r.id]]],
    ["RevPAR", idr(d.occ[0] / 100 * d.adr[0])],
    ["Occupancy", `${d.occ[0]}% (${signed(d.occ[0] - d.occ[cmpIdxFor(r)])} pts)`],
    ["RevPAR index", String(d.rgi)],
    "Tap to focus the page on " + r.name
  ]);
}

function updateMapPins(ctx) {
  for (const key in mapState.panels) {
    const M = mapState.panels[key];
    for (const id in M.pins) {
      const { el, r } = M.pins[id];
      const sev = ctx.status[id];
      const d = r.p[state.period];
      const revpar = d.occ[0] / 100 * d.adr[0];
      const size = Math.round(24 + Math.max(0, Math.min(1, (revpar - 900) / 1300)) * 14); // pin height grows with RevPAR
      const attn = sev === "critical" || sev === "serious";
      const fill = attn ? "#111" : "#fff", stroke = attn ? "#111" : sev === "watch" ? "#111" : "#8a8a8a";
      const w = Math.round(size * 0.74);
      const svg = s("svg", { width: w, height: size, viewBox: "0 0 20 27", "aria-hidden": "true", focusable: "false" },
        s("path", { d: "M10 26 C10 26 1.2 16.4 1.2 9.8 A8.8 8.8 0 0 1 18.8 9.8 C18.8 16.4 10 26 10 26 Z", fill, stroke, "stroke-width": attn ? 1.2 : 1.8 }));
      if (attn) svg.append(s("rect", { x: 8.9, y: 4.2, width: 2.2, height: 6.4, rx: 1, fill: "#fff" }), s("rect", { x: 8.9, y: 12, width: 2.2, height: 2.2, rx: 1.1, fill: "#fff" }));
      else if (sev === "watch") svg.append(s("rect", { x: 8.9, y: 4.6, width: 2.2, height: 6, rx: 1, fill: "#111" }), s("rect", { x: 8.9, y: 12, width: 2.2, height: 2.2, rx: 1.1, fill: "#111" }));
      else svg.append(s("circle", { cx: 10, cy: 9.8, r: 2.6, fill: "#8a8a8a" }));
      clear(el).append(svg);
      el.dataset.w = w; el.dataset.h = size;
      el.classList.toggle("is-focus", state.focus === id);
      el.setAttribute("aria-label", `${r.name}: ${SEV_WORD[sev]}. RevPAR ${idr(revpar)}, occupancy ${d.occ[0]}%, RevPAR index ${d.rgi}. Select to ${state.focus === id ? "show all resorts" : "focus the page on " + r.name}.`);
      el.setAttribute("aria-pressed", String(state.focus === id));
      const lab = clear(M.labels[id]);
      lab.className = "pin-label halo" + (attn ? " attn" : "");
      lab.append(h("b", { text: r.name }), h("span", { text: SEV_WORD[sev] }));
    }
  }
  layoutMaps();
}

function layoutMaps() {
  for (const key in mapState.panels) {
    const M = mapState.panels[key], P = M.P;
    const sw = M.stage.clientWidth;
    if (!sw) continue;
    // horizontal crop on narrow screens
    let vx0 = 0, vx1 = P.width;
    if (MOBILE_VIEW[key] && sw < 600) [vx0, vx1] = MOBILE_VIEW[key];
    const vw = vx1 - vx0, k = sw / vw, sh = P.height * k;
    M.svg.setAttribute("viewBox", `${vx0} 0 ${vw} ${P.height}`);
    M.stage.style.height = sh + "px";
    M.svg.style.height = sh + "px";
    const px = (x, y) => [(x - vx0) * k, y * k];
    // scale bar
    const units = M.km / 111.32 * P.scale;
    M.bar.querySelector("i").style.width = (units * k).toFixed(1) + "px";

    const stageBox = { l: 0, t: 0, r: sw, b: sh };
    const placed = [];
    const inside = b => b.l >= 2 && b.t >= 2 && b.r <= sw - 2 && b.b <= sh - 2;
    const hits = (a, b, pad = 3) => !(a.r + pad <= b.l || b.r + pad <= a.l || a.b + pad <= b.t || b.b + pad <= a.t);
    // reserved: north arrow and scale bar corners
    placed.push({ l: sw - 30, t: 0, r: sw, b: 36 }, { l: 0, t: sh - 30, r: 110, b: sh });
    // pins first
    for (const id in M.pins) {
      const pin = M.pins[id];
      const [x, y] = px(pin.x, pin.y);
      const w = +pin.el.dataset.w, ht = +pin.el.dataset.h;
      pin.el.style.left = x + "px"; pin.el.style.top = y + "px";
      pin.box = { l: x - w / 2, t: y - ht, r: x + w / 2, b: y, w, ht, x, y };
      placed.push(pin.box);
    }
    // pin labels: first preferred side that fits
    for (const id in M.pins) {
      const pin = M.pins[id], lab = M.labels[id];
      lab.style.visibility = "hidden"; lab.style.left = "0px"; lab.style.top = "0px";
      const lw = lab.offsetWidth, lh = lab.offsetHeight;
      const { x, y, w, ht } = pin.box, headY = y - ht * 0.64;
      const opts = { r: [x + w / 2 + 5, headY - lh / 2], l: [x - w / 2 - 5 - lw, headY - lh / 2], t: [x - lw / 2, y - ht - 3 - lh], b: [x - lw / 2, y + 3] };
      let best = null;
      for (const side of PIN_PREF[id].concat(["r", "l", "t", "b"])) {
        const [l, t] = opts[side];
        const box = { l, t, r: l + lw, b: t + lh };
        if (inside(box) && !placed.some(pb => pb !== pin.box && hits(box, pb))) { best = { box, side }; break; }
      }
      if (!best) { const [l, t] = opts[PIN_PREF[id][0]]; best = { box: { l, t, r: l + lw, b: t + lh }, side: PIN_PREF[id][0] }; }
      lab.style.left = best.box.l + "px"; lab.style.top = best.box.t + "px";
      lab.style.textAlign = best.side === "l" ? "right" : best.side === "r" ? "left" : "center";
      lab.style.visibility = "visible";
      placed.push(best.box);
    }
    // secondary labels: keep only those that do not collide (priority order)
    const sorted = [...M.items].sort((a, b) => a.prio - b.prio);
    for (const it of sorted) {
      it.el.style.visibility = "hidden";
      const [x, y] = px(it.x, it.y);
      it.el.style.left = x + "px"; it.el.style.top = y + "px";
      if (getComputedStyle(it.el).display === "none") continue;
      const sb = M.stage.getBoundingClientRect(), b = it.el.getBoundingClientRect();
      const box = { l: b.left - sb.left, t: b.top - sb.top, r: b.right - sb.left, b: b.bottom - sb.top };
      if (b.width && inside(box) && !placed.some(pb => hits(box, pb, 4))) { it.el.style.visibility = "visible"; placed.push(box); }
    }
  }
}

function renderResortList(ctx) {
  const ol = clear($("#resort-list"));
  for (const r of ctx.resortOrder) {
    const d = r.p[state.period], sev = ctx.status[r.id];
    const n = ctx.all.filter(i => i.resort === r).length;
    ol.append(h("li", {}, h("button", { type: "button", class: "resort-row", "aria-pressed": String(state.focus === r.id),
      onclick: () => setFocus(state.focus === r.id ? "all" : r.id, false) },
      h("span", {}, h("span", { class: "rname", text: r.name }), " ", h("span", { class: "helper", text: r.island })),
      h("span", { class: "rmeta" }, statusEl(sev), n ? h("span", { class: "rcount", text: `${n} ${n === 1 ? "problem" : "problems"}` }) : null),
      h("span", { class: "rrev", text: "RevPAR " + idr(d.occ[0] / 100 * d.adr[0]) })
    )));
  }
}

/* ============================== Scorecard ============================== */
const COLS = [
  { key: "occ", label: "Occupancy", vs: "cmp", far: -10, below: -3,
    val: (r, d) => d.occ[0] + "%", diff: (r, d, i) => d.occ[0] - d.occ[i], dtxt: v => signed(v) + " pts" },
  { key: "adr", label: "ADR", vs: "cmp", far: -6, below: -2,
    val: (r, d) => idr(d.adr[0]), diff: (r, d, i) => (d.adr[0] / d.adr[i] - 1) * 100, dtxt: v => signed(v, 1) + "%", dp: 1 },
  { key: "rgi", label: "RevPAR index", vs: "vs 100", far: -15, below: -5,
    val: (r, d) => String(d.rgi), diff: (r, d) => d.rgi - 100, dtxt: v => signed(v) + " vs 100" },
  { key: "gop", label: "GOP margin", vs: "cmp", far: -5, below: -2,
    val: (r, d) => d.gop[0] + "%", diff: (r, d, i) => d.gop[0] - d.gop[i], dtxt: v => signed(v) + " pts" },
  { key: "direct", label: "Direct share", vs: `vs ${TARGETS.direct}%`, far: -12, below: -4,
    val: r => r.ch[0] + "%", diff: r => r.ch[0] - TARGETS.direct, dtxt: v => signed(v) + " pts" },
  { key: "gss", label: "Guest score", vs: "vs last period", far: -3, below: -2,
    val: r => r.gss[0].toFixed(1), diff: r => round((r.gss[0] - r.gss[1]) * 10), dtxt: v => signed(v / 10, 1) },
  { key: "resp", label: "Review replies", vs: `vs ${TARGETS.reviewReplies}%`, far: -25, below: -8,
    val: r => r.resp + "%", diff: r => r.resp - TARGETS.reviewReplies, dtxt: v => signed(v) + " pts" }
];
function cellLevel(c, v) { const rv = round(v, c.dp || 0); return rv <= c.far ? "far" : rv <= c.below ? "below" : "ok"; }

function renderScorecard(ctx) {
  const wrap = clear($("#score-wrap"));
  const p = state.period;
  const cw = state.cmp === "ly" ? "last year" : "budget";
  $("#score-sub").textContent = `${cap(PERIOD_LABEL[p])}. Occupancy, ADR and GOP are compared with ${cw}; the other columns with fixed targets.` + (state.cmp === "ly" ? " Ubud is new, so it is compared with its ramp-up plan." : "");
  const table = h("table", { class: "score" });
  table.append(h("caption", { class: "sr", text: `Scorecard: six resorts by seven measures, ${PERIOD_LABEL[p]}. Shading: black far below target, gray below target, white on or above.` }));
  const hr = h("tr", {}, h("th", { scope: "col", text: "Resort" }));
  for (const c of COLS) hr.append(h("th", { scope: "col" }, c.label, h("br"), h("span", { class: "helper", text: c.vs === "cmp" ? "vs " + cw : c.vs })));
  table.append(h("thead", {}, hr));
  const tb = h("tbody");
  for (const r of RESORTS) {
    const d = r.p[p], i = cmpIdxFor(r), sev = ctx.status[r.id];
    const tr = h("tr", { class: state.focus === r.id ? "is-focus" : null, onclick: () => setFocus(state.focus === r.id ? "all" : r.id, false) });
    tr.append(h("th", { scope: "row" },
      h("button", { type: "button", class: "score-btn", "aria-pressed": String(state.focus === r.id),
        "aria-label": `${r.name}, ${SEV_WORD[sev]}. Select to ${state.focus === r.id ? "show all resorts" : "focus the page on " + r.name}.`,
        onclick: e => { e.stopPropagation(); setFocus(state.focus === r.id ? "all" : r.id, false); } },
        h("span", { class: "rn", text: r.name + (r.isNew && state.cmp === "ly" ? " †" : "") }),
        h("span", { class: "rs" }, statusEl(sev)))));
    for (const c of COLS) {
      const v = c.diff(r, d, i);
      const lvl = cellLevel(c, v);
      const word = lvl === "far" ? "far below target" : lvl === "below" ? "below target" : "on or above target";
      const dv = round(v, c.dp || 0);
      tr.append(h("td", { class: "c-" + lvl, title: `${c.label}: ${word}` },
        h("span", { class: "v", text: c.val(r, d) }),
        h("span", { class: "d" }, h("span", { "aria-hidden": "true", text: arrowFor(dv) ? arrowFor(dv) + " " : "" }), c.dtxt(v)),
        h("span", { class: "sr", text: ", " + word })));
    }
    tb.append(tr);
  }
  table.append(tb);
  wrap.append(table);
  if (state.cmp === "ly") wrap.append(h("p", { class: "helper", style: { padding: "8px 10px" }, text: "† Ubud opened October 2026: compared with its ramp-up plan, not last year." }));
}

/* ============================== Charts ============================== */
const chartDefs = [];
function buildCharts() {
  const grid = $("#chart-grid");
  const defs = [
    { id: "revpar", title: "RevPAR, last 12 months", render: renderRevparChart },
    { id: "ramp", title: "Ubud ramp-up: occupancy vs plan", render: renderRampChart },
    { id: "mix", title: "Booking channel mix", render: renderMixChart },
    { id: "pace", title: "Next 90 days on the books vs last year", render: renderPaceChart }
  ];
  for (const def of defs) {
    const fig = h("figure", { class: "chart", id: "chart-" + def.id });
    const sub = h("p", { class: "sub" });
    const legend = h("div", { class: "legend", "aria-hidden": "true" });
    const plotWrap = h("div", { class: "plot-wrap" });
    const tableWrap = h("div", { class: "table-wrap", hidden: true });
    const note = h("p", { class: "chart-note" });
    const btn = h("button", { type: "button", class: "btn btn-quiet", "aria-expanded": "false", text: "View as table" });
    btn.addEventListener("click", () => {
      const open = tableWrap.hidden;
      tableWrap.hidden = !open; btn.setAttribute("aria-expanded", String(open)); btn.textContent = open ? "Hide table" : "View as table";
    });
    fig.append(h("h3", { text: def.title }), sub, legend, plotWrap, h("div", { class: "chart-foot" }, note, btn), tableWrap);
    grid.append(fig);
    Object.assign(def, { fig, sub, legend, plotWrap, tableWrap, note });
    chartDefs.push(def);
    new ResizeObserver(() => { if (def.lastW !== plotWrap.clientWidth) { def.lastW = plotWrap.clientWidth; def.render(def); } }).observe(plotWrap);
  }
}
function renderCharts() { for (const d of chartDefs) d.render(d); }

function dataTable(def, head, rows) {
  const t = h("table", { class: "data-table" });
  t.append(h("caption", { class: "sr", text: def.title }));
  t.append(h("thead", {}, h("tr", {}, head.map((x, i) => h("th", { scope: "col", text: x })))));
  t.append(h("tbody", {}, rows.map(r => h("tr", {}, r.map((x, i) => i === 0 ? h("th", { scope: "row", text: x }) : h("td", { text: x }))))));
  clear(def.tableWrap).append(t);
}
function legendItems(def, items) {
  clear(def.legend);
  for (const [cls, label, style] of items) {
    const sw = h("i", { class: cls });
    if (style) Object.assign(sw.style, style);
    def.legend.append(h("span", {}, sw, label));
  }
}

function niceTicks(min, max, n = 4) {
  const span = max - min, step0 = span / n, mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= step0);
  const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step;
  const out = []; for (let v = lo; v <= hi + 1e-9; v += step) out.push(round(v, 6));
  return out;
}

/* Generic line chart: series[0] = actual (solid black), series[1] = reference (dashed gray) */
function lineChart(def, { labels, series, yFmt, endFmt, aria, tipRows, yMin }) {
  const W = Math.max(280, def.plotWrap.clientWidth || 520), H = W < 420 ? 210 : 240;
  const ml = 44, mr = W < 420 ? 82 : 96, mt = 12, mb = 26;
  const vals = series.flatMap(s => s.vals).filter(v => v != null);
  const ticks = niceTicks(yMin != null ? Math.min(yMin, ...vals) : Math.min(...vals), Math.max(...vals), 4);
  const y0 = ticks[0], y1 = ticks[ticks.length - 1];
  const x = i => ml + i * (W - ml - mr) / (labels.length - 1);
  const y = v => mt + (1 - (v - y0) / (y1 - y0)) * (H - mt - mb);
  const svg = s("svg", { class: "plot", viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img", tabindex: "0", "aria-label": aria });
  for (const t of ticks) {
    svg.append(s("line", { class: "grid", x1: ml, x2: W - mr, y1: y(t), y2: y(t) }));
    svg.append(s("text", { x: ml - 8, y: y(t) + 4, "text-anchor": "end", "font-size": 12, text: yFmt(t) }));
  }
  const step = labels.length > 8 && W < 480 ? 2 : 1;
  labels.forEach((l, i) => {
    if ((labels.length - 1 - i) % step) return;
    svg.append(s("text", { x: x(i), y: H - 6, "text-anchor": "middle", "font-size": 12, text: l }));
  });
  const pathOf = arr => { let d = "", pen = false; arr.forEach((v, i) => { if (v == null) { pen = false; return; } d += (pen ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1); pen = true; }); return d; };
  const ends = [];
  [...series].reverse().forEach(sr => {
    svg.append(s("path", { class: sr.ref ? "l-ref" : "l-act", d: pathOf(sr.vals) }));
    const li = sr.vals.length - 1;
    if (sr.vals[li] != null) {
      svg.append(s("circle", { class: sr.ref ? "dot-ref" : "dot", cx: x(li), cy: y(sr.vals[li]), r: sr.ref ? 3 : 3.6 }));
      ends.push({ y: y(sr.vals[li]), text: endFmt(sr), ref: sr.ref });
    }
  });
  // end labels, nudged apart
  ends.sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 16) { const mid = (ends[i].y + ends[i - 1].y) / 2; ends[i - 1].y = mid - 8; ends[i].y = mid + 8; }
  for (const e of ends) svg.append(s("text", { class: e.ref ? "end-lbl-ref" : "end-lbl", x: W - mr + 9, y: e.y + 4.5, "font-size": 13, text: e.text }));
  // interaction
  const cursor = s("line", { class: "cursor", y1: mt, y2: H - mb, visibility: "hidden" });
  svg.append(cursor);
  let idx = labels.length - 1;
  const show = (i, clientX, clientY) => {
    idx = i;
    cursor.setAttribute("x1", x(i)); cursor.setAttribute("x2", x(i)); cursor.setAttribute("visibility", "visible");
    const b = svg.getBoundingClientRect();
    const sx = b.left + x(i) * b.width / W;
    const vy = series[0].vals[i] ?? series[1].vals[i];
    showTip(sx, clientY ?? (b.top + y(vy) * b.height / H), labels[i], tipRows(i));
  };
  const hide = () => { cursor.setAttribute("visibility", "hidden"); hideTip(); };
  svg.addEventListener("pointermove", e => {
    const b = svg.getBoundingClientRect(), mx = (e.clientX - b.left) * W / b.width;
    const i = Math.max(0, Math.min(labels.length - 1, Math.round((mx - ml) / ((W - ml - mr) / (labels.length - 1)))));
    show(i, e.clientX, e.clientY);
  });
  svg.addEventListener("pointerleave", hide);
  svg.addEventListener("focus", () => show(idx));
  svg.addEventListener("blur", hide);
  svg.addEventListener("keydown", e => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); show(Math.max(0, Math.min(labels.length - 1, idx + (e.key === "ArrowRight" ? 1 : -1)))); }
    if (e.key === "Escape") hide();
  });
  clear(def.plotWrap).append(svg);
}

function renderRevparChart(def) {
  const focus = state.focus, r = focus === "all" ? null : byId[focus];
  const hist = historyFor(focus), live = liveMtd(focus);
  const act = hist.revpar.slice(0, 11).concat(live.revpar), bud = hist.revparB.slice(0, 11).concat(live.revparB);
  const who = r ? r.name : "Whole group";
  def.sub.textContent = `${who}, December 2025 to November 2026 (November is month to date).`;
  legendItems(def, [["lg-line", "Actual"], ["lg-dash", r && r.isNew ? "Ramp-up plan" : "Budget"]]);
  const last = act[11], lastB = bud[11];
  lineChart(def, {
    labels: MONTHS, series: [{ vals: act, name: "Actual" }, { vals: bud, ref: true, name: "Budget" }],
    yFmt: v => (v / 1000).toFixed(1) + "M", endFmt: sr => (sr.ref ? "Budget " : "") + (sr.vals[11] / 1000).toFixed(2) + "M",
    aria: `Line chart: ${who} RevPAR by month. November ${idr(last)} against budget ${idr(lastB)}, ${signed((last / lastB - 1) * 100, 1)}%.`,
    tipRows: i => [["Actual", idr(act[i])], ["Budget", idr(bud[i])], act[i] != null && bud[i] != null ? `${arrowFor(act[i] - bud[i])} ${signed((act[i] / bud[i] - 1) * 100, 1)}% vs budget` : "No data"]
  });
  def.note.textContent = r ? "Values in IDR. Resort history before November is estimated from the group trend (sample data)." : "Values in IDR per available room.";
  dataTable(def, ["Month", "Actual", "Budget", "Difference"], MONTHS.map((m, i) => [m, idr(act[i]), idr(bud[i]),
    act[i] != null && bud[i] != null ? signed((act[i] / bud[i] - 1) * 100, 1) + "%" : "n/a"]));
}

function renderRampChart(def) {
  const R = UBUD_RAMP, n = R.actual.length - 1;
  def.sub.textContent = "Ubud occupancy by week since opening in October 2026.";
  legendItems(def, [["lg-line", "Actual"], ["lg-dash", "Plan"]]);
  lineChart(def, {
    labels: R.weeks, series: [{ vals: R.actual }, { vals: R.plan, ref: true }], yMin: 0,
    yFmt: v => v + "%", endFmt: sr => sr.ref ? `${sr.vals[n]}% plan` : `${sr.vals[n]}% actual`,
    aria: `Line chart: Ubud occupancy by week since opening. Week 7: ${R.actual[n]}% actual against ${R.plan[n]}% plan, ${R.plan[n] - R.actual[n]} points behind.`,
    tipRows: i => [["Actual", R.actual[i] + "%"], ["Plan", R.plan[i] + "%"], `${arrowFor(R.actual[i] - R.plan[i])} ${signed(R.actual[i] - R.plan[i])} pts vs plan`]
  });
  def.note.textContent = `Behind plan every week; the gap is ${R.plan[n] - R.actual[n]} points in week 7.`;
  dataTable(def, ["Week", "Actual", "Plan", "Difference"], R.weeks.map((w, i) => [w, R.actual[i] + "%", R.plan[i] + "%", signed(R.actual[i] - R.plan[i]) + " pts"]));
}

/* Horizontal bar charts share row interaction */
function rowInteraction(svg, rows, rowY, rowH, W, H, tipFor, selRect) {
  let idx = 0;
  const show = (i, cx, cy) => {
    idx = i;
    selRect.setAttribute("y", rowY(i) - 4); selRect.setAttribute("height", rowH + 8); selRect.setAttribute("visibility", "visible");
    const b = svg.getBoundingClientRect();
    const [title, lines] = tipFor(i);
    showTip(cx ?? b.left + b.width * 0.6, cy ?? b.top + (rowY(i)) * b.height / H, title, lines);
  };
  const hide = () => { selRect.setAttribute("visibility", "hidden"); hideTip(); };
  svg.addEventListener("pointermove", e => {
    const b = svg.getBoundingClientRect(), my = (e.clientY - b.top) * H / b.height;
    const i = rows.findIndex((_, k) => my >= rowY(k) - 6 && my <= rowY(k) + rowH + 6);
    if (i >= 0) show(i, e.clientX, e.clientY); else hide();
  });
  svg.addEventListener("pointerleave", hide);
  svg.addEventListener("focus", () => show(idx));
  svg.addEventListener("blur", hide);
  svg.addEventListener("keydown", e => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); show(Math.max(0, Math.min(rows.length - 1, idx + (e.key === "ArrowDown" ? 1 : -1)))); }
    if (e.key === "Escape") hide();
  });
}

function renderMixChart(def) {
  const rows = [...RESORTS].sort((a, b) => b.ch[1] - a.ch[1]);
  def.sub.textContent = "Share of room nights by channel, highest agent share first. Agents cost 18–30% commission.";
  legendItems(def, [["lg-box", "Online travel agents (OTA)", { background: "#111" }], ["lg-box", "Wholesale", { background: "#a3a3a3" }], ["lg-box", "Direct", { background: "#e0e0e0" }]]);
  const W = Math.max(280, def.plotWrap.clientWidth || 520), lw = 78, rowH = 26, gap = 14, mt = 4;
  const H = mt + rows.length * (rowH + gap);
  const bw = W - lw - 4;
  const svg = s("svg", { class: "plot", viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img", tabindex: "0",
    "aria-label": "Stacked bar chart: booking channel mix by resort. " + rows.map(r => `${r.name}: agents ${r.ch[1]}%, wholesale ${r.ch[2]}%, direct ${r.ch[0]}%`).join("; ") + "." });
  const sel = s("rect", { class: "row-sel", x: 0, width: W, visibility: "hidden" });
  svg.append(sel);
  const rowY = i => mt + i * (rowH + gap);
  rows.forEach((r, i) => {
    const y = rowY(i);
    const isF = state.focus === r.id;
    svg.append(s("text", { x: 0, y: y + rowH / 2 + 5, "font-size": 14, "font-weight": isF ? 700 : 500, fill: "#111", text: r.name }));
    let x = lw;
    for (const [v, cls, txtFill] of [[r.ch[1], "seg-ota", "#fff"], [r.ch[2], "seg-whole", "#111"], [r.ch[0], "seg-direct", "#111"]]) {
      const w = v / 100 * bw;
      svg.append(s("rect", { class: cls, x, y, width: Math.max(0, w - 1.5), height: rowH }));
      if (w >= 34) svg.append(s("text", { x: x + 7, y: y + rowH / 2 + 4.5, "font-size": 12.5, "font-weight": 600, style: `fill:${txtFill}`, text: v + "%" }));
      x += w;
    }
  });
  rowInteraction(svg, rows, rowY, rowH, W, H, i => [rows[i].name, [["Online agents", rows[i].ch[1] + "%"], ["Wholesale", rows[i].ch[2] + "%"], ["Direct", rows[i].ch[0] + "%"],
    rows[i].ch[0] < TARGETS.direct ? `${arrowFor(-1)} direct ${TARGETS.direct - rows[i].ch[0]} pts below the ${TARGETS.direct}% target` : `${arrowFor(1)} direct at or above target`]], sel);
  clear(def.plotWrap).append(svg);
  def.note.textContent = `Direct target ${TARGETS.direct}%. Same for every period in this sample.`;
  dataTable(def, ["Resort", "Online agents", "Wholesale", "Direct"], rows.map(r => [r.name, r.ch[1] + "%", r.ch[2] + "%", r.ch[0] + "%"]));
}

function renderPaceChart(def) {
  const p = state.period;
  const rows = [...RESORTS].sort((a, b) => (a.p[p].pace ?? 99) - (b.p[p].pace ?? 99));
  def.sub.textContent = `Room nights already booked for the next 90 days vs the same point last year (${PERIOD_LABEL[p]} view).`;
  legendItems(def, [["lg-box", "Behind last year", { background: "#111" }], ["lg-box", "Ahead of last year", { background: "#cfcfcf" }]]);
  const W = Math.max(280, def.plotWrap.clientWidth || 520), lw = 78, rowH = 24, gap = 16, mt = 4, vr = 44;
  const H = mt + rows.length * (rowH + gap);
  const maxAbs = Math.max(10, ...rows.map(r => Math.abs(r.p[p].pace ?? 0)));
  const cx = lw + (W - lw - vr) / 2, half = (W - lw - vr) / 2 - 36;
  const svg = s("svg", { class: "plot", viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img", tabindex: "0",
    "aria-label": "Bar chart: next 90 days on the books vs last year. " + rows.map(r => r.p[p].pace == null ? `${r.name}: new resort, no last year` : `${r.name}: ${signed(r.p[p].pace)}%`).join("; ") + "." });
  const sel = s("rect", { class: "row-sel", x: 0, width: W, visibility: "hidden" });
  svg.append(sel);
  const rowY = i => mt + i * (rowH + gap);
  rows.forEach((r, i) => {
    const y = rowY(i), v = r.p[p].pace;
    svg.append(s("text", { x: 0, y: y + rowH / 2 + 5, "font-size": 14, "font-weight": state.focus === r.id ? 700 : 500, fill: "#111", text: r.name }));
    if (v == null) { svg.append(s("text", { x: cx + 8, y: y + rowH / 2 + 5, "font-size": 13, "font-style": "italic", text: "New resort, no last year" })); return; }
    const w = Math.abs(v) / maxAbs * half;
    if (v < 0) {
      svg.append(s("rect", { class: "bar-behind", x: cx - w, y, width: w, height: rowH }));
      svg.append(s("text", { x: cx - w - 6, y: y + rowH / 2 + 5, "text-anchor": "end", "font-size": 13.5, "font-weight": 700, fill: "#111", style: "fill:#111", text: "▼ " + signed(v) + "%" }));
    } else {
      if (w > 0) svg.append(s("rect", { class: "bar-ahead", x: cx, y, width: w, height: rowH }));
      svg.append(s("text", { x: cx + w + 6, y: y + rowH / 2 + 5, "font-size": 13.5, text: (v > 0 ? "▲ " : "") + signed(v) + "%" }));
    }
  });
  svg.append(s("line", { class: "zero", x1: cx, x2: cx, y1: 0, y2: H }));
  rowInteraction(svg, rows, rowY, rowH, W, H, i => {
    const r = rows[i], v = r.p[p].pace;
    return [r.name, v == null ? ["New resort, no last year to compare"] : [["Next 90 days vs last year", signed(v) + "%"], v <= -5 ? "Serious: below the −5% line" : v < 0 ? "Behind, within tolerance" : "Ahead of last year"]];
  }, sel);
  clear(def.plotWrap).append(svg);
  def.note.textContent = "A bar left of the line is behind last year. Five per cent behind or worse raises a problem above.";
  dataTable(def, ["Resort", "Next 90 days vs last year"], rows.map(r => [r.name, r.p[p].pace == null ? "New resort, no last year" : signed(r.p[p].pace) + "%"]));
}

/* ============================== Footer ============================== */
function renderFooter() {
  const f = $("#footer");
  const thr = h("table", {}, h("thead", {}, h("tr", {}, ["Measure", "Black: far below", "Gray: below"].map(t => h("th", { scope: "col", text: t })))),
    h("tbody", {}, COLS.map(c => h("tr", {}, h("td", { text: `${c.label} (${c.vs === "cmp" ? "vs budget or last year" : c.vs})` }),
      h("td", { text: c.key === "gss" ? `${signed(c.far / 10, 1)} or worse` : `${signed(c.far)}${c.key === "adr" ? "%" : c.key === "rgi" ? "" : " pts"} or worse` }),
      h("td", { text: c.key === "gss" ? `${signed(c.below / 10, 1)} or worse` : `${signed(c.below)}${c.key === "adr" ? "%" : c.key === "rgi" ? "" : " pts"} or worse` })))));
  f.append(
    h("p", { class: "sample-label" }, h("strong", { text: "Example with illustrative sample data, not Sudamala actuals." })),
    h("div", {}, h("h2", { text: "How problems are found" }), h("ul", {},
      ["Occupancy 5+ points below target: Serious; 10+ points: Critical. Money = gap ÷ 100 × rooms × days × ADR.",
       "RevPAR index under 95: Serious; under 85: Critical. Money = (100 − index) ÷ 100 × room revenue.",
       "GOP margin 3+ points below target: Serious. Money = gap ÷ 100 × room revenue.",
       "Next-90-day pace 5% or more behind last year: Serious. Money = pace × room revenue × (90 ÷ days).",
       "Direct share under 20%: Watch. Money = room revenue × agent share × 20% commission.",
       "Guest score down 0.2 or more: Watch. Review replies under 65%: Watch.",
       "Days in period: month to date 17, quarter to date 48, year to date 321 (Ubud opened 1 October, so its year to date is capped at 48 days). Ranked by severity, then money at stake.",
       "Status: Critical = fix this week; Serious = fix this month; Watch = keep an eye on it; On track = no action."
      ].map(t => h("li", { text: t })))),
    h("div", {}, h("h2", { text: "Scorecard shading thresholds" }), thr),
    h("div", {}, h("h2", { text: "Group maths and sources" }), h("ul", {},
      ["Occupancy = room nights sold ÷ rooms available, weighted by room count. ADR = room revenue ÷ room nights. RevPAR = occupancy × ADR. GOP margin weighted by room revenue.",
       "Compared with last year, the group figures are like-for-like and exclude Ubud (opened October 2026).",
       "KPI tile status: RevPAR −2% Watch, −5% Serious, −10% Critical. Occupancy −3 pts Watch, −5 Serious, −10 Critical. ADR −2% Watch, −6% Serious. GOP −2 pts Watch, −3 Serious, −5 Critical. Direct share −4 pts vs 25% Watch, −12 Serious. Guest score −0.2 Watch, −0.3 Serious.",
       "Data: illustrative sample (data.js). Boundaries: geoBoundaries gbOpen, Indonesia ADM2 (regency level), CC BY 4.0. Resort pins from street addresses, accurate to about 1 km.",
       "Prepared for Sudamala Resorts marketing, November 2026."
      ].map(t => h("li", { text: t }))))
  );
}

/* ============================== Orchestration ============================== */
let currentCtx = null;
function render() {
  const ctx = computeAll();
  currentCtx = ctx;
  document.body.classList.toggle("explain-on", state.explain);
  renderVerdict(ctx);
  renderTiles(ctx);
  renderIssues(ctx);
  updateMapPins(ctx);
  renderResortList(ctx);
  renderScorecard(ctx);
  renderCharts();
  const fb = $("#focus-banner");
  fb.hidden = state.focus === "all";
  if (state.focus !== "all") {
    const r = byId[state.focus];
    $("#focus-text").textContent = `Showing ${r.name} only (${SEV_WORD[ctx.status[r.id]]}). Every section is focused on this resort.`;
  }
  $(".masthead").dataset.filters = `${PERIOD_LABEL[state.period]}, compared with ${state.cmp === "ly" ? "last year" : "budget"}, ${state.focus === "all" ? "all resorts" : byId[state.focus].name}`;
  syncUrl();
}

function setFocus(id, scrollToIssues) {
  state.focus = id;
  state.showAll = false;
  $("#focus").value = id;
  hideTip();
  render();
  if (scrollToIssues) $("#issues").focus({ preventScroll: true });
  if (scrollToIssues) $("#issues").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
}

function syncUrl() {
  const q = new URLSearchParams();
  if (state.period !== "mtd") q.set("period", state.period);
  if (state.cmp !== "budget") q.set("compare", state.cmp);
  if (state.focus !== "all") q.set("focus", state.focus);
  if (!state.explain) q.set("explain", "off");
  const qs = q.toString();
  history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
}
function readUrl() {
  const q = new URLSearchParams(location.search);
  if (DAYS[q.get("period")]) state.period = q.get("period");
  if (["budget", "ly"].includes(q.get("compare"))) state.cmp = q.get("compare");
  if (byId[q.get("focus")]) state.focus = q.get("focus");
  if (q.get("explain") === "off") state.explain = false;
}

function init() {
  readUrl();
  const sel = $("#focus");
  for (const r of RESORTS) sel.append(h("option", { value: r.id, text: `${r.name} (${r.island})` }));
  const form = $("#filters");
  form.querySelector(`input[name=period][value=${state.period}]`).checked = true;
  form.querySelector(`input[name=cmp][value=${state.cmp}]`).checked = true;
  sel.value = state.focus;
  $("#explain").checked = state.explain;
  form.addEventListener("submit", e => e.preventDefault());
  form.addEventListener("change", e => {
    const t = e.target;
    if (t.name === "period") state.period = t.value;
    else if (t.name === "cmp") state.cmp = t.value;
    else if (t.id === "focus") { state.focus = t.value; state.showAll = false; }
    else if (t.id === "explain") state.explain = t.checked;
    render();
  });
  $("#clear-focus").addEventListener("click", () => { setFocus("all", false); $("#focus").focus(); });
  $("#show-all").addEventListener("click", () => { state.showAll = !state.showAll; renderIssues(currentCtx); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") hideTip(); });
  buildMaps();
  buildCharts();
  renderFooter();
  render();
}
init();
