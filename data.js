// Illustrative sample data. NOT Sudamala actuals. Replace this file with real data later;
// the page reads only these exports.
//
// ADR in IDR thousands. For each period: occ, adr and gop are [actual, budget, lastYear];
// rgi = RevPAR index; pace = next-90-day % vs last year. ch = [direct, OTA, wholesale] % of room nights.
// gss = [guest score now, last period]. resp = % of reviews answered.
// lat/lon from street addresses (accurate to about 1 km).

export const RESORTS = [
 { id:"sanur", name:"Sanur", island:"Bali", rooms:52, lat:-8.7077, lon:115.2562,
   p:{ mtd:{occ:[78,80,76],adr:[2600,2500,2450],rgi:104,gop:[38,36,35],pace:6},
       qtd:{occ:[81,81,79],adr:[2650,2550,2500],rgi:105,gop:[40,38,37],pace:5},
       ytd:{occ:[79,78,75],adr:[2580,2500,2400],rgi:103,gop:[37,36,34],pace:4} },
   ch:[24,58,18], gss:[9.1,9.0], resp:82 },
 { id:"ubud", name:"Ubud", island:"Bali", rooms:46, isNew:true, lat:-8.5020, lon:115.2627,
   p:{ mtd:{occ:[46,60,null],adr:[3400,3600,null],rgi:79,gop:[12,22,null],pace:null},
       qtd:{occ:[41,55,null],adr:[3450,3600,null],rgi:76,gop:[8,18,null],pace:null},
       ytd:{occ:[41,55,null],adr:[3450,3600,null],rgi:76,gop:[8,18,null],pace:null} },
   ch:[15,70,15], gss:[9.0,9.0], resp:58 },
 { id:"amed", name:"Amed", island:"Bali", rooms:30, lat:-8.3375, lon:115.6600,
   p:{ mtd:{occ:[71,70,69],adr:[1900,1900,1850],rgi:101,gop:[33,32,31],pace:2},
       qtd:{occ:[73,72,70],adr:[1950,1920,1880],rgi:102,gop:[34,33,32],pace:3},
       ytd:{occ:[70,70,68],adr:[1880,1880,1820],rgi:100,gop:[32,32,30],pace:1} },
   ch:[31,52,17], gss:[8.6,8.9], resp:64 },
 { id:"senggigi", name:"Senggigi", island:"Lombok", rooms:32, lat:-8.4590, lon:116.0418,
   p:{ mtd:{occ:[62,68,66],adr:[1600,1700,1650],rgi:88,gop:[27,31,30],pace:-9},
       qtd:{occ:[64,69,67],adr:[1620,1700,1660],rgi:89,gop:[28,31,30],pace:-7},
       ytd:{occ:[63,67,64],adr:[1610,1680,1640],rgi:91,gop:[28,30,29],pace:-4} },
   ch:[18,57,25], gss:[8.9,8.9], resp:90 },
 { id:"komodo", name:"Komodo", island:"Flores", rooms:36, lat:-8.5160, lon:119.8790,
   p:{ mtd:{occ:[74,72,70],adr:[2900,2800,2700],rgi:108,gop:[41,39,38],pace:8},
       qtd:{occ:[77,74,72],adr:[2950,2850,2750],rgi:109,gop:[42,40,39],pace:9},
       ytd:{occ:[72,70,67],adr:[2850,2780,2650],rgi:107,gop:[40,38,36],pace:7} },
   ch:[12,74,14], gss:[9.2,9.1], resp:88 },
 { id:"seraya", name:"Seraya", island:"Flores", rooms:20, lat:-8.4155, lon:119.8695,
   p:{ mtd:{occ:[66,65,64],adr:[3100,3000,2950],rgi:97,gop:[35,34,33],pace:1},
       qtd:{occ:[68,67,66],adr:[3150,3050,3000],rgi:98,gop:[36,35,34],pace:2},
       ytd:{occ:[65,64,62],adr:[3080,3000,2900],rgi:96,gop:[34,34,32],pace:0} },
   ch:[22,60,18], gss:[9.3,9.4], resp:71 }
];

export const DAYS = { mtd:17, qtd:48, ytd:321 };
export const TARGETS = { direct:25, reviewReplies:90 };

// Portfolio monthly history, Dec 2025 → Nov 2026 (last value = current, computed live)
export const MONTHS = ["Dec","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov"];
export const PORTFOLIO = {
  revpar:  [1650,1480,1420,1510,1590,1720,1980,2120,1840,1760,1690,null],
  revparB: [1600,1500,1450,1500,1620,1750,1950,2080,1860,1800,1780,null],
  occ:     [70,63,61,64,67,72,82,86,77,74,69,null],
  gop:     [34,28,26,29,31,34,40,42,36,34,30,null],
  direct:  [19,18,19,20,20,21,21,22,21,21,20,null],
  gss:     [9.0,9.0,8.9,9.0,9.1,9.1,9.0,9.0,9.1,9.0,9.0,null]
};

// Ubud weekly ramp-up since opening, occupancy %
export const UBUD_RAMP = {
  weeks:["W1","W2","W3","W4","W5","W6","W7"],
  actual:[22,31,36,40,44,47,49],
  plan:  [30,38,45,50,55,58,60]
};

// Map landmarks (orientation aids only)
export const LANDMARKS = [
  { kind:"volcano", name:"Mt Agung",   lat:-8.3433, lon:115.5075, panel:"main" },
  { kind:"volcano", name:"Mt Batur",   lat:-8.2420, lon:115.3750, panel:"main" },
  { kind:"volcano", name:"Mt Rinjani", lat:-8.4116, lon:116.4573, panel:"main" },
  { kind:"airport", name:"DPS",        lat:-8.7482, lon:115.1672, panel:"main" },
  { kind:"airport", name:"LOP",        lat:-8.7573, lon:116.2766, panel:"main" },
  { kind:"airport", name:"LBJ",        lat:-8.4866, lon:119.8891, panel:"close" },
  { kind:"town",    name:"Labuan Bajo",lat:-8.4964, lon:119.8877, panel:"close" }
];
