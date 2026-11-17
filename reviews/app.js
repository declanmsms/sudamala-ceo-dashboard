// Sudamala guest-review prototype. Vanilla JS, no dependencies, illustrative sample data only.
// Same Lagoon design as the business dashboard; red is the one "needs attention" colour.
// All text goes in via textContent (never innerHTML).
import { NOW, DAY, PROPERTIES, COMPETITORS, SOURCES, TOPICS, REVIEWS } from "./data.js";

/* ============================== State ============================== */
const state = { period: 30, focus: "all", feed: "all", source: "all", shown: 8 };
const byId = Object.fromEntries(PROPERTIES.map(p => [p.id, p]));
const C = { brand: "#0e4f54", ref: "#8b9796", crit: "#b42318", ser: "#c2410c", watch: "#b07800", watchInk: "#7a5600", ok: "#2b6e46", okRing: "#7fae92" };
const SEV_WORD = { critical: "Needs attention", serious: "Serious", watch: "Watch", ok: "On track" };
const TARGET = { rate: 90, hours: 24, score: 9.0 };
const STORE = "sudamala-reviews-replied";
let marked = new Set();
try { marked = new Set(JSON.parse(localStorage.getItem(STORE) || "[]")); } catch { /* private mode */ }
const saveMarked = () => { try { localStorage.setItem(STORE, JSON.stringify([...marked])); } catch { /* ignore */ } };
const isReplied = r => r.replied || marked.has(r.id);

/* ============================== DOM helpers ============================== */
const $ = (sel, root = document) => root.querySelector(sel);
const SVGNS = "http://www.w3.org/2000/svg";
function h(tag, props, ...kids) { const el = document.createElement(tag); setProps(el, props); append(el, kids); return el; }
function s(tag, props, ...kids) { const el = document.createElementNS(SVGNS, tag); setProps(el, props); append(el, kids); return el; }
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
function append(el, kids) { for (const k of kids.flat(Infinity)) { if (k == null || k === false) continue; el.append(k instanceof Node ? k : document.createTextNode(String(k))); } }
const clear = el => { while (el.firstChild) el.removeChild(el.firstChild); return el; };

/* ============================== Formatting ============================== */
const MINUS = "−";
const round = (v, dp = 0) => { const m = 10 ** dp; return Math.round(v * m) / m; };
const fix = (v, dp = 0) => round(v, dp).toFixed(dp);
const plural = (n, one, many = one + "s") => `${n} ${n === 1 ? one : many}`;
const lc = t => /^[A-Z][a-z]*-[A-Z]/.test(t) ? t : t.charAt(0).toLowerCase() + t.slice(1); // keeps "Wi-Fi"
const arrow = d => (d > 0 ? "▲" : d < 0 ? "▼" : "");
function ago(date) {
  const hrs = (NOW - date) / 3600000;
  if (hrs < 1) return "under an hour ago";
  if (hrs < 48) return `${Math.floor(hrs)} h ago`;
  return `${Math.floor(hrs / 24)} days ago`;
}
function hoursText(hrs) { return hrs == null ? "–" : hrs < 48 ? `${fix(hrs)} h` : `${fix(hrs / 24, 1)} days`; }
function median(a) { if (!a.length) return null; const b = [...a].sort((x, y) => x - y); const m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; }

/* ============================== Status chips (same as business dashboard) ============================== */
function statusIcon(sev, size = 18) {
  const svg = s("svg", { width: size, height: size, viewBox: "0 0 20 20", "aria-hidden": "true", focusable: "false" });
  if (sev === "critical") svg.append(s("circle", { cx: 10, cy: 10, r: 9.5, fill: C.crit }), bang("#fff"));
  else if (sev === "serious") svg.append(s("path", { d: "M10 0.8 L19.6 18.6 H0.4 Z", fill: C.ser }), bang("#fff", 3.2));
  else if (sev === "watch") svg.append(s("circle", { cx: 10, cy: 10, r: 8.6, fill: "#fff8e6", stroke: C.watch, "stroke-width": 1.9 }), bang(C.watchInk));
  else svg.append(s("circle", { cx: 10, cy: 10, r: 8.6, fill: "#eef6f1", stroke: C.okRing, "stroke-width": 1.6 }),
    s("path", { d: "M6 10.4 L8.8 13.1 L14.2 7.4", fill: "none", stroke: C.ok, "stroke-width": 1.9, "stroke-linecap": "round", "stroke-linejoin": "round" }));
  return svg;
}
function bang(fill, dy = 0) { const g = s("g", { fill }); g.append(s("rect", { x: 8.9, y: 4.4 + dy, width: 2.2, height: 7, rx: 1 }), s("rect", { x: 8.9, y: 13 + dy, width: 2.2, height: 2.2, rx: 1.1 })); return g; }
const statusEl = (sev, word) => h("span", { class: "status status-" + (sev === "ok" ? "ontrack" : sev) }, statusIcon(sev), word || SEV_WORD[sev]);

