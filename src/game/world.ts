export const TILE = 32;
export type MapId = "over" | "town" | "hall" | "inn" | "dungeon" | "crypt" | "keep" | "ship" | "isle";
export type TileCh = string;

function parse(raw: string): TileCh[][] {
  const rows = raw.trim().split("\n");
  const w = Math.max(...rows.map((l) => l.length));
  return rows.map((l) => l.padEnd(w, "W").split(""));
}

function hash(x: number, y: number) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function buildOver(): TileCh[][] {
  const cols = 80;
  const rows = 62;
  const t: TileCh[][] = Array.from({ length: rows }, () => Array<TileCh>(cols).fill("~"));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const dx = (c - 36) / 34;
      const dy = (r - 28) / 25;
      const d = dx * dx + dy * dy + (hash(c, r) - 0.5) * 0.16;
      if (d > 1.14) continue;
      if (d > 0.96) {
        t[r][c] = ",";
        continue;
      }
      if (r < 14 && Math.abs(c - 36) < 16) t[r][c] = r < 9 ? "M" : hash(c, r) > 0.4 ? "M" : ".";
      else if (c < 22 && r > 12 && r < 38) t[r][c] = hash(c, r) > 0.32 ? "f" : ".";
      else if (c > 48 && r > 28 && r < 48) t[r][c] = hash(c, r) > 0.42 ? "s" : ".";
      else if (c > 56 && r > 12 && r < 30) t[r][c] = hash(c, r) > 0.48 ? "M" : ".";
      else if (r > 48) t[r][c] = hash(c, r) > 0.5 ? "," : ".";
      else t[r][c] = ".";
      if (r < 10 && t[r][c] === ".") t[r][c] = hash(c * 3, r) > 0.55 ? "M" : ".";
    }
  }
  const road = (c0: number, r0: number, c1: number, r1: number) => {
    let c = c0;
    let r = r0;
    while (c !== c1 || r !== r1) {
      if (t[r] && t[r][c] && t[r][c] !== "~" && t[r][c] !== "M") t[r][c] = "p";
      if (c !== c1) c += Math.sign(c1 - c);
      else if (r !== r1) r += Math.sign(r1 - r);
    }
  };
  road(14, 32, 14, 18);
  road(14, 18, 26, 18);
  road(26, 18, 26, 8);
  road(14, 18, 44, 14);
  road(26, 18, 42, 30);
  road(20, 22, 32, 22);
  road(14, 32, 8, 32);
  road(14, 18, 10, 22);
  road(14, 32, 22, 38);
  road(44, 14, 64, 20);
  road(42, 30, 52, 36);
  road(26, 8, 42, 8);
  road(64, 20, 52, 36);
  for (let r = 16; r <= 20; r++) for (let c = 12; c <= 16; c++) if (t[r][c] !== "~") t[r][c] = "T";
  for (let r = 12; r <= 15; r++) for (let c = 42; c <= 45; c++) if (t[r]?.[c] && t[r][c] !== "~") t[r][c] = "D";
  for (let r = 6; r <= 8; r++) for (let c = 24; c <= 27; c++) if (t[r][c] !== "~") t[r][c] = "H";
  for (let r = 29; r <= 31; r++) for (let c = 40; c <= 43; c++) if (t[r]?.[c] && t[r][c] !== "~") t[r][c] = "F";
  for (let c = 30; c <= 36; c++) if (t[22][c] === "~" || t[22][c] === ",") t[22][c] = "=";
  for (let r = 30; r <= 33; r++) {
    for (let c = 6; c <= 10; c++) {
      if (t[r]?.[c] && t[r][c] !== "~" && t[r][c] !== "M") t[r][c] = "K";
    }
  }
  if (t[32]) t[32][8] = "p";
  const plot = (c0: number, r0: number) => {
    for (let r = r0 - 1; r <= r0 + 1; r++) {
      for (let c = c0 - 1; c <= c0 + 1; c++) {
        if (t[r]?.[c] && t[r][c] !== "~") t[r][c] = "K";
      }
    }
  };
  plot(10, 22);
  plot(22, 38);
  plot(64, 20);
  plot(52, 36);
  plot(42, 8);
  let dockC = 6;
  let dockR = 24;
  outer: for (let r = 18; r < 32; r++) {
    for (let c = 3; c < 16; c++) {
      if (t[r]?.[c] === "," && t[r][c - 1] === "~") {
        dockC = c;
        dockR = r;
        break outer;
      }
    }
  }
  if (t[dockR]) t[dockR][dockC] = "p";
  DOCK.c = dockC;
  DOCK.r = dockR;
  return t;
}

