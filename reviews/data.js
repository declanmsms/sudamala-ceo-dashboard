// Illustrative sample reviews for the prototype. NOT real guest reviews and NOT Sudamala actuals.
// Generated deterministically (seeded), so every visitor sees the same numbers.
// In the real system these rows come from the hourly collect + enrich jobs (see the build brief).

export const NOW = new Date("2026-11-18T09:00:00+08:00"); // sample "now", WITA
export const DAY = 86400000;

export const PROPERTIES = [
  { id: "ubud",     name: "Sudamala Resort Ubud",     short: "Ubud",     island: "Bali",   base: 8.7, perDay: 1.5, replyRate: 0.62, replyHours: 46 },
  { id: "sanur",    name: "Sudamala Resort Sanur",    short: "Sanur",    island: "Bali",   base: 9.1, perDay: 2.0, replyRate: 0.93, replyHours: 14 },
  { id: "amed",     name: "Sudamala Amed Lodge",      short: "Amed",     island: "Bali",   base: 8.9, perDay: 0.8, replyRate: 0.85, replyHours: 22 },
  { id: "senggigi", name: "Sudamala Resort Senggigi", short: "Senggigi", island: "Lombok", base: 8.6, perDay: 1.0, replyRate: 0.78, replyHours: 30 },
  { id: "komodo",   name: "Sudamala Resort Komodo",   short: "Komodo",   island: "Flores", base: 9.2, perDay: 1.1, replyRate: 0.95, replyHours: 11 },
  { id: "seraya",   name: "Sudamala Resort Seraya",   short: "Seraya",   island: "Flores", base: 9.0, perDay: 0.6, replyRate: 0.9,  replyHours: 18 },
];

// Competitor set for Ubud: last 30 days, illustrative numbers only.
export const COMPETITORS = [
  { name: "Kappa Senses Ubud", score: 9.2, reviews: 61 },
  { name: "Arkamara Dijiwa Ubud", score: 9.0, reviews: 38 },
  { name: "The Westin Resort & Spa Ubud", score: 8.9, reviews: 74 },
  { name: "Alaya Resort Ubud", score: 8.8, reviews: 52 },
];

export const SOURCES = { google: "Google", tripadvisor: "Tripadvisor", booking: "Booking.com", agoda: "Agoda", expedia: "Expedia" };
const SOURCE_W = [["google", 0.34], ["booking", 0.26], ["tripadvisor", 0.18], ["agoda", 0.14], ["expedia", 0.08]];
const FIVE_STAR = new Set(["google", "tripadvisor", "expedia"]);