/* ============================== Maths ============================== */
const scoped = () => REVIEWS.filter(r => state.focus === "all" || r.property === state.focus);
// offset 0 = this period, 1 = the period of the same length just before
const inPeriod = (r, days, offset = 0) => { const age = NOW - r.posted; return age >= offset * days * DAY && age < (offset + 1) * days * DAY; };
function stats(list) {
  const n = list.length;
  const avg = n ? list.reduce((a, r) => a + r.rating, 0) / n : null;
  const mood = n ? (list.reduce((a, r) => a + r.sentiment, 0) / n + 1) * 50 : null;
  const waiting = list.filter(r => !isReplied(r));
  const urgent = waiting.filter(r => r.urgency === "high");
  const rate = n ? (n - waiting.length) / n * 100 : null;
  const hours = median(list.filter(r => r.replied).map(r => r.replyHours));
  return { n, avg, mood, waiting: waiting.length, urgent: urgent.length, rate, hours };
}
function topicCounts(list) {
  const c = {};
  for (const k of Object.keys(TOPICS)) c[k] = { pos: 0, neg: 0, where: {} };
  for (const r of list) for (const t of r.topics) {
    c[t.topic][t.neg ? "neg" : "pos"]++;
    if (t.neg) c[t.topic].where[r.property] = (c[t.topic].where[r.property] || 0) + 1;
  }
  return c;
}
function resortSev(st) {
  if (st.urgent > 0 || st.avg < 8.3 || st.rate < 70) return "critical";
  if (st.rate < TARGET.rate || (st.hours ?? 0) > TARGET.hours || st.avg < 8.8) return "watch";
  return "ok";
}

/* ============================== Sparkline ============================== */
function sparkline(vals) {
  const W = 200, H = 40, pad = 4;
  const ok = vals.filter(v => v != null);
  const lo = Math.min(...ok), hi = Math.max(...ok), span = Math.max(hi - lo, Math.abs(hi) * 0.06) || 1, mid = (hi + lo) / 2;
  const x = i => pad + i * (W - pad * 2) / (vals.length - 1);
  const y = v => H - pad - (v - (mid - span / 2)) / span * (H - pad * 2);
  let d = "", pen = false;
  vals.forEach((v, i) => { if (v == null) { pen = false; return; } d += (pen ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1); pen = true; });
  const svg = s("svg", { class: "spark", viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "none", "aria-hidden": "true", focusable: "false" });
  svg.append(s("path", { d, fill: "none", stroke: C.brand, "stroke-width": 2, "stroke-linejoin": "round", "vector-effect": "non-scaling-stroke" }));
  return svg;
}
// 13 weekly points (last 90 days) of a statistic
function weekly(list, fn) {
  const out = [];
  for (let w = 12; w >= 0; w--) {
    const wk = list.filter(r => { const age = NOW - r.posted; return age >= w * 7 * DAY && age < (w + 1) * 7 * DAY; });
    out.push(wk.length ? fn(wk) : null);
  }
  return out;
}
// Daily 7-day rolling average score over 90 days
function rolling(list) {
  const out = [];
  for (let d = 89; d >= 0; d--) {
    const win = list.filter(r => { const age = NOW - r.posted; return age >= d * DAY && age < (d + 7) * DAY; });
    out.push(win.length ? win.reduce((a, r) => a + r.rating, 0) / win.length : null);
  }
  return out;
}