export const DOCK = { c: 6, r: 24 };

const TOWN = `
WWWWWWWWWWWWWWWWWWWWWW
WFFFFFFFFFFFFFFFFFFFFW
WFFWWWWFFFFwwwwFFFFFFW
WFFWFFWFFFFwFFwFFFFFFW
WFFWFFWFFFFwFFwFFFFFFW
WFFWpWWFFFFwppwFFFFFFW
WFFFFFFFFFFFFFFFFFFFFW
WFFFFFFFFFFWWWWWFFFFFW
WFFFFFFFFFFWFFFWFFFFFW
WFFFFFFFFFFWFFFWFFFFFW
WFFFFFppFFFWpWWWFFFFFW
WFFFFFpFFFFFFFFFFFFFFW
WFFFFFpFFFFFFFFFFFFFFW
WWWWWWWWWpWWWWWWWWWWWW
`.trim();

const HALL = `
WWWWWWWWWWWWWW
WwwwwwwwwwwwwW
WwFFFFFFFFFFwW
WwFFFFFFwFFFwW
WwFFFFFFFFFFwW
WwFFFFFFFFFFwW
WwFFFFFFFFFFwW
WWWWWWWWpWWWWW
`.trim();

const INN = `
WWWWWWWWWWWWWW
WwwwwwwwwwwwwW
WwFFFFFFFFFFwW
WwFFwFFFFFFfwW
WwFFwFFFFFFFwW
WwFFFFFFFFFFwW
WwFFFFFFFFFFwW
WWWWWWWWpWWWWW
`.trim();


const DUNGEON = `
WWWWWWWWWWWWWWWWWWWWWWWW
WddddddddddddddddddddddW
WdWWWWWddddddWWWWWWWdddW
WdWddddddddddddddddWdddW
WdWddWWWWWWWWWWddddWdddW
WdWddddddddddddddddddddW
WdWWWWWdddWWWWWWddddddWW
WdddddddddddddddddddddDW
WddWWWWWWWWWWWWWWWWdddDW
WddddddddLLdddddddddddW
WdddddddLLLLLLddddddddW
WddddddddLLdddddddddddW
WdddddddddddddddddddddW
WWWWWWWWWWWWpdWWWWWWWWW
`.trim();

const CRYPT = `
WWWWWWWWWWWWWWWW
WddddddddddddddW
WdWWWWddddWWWWdW
WdWddddddddddWdW
WdWddWWWWWWWdWdW
WdWddddddddddWdW
WdWWWWWddddWWWdW
WddddddddddddddW
WddddLLLLLLddddW
WddddddddddddddW
WWWWWWWWpdWWWWWW
`.trim();

const KEEP = `
WWWWWWWWWWWWWWWWWWWW
WwwwwwwwwwwwwwwwwwwW
WwFFFFFFFFFFFFFFFFFw
WwFwwFFwFwwFFwFwwFwW
WwFwFFFwFwFFFwFwFFFW
WwFFFFFFFFFFFFFFFFFw
WwFFFFFFFFFFFFFFFFFw
WwFFFFFFppppFFFFFFFw
WwFFFFFFppppFFFFFFFw
WwFFFFFFFFFFFFFFFFFw
WwFwwFFwFwwFFwFwwFwW
WwFwFFFwFwFFFwFwFFFW
WwFFFFFFFFFFFFFFFFFw
WWWWWWWWppWWWWWWWWWW
`.trim();

const SHIP = `
WWWWWWWWWWWWWWWW
W~~~~wwwwww~~~~W
W~~~wwwwwwww~~~W
W~~wwFFFFFFFw~~W
W~~wFFFFFFFFFw~W
W~~wFFFFppFFFw~W
W~~wwFFFFFFFw~~W
W~~~wwwwwwww~~~W
W~~~~wwwwww~~~~W
WWWWWWWWWWWWWWWW
`.trim();