// Topic: weight (how often mentioned), department, phrases [positive sentences], [negative sentences], short words for summaries.
export const TOPICS = {
  staff:     { label: "Staff and service", dept: "Front Office", w: 10,
    pos: ["The staff remembered our names from day one and nothing was too much trouble.", "Service was warm and genuine, especially at the pool bar."],
    neg: ["Staff seemed stretched and we often waited to be noticed.", "Our requests were forgotten twice and nobody followed up."],
    sp: "the staff", sn: "service was slow" },
  room:      { label: "Room comfort", dept: "Housekeeping", w: 7,
    pos: ["The villa was spacious, the bed was wonderful and the outdoor shower was a treat.", "Our room was beautifully designed and very comfortable."],
    neg: ["The bed was hard and the pillows were flat.", "The room felt tired and the air-conditioning struggled at night."],
    sp: "the room", sn: "the room felt tired" },
  clean:     { label: "Cleanliness", dept: "Housekeeping", w: 5,
    pos: ["Everything was spotless.", "Housekeeping kept the room immaculate."],
    neg: ["We found ants in the bathroom and the floor was not swept.", "The bathroom was not properly cleaned on arrival."],
    sp: "how clean it was", sn: "the room was not clean" },
  breakfast: { label: "Breakfast", dept: "F&B", w: 6,
    pos: ["Breakfast was a highlight, with fresh fruit and made-to-order eggs.", "The breakfast menu was generous and delicious."],
    neg: ["Breakfast was slow and the buffet ran out of fruit by nine.", "Breakfast felt repetitive and we waited 30 minutes for eggs."],
    sp: "breakfast", sn: "breakfast was slow" },
  restaurant:{ label: "Restaurant", dept: "F&B", w: 4,
    pos: ["Dinner at the restaurant was excellent, the Balinese set menu especially.", "The chef's dishes were some of the best we had on the trip."],
    neg: ["Dinner was overpriced for what it was.", "The restaurant closed early and room service was limited."],
    sp: "the restaurant", sn: "dinner disappointed" },
  pool:      { label: "Pool", dept: "Engineering", w: 5,
    pos: ["The pool was beautiful and never crowded.", "We spent every afternoon at the pool, it is gorgeous."],
    neg: ["The pool was cloudy for two days.", "Not enough sun loungers around the pool."],
    sp: "the pool", sn: "the pool area fell short" },
  spa:       { label: "Spa", dept: "Spa", w: 3,
    pos: ["The Balinese massage at the spa was the best I have had.", "The spa treatments were excellent value."],
    neg: ["The spa was fully booked for our whole stay.", "Our spa appointment started 20 minutes late."],
    sp: "the spa", sn: "the spa was hard to book" },
  location:  { label: "Location", dept: "Sales", w: 5,
    pos: ["The location is perfect, peaceful but close to everything.", "We loved the setting and the views."],
    neg: ["It is a long drive from the airport.", "The location is a bit far from the restaurants."],
    sp: "the location", sn: "the location felt remote" },
  value:     { label: "Value", dept: "Sales", w: 4,
    pos: ["Great value for the quality.", "Worth every rupiah."],
    neg: ["Expensive for what you get.", "Extras on the bill added up quickly."],
    sp: "the value", sn: "it felt poor value" },
  wifi:      { label: "Wi-Fi", dept: "Engineering", w: 3,
    pos: ["Wi-Fi was fast enough to work from the villa.", "Wi-Fi worked well everywhere."],
    neg: ["Wi-Fi kept dropping in the villa.", "The Wi-Fi was too slow for a video call."],
    sp: "the Wi-Fi", sn: "Wi-Fi dropped" },
  noise:     { label: "Noise", dept: "Front Office", w: 2,
    pos: ["So quiet at night, we only heard the river.", "Peaceful and quiet."],
    neg: ["Traffic noise from the road kept us awake.", "Construction noise next door started at 8 every morning."],
    sp: "the quiet", sn: "noise at night" },
  checkin:   { label: "Check-in", dept: "Front Office", w: 3,
    pos: ["Check-in was smooth, with a welcome drink and a cold towel.", "We were checked in within minutes."],
    neg: ["We waited an hour for our room at check-in.", "Check-in was disorganised and our booking was not found."],
    sp: "check-in", sn: "check-in was slow" },
  upkeep:    { label: "Maintenance", dept: "Engineering", w: 2,
    pos: ["Everything worked perfectly.", "The property is very well kept."],
    neg: ["The shower had no hot water one morning and the door lock was faulty.", "There was a leak in the ceiling of our villa."],
    sp: "how well kept it is", sn: "things were broken" },
};

// Chance a mention is negative. Default plus a few resort-specific problems (Ubud breakfast worsening in the last month).
function negChance(prop, topic, daysAgo) {
  const p = { ubud: { breakfast: daysAgo <= 30 ? 0.62 : 0.3, wifi: 0.45, noise: 0.5, staff: 0.18 },
    senggigi: { upkeep: 0.55, pool: 0.35, room: 0.3 }, amed: { location: 0.35, wifi: 0.4 },
    sanur: { value: 0.25 }, komodo: { location: 0.3 }, seraya: { restaurant: 0.25 } }[prop.id] || {};
  return p[topic] ?? (["location", "value"].includes(topic) ? 0.15 : 0.1);
}

const NAMES = ["Sarah", "James", "Mei", "Oliver", "Ayu", "Lukas", "Chloé", "Daniel", "Hana", "Tom", "Priya", "Marco", "Emma", "Kenji", "Lena", "Rizky", "Sophie", "Jae-won", "Isabel", "Ben", "Anika", "Wayan", "Claire", "Ravi", "Nora", "Felix", "Dewi", "Liam", "Yuki", "Grace"];
const TRIPS = ["Couple", "Family", "Solo traveller", "Friends", "Honeymoon", "Business"];

function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rnd = mulberry32(20261118);
const pick = arr => arr[Math.floor(rnd() * arr.length)];
function weighted(pairs) { const t = pairs.reduce((a, p) => a + p[1], 0); let r = rnd() * t; for (const [k, w] of pairs) { if ((r -= w) <= 0) return k; } return pairs[0][0]; }
const TOPIC_W = Object.entries(TOPICS).map(([k, t]) => [k, t.w]);
const listJoin = a => a.length <= 1 ? (a[0] || "") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1];