/* ============================== Verdict ============================== */
function renderVerdict(cur, tc) {
  const el = clear($("#verdict"));
  const st = stats(cur);
  const worst = Object.entries(tc).sort((a, b) => b[1].neg - a[1].neg)[0];
  const sev = st.urgent ? "critical" : st.waiting ? "watch" : "ok";
  const who = state.focus === "all" ? "" : byId[state.focus].short + ": ";
  el.append(statusEl(sev, st.urgent ? "Reply now" : st.waiting ? "Watch" : "On track"), h("br"));
  if (!st.waiting) el.append(h("strong", { text: `${who}every review has a reply` }), ". ");
  else el.append(h("strong", { text: `${who}${plural(st.waiting, "review is", "reviews are")} waiting for a reply` }), st.urgent ? `, ${st.urgent} of them urgent. ` : ". ");
  if (worst && worst[1].neg) {
    const where = Object.entries(worst[1].where).sort((a, b) => b[1] - a[1])[0];
    const at = state.focus === "all" && where && where[1] / worst[1].neg >= 0.4 ? `, mostly at ${byId[where[0]].short}` : "";
    el.append(`The top complaint is ${lc(TOPICS[worst[0]].label)} (${worst[1].neg} mentions${at}).`);
  }
}

/* ============================== KPI tiles ============================== */
function renderTiles(all, cur, prev) {
  const wrap = clear($("#tiles"));
  const A = stats(cur), B = stats(prev);
  const scopeName = state.focus === "all" ? "all six resorts" : byId[state.focus].name;
  $("#kpis-sub").textContent = `Last ${state.period} days for ${scopeName}, compared with the ${state.period} days before.`;
  const ch = (d, dp, unit) => {
    const r = round(d, dp);
    if (r === 0) return "Same as the period before";
    return `${arrow(r)} ${Math.abs(r).toFixed(dp)}${unit} ${r > 0 ? "higher" : "lower"} than before`;
  };
  const scoreSev = A.avg >= TARGET.score ? "ok" : A.avg >= 8.5 ? "watch" : "critical";
  const tiles = [
    { hero: true, label: "Average review score", helper: "All sites, converted to a score out of 10", value: fix(A.avg, 1), unit: "/10",
      change: ch(A.avg - B.avg, 1, ""), sev: scoreSev, target: `Target ${fix(TARGET.score, 1)} or higher`,
      spark: rolling(all), cap: "Last 90 days, 7-day average" },
    { label: "Guest mood", helper: "How positive the words are, 0 to 100", value: fix(A.mood), change: ch(A.mood - B.mood, 0, " pts"),
      sev: A.mood >= 75 ? "ok" : A.mood >= 65 ? "watch" : "critical", spark: weekly(all, l => stats(l).mood) },
    { label: "New reviews", helper: "Posted on all sites", value: String(A.n), change: ch(B.n ? (A.n / B.n - 1) * 100 : 0, 0, "%"),
      sev: null, spark: weekly(all, l => l.length) },
    { label: "Waiting for a reply", helper: "No public reply yet", value: String(A.waiting), bad: A.waiting > 0,
      change: A.urgent ? `${A.urgent} urgent: low score, hygiene or safety` : "None urgent", sev: A.urgent ? "critical" : A.waiting > 3 ? "watch" : "ok",
      spark: weekly(all, l => stats(l).waiting) },
    { label: "Reply rate", helper: "Share of reviews we answered", value: fix(A.rate) + "%", bad: A.rate < TARGET.rate,
      change: ch(A.rate - B.rate, 0, " pts"), sev: A.rate >= TARGET.rate ? "ok" : A.rate >= 75 ? "watch" : "critical", target: `Target ${TARGET.rate}%`,
      spark: weekly(all, l => stats(l).rate) },
    { label: "Typical reply time", helper: "Median time to post a reply", value: hoursText(A.hours), bad: A.hours > TARGET.hours,
      change: B.hours != null && A.hours != null ? ch(A.hours - B.hours, 0, " h").replace(/higher|lower/, w => (w === "higher" ? "slower" : "faster")) : "",
      sev: A.hours == null ? null : A.hours <= TARGET.hours ? "ok" : A.hours <= 36 ? "watch" : "critical", target: `Target under ${TARGET.hours} h`,
      spark: weekly(all, l => stats(l).hours) },
  ];
  for (const t of tiles) {
    const label = `${t.label}: ${t.value}${t.unit || ""}. ${t.change.replace(/[▲▼]\s?/g, "")}.` + (t.sev ? ` Status: ${SEV_WORD[t.sev]}.` : "");
    wrap.append(h("div", { class: "tile" + (t.hero ? " tile-hero" : ""), tabindex: "0", role: "group", "aria-label": label },
      h("div", { class: "tile-label", text: t.label }),
      h("div", { class: "helper", text: t.helper }),
      h("div", { class: "tile-num" + (t.bad ? " is-bad" : "") }, t.value, t.unit ? h("small", { class: "tile-unit", text: t.unit }) : null),
      t.change ? h("div", { class: "tile-change", text: t.change }) : null,
      t.sev ? statusEl(t.sev) : null,
      t.target ? h("div", { class: "tile-target", text: t.target }) : null,
      t.hero ? h("div", { class: "spark-box" }, sparkline(t.spark), h("span", { class: "spark-cap", text: t.cap })) : sparkline(t.spark)));
  }
}