function buildIsle(): TileCh[][] {
  const cols = 36;
  const rows = 24;
  const t: TileCh[][] = Array.from({ length: rows }, () => Array<TileCh>(cols).fill("~"));
  for (let r = 2; r < rows - 2; r++) {
    for (let c = 3; c < cols - 3; c++) {
      const dx = (c - 18) / 15;
      const dy = (r - 12) / 10;
      const d = dx * dx + dy * dy + (hash(c + 80, r + 30) - 0.5) * 0.13;
      if (d > 1.02) continue;
      if (d > 0.76) t[r][c] = ",";
      else if ((r < 8 && c > 13) || (c > 27 && r < 14)) t[r][c] = hash(c, r) > 0.3 ? "M" : ".";
      else if (c < 11 && r < 15) t[r][c] = hash(c, r) > 0.58 ? "f" : ".";
      else if (r > 16 && c > 18) t[r][c] = hash(c, r) > 0.58 ? "s" : ",";
      else t[r][c] = ".";
    }
  }

  const path = (c0: number, r0: number, c1: number, r1: number) => {
    let c = c0;
    let r = r0;
    while (c !== c1 || r !== r1) {
      if (t[r]?.[c] && t[r][c] !== "~" && t[r][c] !== "M") t[r][c] = "p";
      if (c !== c1) c += Math.sign(c1 - c);
      else if (r !== r1) r += Math.sign(r1 - r);
    }
    if (t[r]?.[c] && t[r][c] !== "~") t[r][c] = "p";
  };
  path(6, 20, 13, 17);
  path(13, 17, 18, 10);
  path(18, 10, 28, 6);
  path(13, 17, 24, 17);

  for (let r = 16; r <= 18; r++) {
    for (let c = 12; c <= 14; c++) t[r][c] = "K";
  }
  t[6][28] = "H";
  const usable = [
    [6, 20], [7, 20], [6, 19], [7, 18], [21, 20], [9, 20], [23, 17], [28, 12],
    [17, 10], [25, 7], [12, 20], [29, 16], [6, 13], [9, 16], [15, 19], [21, 14],
    [26, 16], [29, 11], [18, 8], [28, 6],
  ];
  for (const [c, r] of usable) if (t[r]?.[c] === "~" || t[r]?.[c] === "M") t[r][c] = ",";
  return t;
}

export const MAPS: Record<MapId, TileCh[][]> = {
  over: buildOver(),
  town: parse(TOWN),
  hall: parse(HALL),
  inn: parse(INN),
  dungeon: parse(DUNGEON),
  crypt: parse(CRYPT),
  keep: parse(KEEP),
  ship: parse(SHIP),
  isle: buildIsle(),
};

export const MAP_SIZE: Record<MapId, { cols: number; rows: number }> = {
  over: { cols: MAPS.over[0].length, rows: MAPS.over.length },
  town: { cols: MAPS.town[0].length, rows: MAPS.town.length },
  hall: { cols: MAPS.hall[0].length, rows: MAPS.hall.length },
  inn: { cols: MAPS.inn[0].length, rows: MAPS.inn.length },
  dungeon: { cols: MAPS.dungeon[0].length, rows: MAPS.dungeon.length },
  crypt: { cols: MAPS.crypt[0].length, rows: MAPS.crypt.length },
  keep: { cols: MAPS.keep[0].length, rows: MAPS.keep.length },
  ship: { cols: MAPS.ship[0].length, rows: MAPS.ship.length },
  isle: { cols: MAPS.isle[0].length, rows: MAPS.isle.length },
};

export const SPAWN: Record<MapId, { c: number; r: number }> = {
  over: { c: 14, r: 22 },
  town: { c: 9, r: 12 },
  hall: { c: 7, r: 6 },
  inn: { c: 7, r: 6 },
  dungeon: { c: 12, r: 12 },
  crypt: { c: 8, r: 9 },
  keep: { c: 10, r: 11 },
  ship: { c: 7, r: 4 },
  isle: { c: 6, r: 19 },
};