function makeReview(prop, n) {
  const ageH = rnd() * 180 * 24;
  const daysAgo = ageH / 24;
  const posted = new Date(NOW - ageH * 3600000);
  const k = 1 + Math.floor(rnd() * 2.6);
  const topics = [];
  while (topics.length < k) { const t = weighted(TOPIC_W); if (!topics.some(x => x.topic === t)) topics.push({ topic: t, neg: rnd() < negChance(prop, t, daysAgo) }); }
  const negN = topics.filter(t => t.neg).length;
  let score = prop.base + (rnd() - 0.5) * 1.6 - negN * 1.7 + (negN === 0 ? 0.4 : 0);
  if (negN >= 2 && rnd() < 0.5) score -= 2;
  score = Math.max(2, Math.min(10, score));
  const source = weighted(SOURCE_W);
  let rating, raw;
  if (FIVE_STAR.has(source)) { const st = Math.max(1, Math.min(5, Math.round(score / 2))); rating = st * 2; raw = st + "/5"; }
  else { rating = Math.round(score * 10) / 10; raw = rating.toFixed(1) + "/10"; }
  const sentiment = Math.max(-1, Math.min(1, ((topics.length - 2 * negN) / topics.length) * 0.55 + (rating - 7) / 3 * 0.45));
  const pos = topics.filter(t => !t.neg), neg = topics.filter(t => t.neg);
  const name = pick(NAMES);
  const opener = rating >= 9 ? pick(["An unforgettable stay.", "We did not want to leave.", "Simply wonderful."]) :
    rating >= 7 ? pick(["A lovely stay overall.", "Good stay with a few small issues.", "We enjoyed our time here."]) :
    rating >= 5 ? pick(["Mixed feelings about this stay.", "Not quite what we expected.", "Some good, some disappointing."]) :
    pick(["Very disappointing.", "Not up to the standard we expected.", "We would not stay again."]);
  const body = [opener, ...topics.map(t => pick(TOPICS[t.topic][t.neg ? "neg" : "pos"]))].join(" ");
  const title = rating >= 9 ? pick(["Pure magic", "Perfect escape", "Exceptional", "Our favourite stay in Indonesia"]) :
    rating >= 7 ? pick(["Lovely place", "Very good", "Relaxing stay"]) : rating >= 5 ? pick(["Could be better", "Average", "Mixed"]) : pick(["Disappointing", "Not recommended", "Let down"]);
  const urgent = rating <= 4 || neg.some(t => t.topic === "clean" || t.topic === "upkeep");
  const urgency = urgent ? "high" : neg.length ? "medium" : "low";
  // Summary (one sentence, English) and reply draft (warm, specific, no compensation promised).
  const sumPos = pos.map(t => TOPICS[t.topic].sp), sumNeg = neg.map(t => TOPICS[t.topic].sn);
  const summary = (sumPos.length ? "Liked " + listJoin(sumPos) : "") + (sumPos.length && sumNeg.length ? "; " : "") +
    (sumNeg.length ? (sumPos.length ? "unhappy that " : "Unhappy that ") + listJoin(sumNeg) : "") + ".";
  const thanks = pos.length ? `thank you so much for your kind words about ${listJoin(sumPos)}; we will share them with the team.` : "thank you for taking the time to tell us about your stay.";
  const sorry = neg.length ? ` We are truly sorry that ${listJoin(sumNeg)}. Our ${listJoin([...new Set(neg.map(t => TOPICS[t.topic].dept))])} team${neg.length > 1 ? "s are" : " is"} looking into it now.` : "";
  const back = rating >= 7 ? ` We would love to welcome you back to ${prop.short} soon.` : ` If you are willing, we would love to hear more: please write to our guest relations team directly.`;
  const reply = `Dear ${name}, ${thanks}${sorry}${back} Warm regards, the Sudamala ${prop.short} team`;
  // Replies: older reviews are mostly answered; delay varies by resort.
  const delay = Math.max(1.5, prop.replyHours * (0.35 + rnd() * 1.3));
  const replied = rnd() < prop.replyRate - (urgent && daysAgo < 20 ? 0.35 : 0) && delay < ageH;
  return {
    id: prop.id + "-" + n, property: prop.id, source, rating, raw, title, body, reviewer: name + " " + String.fromCharCode(65 + Math.floor(rnd() * 26)) + ".",
    trip: pick(TRIPS), posted, topics, sentiment, urgency, summary, reply,
    departments: [...new Set(neg.map(t => TOPICS[t.topic].dept))],
    replied, replyHours: replied ? delay : null,
  };
}

export const REVIEWS = [];
for (const p of PROPERTIES) {
  const count = Math.round(p.perDay * 180);
  for (let i = 0; i < count; i++) REVIEWS.push(makeReview(p, i));
}
REVIEWS.sort((a, b) => b.posted - a.posted);