/* ============================== Review cards ============================== */
function rateClass(r) { return r.rating <= 4 ? "rate-low" : r.rating < 7 ? "rate-mid" : ""; }
function card(r, urgentView) {
  const p = byId[r.property];
  const replied = isReplied(r);
  const late = !replied && (NOW - r.posted) > 24 * 3600000;
  const urgent = !replied && r.urgency === "high";
  const el = h("li", { class: "rv" + (urgent ? " is-urgent" : "") });
  el.append(h("div", { class: "rv-top" },
    h("div", { class: "rate " + rateClass(r), role: "img", "aria-label": `Score ${fix(r.rating, 1)} out of 10 (${r.raw} on ${SOURCES[r.source]})` },
      h("span", {}, fix(r.rating, r.rating % 1 ? 1 : 0), h("small", { text: "/10" }))),
    h("div", { class: "rv-meta" },
      h("h3", { class: "rv-title", text: r.title }),
      h("p", { class: "rv-who" }, h("b", { text: p.short }), ` · ${SOURCES[r.source]} · ${r.reviewer}, ${lc(r.trip)} · `,
        h("span", { class: "rv-age" + (late ? " is-late" : ""), text: ago(r.posted) }))),
    h("div", { class: "rv-state" }, replied ? statusEl("ok", marked.has(r.id) ? "Marked as replied" : "Replied")
      : urgent ? statusEl("critical", "Urgent, no reply") : statusEl("watch", "No reply yet"))));
  el.append(h("p", { class: "rv-body", text: r.body }));
  const tags = h("div", { class: "tags" },
    r.topics.map(t => h("span", { class: "tag " + (t.neg ? "tag-neg" : "tag-pos") }, h("span", { "aria-hidden": "true", text: t.neg ? MINUS : "+" }),
      h("span", { class: "sr", text: t.neg ? "Complaint: " : "Praise: " }), TOPICS[t.topic].label)),
    r.departments.map(d => h("span", { class: "tag tag-dept", text: "For " + d })));
  el.append(h("div", { class: "rv-ai" }, h("p", {}, h("b", { text: "In short: " }), r.summary), tags));
  if (!r.replied) {
    const det = h("details", { class: "reply" }, h("summary", { text: "Suggested reply" }),
      h("p", { class: "reply-text", text: r.reply }),
      h("p", { class: "reply-note", text: "Written by AI. Check it and make it personal before posting." }));
    if (urgentView && matchMedia("(min-width: 768px)").matches) det.open = true;
    const actions = h("div", { class: "rv-actions" });
    if (!replied) {
      actions.append(
        h("button", { type: "button", class: "btn btn-sm btn-solid", onclick: () => copyReply(r) }, "Copy reply"),
        h("button", { type: "button", class: "btn btn-sm", onclick: () => markReplied(r, true) }, "Mark as replied"));
    } else {
      actions.append(h("button", { type: "button", class: "btn btn-sm btn-quiet", onclick: () => markReplied(r, false) }, "Undo: not replied yet"));
    }
    det.append(actions);
    el.append(det);
  }
  return el;
}