export const PLACE: Record<MapId, string> = {
  over: "Дикие земли",
  town: "Вестмер",
  hall: "Зал Халрика",
  inn: "Таверна «Соль»",
  dungeon: "Чёрная твердыня",
  crypt: "Крипта кодекса",
  keep: "Двор клятвы",
  ship: "Соляной киль",
  isle: "Остров киля",
};

export const EXITS: Record<MapId, { c: number; r: number; to: MapId; tc: number; tr: number }[]> = {
  over: [
    { c: 14, r: 18, to: "town", tc: 9, tr: 12 },
    { c: 13, r: 18, to: "town", tc: 9, tr: 12 },
    { c: 15, r: 18, to: "town", tc: 9, tr: 12 },
    { c: 14, r: 17, to: "town", tc: 9, tr: 12 },
    { c: 43, r: 13, to: "dungeon", tc: 12, tr: 12 },
    { c: 44, r: 13, to: "dungeon", tc: 12, tr: 12 },
    { c: 43, r: 14, to: "dungeon", tc: 12, tr: 12 },
    { c: 8, r: 32, to: "keep", tc: 10, tr: 12 },
    { c: 7, r: 32, to: "keep", tc: 10, tr: 12 },
    { c: 9, r: 32, to: "keep", tc: 10, tr: 12 },
    { c: 8, r: 31, to: "keep", tc: 10, tr: 12 },
    { c: DOCK.c, r: DOCK.r, to: "ship", tc: 8, tr: 5 },
  ],
  town: [
    { c: 9, r: 13, to: "over", tc: 14, tr: 20 },
    { c: 4, r: 5, to: "hall", tc: 7, tr: 6 },
    { c: 15, r: 5, to: "inn", tc: 7, tr: 6 },
    { c: 16, r: 5, to: "inn", tc: 7, tr: 6 },
  ],
  hall: [{ c: 7, r: 7, to: "town", tc: 5, tr: 7 }],
  inn: [{ c: 7, r: 7, to: "town", tc: 15, tr: 6 }],
  dungeon: [
    { c: 12, r: 13, to: "over", tc: 42, tr: 15 },
    { c: 22, r: 7, to: "crypt", tc: 8, tr: 9 },
    { c: 22, r: 8, to: "crypt", tc: 8, tr: 9 },
  ],
  crypt: [{ c: 8, r: 10, to: "dungeon", tc: 21, tr: 7 }],
  keep: [
    { c: 10, r: 13, to: "over", tc: 8, tr: 33 },
    { c: 9, r: 13, to: "over", tc: 8, tr: 33 },
  ],
  ship: [
    { c: 8, r: 5, to: "over", tc: DOCK.c, tr: DOCK.r },
    { c: 9, r: 5, to: "over", tc: DOCK.c, tr: DOCK.r },
  ],
  isle: [
    { c: 6, r: 20, to: "ship", tc: 7, tr: 4 },
    { c: 7, r: 20, to: "ship", tc: 7, tr: 4 },
  ],
};

const SOLID = new Set(["~", "M", "W", "L", "#"]);

export function tileAt(map: MapId, c: number, r: number): TileCh {
  const m = MAPS[map];
  if (r < 0 || c < 0 || r >= m.length || c >= m[0].length) return "~";
  return m[r][c];
}

export function blocked(map: MapId, c: number, r: number) {
  return SOLID.has(tileAt(map, c, r));
}

export function hurtTile(map: MapId, c: number, r: number) {
  return tileAt(map, c, r) === "L";
}

export const TILE_FILE: Record<string, string> = {
  ".": "t-grass",
  p: "t-road",
  "~": "t-water",
  "=": "t-bridge",
  f: "t-forest",
  M: "t-mountain",
  s: "t-swamp",
  ",": "t-sand",
  F: "t-cobble",
  W: "t-wall",
  w: "t-wood",
  d: "t-dfloor",
  H: "t-shrine",
  L: "t-lava",
  T: "t-cobble",
  D: "t-dfloor",
  "#": "t-dwall",
  K: "t-cobble",
};