const toastEl = $("#toast");
let toastT;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("is-open");
  clearTimeout(toastT);
  toastT = setTimeout(() => toastEl.classList.remove("is-open"), 2600);
}
async function copyReply(r) {
  let ok = false;
  try { await navigator.clipboard.writeText(r.reply); ok = true; } catch { /* fall back below */ }
  if (!ok) { // older browsers or a blocked clipboard API
    const ta = h("textarea", { readonly: true, style: { position: "fixed", opacity: "0", top: "0" } });
    ta.value = r.reply; document.body.append(ta); ta.select();
    try { ok = document.execCommand("copy"); } catch { ok = false; }
    ta.remove();
  }
  toast(ok ? `Reply copied. Paste it on ${SOURCES[r.source]}, then mark it as replied.` : "Could not copy. Open the suggested reply and select the text.");
}
function markReplied(r, on) {
  if (on) marked.add(r.id); else marked.delete(r.id);
  saveMarked();
  render();
  softSwap();
  toast(on ? `Marked as replied: ${byId[r.property].short}, ${r.reviewer}` : "Moved back to waiting for a reply");
}

/* ============================== Urgent list ============================== */
function renderUrgent(cur) {
  const list = clear($("#urgent-list"));
  const urgent = cur.filter(r => !isReplied(r) && r.urgency === "high").sort((a, b) => a.posted - b.posted).slice(0, 5);
  if (!urgent.length) {
    list.append(h("li", { class: "empty-ok" }, statusIcon("ok", 22), "Nothing urgent is waiting. Every low score and hygiene or safety complaint has a reply."));
    return;
  }
  for (const r of urgent) list.append(card(r, true));
}

/* ============================== Topics ============================== */
function bars(listEl, rows, max, neg) {
  clear(listEl);
  listEl.classList.toggle("bars-neg", !!neg);
  for (const row of rows) {
    const fill = h("span", { class: "bar-fill", style: { transform: `scaleX(${max ? row.v / max : 0})` } });
    listEl.append(h("li", { class: "bar-row" + (row.cls ? " " + row.cls : "") },
      h("span", { class: "lbl" }, row.label, row.sub ? h("small", { text: row.sub }) : null),
      h("span", { class: "bar-track", "aria-hidden": "true" }, fill),
      h("span", { class: "val" }, row.text, row.extra || null)));
  }
}
function renderTopics(cur, prev) {
  const now = topicCounts(cur), before = topicCounts(prev);
  const love = Object.entries(now).filter(([, c]) => c.pos).sort((a, b) => b[1].pos - a[1].pos).slice(0, 5);
  const hate = Object.entries(now).filter(([, c]) => c.neg).sort((a, b) => b[1].neg - a[1].neg).slice(0, 5);
  $("#love-h").textContent = love.length ? `Guests love ${lc(TOPICS[love[0][0]].label)} most` : "No praise yet in this period";
  bars($("#love-bars"), love.map(([k, c]) => ({ label: TOPICS[k].label, v: c.pos, text: String(c.pos) })), love[0]?.[1].pos);
  if (hate.length) {
    const [k, c] = hate[0], b = before[k].neg;
    const name = TOPICS[k].label;
    $("#hate-h").textContent = b && c.neg >= 2 * b ? `${name} complaints doubled` : b && c.neg > b ? `${name} complaints are rising` : `${name} is the top complaint`;
  } else $("#hate-h").textContent = "No complaints in this period";
  bars($("#hate-bars"), hate.map(([k, c]) => {
    const d = c.neg - before[k].neg;
    return { label: TOPICS[k].label, sub: TOPICS[k].dept, v: c.neg, text: String(c.neg),
      extra: h("small", { class: d > 0 ? "up" : "", text: d === 0 ? "same" : `${arrow(d)}${Math.abs(d)}` }) };
  }), hate[0]?.[1].neg, true);
}

/* ============================== Resort table and competitors ============================== */
function renderResorts() {
  const wrap = clear($("#resort-table"));
  $("#resorts-sub").textContent = `Last ${state.period} days. Red means below target. Tap a resort to see only its reviews.`;
  const rows = PROPERTIES.map(p => {
    const mine = REVIEWS.filter(r => r.property === p.id);
    const A = stats(mine.filter(r => inPeriod(r, state.period))), B = stats(mine.filter(r => inPeriod(r, state.period, 1)));
    return { p, A, B, sev: resortSev(A) };
  }).sort((a, b) => ({ critical: 2, watch: 1, ok: 0 }[b.sev] - { critical: 2, watch: 1, ok: 0 }[a.sev]) || a.A.avg - b.A.avg);
  const cols = [
    { label: "Score", sub: "out of 10", v: r => fix(r.A.avg, 1), d: r => { const x = round(r.A.avg - r.B.avg, 1); return x ? `${arrow(x)} ${Math.abs(x).toFixed(1)}` : "same"; }, bad: r => r.A.avg < 8.5 },
    { label: "Guest mood", sub: "0 to 100", v: r => fix(r.A.mood), d: r => { const x = round(r.A.mood - r.B.mood); return x ? `${arrow(x)} ${Math.abs(x)}` : "same"; }, bad: r => r.A.mood < 65 },
    { label: "Reviews", sub: "new", v: r => String(r.A.n), d: () => "", bad: () => false },
    { label: "Waiting", sub: "for a reply", v: r => String(r.A.waiting), d: r => r.A.urgent ? `${r.A.urgent} urgent` : "", bad: r => r.A.urgent > 0 || r.A.waiting > 5 },
    { label: "Reply rate", sub: `target ${TARGET.rate}%`, v: r => fix(r.A.rate) + "%", d: () => "", bad: r => r.A.rate < TARGET.rate },
    { label: "Reply time", sub: `target < ${TARGET.hours} h`, v: r => hoursText(r.A.hours), d: () => "", bad: r => r.A.hours > TARGET.hours },
  ];
  const table = h("table", { class: "score rt" },
    h("caption", { class: "sr", text: `Resorts, last ${state.period} days, worst first` }),
    h("thead", {}, h("tr", {}, h("th", { scope: "col", text: "Resort" }),
      cols.map(c => h("th", { scope: "col" }, c.label, h("br"), h("span", { class: "helper", text: c.sub }))))),
    h("tbody", {}, rows.map(row => {
      const tr = h("tr", { class: state.focus === row.p.id ? "is-focus" : null, onclick: () => setFocus(row.p.id) },
        h("th", { scope: "row" }, h("button", { type: "button", class: "score-btn", onclick: e => { e.stopPropagation(); setFocus(row.p.id); } },
          h("span", { class: "rn", text: row.p.short }), h("span", { class: "rs" }, statusEl(row.sev)))),
        cols.map(c => { const bad = c.bad(row); return h("td", { class: bad ? "bad" : null },
          h("span", { class: "v" }, bad ? h("span", { class: "sr", text: "Below target: " }) : null, c.v(row)), c.d(row) ? h("span", { class: "d", text: c.d(row) }) : null); }));
      return tr;
    })));
  wrap.append(table);

  // Competitors: Ubud only
  const show = state.focus === "all" || state.focus === "ubud";
  $("#compare").hidden = !show;
  if (!show) return;
  const ubud = stats(REVIEWS.filter(r => r.property === "ubud" && inPeriod(r, 30)));
  const set = [...COMPETITORS.map(c => ({ name: c.name, score: c.score, us: false })), { name: "Sudamala Resort Ubud", score: round(ubud.avg, 1), us: true }]
    .sort((a, b) => b.score - a.score);
  const rank = set.findIndex(x => x.us) + 1;
  const gap = round(set[0].score - round(ubud.avg, 1), 1);
  $("#compare-h").textContent = rank === 1 ? "Ubud leads its competitor set" :
    `Ubud ranks ${rank} of ${set.length} nearby resorts, ${gap.toFixed(1)} behind the leader`;
  const lo = 7;
  bars($("#compare-bars"), set.map(x => ({ label: x.name, v: x.score - lo, text: x.score.toFixed(1),
    cls: x.us ? "is-us" + (rank > 1 ? " is-behind" : "") : "" })), 10 - lo);
}

/* ============================== Feed ============================== */
function renderFeed(cur) {
  const chips = clear($("#feed-chips"));
  const counts = { waiting: cur.filter(r => !isReplied(r)).length, low: cur.filter(r => r.rating < 7).length, all: cur.length };
  for (const [key, label] of [["all", "All"], ["waiting", "Waiting for a reply"], ["low", "Scores under 7"]]) {
    chips.append(h("button", { type: "button", class: "chip", "aria-pressed": String(state.feed === key),
      onclick: () => { state.feed = key; state.shown = 8; renderFeed(scopedCur()); } }, `${label} (${counts[key]})`));
  }
  let list = cur.filter(r => state.source === "all" || r.source === state.source);
  if (state.feed === "waiting") list = list.filter(r => !isReplied(r));
  if (state.feed === "low") list = list.filter(r => r.rating < 7);
  const ol = clear($("#feed-list"));
  if (!list.length) ol.append(h("li", { class: "empty", text: "No reviews match. Try another site or “All”." }));
  for (const r of list.slice(0, state.shown)) ol.append(card(r, false));
  const more = $("#more");
  more.hidden = list.length <= state.shown;
  more.textContent = `Show more (${list.length - state.shown} left)`;
}

/* ============================== Render ============================== */
const scopedCur = () => scoped().filter(r => inPeriod(r, state.period));
function render() {
  const all = scoped();
  const cur = all.filter(r => inPeriod(r, state.period)), prev = all.filter(r => inPeriod(r, state.period, 1));
  renderVerdict(cur, topicCounts(cur));
  renderTiles(all, cur, prev);
  renderUrgent(cur);
  renderTopics(cur, prev);
  renderResorts();
  renderFeed(cur);
  const banner = $("#focus-banner");
  banner.hidden = state.focus === "all";
  if (state.focus !== "all") $("#focus-text").textContent = `Showing ${byId[state.focus].name} only.`;
  $(".masthead").dataset.filters = `last ${state.period} days, ${state.focus === "all" ? "all resorts" : byId[state.focus].short}`;
  syncUrl();
}
function setFocus(id) {
  state.focus = id; state.shown = 8;
  $("#focus").value = id;
  render(); softSwap();
  if (id !== "all") $("#kpis").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}
function syncUrl() {
  const q = new URLSearchParams();
  if (state.period !== 30) q.set("period", state.period);
  if (state.focus !== "all") q.set("resort", state.focus);
  const qs = q.toString();
  history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
}
function readUrl() {
  const q = new URLSearchParams(location.search);
  if (["7", "30", "90"].includes(q.get("period"))) state.period = +q.get("period");
  if (byId[q.get("resort")]) state.focus = q.get("resort");
}

/* ============================== Motion (same as business dashboard) ============================== */
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
  for (const el of document.querySelectorAll("#verdict, #tiles, #urgent-list, #topics .topic-grid, #resort-table, #compare, #feed-list")) {
    el.animate(reduceMotion.matches ? [{ opacity: 0.6 }, { opacity: 1 }] : [{ opacity: 0.35, filter: "blur(3px)" }, { opacity: 1, filter: "blur(0)" }],
      { duration: 220, easing: "cubic-bezier(0.23, 1, 0.32, 1)" });
  }
}

/* ============================== Init ============================== */
function init() {
  readUrl();
  const sel = $("#focus");
  for (const p of PROPERTIES) sel.append(h("option", { value: p.id, text: `${p.short} (${p.island})` }));
  const src = $("#source");
  for (const [k, v] of Object.entries(SOURCES)) src.append(h("option", { value: k, text: v }));
  const form = $("#filters");
  form.querySelector(`input[name=period][value="${state.period}"]`).checked = true;
  sel.value = state.focus;
  form.addEventListener("submit", e => e.preventDefault());
  form.addEventListener("change", e => {
    const t = e.target;
    if (t.name === "period") { state.period = +t.value; placeThumbs(); }
    else if (t.id === "focus") state.focus = t.value;
    state.shown = 8;
    render(); softSwap();
  });
  src.addEventListener("change", () => { state.source = src.value; state.shown = 8; renderFeed(scopedCur()); });
  $("#more").addEventListener("click", () => { state.shown += 8; renderFeed(scopedCur()); });
  $("#clear-focus").addEventListener("click", () => { setFocus("all"); $("#focus").focus(); });
  render();
  placeThumbs(false);
  document.fonts?.ready.then(() => placeThumbs(false));
  new ResizeObserver(() => placeThumbs(false)).observe(form);
}
init();
