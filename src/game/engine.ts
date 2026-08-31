import { GameAudio } from "./audio";
import { ASK, DROP, GREET, ITEM, KEY_RU, MOB, NPCS, ROLE, SHOP, type Guise, type ItemId, type MobKind, type Npc, type Slot } from "./content";
import {
  HEROES,
  SPELLS,
  TALENTS,
  type HeroId,
  type SpellId,
  type TalentId,
} from "./heroes";
import { BUILDINGS, WAYPOINTS, type BuildId, type WpId } from "./keep";
import { DATA_CRAFT as CRAFT, GATHER_NODES, LANDMARKS, SITES, gatherNodeAt, siteAt, type SiteId } from "./data";
import { readGameSave, writeGameSave, type GameSave, type SavedMode } from "./save";
import {
  EXITS,
  MAP_SIZE,
  MAPS,
  PLACE,
  SPAWN,
  TILE,
  TILE_FILE,
  DOCK,
  blocked,
  hurtTile,
  tileAt,
  type MapId,
} from "./world";

export type Mode = "menu" | "play" | "pause" | "talk" | "inv" | "journal" | "talent" | "way" | "build" | "atlas" | "site" | "dead" | "win";

export type Snapshot = {
  mode: Mode;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  food: number;
  gold: number;
  xp: number;
  level: number;
  log: string[];
  hint: string;
  talk: { name: string; text: string; portrait: string; role: string; ask: string; keys: { id: string; label: string }[] } | null;
  items: { id: ItemId; name: string; desc: string; slot?: string; on?: boolean }[];
  party: string[];
  quests: { text: string; done: boolean }[];
  spells: { id: SpellId; name: string; key: string; cost: number; ready: number }[];
  talents: { id: TalentId; name: string; desc: string }[] | null;
  hero: HeroId | null;
  muted: boolean;
  place: string;
  xpNeed: number;
  meleeCd: number;
  buildings: { id: BuildId; name: string; cost: number; desc: string; bonus: string; built: boolean; ok: boolean }[];
  waypoints: { id: WpId; name: string; unlocked: boolean }[];
  portalOpen: boolean;
  inKeep: boolean;
  canRest: boolean;
  keepClaimed: boolean;
  wep: string;
  arm: string;
  cloak: string;
  equipment: Record<Slot, ItemId | null>;
  guise: Guise;
  goldFlash: number;
  activeSlot: number;
  canCraft: boolean;
  recipes: { out: ItemId; name: string; gold: number; need: string[]; ok: boolean }[];
  you: { c: number; r: number; map: MapId };
  sites: {
    id: SiteId;
    map: MapId;
    name: string;
    blurb: string;
    c: number;
    r: number;
    built: string;
    options: { id: string; name: string; cost: number; desc: string; bonus: string; ok: boolean }[];
  }[];
  nearSite: SiteId | null;
  landmarks: { id: string; name: string; c: number; r: number }[];
  canContinue: boolean;
};

export type GameHandle = {
  start: (id: HeroId) => void;
  continueGame: () => boolean;
  pause: () => void;
  returnToMenu: () => void;
  keyword: (k: string) => void;
  attack: () => void;
  cast: (slot: number) => void;
  interact: () => void;
  pickTalent: (id: TalentId) => void;
  townPortal: () => void;
  goCastle: () => void;
  toggleWaypoints: () => void;
  travel: (id: WpId) => void;
  toggleBuild: () => void;
  build: (id: BuildId) => void;
  rest: () => void;
  toggleInv: () => void;
  toggleJournal: () => void;
  usePotion: () => void;
  closePanel: () => void;
  toggleMute: () => void;
  setMoveStick: (x: number, y: number) => void;
  select: (slot: number) => void;
  equip: (id: ItemId) => void;
  craft: (out: ItemId) => void;
  raiseSite: (siteId: SiteId, optId: string) => void;
  toggleAtlas: () => void;
  destroy: () => void;
  snapshot: () => Snapshot;
  nudge: (dc: number, dr: number) => void;
};

const FACE: Array<[number, number]> = [
  [0, 1],
  [-1, 0],
  [1, 0],
  [0, -1],
];

const STACKABLE_ITEMS = new Set<ItemId>([
  "hide",
  "ore",
  "cloth",
  "potion",
  "wood",
  "herb",
  "driftwood",
  "kelp",
  "shell",
]);

const AUTO_EQUIP_ITEMS = new Set<ItemId>(["steel", "chain", "sash", "robe", "shroud", "harpoon", "stormcloak", "shellmail"]);

type Mob = {
  id: number;
  map: MapId;
  x: number;
  y: number;
  kind: MobKind;
  hp: number;
  max: number;
  wait: number;
  stun: number;
  slow: number;
  poison: number;
  atkCd: number;
  flash: number;
};
type Shot = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  grav: number;
  life: number;
  dmg: number;
  r: number;
  color: string;
  pierce: number;
  slow: number;
  stun: number;
  poison: number;
  stuck: number;
  kind: "arrow" | "magic";
  hit: number;
};
type Slash = { x: number; y: number; ang: number; t: number; r: number; color: string };
type Spark = { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number };
type Floater = { x: number; y: number; text: string; life: number; color: string };
type Coin = { map: MapId; x: number; y: number; z: number; vx: number; vy: number; vz: number; n: number; wait: number; spin: number };

function loadImg(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(src));
    img.src = src;
  });
}

function radial(x: number, y: number, dz = 0.14) {
  const m = Math.hypot(x, y);
  if (m < dz) return { x: 0, y: 0 };
  const s = (m - dz) / (1 - dz) / m;
  return { x: x * s, y: y * s };
}

function angOf(dir: number) {
  return Math.atan2(FACE[dir][1], FACE[dir][0]);
}

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      getX: () => number;
      getY: () => number;
      getMode?: () => string;
      setKeys?: (codes: string[]) => void;
      setSteer?: (v: number) => void;
    };
  }
}

export function mountGame(canvas: HTMLCanvasElement, onChange: (s: Snapshot) => void): GameHandle {
  const maybe = canvas.getContext("2d");
  if (!maybe) throw new Error("Canvas unsupported");
  const ctx: CanvasRenderingContext2D = maybe;
  const audio = new GameAudio();

  const keys = new Set<string>();
  const injected = new Set<string>();
  let stickX = 0;
  let stickY = 0;
  let raf = 0;
  let lastT = 0;
  let cssW = 1;
  let cssH = 1;
  let dpr = 1;
  let lastEmit = 0;
  let time = 0;
  let footT = 0;
  let shake = 0;
  let lavaT = 0;
  let exitLock = 0;
  let meleeCd = 0;
  let lunge = 0;
  let shieldT = 0;
  let markT = 0;
  let iframe = 0;
  let lyraAtk = 0;

  let mode: Mode = "menu";
  let heroId: HeroId = "aldric";
  let map: MapId = "over";
  let px = SPAWN.over.c * TILE + 16;
  let py = SPAWN.over.r * TILE + 16;
  let vx = 0;
  let vy = 0;
  let dir = 0;
  let hp = 34;
  let maxHp = 34;
  let mp = 8;
  let maxMp = 8;
  let food = 28;
  let gold = 80;
  let xp = 0;
  let level = 1;
  let str = 12;
  let baseSpd = 118;
  let baseArmor = 2;
  const items: ItemId[] = ["sword", "leather"];
  const worn: Record<Slot, ItemId | null> = { wep: "sword", arm: "leather", cloak: null };
  let lyra = false;
  let lyraHp = 18;
  const flags = new Set<string>();
  const owned = new Set<TalentId>();
  let pending: TalentId[] = [];
  const cds: Record<string, number> = {};
  const built = new Set<BuildId>();
  const raised = new Map<SiteId, string>();
  let siteArmor = 0;
  const stones = new Set<WpId>();
  let fieldPortal: { map: MapId; x: number; y: number } | null = null;
  let portalLock = 0;
  let keepDmg = 0;
  let keepRegen = 0.6;
  let vaultVisit = false;
  const log: string[] = [];
  let hint = "WASD ход · E действие · Пробел удар · 1 2 3 магия";
  let talkNpc: Npc | null = null;
  let talkText = "";
  let lastAsk = "";
  const opened = new Set<string>();
  const sparks: Spark[] = [];
  const floaters: Floater[] = [];
  const shots: Shot[] = [];
  const slashes: Slash[] = [];
  const coins: Coin[] = [];
  let goldFlash = 0;
  let activeSlot = 0;
  let moveTo: { x: number; y: number } | null = null;
  let huntId = 0;
  let talkGo: Npc | null = null;
  let interactGo: { c: number; r: number } | null = null;
  let holdLmb = false;
  let holdRmb = false;
  let aimX = 0;
  let aimY = 0;
  let hasAim = false;
  let aimAng = 0;
  const cam = { x: px, y: py };
  let mobId = 1;
  let mobs: Mob[] = [];
  let saveAvailable = readGameSave() !== null;
  let lastSavedAt = 0;

  const mods = {
    armor: 0,
    lifesteal: 0,
    slash: 1,
    whirl: 0,
    holy: 0,
    pierce: 0,
    freeze: 0.7,
    nova: 1,
    siphon: 0,
    boltCost: 0,
    crit: 0,
    spd: 0,
    poison: 0,
    dash: 1,
    luck: 1,
    twin: 0,
    stun: 0,
  };

  function mkMob(m: MapId, c: number, r: number, kind: MobKind): Mob {
    const hp0 = MOB[kind].hp;
    return {
      id: mobId++,
      map: m,
      x: c * TILE + 16,
      y: r * TILE + 16,
      kind,
      hp: hp0,
      max: hp0,
      wait: Math.random(),
      stun: 0,
      slow: 0,
      poison: 0,
      atkCd: 0,
      flash: 0,
    };
  }

  function seedMobs() {
    mobs = [
      mkMob("over", 10, 14, "wolf"),
      mkMob("over", 8, 26, "wolf"),
      mkMob("over", 20, 12, "wolf"),
      mkMob("over", 22, 24, "wolf"),
      mkMob("over", 32, 20, "wolf"),
      mkMob("over", 38, 16, "orc"),
      mkMob("over", 40, 18, "orc"),
      mkMob("over", 46, 22, "orc"),
      mkMob("over", 36, 28, "wolf"),
      mkMob("over", 48, 18, "orc"),
      mkMob("over", 12, 40, "wolf"),
      mkMob("over", 24, 42, "wolf"),
      mkMob("over", 8, 20, "wolf"),
      mkMob("over", 18, 36, "wolf"),
      mkMob("over", 60, 22, "orc"),
      mkMob("over", 66, 24, "orc"),
      mkMob("over", 50, 38, "wolf"),
      mkMob("over", 54, 40, "orc"),
      mkMob("over", 40, 10, "wolf"),
      mkMob("over", 70, 28, "orc"),
      mkMob("over", 58, 16, "orc"),
      mkMob("dungeon", 4, 4, "skel"),
      mkMob("dungeon", 16, 4, "skel"),
      mkMob("dungeon", 8, 8, "skel"),
      mkMob("dungeon", 18, 10, "skel"),
      mkMob("dungeon", 6, 11, "skel"),
      mkMob("crypt", 4, 4, "skel"),
      mkMob("crypt", 12, 3, "skel"),
      mkMob("crypt", 8, 2, "wraith"),
      mkMob("isle", 9, 16, "crab"),
      mkMob("isle", 15, 19, "crab"),
      mkMob("isle", 21, 14, "crab"),
      mkMob("isle", 26, 16, "crab"),
      mkMob("isle", 29, 11, "crab"),
      mkMob("isle", 18, 8, "crab"),
    ];
  }
  seedMobs();

  const imgs: Record<string, HTMLImageElement> = {};
  void Promise.all(
    [...new Set([...Object.values(TILE_FILE), "hero-aldric", "hero-vessa", "hero-kael", "npcs", "mobs", "crab", "props", "items", "keep", "coin", "wreck", "shack", "beacon", "cave"])].map(
      async (n) => {
        imgs[n] = await loadImg(`/sprites/${n}.png`);
      },
    ),
  ).then(() => emit(true));

  function down(code: string) {
    return injected.has(code) || keys.has(code);
  }
  function say(line: string) {
    log.push(line);
    if (log.length > 10) log.shift();
  }
  function has(id: ItemId) {
    return items.includes(id);
  }
  function give(id: ItemId) {
    if (id === "food") food += 10;
    else if (STACKABLE_ITEMS.has(id) || !has(id)) items.push(id);
    audio.pickup();
    const slot = ITEM[id].slot;
    if (slot && (!worn[slot] || AUTO_EQUIP_ITEMS.has(id))) worn[slot] = id;
    if (slot && AUTO_EQUIP_ITEMS.has(id)) say(`Надето: ${ITEM[id].name}.`);
    if (AUTO_EQUIP_ITEMS.has(id)) {
      burst(px, py, "#e8e4d8", 18);
      float(px, py - 20, ITEM[id].name, "#e8e4d8");
    }
  }

  function guise(): Guise {
    if (worn.cloak === "sash") return "pirate";
    if (worn.cloak === "robe") return "mage";
    if (worn.cloak === "shroud") return "thief";
    return "oath";
  }

  function equip(id: ItemId) {
    const slot = ITEM[id].slot;
    if (!slot || !has(id)) return;
    worn[slot] = id;
    say(`На тебе: ${ITEM[id].name}.`);
    audio.ok();
    emit(true);
  }

  function canMake(r: (typeof CRAFT)[number]) {
    if (gold < r.gold) return false;
    const count: Partial<Record<ItemId, number>> = {};
    for (const n of r.need) count[n] = (count[n] ?? 0) + 1;
    for (const [k, n] of Object.entries(count)) {
      if (items.filter((i) => i === k).length < (n ?? 0)) return false;
    }
    return true;
  }

  function currentSiteOption() {
    const site = siteAt(map, tileC(), tileR());
    if (!site) return null;
    return site.options.find((option) => option.id === raised.get(site.id)) ?? null;
  }

  function canCraftHere() {
    return (map === "keep" && built.has("forge")) || !!currentSiteOption()?.craft;
  }

  function craft(out: ItemId) {
    const r = CRAFT.find((x) => x.out === out);
    if (!r || !canCraftHere()) {
      say("Нужна кузница во дворе или ремесленная постройка на участке.");
      emit(true);
      return;
    }
    if (!canMake(r)) {
      say("Не хватает.");
      emit(true);
      return;
    }
    gold -= r.gold;
    for (const n of r.need) {
      const i = items.indexOf(n);
      if (i >= 0) items.splice(i, 1);
    }
    give(out);
    say(`Выковал: ${ITEM[out].name}.`);
    emit(true);
  }

  function quests() {
    return [
      { text: "Найти Халрика в зале Вестмера", done: flags.has("metLord") },
      { text: "Поднять Двор клятвы (юг от дороги)", done: flags.has("keep") },
      { text: "Взять факел у Бруны", done: has("torch") },
      { text: "Ключ (Оскар/Сорен) или знак на алтаре", done: has("key") || has("mark") },
      { text: "Забрать кодекс из крипты", done: has("codex") },
      { text: "Вернуть кодекс Халрику", done: flags.has("returned") },
      { text: "Достать кушак Соляного киля", done: has("sash") },
      { text: "Сесть на корабль Рина (ур. 3 и кушак на себе)", done: flags.has("sailed") },
      { text: "Взять приливный камень на острове киля", done: has("tide") },
      { text: "Поднять постройку на участке (роща, межа, кряж, топь, мыс)", done: raised.size > 0 },
      { text: "Основать убежище в бухте Соляного киля", done: raised.has("haven") },
      { text: "Сковать островное снаряжение", done: has("harpoon") || has("stormcloak") || has("shellmail") },
    ];
  }

  function talkKeys(n: Npc) {
    return Object.keys(n.words)
      .filter((k) => {
        if (k === "JOIN" && lyra) return false;
        if (k === "STEAL" && (has("sash") || n.id !== "ryn")) return false;
        if (k === "SAIL" && n.id !== "ryn") return false;
        return true;
      })
      .map((k) => ({ id: k, label: ASK[k] ?? KEY_RU[k] ?? k }));
  }

  function snapshot(): Snapshot {
    const h = HEROES[heroId];
    return {
      mode,
      hp,
      maxHp,
      mp,
      maxMp,
      food,
      gold,
      xp,
      level,
      log: [...log],
      hint,
      talk: talkNpc
        ? {
            name: talkNpc.name,
            text: talkText,
            portrait: talkNpc.id,
            role: ROLE[talkNpc.id],
            ask: lastAsk,
            keys: talkKeys(talkNpc),
          }
        : null,
      items: items.map((id) => ({
        id,
        name: ITEM[id].name,
        desc: ITEM[id].desc,
        slot: ITEM[id].slot,
        on: worn.wep === id || worn.arm === id || worn.cloak === id,
      })),
      party: lyra ? [`Лира ${Math.max(0, lyraHp | 0)}`] : [],
      quests: quests(),
      spells: h.spells.map((id) => {
        const s = SPELLS[id];
        return { id, name: s.name, key: s.key, cost: Math.max(1, s.cost + (id === "bolt" ? mods.boltCost : 0)), ready: cds[id] ?? 0 };
      }),
      talents: mode === "talent" ? pending.map((id) => ({ id, name: TALENTS[id].name, desc: TALENTS[id].desc })) : null,
      hero: mode === "menu" ? null : heroId,
      muted: audio.muted,
      place: PLACE[map],
      xpNeed: level * 36,
      meleeCd,
      buildings: BUILDINGS.map((b) => ({
        id: b.id,
        name: b.name,
        cost: b.cost,
        desc: b.desc,
        bonus: b.bonus,
        built: built.has(b.id),
        ok: gold >= b.cost,
      })),
      waypoints: WAYPOINTS.map((w) => ({ id: w.id, name: w.name, unlocked: stones.has(w.id) })),
      portalOpen: !!fieldPortal,
      inKeep: map === "keep",
      canRest: (map === "keep" && built.has("hearth")) || (() => {
        const p = siteAt(map, tileC(), tileR());
        if (!p) return false;
        const o = p.options.find((x) => x.id === raised.get(p.id));
        return !!o?.rest;
      })(),
      keepClaimed: flags.has("keep"),
      wep: worn.wep ? ITEM[worn.wep].name : "кулаки",
      arm: worn.arm ? ITEM[worn.arm].name : "рубаха",
      cloak: worn.cloak ? ITEM[worn.cloak].name : "без плаща",
      equipment: { ...worn },
      guise: guise(),
      goldFlash,
      activeSlot,
      canCraft: canCraftHere(),
      recipes: CRAFT.map((r) => ({
        out: r.out,
        name: ITEM[r.out].name,
        gold: r.gold,
        need: r.need.map((n) => ITEM[n].name),
        ok: canMake(r),
      })),
      you: { c: tileC(), r: tileR(), map },
      sites: SITES.map((s) => {
        const pick = raised.get(s.id);
        const opt = s.options.find((o) => o.id === pick);
        return {
          id: s.id,
          map: s.map,
          name: s.name,
          blurb: s.blurb,
          c: s.c,
          r: s.r,
          built: opt?.name ?? "",
          options: s.options.map((o) => ({
            id: o.id,
            name: o.name,
            cost: o.cost,
            desc: o.desc,
            bonus: o.bonus,
            ok: !pick && gold >= o.cost,
          })),
        };
      }),
      nearSite: siteAt(map, tileC(), tileR())?.id ?? null,
      landmarks: LANDMARKS.map((l) => ({ ...l, c: l.id === "dock" ? DOCK.c : l.c, r: l.id === "dock" ? DOCK.r : l.r })),
      canContinue: saveAvailable,
    };
  }

  function savedMode(): SavedMode {
    if (mode === "talent" || mode === "dead" || mode === "win") return mode;
    return "play";
  }

  function persistGame(force = false) {
    if (mode === "menu") return;
    const now = Date.now();
    if (!force && now - lastSavedAt < 5000) return;
    const save: GameSave = {
      version: 1,
      updatedAt: now,
      mode: savedMode(),
      heroId,
      map,
      px,
      py,
      dir,
      hp,
      maxHp,
      mp,
      maxMp,
      food,
      gold,
      xp,
      level,
      str,
      baseSpd,
      baseArmor,
      items: [...items],
      worn: { ...worn },
      lyra,
      lyraHp,
      flags: [...flags],
      opened: [...opened],
      owned: [...owned],
      pending: [...pending],
      built: [...built],
      raised: [...raised],
      stones: [...stones],
      fieldPortal: fieldPortal ? { ...fieldPortal } : null,
      vaultVisit,
      log: [...log],
      activeSlot,
      mobs: mobs.map((mob) => ({ ...mob })),
      cds: { ...cds },
    };
    if (writeGameSave(save)) {
      saveAvailable = true;
      lastSavedAt = now;
    }
  }

  function restoreGame() {
    const save = readGameSave();
    if (!save) {
      saveAvailable = false;
      return false;
    }
    reset(save.heroId);
    map = save.map;
    px = save.px;
    py = save.py;
    dir = Math.max(0, Math.min(3, Math.floor(save.dir)));
    hp = save.hp;
    maxHp = save.maxHp;
    mp = save.mp;
    maxMp = save.maxMp;
    food = save.food;
    gold = save.gold;
    xp = save.xp;
    level = Math.max(1, Math.floor(save.level));
    str = save.str;
    baseSpd = save.baseSpd;
    baseArmor = save.baseArmor;

    items.length = 0;
    items.push(...save.items.filter((id) => id in ITEM));
    for (const slot of Object.keys(worn) as Slot[]) {
      const id = save.worn[slot];
      worn[slot] = id && id in ITEM && ITEM[id].slot === slot && items.includes(id) ? id : null;
    }
    lyra = save.lyra;
    lyraHp = save.lyraHp;
    flags.clear();
    save.flags.forEach((flag) => flags.add(flag));
    opened.clear();
    save.opened.forEach((id) => opened.add(id));
    owned.clear();
    save.owned.filter((id) => id in TALENTS).forEach((id) => owned.add(id));
    pending = save.pending.filter((id) => id in TALENTS && !owned.has(id));
    built.clear();
    save.built.filter((id) => BUILDINGS.some((building) => building.id === id)).forEach((id) => built.add(id));
    raised.clear();
    for (const [siteId, optionId] of save.raised) {
      const site = SITES.find((candidate) => candidate.id === siteId);
      if (site?.options.some((option) => option.id === optionId)) raised.set(siteId, optionId);
    }
    stones.clear();
    save.stones.filter((id) => WAYPOINTS.some((waypoint) => waypoint.id === id)).forEach((id) => stones.add(id));
    fieldPortal = save.fieldPortal ? { ...save.fieldPortal } : null;
    vaultVisit = save.vaultVisit;
    log.length = 0;
    log.push(...save.log.slice(-10));
    activeSlot = Math.max(-1, Math.min(2, Math.floor(save.activeSlot)));

    resetMods();
    owned.forEach((id) => applyTalent(id, false));
    siteArmor = 0;
    for (const [siteId, optionId] of raised) {
      const option = SITES.find((site) => site.id === siteId)?.options.find((candidate) => candidate.id === optionId);
      siteArmor += option?.armor ?? 0;
    }
    recalcKeep();
    for (const key of Object.keys(cds)) delete cds[key];
    Object.assign(cds, save.cds);
    mobs = save.mobs.map((mob) => ({ ...mob }));
    mobId = Math.max(1, ...mobs.map((mob) => mob.id + 1));

    if (!tryPos(px, py)) {
      px = SPAWN[map].c * TILE + 16;
      py = SPAWN[map].r * TILE + 16;
    }
    cam.x = px;
    cam.y = py;
    sparks.length = 0;
    floaters.length = 0;
    shots.length = 0;
    slashes.length = 0;
    coins.length = 0;
    moveTo = null;
    huntId = 0;
    talkGo = null;
    interactGo = null;
    talkNpc = null;
    lastAsk = "";
    holdLmb = false;
    holdRmb = false;
    mode = save.mode === "talent" && pending.length === 0 ? "play" : save.mode;
    saveAvailable = true;
    lastSavedAt = Date.now();
    say("Игра загружена.");
    return true;
  }

  function emit(force = false) {
    if (!force && time - lastEmit < 0.08) return;
    lastEmit = time;
    persistGame(force);
    onChange(snapshot());
  }

  function burst(x: number, y: number, color: string, n = 8) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 50 + Math.random() * 90;
      sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.3 + Math.random() * 0.3, color, size: 2 + Math.random() * 2 });
    }
  }
  function float(x: number, y: number, text: string, color: string) {
    floaters.push({ x, y, text, life: 0.75, color });
  }

  function resetMods() {
    mods.armor = 0;
    mods.lifesteal = 0;
    mods.slash = 1;
    mods.whirl = 0;
    mods.holy = 0;
    mods.pierce = 0;
    mods.freeze = 0.7;
    mods.nova = 1;
    mods.siphon = 0;
    mods.boltCost = 0;
    mods.crit = 0;
    mods.spd = 0;
    mods.poison = 0;
    mods.dash = 1;
    mods.luck = 1;
    mods.twin = 0;
    mods.stun = 0;
  }

  function applyTalent(id: TalentId, grantStats = true) {
    if (id === "iron") mods.armor += 3;
    if (id === "blood") mods.lifesteal = 2;
    if (id === "wide") mods.slash += 0.4;
    if (id === "holy") {
      mods.holy += 7;
      mods.stun += 0.5;
    }
    if (id === "stamina" && grantStats) {
      maxHp += 14;
      hp += 14;
    }
    if (id === "whirl") mods.whirl = 1;
    if (id === "mind" && grantStats) {
      maxMp += 10;
      mp += 10;
    }
    if (id === "pierce") mods.pierce = 1;
    if (id === "freeze") mods.freeze = 1.4;
    if (id === "big") mods.nova = 1.45;
    if (id === "siphon") mods.siphon = 5;
    if (id === "storm") mods.boltCost = -2;
    if (id === "crit") mods.crit = 0.25;
    if (id === "swift") mods.spd += 22;
    if (id === "venom") mods.poison = 6;
    if (id === "blink") mods.dash = 1.6;
    if (id === "luck") mods.luck = 1.6;
    if (id === "twin") mods.twin = 0.2;
  }

  function reset(id: HeroId) {
    const h = HEROES[id];
    heroId = id;
    map = "over";
    px = SPAWN.over.c * TILE + 16;
    py = SPAWN.over.r * TILE + 16;
    vx = 0;
    vy = 0;
    dir = 0;
    maxHp = h.hp;
    hp = h.hp;
    maxMp = h.mp;
    mp = h.mp;
    food = 28;
    gold = 80;
    xp = 0;
    level = 1;
    str = h.str;
    baseSpd = h.spd;
    baseArmor = h.armor;
    items.length = 0;
    items.push(id === "vessa" ? "leather" : "sword", "leather");
    worn.wep = id === "vessa" ? null : "sword";
    worn.arm = "leather";
    worn.cloak = null;
    lyra = false;
    lyraHp = 18;
    flags.clear();
    opened.clear();
    owned.clear();
    pending = [];
    resetMods();
    built.clear();
    raised.clear();
    siteArmor = 0;
    stones.clear();
    fieldPortal = null;
    keepDmg = 0;
    keepRegen = 0.6;
    vaultVisit = false;
    talkNpc = null;
    lastAsk = "";
    mode = "play";
    log.length = 0;
    log.push(`${h.name} на дороге. Юг — руина Двора. E — говорить и исследовать.`);
    cam.x = px;
    cam.y = py;
    sparks.length = 0;
    floaters.length = 0;
    shots.length = 0;
    slashes.length = 0;
    coins.length = 0;
    goldFlash = 0;
    activeSlot = 0;
    moveTo = null;
    huntId = 0;
    talkGo = null;
    interactGo = null;
    holdLmb = false;
    holdRmb = false;
    shieldT = 0;
    markT = 0;
    seedMobs();
    time = 0;
    for (const s of h.spells) cds[s] = 0;
  }

  function tileC() {
    return Math.floor(px / TILE);
  }
  function tileR() {
    return Math.floor(py / TILE);
  }
  function solidAt(x: number, y: number) {
    return blocked(map, Math.floor(x / TILE), Math.floor(y / TILE));
  }
  function tryPos(nx: number, ny: number) {
    const r = 9;
    return !solidAt(nx - r, ny) && !solidAt(nx + r, ny) && !solidAt(nx, ny - r * 0.4) && !solidAt(nx, ny + r);
  }

  function npcNear(dist = 40) {
    let best: Npc | null = null;
    let bd = dist;
    for (const n of NPCS) {
      if (n.map !== map) continue;
      if (n.id === "lyra" && lyra) continue;
      const d = Math.hypot(n.c * TILE + 16 - px, n.r * TILE + 16 - py);
      if (d < bd) {
        bd = d;
        best = n;
      }
    }
    return best;
  }

  function startTalk(n: Npc) {
    talkNpc = n;
    lastAsk = "";
    if (n.id === "halric") flags.add("metLord");
    const g = guise();
    talkText = GREET[n.id][g];
    if (n.id === "ryn" && g === "pirate" && level < 3) {
      talkText = "«Кушак вижу. Крови мало. Волки на берегу ещё не знают твоего имени. Приди третьим.»";
    }
    if (n.id === "ryn" && has("tide")) {
      talkText = "«Камень. Вторая клятва у тебя в кармане. Суша этого не простит. Киль — простит всё.»";
    }
    mode = "talk";
    audio.talk();
    emit(true);
  }

  function doKeyword(raw: string) {
    if (!talkNpc || mode !== "talk") return;
    const ru2en = Object.entries(KEY_RU).find(([, v]) => v === raw.toUpperCase());
    const key = (ru2en?.[0] ?? raw).toUpperCase().replace(/\s+/g, "");
    const n = talkNpc;
    lastAsk = ASK[key] ?? KEY_RU[key] ?? raw;
    const shop = SHOP.find((s) => s.npc === n.id && s.word === key);
    if (shop) {
      if (has(shop.item) && shop.item !== "food" && shop.item !== "potion") {
        talkText = "«Уже есть.»";
        emit(true);
        return;
      }
      if (gold < shop.gold) {
        talkText = "«Мало золота.»";
        emit(true);
        return;
      }
      gold -= shop.gold;
      give(shop.item);
      talkText = `«${ITEM[shop.item].name}. Минус ${shop.gold} золота.»`;
      emit(true);
      return;
    }
    if (key === "JOIN" && n.id === "lyra") {
      lyra = true;
      lyraHp = 18;
      talkText = n.words.JOIN.startsWith("«") ? n.words.JOIN : `«${n.words.JOIN}»`;
      say("Лира в отряде.");
      audio.ok();
      emit(true);
      return;
    }
    if (n.id === "ryn" && key === "SAIL") {
      if (guise() !== "pirate") {
        talkText = "«Без кушака на себе ты груз, не матрос. Надень — потом говори.»";
      } else if (level < 3) {
        talkText = "«Мало крови. Волки на берегу ещё не знают твоего имени.»";
      } else {
        flags.add("sailed");
        talkNpc = null;
        lastAsk = "";
        mode = "play";
        warp("isle", SPAWN.isle.c, SPAWN.isle.r, "Паруса. Архипелаг Соляного киля.");
        audio.ok();
      }
      emit(true);
      return;
    }
    if (n.id === "ryn" && key === "STEAL") {
      if (has("sash")) talkText = "«Уже висит на тебе. Не жадничай пальцами.»";
      else if (guise() === "thief" || level >= 2) {
        give("sash");
        worn.cloak = "sash";
        talkText = "«Бери. Соль сама находит воров. Теперь ты пахнешь килем.»";
      } else {
        hp = Math.max(1, hp - 6);
        talkText = "«Ещё раз — в воду.» Нож по ладони. −6 HP.";
        audio.hurt();
      }
      emit(true);
      return;
    }
    if (n.id === "halric" && has("codex") && (key === "CODEX" || key === "OATH")) {
      flags.add("returned");
      audio.end();
      mode = "win";
      talkNpc = null;
      emit(true);
      return;
    }
    const ans = n.words[key];
    talkText = ans ? (ans.startsWith("«") ? ans : `«${ans}»`) : "Молчит. Такого не спрашивают.";
    if (ans) audio.talk();
    emit(true);
  }

  function armor() {
    return baseArmor + mods.armor + siteArmor + (worn.arm === "shellmail" ? 5 : worn.arm === "chain" ? 3 : worn.arm === "leather" ? 1 : 0);
  }
  function meleeDmg() {
    let d = 3 + Math.floor(str / 3) + (worn.wep === "harpoon" ? 7 : worn.wep === "steel" ? 5 : worn.wep === "sword" ? 3 : heroId === "vessa" ? 1 : 2);
    if (markT > 0) {
      d *= 2;
      markT = 0;
    }
    if (Math.random() < mods.crit) d *= 2;
    return d + keepDmg + ((Math.random() * 4) | 0);
  }

  function offerTalents() {
    const pool = (Object.keys(TALENTS) as TalentId[]).filter((id) => TALENTS[id].hero === heroId && !owned.has(id));
    for (let i = pool.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      const t = pool[i];
      pool[i] = pool[j];
      pool[j] = t;
    }
    pending = pool.slice(0, 3);
    if (pending.length) {
      mode = "talent";
      emit(true);
    }
  }

  function spawnLoot(x: number, y: number, amount: number, m: MapId = map) {
    if (amount <= 0) return;
    let left = amount;
    while (left > 0) {
      const n = Math.min(left, left > 8 ? 3 : 1);
      left -= n;
      const a = Math.random() * Math.PI * 2;
      const s = 40 + Math.random() * 90;
      coins.push({
        map: m,
        x,
        y,
        z: 12 + Math.random() * 18,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s * 0.7,
        vz: 90 + Math.random() * 70,
        n,
        wait: 0.28 + Math.random() * 0.25,
        spin: Math.random() * 4,
      });
    }
  }

  function takeCoin(c: Coin) {
    gold += c.n;
    goldFlash = 1;
    float(c.x, c.y - 10, `+${c.n}`, "#d8c070");
    audio.pickup();
  }

  function checkLevel() {
    while (xp >= level * 36) {
      level += 1;
      maxHp += 4;
      hp = maxHp;
      maxMp += 2;
      mp = maxMp;
      str += 1;
      say(`Уровень ${level}. Выбери талант.`);
      burst(px, py, "#e8d48a", 22);
      float(px, py - 24, `Ур. ${level}`, "#e8d48a");
      audio.ok();
      offerTalents();
    }
  }

  function killMob(m: Mob) {
    const g = Math.round(MOB[m.kind].gold * mods.luck);
    const x = MOB[m.kind].xp;
    xp += x;
    m.hp = 0;
    say(`${MOB[m.kind].name}. +${x} опыта.`);
    burst(m.x, m.y, "#c17a6a", 16);
    spawnLoot(m.x, m.y, g);
    const drop = DROP[m.kind];
    if (drop && Math.random() < 0.55) {
      give(drop);
      float(m.x, m.y - 16, ITEM[drop].name, "#c8d0c4");
    }
    if (mods.siphon) mp = Math.min(maxMp, mp + mods.siphon);
    checkLevel();
    audio.ok();
  }

  function hurtMob(m: Mob, dmg: number, kb = 0, ang = 0) {
    if (m.hp <= 0) return;
    m.hp -= dmg;
    m.flash = 0.12;
    float(m.x, m.y - 12, `-${dmg}`, "#e8e4d8");
    if (kb) {
      const nx = m.x + Math.cos(ang) * kb;
      const ny = m.y + Math.sin(ang) * kb;
      if (!solidAt(nx, ny)) {
        m.x = nx;
        m.y = ny;
      }
    }
    burst(m.x, m.y, "#e8dcc8", 5);
    if (mods.lifesteal) hp = Math.min(maxHp, hp + mods.lifesteal);
    if (m.hp <= 0) killMob(m);
    else audio.hit();
  }

  function hurtPlayer(d: number) {
    if (iframe > 0) return;
    if (shieldT > 0) d = Math.max(1, Math.floor(d * 0.35));
    d = Math.max(1, d - armor());
    hp -= d;
    iframe = 0.45;
    shake = 0.2;
    float(px, py - 18, `-${d}`, "#c17a6a");
    audio.hurt();
    if (hp <= 0) {
      hp = 0;
      say("Бруна вытащила тебя. Золото наполовину.");
      gold = Math.floor(gold / 2);
      hp = Math.max(6, Math.floor(maxHp / 2));
      map = "inn";
      px = SPAWN.inn.c * TILE + 16;
      py = SPAWN.inn.r * TILE + 16;
      cam.x = px;
      cam.y = py;
    }
  }

  function fireShot(opts: Partial<Shot> & { x: number; y: number; vx: number; vy: number; dmg: number; color: string }) {
    shots.push({
      z: 16,
      vz: -36,
      grav: 0,
      life: 0.9,
      r: 5,
      pierce: 0,
      slow: 0,
      stun: 0,
      poison: 0,
      stuck: 0,
      kind: "magic",
      hit: 0,
      ...opts,
    });
  }

  function slashAt(x: number, y: number, ang: number, r: number, dmg: number, color: string, whirl = false) {
    slashes.push({ x, y, ang, t: 0.18, r, color });
    lunge = 0.12;
    shake = 0.1;
    audio.hit();
    for (const m of mobs) {
      if (m.map !== map || m.hp <= 0) continue;
      const dx = m.x - x;
      const dy = m.y - y;
      const dist = Math.hypot(dx, dy);
      if (dist > r + 12) continue;
      if (!whirl) {
        const dot = (dx * Math.cos(ang) + dy * Math.sin(ang)) / (dist || 1);
        if (dot < 0.15) continue;
      }
      hurtMob(m, dmg, 22, ang);
      if (mods.stun) m.stun = Math.max(m.stun, 0.35 + mods.stun);
    }
  }

  function aim() {
    return hasAim ? aimAng : angOf(dir);
  }

  function attack() {
    if (mode !== "play" || meleeCd > 0) return;
    if (hasAim) faceWorld(aimX, aimY);
    meleeCd = heroId === "vessa" ? 0.42 : heroId === "kael" ? 0.32 : 0.38;
    const ang = aim();
    const r = (worn.wep === "harpoon" ? 62 : heroId === "aldric" ? 46 : 34) * mods.slash;
    slashAt(px, py, ang, r, meleeDmg(), heroId === "aldric" ? "#e8e4d8" : "#c8d0c4", !!mods.whirl);
  }

  function cast(slot: number) {
    if (mode !== "play") return;
    const id = HEROES[heroId].spells[slot];
    if (!id) return;
    activeSlot = slot;
    if (hasAim) faceWorld(aimX, aimY);
    const def = SPELLS[id];
    const cost = Math.max(1, def.cost + (id === "bolt" ? mods.boltCost : 0));
    if ((cds[id] ?? 0) > 0) return;
    if (mp < cost) {
      say("Мало маны.");
      emit(true);
      return;
    }
    mp -= cost;
    cds[id] = def.cd;
    const ang = aim();
    const fx = Math.cos(ang);
    const fy = Math.sin(ang);
    audio.spell();
    if (id === "bolt" || id === "shot" || id === "frost" || id === "smite") {
      const spd = id === "shot" ? 390 : id === "smite" ? 300 : id === "frost" ? 240 : 280;
      const dmg =
        id === "smite"
          ? 8 + mods.holy + Math.floor(str / 2)
          : id === "frost"
            ? 7 + Math.floor(maxMp / 6)
            : 6 + Math.floor(maxMp / 5) + (heroId === "kael" ? 3 : 0);
      const col = id === "frost" ? "#9ec4e8" : id === "smite" ? "#e8d48a" : id === "shot" ? "#c4b48a" : "#e07a4a";
      const arrow = id === "shot";
      const dist = hasAim ? Math.hypot(aimX - px, aimY - py) : 140;
      const loft = arrow ? Math.min(90, 18 + dist * 0.12) : 0;
      const shoot = (a: number) =>
        fireShot({
          x: px + Math.cos(a) * 18,
          y: py + Math.sin(a) * 18,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          vz: arrow ? -loft : 0,
          z: arrow ? 14 : 10,
          grav: arrow ? 420 : 0,
          dmg,
          color: col,
          pierce: id === "bolt" ? mods.pierce : 0,
          slow: id === "frost" ? mods.freeze : 0,
          stun: id === "smite" ? 0.3 + mods.stun : 0,
          poison: id === "shot" ? mods.poison : 0,
          r: id === "smite" ? 7 : arrow ? 3 : 5,
          life: id === "smite" ? 0.5 : arrow ? 1.4 : 0.95,
          kind: arrow ? "arrow" : "magic",
        });
      shoot(ang);
      if (id === "shot" && Math.random() < mods.twin) shoot(ang + 0.18);
    } else if (id === "nova") {
      const rad = 78 * mods.nova;
      slashes.push({ x: px, y: py, ang: 0, t: 0.28, r: rad, color: "#e07a4a" });
      shake = 0.18;
      for (const m of mobs) {
        if (m.map !== map || m.hp <= 0) continue;
        if (Math.hypot(m.x - px, m.y - py) < rad) hurtMob(m, 10 + Math.floor(maxMp / 4), 28, Math.atan2(m.y - py, m.x - px));
      }
      burst(px, py, "#e07a4a", 18);
    } else if (id === "cleave") {
      slashAt(px, py, ang, 58 * mods.slash, meleeDmg() + 4, "#e8e4d8", true);
    } else if (id === "guard") {
      shieldT = 2.4;
      say("Страж.");
    } else if (id === "dash") {
      const dist = 70 * mods.dash;
      iframe = 0.28;
      for (let i = 0; i < 8; i++) {
        const nx = px + fx * (dist / 8);
        const ny = py + fy * (dist / 8);
        if (!tryPos(nx, ny)) break;
        px = nx;
        py = ny;
      }
      slashAt(px, py, ang, 36, meleeDmg(), "#c8d0c4");
    } else if (id === "mark") {
      markT = 6;
      say("Метка на клинке.");
    }
    emit(true);
  }

  function doSearch() {
    const t = tileAt(map, tileC(), tileR());
    if (t === "H" || npcNear(70)?.id === "mira") {
      if (!has("mark")) {
        give("mark");
        say("Алтарь жжёт ладонь. Знак твой.");
        burst(px, py, "#9ab0d0", 16);
        audio.ok();
      } else say("Алтарь уже знает тебя.");
    } else if (t === "f" && Math.random() < 0.55) {
      food += 4;
      say("Коренья. +4 еды.");
    } else say("Пусто.");
    emit(true);
  }

  function doGet() {
    const id = `${map}:${tileC()},${tileR()}`;
    const node = gatherNodeAt(map, tileC(), tileR());
    if (node && !opened.has(`node:${node.id}`)) {
      opened.add(`node:${node.id}`);
      for (let i = 0; i < node.amount; i++) give(node.item);
      say(`${node.label}. +${node.amount} · ${ITEM[node.item].name}.`);
      burst(node.c * TILE + 16, node.r * TILE + 16, "#d8d0a8", 12);
    } else if (map === "hall" && tileC() === 10 && tileR() === 3 && !opened.has(id)) {
      opened.add(id);
      spawnLoot(px, py, 30);
      give("potion");
      say("Сундук зала. Золото на камне.");
    } else if (map === "inn" && tileC() === 3 && tileR() === 4 && !opened.has(id)) {
      opened.add(id);
      give("food");
      say("Запасы Бруны. +еда.");
    } else if (map === "dungeon" && tileC() === 3 && tileR() === 3 && !opened.has(id)) {
      opened.add(id);
      give("potion");
      spawnLoot(px, py, 18);
      say("Сундук: зелье. Золото сыпется.");
    } else if (map === "over" && Math.abs(tileC() - DOCK.c) + Math.abs(tileR() - DOCK.r) <= 1 && !opened.has("dock-sash")) {
      opened.add("dock-sash");
      give("sash");
      say("С бочки у борта — мокрый кушак. Рин это увидит.");
    } else if (map === "isle" && tileC() === 28 && tileR() === 6 && !opened.has("isle-chest")) {
      opened.add("isle-chest");
      spawnLoot(px, py, 40);
      give("tide");
      give("cloth");
      say("Приливный камень. Соль жжёт ладонь. Вторая клятва.");
    } else if (map === "crypt" && tileC() === 8 && tileR() === 2) {
      const guard = mobs.find((m) => m.kind === "wraith" && m.hp > 0);
      if (guard) say("Призрак не отдаст книгу.");
      else if (!has("key") && !has("mark")) say("Плита заперта. Нужен ключ или знак.");
      else if (!has("codex")) {
        give("codex");
        say("Кодекс клятвы. Неси Халрику.");
        burst(px, py, "#d8c070", 20);
      } else say("Пусто.");
    } else return false;
    emit(true);
    return true;
  }

  function interact() {
    if (mode !== "play") return;
    const n = npcNear();
    if (n) {
      startTalk(n);
      return;
    }
    const plot = siteAt(map, tileC(), tileR());
    if (plot) {
      const pick = raised.get(plot.id);
      if (!pick) {
        mode = "site";
        emit(true);
        return;
      }
      const opt = plot.options.find((o) => o.id === pick);
      if (opt?.rest) {
        rest();
        return;
      }
      if (opt?.craft) {
        mode = "build";
        emit(true);
        return;
      }
      say(`${opt?.name ?? plot.name}. ${opt?.bonus ?? ""}`);
      emit(true);
      return;
    }
    if (doGet()) return;
    if (map === "keep") {
      for (const b of BUILDINGS) {
        if (!built.has(b.id)) continue;
        const d = Math.hypot(b.c * TILE + 16 - px, b.r * TILE + 16 - py);
        if (d < 40) {
          if (b.id === "hearth") {
            rest();
            return;
          }
          say(`${b.name}. ${b.bonus}.`);
          emit(true);
          return;
        }
      }
      mode = "build";
      emit(true);
      return;
    }
    for (const w of WAYPOINTS) {
      if (w.map !== map) continue;
      const d = Math.hypot(w.c * TILE + 16 - px, w.r * TILE + 16 - py);
      if (d < 42) {
        stones.add(w.id);
        say(`Камень пути: ${w.name}. Открыт.`);
        audio.ok();
        emit(true);
        return;
      }
    }
    const t = tileAt(map, tileC(), tileR());
    if (t === "H") {
      doSearch();
      return;
    }
    if (map === "over") {
      const gid = `g:${tileC()},${tileR()}`;
      if (!opened.has(gid)) {
        if (t === "f") {
          opened.add(gid);
          give("wood");
          say("Хворост. На факел в кузнице или избе.");
          emit(true);
          return;
        }
        if (t === "s") {
          opened.add(gid);
          give("herb");
          say("Болотная трава. На зелье.");
          emit(true);
          return;
        }
      }
    }
    if (t === "f") {
      doSearch();
      return;
    }
    say("Нечего.");
    emit(true);
  }

  function drinkPotion() {
    if (!has("potion")) {
      say("Нет зелья.");
      emit(true);
      return;
    }
    items.splice(items.indexOf("potion"), 1);
    hp = Math.min(maxHp, hp + 14);
    say("Зелье. +14 HP.");
    audio.ok();
    emit(true);
  }

  function recalcKeep() {
    keepDmg = built.has("forge") ? 3 : 0;
    keepRegen = built.has("tower") ? 2.2 : 0.6;
    mods.luck = (owned.has("luck") ? 1.6 : 1) * (built.has("vault") ? 1.15 : 1);
  }

  function warp(to: MapId, c: number, r: number, msg?: string) {
    map = to;
    px = c * TILE + 16;
    py = r * TILE + 16;
    cam.x = px;
    cam.y = py;
    exitLock = 0.7;
    portalLock = 0.8;
    moveTo = null;
    huntId = 0;
    talkGo = null;
    interactGo = null;
    if (to === "keep") {
      flags.add("keep");
      stones.add("keep");
      if (built.has("vault") && !vaultVisit) {
        vaultVisit = true;
        spawnLoot(px, py, 12, "keep");
        say("Склеп. Дань на полу.");
      }
    } else vaultVisit = false;
    if (msg) say(msg);
    else say(PLACE[to]);
    emit(true);
  }

  function goCastle() {
    if (mode !== "play" && mode !== "way" && mode !== "build") return;
    mode = "play";
    if (map === "keep") {
      say("Ты уже во дворе.");
      emit(true);
      return;
    }
    if (!flags.has("keep")) {
      say("Сначала войди в руину Двора к югу от дороги.");
      emit(true);
      return;
    }
    townPortal();
  }

  function townPortal() {
    if (mode !== "play" && mode !== "way") return;
    mode = "play";
    if (!flags.has("keep")) {
      say("Врата не знают твоего дома. Найди руину Двора на юге.");
      emit(true);
      return;
    }
    if (map === "keep") {
      if (!fieldPortal) {
        say("Нет обратного портала. Выйди в ворота или открой камень пути.");
        emit(true);
        return;
      }
      warp(fieldPortal.map, Math.floor(fieldPortal.x / TILE), Math.floor(fieldPortal.y / TILE), "Обратные врата.");
      burst(px, py, "#9ec4e8", 14);
      audio.spell();
      return;
    }
    if (!built.has("gate")) {
      if (mp < 6) {
        say("Мало маны на врата. Построй Врата во дворе — будут бесплатны.");
        emit(true);
        return;
      }
      mp -= 6;
    }
    fieldPortal = { map, x: px, y: py };
    audio.spell();
    burst(px, py, "#9ec4e8", 16);
    warp("keep", SPAWN.keep.c, SPAWN.keep.r, "Синие врата. Обратно — круг во дворе или кнопка «Обратно».");
  }

  function travel(id: WpId) {
    const w = WAYPOINTS.find((x) => x.id === id);
    if (!w || !stones.has(id)) {
      say("Камень молчит. Дойди до места сам.");
      emit(true);
      return;
    }
    mode = "play";
    warp(w.map, w.c, w.r, `Камень пути: ${w.name}.`);
    burst(px, py, "#c8d0c4", 10);
    audio.ok();
  }

  function doBuild(id: BuildId) {
    if (map !== "keep") {
      say("Строить можно только во дворе.");
      emit(true);
      return;
    }
    const b = BUILDINGS.find((x) => x.id === id);
    if (!b || built.has(id)) return;
    if (gold < b.cost) {
      say("Мало золота.");
      emit(true);
      return;
    }
    gold -= b.cost;
    built.add(id);
    if (id === "barracks") {
      maxHp += 8;
      hp += 8;
    }
    if (id === "tower") {
      maxMp += 6;
      mp += 6;
    }
    recalcKeep();
    say(`${b.name} стоит. ${b.bonus}.`);
    audio.ok();
    burst(b.c * TILE + 16, b.r * TILE + 16, id === "hearth" ? "#e07a4a" : "#d8c070", id === "hearth" ? 28 : 14);
    emit(true);
  }

  function raiseSite(siteId: SiteId, optId: string) {
    const s = SITES.find((x) => x.id === siteId);
    const opt = s?.options.find((o) => o.id === optId);
    if (!s || !opt || raised.has(siteId)) return;
    if (map !== s.map) {
      say("Дойди до отмеченного участка.");
      emit(true);
      return;
    }
    if (Math.abs(tileC() - s.c) + Math.abs(tileR() - s.r) > 3) {
      say("Дойди до участка.");
      emit(true);
      return;
    }
    if (gold < opt.cost) {
      say("Мало золота.");
      emit(true);
      return;
    }
    gold -= opt.cost;
    raised.set(siteId, optId);
    if (opt.armor) siteArmor += opt.armor;
    if (opt.hp) {
      maxHp += opt.hp;
      hp += opt.hp;
    }
    if (opt.mp) {
      maxMp += opt.mp;
      mp += opt.mp;
    }
    if (opt.food) food += opt.food;
    if (opt.gold) gold += opt.gold;
    if (opt.wood) for (let i = 0; i < opt.wood; i++) give("wood");
    if (opt.cloth) for (let i = 0; i < opt.cloth; i++) give("cloth");
    if (opt.potion) give("potion");
    if (opt.waypoint) stones.add(opt.waypoint);
    say(`${opt.name} стоит. ${opt.bonus}.`);
    audio.ok();
    burst(s.c * TILE + 16, s.r * TILE + 16, "#d8c070", 18);
    mode = opt.craft ? "build" : "play";
    emit(true);
  }

  function rest() {
    const plot = siteAt(map, tileC(), tileR());
    const pick = plot ? raised.get(plot.id) : undefined;
    const opt = plot?.options.find((o) => o.id === pick);
    const atHearth = map === "keep" && built.has("hearth");
    if (!atHearth && !opt?.rest) {
      say("Нужен очаг во дворе или изба с кроватью на участке.");
      emit(true);
      return;
    }
    hp = maxHp;
    mp = maxMp;
    food = Math.max(food, 32);
    say(atHearth ? "Очаг. Силы вернулись." : `${opt?.name}. Силы вернулись.`);
    audio.ok();
    emit(true);
  }

  function checkPortals() {
    if (portalLock > 0) return;
    if (fieldPortal && map === "keep") {
      const d = Math.hypot(10 * TILE + 16 - px, 8 * TILE + 16 - py);
      if (d < 22) {
        warp(fieldPortal.map, Math.floor(fieldPortal.x / TILE), Math.floor(fieldPortal.y / TILE), "Обратные врата.");
        return;
      }
    }
    if (fieldPortal && map === fieldPortal.map) {
      const d = Math.hypot(fieldPortal.x - px, fieldPortal.y - py);
      if (d < 20) {
        warp("keep", SPAWN.keep.c, SPAWN.keep.r, "Врата во двор.");
      }
    }
  }

  function checkExits() {
    if (exitLock > 0) return;
    const c = tileC();
    const r = tileR();
    const ex = EXITS[map].find((e) => e.c === c && e.r === r);
    if (!ex) return;
    if (ex.to === "crypt" && !has("key") && !has("mark")) {
      say("Дверь крипты. Ключ или знак.");
      py += 28;
      exitLock = 0.5;
      emit(true);
      return;
    }
    map = ex.to;
    px = ex.tc * TILE + 16;
    py = ex.tr * TILE + 16;
    cam.x = px;
    cam.y = py;
    exitLock = 0.6;
    say(PLACE[map]);
    if (map === "keep") {
      flags.add("keep");
      stones.add("keep");
    }
    if ((map === "dungeon" || map === "crypt") && !has("torch")) say("Темно. Факел был бы умнее.");
    emit(true);
  }

  function sim(dt: number) {
    if (mode !== "play") {
      vx = 0;
      vy = 0;
      return;
    }
    time += dt;
    shake = Math.max(0, shake - dt);
    exitLock = Math.max(0, exitLock - dt);
    portalLock = Math.max(0, portalLock - dt);
    meleeCd = Math.max(0, meleeCd - dt);
    lunge = Math.max(0, lunge - dt);
    shieldT = Math.max(0, shieldT - dt);
    markT = Math.max(0, markT - dt);
    iframe = Math.max(0, iframe - dt);
    goldFlash = Math.max(0, goldFlash - dt * 1.8);
    if (map === "keep" && built.has("hearth")) {
      audio.setAmbience("fire");
      if (Math.random() < dt * 2.2) audio.crackle();
    } else if (map === "ship" || map === "isle" || tileAt(map, tileC(), tileR()) === "~" || tileAt(map, tileC(), tileR()) === ",") {
      audio.setAmbience("sea");
    } else audio.setAmbience("none");
    for (const k of Object.keys(cds)) cds[k] = Math.max(0, cds[k] - dt);

    let mx = 0;
    let my = 0;
    if (down("KeyW") || down("ArrowUp")) my -= 1;
    if (down("KeyS") || down("ArrowDown")) my += 1;
    if (down("KeyA") || down("ArrowLeft")) mx -= 1;
    if (down("KeyD") || down("ArrowRight")) mx += 1;
    mx += stickX;
    my += stickY;
    if (moveTo) {
      const dxm = moveTo.x - px;
      const dym = moveTo.y - py;
      const dm = Math.hypot(dxm, dym);
      if (dm < 10) moveTo = null;
      else {
        mx += dxm / dm;
        my += dym / dm;
      }
    }
    const pads = navigator.getGamepads?.() ?? [];
    for (const pad of pads) {
      if (!pad) continue;
      const ls = radial(pad.axes[0] || 0, pad.axes[1] || 0);
      mx += ls.x;
      my += ls.y;
    }
    const mag = Math.hypot(mx, my);
    if (mag > 1) {
      mx /= mag;
      my /= mag;
    }
    if (Math.abs(mx) > 0.2 || Math.abs(my) > 0.2) {
      if (Math.abs(mx) > Math.abs(my)) dir = mx < 0 ? 1 : 2;
      else dir = my < 0 ? 3 : 0;
    }
    const slow = tileAt(map, tileC(), tileR());
    const spd = ((slow === "f" || slow === "s" ? 0.72 : 1) * (baseSpd + mods.spd));
    vx = mx * spd;
    vy = my * spd;
    const [lx, ly] = [Math.cos(aim()), Math.sin(aim())];
    const nx = px + vx * dt + (lunge > 0 ? lx * 90 * dt : 0);
    const ny = py + vy * dt + (lunge > 0 ? ly * 90 * dt : 0);
    if (tryPos(nx, py)) px = nx;
    if (tryPos(px, ny)) py = ny;
    const size = MAP_SIZE[map];
    px = Math.max(20, Math.min(size.cols * TILE - 20, px));
    py = Math.max(20, Math.min(size.rows * TILE - 20, py));

    if (talkGo) {
      const d = Math.hypot(talkGo.c * TILE + 16 - px, talkGo.r * TILE + 16 - py);
      if (d < 38) {
        const n = talkGo;
        talkGo = null;
        moveTo = null;
        startTalk(n);
      } else moveTo = { x: talkGo.c * TILE + 16, y: talkGo.r * TILE + 16 };
    }
    if (interactGo) {
      const d = Math.hypot(interactGo.c * TILE + 16 - px, interactGo.r * TILE + 16 - py);
      if (d < 34) {
        interactGo = null;
        moveTo = null;
        interact();
      } else moveTo = { x: interactGo.c * TILE + 16, y: interactGo.r * TILE + 16 };
    }
    if (huntId) {
      const prey = mobs.find((m) => m.id === huntId && m.hp > 0 && m.map === map);
      if (!prey) huntId = 0;
      else {
        moveTo = { x: prey.x, y: prey.y };
        const d = Math.hypot(prey.x - px, prey.y - py);
        if (d < 42) {
          faceWorld(prey.x, prey.y);
          attack();
        }
      }
    }
    if (holdRmb && mode === "play") {
      if (activeSlot < 0) attack();
      else cast(activeSlot);
    }

    if (mag > 0.2) {
      footT += dt;
      food -= dt * 0.28;
      if (footT > 0.28) {
        footT = 0;
        audio.step();
      }
      if (Math.random() < dt * 0.2) mp = Math.min(maxMp, mp + 1);
    }
    mp = Math.min(maxMp, mp + dt * keepRegen * 0.35);
    if (food <= 0) {
      food = 0;
      hp -= dt * 2;
      if (hp <= 0) {
        hp = 0;
        mode = "dead";
        emit(true);
        return;
      }
    }
    if (hurtTile(map, tileC(), tileR())) {
      lavaT += dt;
      if (lavaT > 0.4) {
        lavaT = 0;
        hurtPlayer(3);
      }
    } else lavaT = 0;

    const n = npcNear(42);
    const node = gatherNodeAt(map, tileC(), tileR(), 2);
    const gather = node && !opened.has(`node:${node.id}`) ? node : null;
    const plot = siteAt(map, tileC(), tileR());
    hint = n
      ? `E — ${n.name}`
      : gather
        ? `E / ЛКМ — ${gather.label}`
        : plot
        ? raised.has(plot.id)
          ? `E — ${plot.name}: ${raised.get(plot.id)}`
          : `E — участок: ${plot.name}. Выбери постройку`
        : map === "keep"
          ? "E / ЛКМ — строить · кузница шьёт плащи"
          : map === "ship"
            ? "Рин на палубе. Кушак на тебе — и ур. 3"
            : map === "over" && Math.hypot(DOCK.c * TILE - px, DOCK.r * TILE - py) < 70
              ? "E — бочка с кушаком · на борт Соляного киля"
              : map === "over"
                ? "M — карта мира · E в лесу — дерево, в топи — трава"
                : map === "isle"
                  ? "ЛКМ — подсвеченные ресурсы и стройки · ПКМ — активка"
                  : "ЛКМ — идти и бить · ПКМ — активка · WASD";
    for (const w of WAYPOINTS) {
      if (w.map !== map || stones.has(w.id)) continue;
      if (Math.hypot(w.c * TILE + 16 - px, w.r * TILE + 16 - py) < 48) {
        stones.add(w.id);
        say(`Камень пути: ${w.name}.`);
        burst(w.c * TILE + 16, w.r * TILE + 16, "#c8d0c4", 14);
        audio.ok();
      }
    }

    for (const m of mobs) {
      if (m.map !== map || m.hp <= 0) continue;
      m.flash = Math.max(0, m.flash - dt);
      m.stun = Math.max(0, m.stun - dt);
      m.slow = Math.max(0, m.slow - dt);
      m.atkCd = Math.max(0, m.atkCd - dt);
      if (m.poison > 0) {
        m.poison -= dt;
        if (((time * 4) | 0) !== (((time - dt) * 4) | 0)) {
          m.hp -= 2;
          float(m.x, m.y, "-2", "#6a8f7a");
          if (m.hp <= 0) killMob(m);
        }
      }
      if (m.stun > 0) continue;
      const dx = px - m.x;
      const dy = py - m.y;
      const dist = Math.hypot(dx, dy);
      const aggro = m.kind === "wraith" ? 200 : 150;
      if (dist < aggro && dist > 18) {
        const sp = (m.kind === "wolf" ? 70 : m.kind === "orc" ? 52 : 46) * (m.slow > 0 ? 0.4 : 1);
        const mx2 = m.x + (dx / dist) * sp * dt;
        const my2 = m.y + (dy / dist) * sp * dt;
        if (!solidAt(mx2, m.y)) m.x = mx2;
        if (!solidAt(m.x, my2)) m.y = my2;
      } else {
        m.wait -= dt;
        if (m.wait <= 0) {
          m.wait = 0.6 + Math.random();
          const ox = m.x + ((Math.random() * 3 | 0) - 1) * 16;
          const oy = m.y + ((Math.random() * 3 | 0) - 1) * 16;
          if (!solidAt(ox, oy)) {
            m.x = ox;
            m.y = oy;
          }
        }
      }
      if (dist < 22 && m.atkCd <= 0) {
        m.atkCd = m.kind === "wraith" ? 1.1 : 0.85;
        hurtPlayer(MOB[m.kind].atk);
      }
    }

    if (lyra && lyraHp > 0) {
      lyraAtk -= dt;
      if (lyraAtk <= 0) {
        lyraAtk = 0.9;
        let best: Mob | null = null;
        let bd = 56;
        for (const m of mobs) {
          if (m.map !== map || m.hp <= 0) continue;
          const d = Math.hypot(m.x - px, m.y - py);
          if (d < bd) {
            bd = d;
            best = m;
          }
        }
        if (best) {
          const d = 4 + ((Math.random() * 4) | 0);
          hurtMob(best, d + (built.has("barracks") ? 3 : 0), 10, Math.atan2(best.y - py, best.x - px));
        }
      }
    }

    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i];
      if (s.stuck > 0) {
        s.stuck -= dt;
        if (s.stuck <= 0) shots.splice(i, 1);
        continue;
      }
      s.life -= dt;
      s.vz += s.grav * dt;
      s.z -= s.vz * dt;
      const drag = s.kind === "arrow" ? 0.55 : 0.12;
      s.vx *= Math.max(0, 1 - drag * dt);
      s.vy *= Math.max(0, 1 - drag * dt);
      const sp = Math.hypot(s.vx, s.vy);
      const steps = Math.max(1, Math.ceil((sp * dt) / 5));
      const sx = (s.vx * dt) / steps;
      const sy = (s.vy * dt) / steps;
      let dead = s.life <= 0;
      for (let k = 0; k < steps && !dead; k++) {
        s.x += sx;
        s.y += sy;
        if (solidAt(s.x, s.y)) {
          burst(s.x, s.y, s.color, s.kind === "arrow" ? 6 : 10);
          if (s.kind === "arrow") {
            s.vx = 0;
            s.vy = 0;
            s.vz = 0;
            s.stuck = 1.6;
          } else dead = true;
          break;
        }
        if (s.z <= 0) {
          s.z = 0;
          s.vx *= 0.2;
          s.vy *= 0.2;
          s.vz = 0;
          s.stuck = 1.1;
          burst(s.x, s.y, "#8a7a5a", 4);
          break;
        }
        if (s.z > 22) continue;
        for (const m of mobs) {
          if (m.map !== map || m.hp <= 0 || m.id === s.hit) continue;
          if (Math.hypot(m.x - s.x, m.y - s.y) < 15 + s.r) {
            hurtMob(m, s.dmg, 18 + sp * 0.02, Math.atan2(s.vy, s.vx));
            if (s.slow) m.slow = Math.max(m.slow, s.slow);
            if (s.stun) m.stun = Math.max(m.stun, s.stun);
            if (s.poison) m.poison = Math.max(m.poison, 3);
            s.hit = m.id;
            burst(s.x, s.y, s.color, 5);
            if (s.pierce > 0) {
              s.pierce -= 1;
              s.vx *= 0.85;
              s.vy *= 0.85;
            } else if (s.kind === "arrow") {
              s.vx = 0;
              s.vy = 0;
              s.vz = 0;
              s.stuck = 0.7;
            } else dead = true;
            break;
          }
        }
      }
      if (!s.stuck && s.kind === "arrow" && Math.random() < dt * 18) {
        sparks.push({ x: s.x, y: s.y - s.z, vx: -s.vx * 0.1, vy: 8, life: 0.2, color: "#c4b48a", size: 1.4 });
      }
      if (dead && s.stuck <= 0) shots.splice(i, 1);
    }

    for (let i = slashes.length - 1; i >= 0; i--) {
      slashes[i].t -= dt;
      if (slashes[i].t <= 0) slashes.splice(i, 1);
    }
    if (Math.random() < dt * 5) {
      sparks.push({
        x: px + (Math.random() - 0.5) * 200,
        y: py + (Math.random() - 0.5) * 140,
        vx: 0,
        vy: -10,
        life: 0.7,
        color: map === "dungeon" || map === "crypt" ? "#6a5a40" : "#d8d0c0",
        size: 1.4,
      });
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.life -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.life <= 0) sparks.splice(i, 1);
    }
    for (let i = coins.length - 1; i >= 0; i--) {
      const c = coins[i];
      if (c.map !== map) continue;
      c.spin += dt * 8;
      c.wait -= dt;
      c.vz -= 520 * dt;
      c.z += c.vz * dt;
      if (c.z < 0) {
        c.z = 0;
        c.vz *= -0.38;
        c.vx *= 0.55;
        c.vy *= 0.55;
      }
      if (c.wait > 0) {
        c.x += c.vx * dt;
        c.y += c.vy * dt;
      } else {
        const dx = px - c.x;
        const dy = py - c.y;
        const d = Math.hypot(dx, dy) || 1;
        c.vx += (dx / d) * 520 * dt;
        c.vy += (dy / d) * 520 * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        if (d < 18) {
          takeCoin(c);
          coins.splice(i, 1);
        }
      }
    }
    if (map === "keep" && built.has("hearth") && Math.random() < dt * 18) {
      const b = BUILDINGS.find((x) => x.id === "hearth")!;
      sparks.push({
        x: b.c * TILE + 16 + (Math.random() - 0.5) * 10,
        y: b.r * TILE + 8,
        vx: (Math.random() - 0.5) * 18,
        vy: -40 - Math.random() * 50,
        life: 0.35 + Math.random() * 0.3,
        color: Math.random() > 0.5 ? "#e07a4a" : "#e8c070",
        size: 2 + Math.random() * 2,
      });
    }
    if (map === "keep" && built.has("forge") && Math.random() < dt * 10) {
      const b = BUILDINGS.find((x) => x.id === "forge")!;
      sparks.push({
        x: b.c * TILE + 16,
        y: b.r * TILE + 6,
        vx: (Math.random() - 0.5) * 40,
        vy: -60 - Math.random() * 40,
        life: 0.4,
        color: "#e8d48a",
        size: 1.6,
      });
    }
    if (map === "keep" && built.has("tower") && Math.random() < dt * 8) {
      const b = BUILDINGS.find((x) => x.id === "tower")!;
      sparks.push({
        x: b.c * TILE + 16 + (Math.random() - 0.5) * 14,
        y: b.r * TILE,
        vx: (Math.random() - 0.5) * 12,
        vy: -20,
        life: 0.8,
        color: "#9ec4e8",
        size: 2,
      });
    }
    for (let i = floaters.length - 1; i >= 0; i--) {
      floaters[i].life -= dt;
      floaters[i].y -= 24 * dt;
      if (floaters[i].life <= 0) floaters.splice(i, 1);
    }

    checkExits();
    checkPortals();
    const k = 1 - Math.exp(-5 * dt);
    cam.x += (px - cam.x) * k;
    cam.y += (py - cam.y) * k;
  }

  function cellImg(ch: string, m: MapId) {
    if ((m === "dungeon" || m === "crypt") && ch === "W") return imgs["t-dwall"];
    return imgs[TILE_FILE[ch] ?? "t-grass"];
  }

  function blit(
    img: HTMLImageElement | undefined,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
    sx = 0,
    sy = 0,
    sw?: number,
    sh?: number,
  ) {
    if (!img) {
      ctx.fillStyle = "#3d5c4a";
      ctx.fillRect(dx, dy, dw, dh);
      return;
    }
    ctx.drawImage(img, sx, sy, sw ?? img.width, sh ?? img.height, dx, dy, dw, dh);
  }

  function sheet(img: HTMLImageElement | undefined, index: number, dx: number, dy: number, s = 36) {
    if (!img) return;
    const col = index % 2;
    const row = Math.floor(index / 2);
    blit(img, dx, dy, s, s, col * (img.width / 2), row * (img.height / 2), img.width / 2, img.height / 2);
  }

  function sheetGrid(img: HTMLImageElement | undefined, index: number, cols: number, rows: number, dx: number, dy: number, s: number) {
    if (!img) return;
    const col = index % cols;
    const row = Math.floor(index / cols);
    blit(img, dx, dy, s, s, col * (img.width / cols), row * (img.height / rows), img.width / cols, img.height / rows);
  }

  function drawPortal(x: number, y: number) {
    const p = wrld(x, y);
    const pulse = 0.45 + Math.sin(time * 7) * 0.2;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = "#9ec4e8";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 16, 9, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = pulse * 0.35;
    ctx.fillStyle = "#9ec4e8";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawInteractionPulse(x: number, y: number, label?: string, strong = false) {
    const p = wrld(x, y);
    const pulse = 0.55 + Math.sin(time * 5.5) * 0.2;
    const near = Math.hypot(x - px, y - py) < 132;
    ctx.save();
    ctx.globalAlpha = pulse * (strong ? 0.95 : 0.72);
    ctx.strokeStyle = strong ? "#f0d58a" : "#b9d8ca";
    ctx.lineWidth = strong ? 3 : 2;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 7, strong ? 20 : 15, strong ? 10 : 7, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha *= 0.18;
    ctx.fillStyle = strong ? "#f0d58a" : "#b9d8ca";
    ctx.fill();
    if (near && label) {
      ctx.globalAlpha = 0.94;
      ctx.fillStyle = "rgba(10,12,16,0.84)";
      ctx.font = "11px IBM Plex Mono, monospace";
      ctx.textAlign = "center";
      const width = ctx.measureText(label).width + 12;
      ctx.fillRect(p.x - width / 2, p.y - 30, width, 17);
      ctx.fillStyle = "#f0eadc";
      ctx.fillText(label, p.x, p.y - 18);
    }
    ctx.restore();
  }

  function wrld(x: number, y: number) {
    const sx = shake > 0 ? (Math.random() - 0.5) * 10 * shake : 0;
    const sy = shake > 0 ? (Math.random() - 0.5) * 10 * shake : 0;
    return { x: Math.round(x - cam.x + cssW / 2 + sx), y: Math.round(y - cam.y + cssH / 2 + sy) };
  }

  function drawMinimap() {
    const size = MAP_SIZE[map];
    const mw = 148;
    const mh = 112;
    const x0 = cssW - mw - 16;
    const y0 = cssH - mh - 110;
    ctx.fillStyle = "rgba(10,12,16,0.72)";
    ctx.fillRect(x0 - 4, y0 - 4, mw + 8, mh + 8);
    for (let r = 0; r < size.rows; r++) {
      for (let c = 0; c < size.cols; c++) {
        const ch = MAPS[map][r][c];
        ctx.fillStyle =
          ch === "~" ? "#1a3340" : ch === "M" || ch === "W" ? "#3a3a3a" : ch === "f" ? "#2a4a32" : ch === "p" || ch === "T" ? "#8a7a5a" : ch === "L" ? "#a04020" : "#3d5c4a";
        ctx.fillRect(x0 + (c / size.cols) * mw, y0 + (r / size.rows) * mh, Math.ceil(mw / size.cols), Math.ceil(mh / size.rows));
      }
    }
    for (const node of GATHER_NODES) {
      if (node.map !== map || opened.has(`node:${node.id}`)) continue;
      ctx.fillStyle = "#b9d8ca";
      ctx.fillRect(x0 + ((node.c + 0.5) / size.cols) * mw - 1, y0 + ((node.r + 0.5) / size.rows) * mh - 1, 3, 3);
    }
    for (const site of SITES) {
      if (site.map !== map) continue;
      ctx.fillStyle = raised.has(site.id) ? "#d8c070" : "#f0d58a";
      ctx.fillRect(x0 + ((site.c + 0.5) / size.cols) * mw - 2, y0 + ((site.r + 0.5) / size.rows) * mh - 2, 4, 4);
    }
    ctx.fillStyle = "#e8e4d8";
    ctx.fillRect(x0 + (px / (size.cols * TILE)) * mw - 1, y0 + (py / (size.rows * TILE)) * mh - 1, 3, 3);
  }

  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#0a0c10";
    ctx.fillRect(0, 0, cssW, cssH);
    const size = MAP_SIZE[map];
    const grid = MAPS[map];
    const c0 = Math.max(0, Math.floor((cam.x - cssW / 2) / TILE) - 1);
    const r0 = Math.max(0, Math.floor((cam.y - cssH / 2) / TILE) - 1);
    const c1 = Math.min(size.cols, Math.ceil((cam.x + cssW / 2) / TILE) + 1);
    const r1 = Math.min(size.rows, Math.ceil((cam.y + cssH / 2) / TILE) + 1);
    const torch = has("torch") ? 7.2 : 4.2;
    const dark = map === "dungeon" || map === "crypt";

    for (let r = r0; r < r1; r++) {
      for (let c = c0; c < c1; c++) {
        const s = wrld(c * TILE, r * TILE);
        blit(cellImg(grid[r][c], map), s.x, s.y, TILE, TILE);
        if (dark) {
          const d = Math.hypot(c + 0.5 - px / TILE, r + 0.5 - py / TILE);
          if (d > torch) {
            ctx.fillStyle = "rgba(4,4,8,0.82)";
            ctx.fillRect(s.x, s.y, TILE, TILE);
          } else if (d > torch - 2) {
            ctx.fillStyle = "rgba(4,4,8,0.45)";
            ctx.fillRect(s.x, s.y, TILE, TILE);
          }
        }
      }
    }

    const hour = (time * 0.012) % 1;
    if (map === "over" && (hour < 0.22 || hour > 0.78)) {
      ctx.fillStyle = "rgba(8,12,28,0.32)";
      ctx.fillRect(0, 0, cssW, cssH);
    }
    if (map === "isle") {
      ctx.fillStyle = "rgba(150,182,176,0.08)";
      ctx.fillRect(0, 0, cssW, cssH);
      ctx.save();
      for (let i = 0; i < 5; i++) {
        const drift = (time * (10 + i * 2) + i * 173) % (cssW + 280) - 140;
        const y = 56 + ((i * 137) % Math.max(120, cssH - 80));
        ctx.globalAlpha = 0.035 + i * 0.008;
        ctx.fillStyle = "#d7e4df";
        ctx.beginPath();
        ctx.ellipse(drift, y, 120 + i * 18, 22 + i * 3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if ((map === "hall" && !opened.has("hall:10,3")) || (map === "inn" && !opened.has("inn:3,4")) || (map === "dungeon" && !opened.has("dungeon:3,3"))) {
      const chests = map === "hall" ? [[10, 3]] : map === "inn" ? [[3, 4]] : [[3, 3]];
      for (const [c, r] of chests) {
        const s = wrld(c * TILE, r * TILE);
        sheet(imgs.props, 0, s.x, s.y - 4, 32);
        drawInteractionPulse(c * TILE + 16, r * TILE + 16, "Открыть", true);
      }
    }
    if (map === "crypt" && !has("codex")) {
      const s = wrld(8 * TILE, 2 * TILE);
      sheet(imgs.props, 3, s.x, s.y - 6, 32);
      drawInteractionPulse(8 * TILE + 16, 2 * TILE + 16, "Кодекс", true);
    }
    if (map === "isle" && !opened.has("isle-chest")) {
      const s = wrld(28 * TILE, 6 * TILE);
      sheet(imgs.props, 0, s.x, s.y - 4, 32);
      drawInteractionPulse(28 * TILE + 16, 6 * TILE + 16, "Приливный камень", true);
    }
    if (map === "over") {
      const s = wrld(25 * TILE, 6 * TILE);
      sheet(imgs.props, 1, s.x, s.y, 40);
      if (!has("mark")) drawInteractionPulse(26 * TILE + 16, 7 * TILE + 16, "Алтарь клятвы", true);
      const sh = wrld(DOCK.c * TILE - 10, DOCK.r * TILE - 28);
      if (imgs.wreck) blit(imgs.wreck, sh.x, sh.y, 52, 36);
      else sheet(imgs.props, 1, sh.x, sh.y, 44);
      if (!opened.has("dock-sash")) drawInteractionPulse(DOCK.c * TILE + 16, DOCK.r * TILE + 16, "Кушак на бочке", true);
    }
    for (const node of GATHER_NODES) {
      if (node.map !== map || opened.has(`node:${node.id}`)) continue;
      const p = wrld(node.c * TILE, node.r * TILE - 7);
      sheetGrid(imgs.items, node.sprite, 3, 3, p.x, p.y, 32);
      drawInteractionPulse(node.c * TILE + 16, node.r * TILE + 16, node.label, true);
    }
    for (const s of SITES) {
      if (s.map !== map) continue;
      const p = wrld(s.c * TILE - 8, s.r * TILE - 18);
      const pick = raised.get(s.id);
      const opt = s.options.find((o) => o.id === pick);
      if (!opt) {
        ctx.fillStyle = "rgba(20,16,12,0.55)";
        ctx.beginPath();
        ctx.ellipse(p.x + 24, p.y + 40, 18, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(240,213,138,0.72)";
        ctx.fillRect(p.x + 10, p.y + 22, 28, 8);
        drawInteractionPulse(s.c * TILE + 16, s.r * TILE + 16, `Строить: ${s.name}`, true);
        continue;
      }
      if (opt.sprite === "keep" && imgs.keep) sheetGrid(imgs.keep, opt.frame, 3, 2, p.x, p.y, 48);
      else if (imgs[opt.sprite]) blit(imgs[opt.sprite], p.x, p.y, 46, 40);
      else sheet(imgs.props, 1, p.x, p.y, 40);
      if (opt.craft || opt.rest) drawInteractionPulse(s.c * TILE + 16, s.r * TILE + 16, opt.craft ? "Мастерская" : "Отдохнуть");
    }
    if (map === "keep") {
      for (const b of BUILDINGS) {
        const s = wrld(b.c * TILE - 8, b.r * TILE - 18);
        if (!built.has(b.id)) {
          ctx.fillStyle = "rgba(20,16,12,0.55)";
          ctx.beginPath();
          ctx.ellipse(s.x + 24, s.y + 40, 14, 8, 0, 0, Math.PI * 2);
          ctx.fill();
          continue;
        }
        sheetGrid(imgs.keep, b.sprite, 3, 2, s.x, s.y, 48);
        if (b.id === "hearth") {
          const p = wrld(b.c * TILE + 16, b.r * TILE + 8);
          const flick = 0.55 + Math.sin(time * 11) * 0.2 + Math.sin(time * 23) * 0.1;
          ctx.save();
          ctx.globalAlpha = flick;
          ctx.fillStyle = "#e07a4a";
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, 16, 10, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = flick * 0.7;
          ctx.fillStyle = "#e8d48a";
          ctx.beginPath();
          ctx.ellipse(p.x, p.y - 6, 7, 12 + Math.sin(time * 14) * 3, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 0.25;
          ctx.fillStyle = "#e07a4a";
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, 28, 16, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
      if (fieldPortal) drawPortal(10 * TILE + 16, 8 * TILE + 16);
    }
    if (fieldPortal && map === fieldPortal.map) drawPortal(fieldPortal.x, fieldPortal.y);
    for (const w of WAYPOINTS) {
      if (w.map !== map || w.id === "keep") continue;
      const s = wrld(w.c * TILE + 16, w.r * TILE + 16);
      ctx.save();
      const on = stones.has(w.id);
      ctx.globalAlpha = on ? 0.55 + Math.sin(time * 5) * 0.25 : 0.28;
      ctx.strokeStyle = on ? "#e8e4d8" : "#6e675c";
      ctx.fillStyle = on ? "rgba(200,210,200,0.18)" : "transparent";
      ctx.lineWidth = on ? 3 : 2;
      ctx.beginPath();
      ctx.arc(s.x, s.y, on ? 9 : 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      if (!on) drawInteractionPulse(w.c * TILE + 16, w.r * TILE + 16, `Камень пути: ${w.name}`);
    }

    for (const n of NPCS) {
      if (n.map !== map || (n.id === "lyra" && lyra)) continue;
      const s = wrld(n.c * TILE, n.r * TILE - 10);
      sheet(imgs.npcs, n.sprite, s.x, s.y, 36);
      const near = Math.hypot(n.c * TILE + 16 - px, n.r * TILE + 16 - py) < 52;
      drawInteractionPulse(n.c * TILE + 16, n.r * TILE + 16, near ? n.name : undefined);
      if (near) {
        ctx.font = "11px IBM Plex Mono, monospace";
        ctx.fillStyle = "rgba(232,228,216,0.9)";
        ctx.textAlign = "center";
        ctx.fillText(n.name, s.x + 18, s.y - 4);
        ctx.textAlign = "left";
      }
    }
    for (const m of mobs) {
      if (m.map !== map || m.hp <= 0) continue;
      const s = wrld(m.x - 16, m.y - 20);
      if (m.flash > 0) ctx.filter = "brightness(2.4)";
      if (m.kind === "crab") sheet(imgs.crab, Math.floor(time * 4) % 4, s.x, s.y, 34);
      else sheet(imgs.mobs, MOB[m.kind].sprite, s.x, s.y, 34);
      ctx.filter = "none";
      ctx.fillStyle = "#2a1818";
      ctx.fillRect(s.x, s.y - 6, 34, 4);
      ctx.fillStyle = "#c17a6a";
      ctx.fillRect(s.x, s.y - 6, 34 * (m.hp / m.max), 4);
    }

    for (const sl of slashes) {
      const p = wrld(sl.x, sl.y);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(sl.ang);
      ctx.globalAlpha = Math.max(0, sl.t / 0.18);
      ctx.strokeStyle = sl.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, sl.r, -0.9, 0.9);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.restore();
    }
    for (const s of shots) {
      const g = wrld(s.x, s.y);
      ctx.fillStyle = "rgba(10,8,6,0.35)";
      ctx.beginPath();
      ctx.ellipse(g.x, g.y + 3, 5, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
      const p = wrld(s.x, s.y - s.z);
      const a = Math.atan2(s.vy, s.vx);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(a);
      ctx.globalAlpha = s.stuck > 0 ? Math.min(1, s.stuck) : 1;
      if (s.kind === "arrow") {
        ctx.fillStyle = "#6a4a28";
        ctx.fillRect(-11, -1.1, 16, 2.2);
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.moveTo(5, -3.4);
        ctx.lineTo(13, 0);
        ctx.lineTo(5, 3.4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#c8d0c4";
        ctx.beginPath();
        ctx.moveTo(-11, 0);
        ctx.lineTo(-15, -3);
        ctx.lineTo(-13, 0);
        ctx.lineTo(-15, 3);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, s.r * 2.4, s.r * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.ellipse(-s.r, 0, s.r * 3.2, s.r * 1.4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    const ps = wrld(px - 18, py - 28);
    const cx = ps.x + 19;
    const cy = ps.y + 22;
    if (level >= 3) {
      ctx.save();
      ctx.globalAlpha = 0.22 + Math.min(0.25, (level - 2) * 0.05);
      ctx.strokeStyle = has("mark") ? "#e8d48a" : "#c8d0c4";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 12, 14 + level, 6, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (iframe > 0 && ((time * 16) | 0) % 2 === 0) ctx.globalAlpha = 0.45;
    if (worn.arm === "shellmail") {
      ctx.save();
      ctx.filter = "brightness(1.08) saturate(0.76) hue-rotate(24deg)";
      sheet(imgs[HEROES[heroId].sheet], dir, ps.x, ps.y, 38);
      ctx.restore();
      ctx.fillStyle = "#d8d0a8";
      ctx.beginPath();
      ctx.ellipse(cx - 10, cy - 8, 7, 5, -0.35, 0, Math.PI * 2);
      ctx.ellipse(cx + 10, cy - 8, 7, 5, 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#4d7773";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - 9, cy - 1);
      ctx.lineTo(cx + 9, cy + 6);
      ctx.moveTo(cx + 9, cy - 1);
      ctx.lineTo(cx - 9, cy + 6);
      ctx.stroke();
    } else if (worn.arm === "chain") {
      ctx.save();
      ctx.filter = "brightness(1.18) saturate(0.7)";
      sheet(imgs[HEROES[heroId].sheet], dir, ps.x, ps.y, 38);
      ctx.restore();
      ctx.fillStyle = "#c8d0c4";
      ctx.fillRect(cx - 12, cy - 10, 8, 6);
      ctx.fillRect(cx + 4, cy - 10, 8, 6);
    } else {
      sheet(imgs[HEROES[heroId].sheet], dir, ps.x, ps.y, 38);
    }
    ctx.globalAlpha = 1;
    if (worn.cloak === "sash") {
      ctx.fillStyle = "#c17a6a";
      ctx.fillRect(cx - 10, cy + 6, 20, 5);
    } else if (worn.cloak === "robe") {
      ctx.fillStyle = "#3a3a48";
      ctx.fillRect(cx - 11, cy + 2, 22, 10);
    } else if (worn.cloak === "shroud") {
      ctx.fillStyle = "#1a1a18";
      ctx.globalAlpha = 0.7;
      ctx.fillRect(cx - 12, cy - 4, 24, 16);
      ctx.globalAlpha = 1;
    } else if (worn.cloak === "stormcloak") {
      ctx.fillStyle = "#183f3c";
      ctx.globalAlpha = 0.92;
      ctx.beginPath();
      ctx.moveTo(cx - 13, cy - 8);
      ctx.lineTo(cx + 13, cy - 8);
      ctx.lineTo(cx + 16, cy + 16);
      ctx.lineTo(cx, cy + 11);
      ctx.lineTo(cx - 16, cy + 16);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#79a69b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy - 9, 10, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    const angW = aim();
    const fx = Math.cos(angW);
    const fy = Math.sin(angW);
    const steel = worn.wep === "steel";
    if (worn.wep === "harpoon") {
      const len = 29;
      ctx.strokeStyle = "#725437";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - fx * 9, cy - fy * 9 + 5);
      ctx.lineTo(cx + fx * len, cy + fy * len - 4);
      ctx.stroke();
      const tx = cx + fx * len;
      const ty = cy + fy * len - 4;
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(angW);
      ctx.fillStyle = "#b9d8ca";
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(-3, -5);
      ctx.lineTo(0, 0);
      ctx.lineTo(-3, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else if (heroId === "vessa") {
      ctx.strokeStyle = "#6a5a40";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - fx * 4, cy + 8);
      ctx.lineTo(cx + fx * 8, cy - 16);
      ctx.stroke();
      ctx.fillStyle = "#e07a4a";
      ctx.globalAlpha = 0.7 + Math.sin(time * 8) * 0.3;
      ctx.beginPath();
      ctx.arc(cx + fx * 8, cy - 16, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (heroId === "kael") {
      ctx.strokeStyle = "#5a4a32";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx + fx * 8, cy, 8, fy >= 0 ? 0.4 : 3.4, fy >= 0 ? 2.8 : 6);
      ctx.stroke();
    } else {
      const len = steel ? 20 : 14;
      ctx.strokeStyle = steel ? "#e8e4d8" : "#8a7060";
      ctx.lineWidth = steel ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(cx + fx * 6, cy + fy * 2);
      ctx.lineTo(cx + fx * len, cy + fy * len - 4);
      ctx.stroke();
      if (steel) {
        ctx.fillStyle = "#e8e4d8";
        ctx.fillRect(cx + fx * len - 2, cy + fy * len - 6, 4, 4);
      }
    }
    if (has("torch")) {
      const tx = cx - fx * 10;
      const ty = cy - 4;
      ctx.fillStyle = "#6a4a28";
      ctx.fillRect(tx - 1, ty, 3, 8);
      ctx.fillStyle = "#e07a4a";
      ctx.globalAlpha = 0.75 + Math.sin(time * 12) * 0.25;
      ctx.beginPath();
      ctx.arc(tx, ty - 2, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (has("mark")) {
      ctx.fillStyle = "#e8d48a";
      ctx.globalAlpha = 0.5 + Math.sin(time * 3) * 0.2;
      ctx.fillRect(cx - 2, cy - 2, 4, 4);
      ctx.globalAlpha = 1;
    }
    if (shieldT > 0) {
      ctx.strokeStyle = "rgba(200,210,230,0.7)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 22, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (lyra) {
      const ls = wrld(px - 28, py - 10);
      sheet(imgs.npcs, 3, ls.x, ls.y, 32);
    }

    for (const c of coins) {
      if (c.map !== map) continue;
      const p = wrld(c.x, c.y - c.z);
      ctx.fillStyle = "rgba(10,8,6,0.35)";
      ctx.beginPath();
      ctx.ellipse(wrld(c.x, c.y).x, wrld(c.x, c.y).y + 4, 5, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      const frame = Math.floor(c.spin) % 4;
      if (imgs.coin) sheetGrid(imgs.coin, frame, 2, 2, p.x - 8, p.y - 8, 16);
      else {
        ctx.fillStyle = "#d8c070";
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 5, 5 * Math.abs(Math.cos(c.spin)), 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (const s of sparks) {
      const p = wrld(s.x, s.y);
      ctx.globalAlpha = Math.max(0, s.life);
      ctx.fillStyle = s.color;
      ctx.fillRect(p.x, p.y, s.size, s.size);
      ctx.globalAlpha = 1;
    }
    ctx.font = "12px IBM Plex Mono, monospace";
    for (const f of floaters) {
      const p = wrld(f.x, f.y);
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, p.x, p.y);
      ctx.globalAlpha = 1;
    }
    drawMinimap();
    if (hasAim && mode === "play") {
      const p = wrld(px, py);
      ctx.save();
      ctx.strokeStyle = "rgba(232,228,216,0.45)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x + Math.cos(aimAng) * 20, p.y + Math.sin(aimAng) * 20);
      ctx.lineTo(p.x + Math.cos(aimAng) * 32, p.y + Math.sin(aimAng) * 32);
      ctx.stroke();
      ctx.restore();
    }
    if (moveTo && mode === "play") {
      const p = wrld(moveTo.x, moveTo.y);
      ctx.save();
      ctx.strokeStyle = "rgba(232,228,216,0.7)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 8, 4, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function frame(tms: number) {
    const now = tms / 1000;
    if (!lastT) lastT = now;
    let dt = now - lastT;
    lastT = now;
    if (dt > 0.1) dt = 0.1;
    sim(dt);
    render();
    emit(false);
    raf = requestAnimationFrame(frame);
  }

  function resize() {
    const parent = canvas.parentElement ?? canvas;
    cssW = Math.max(1, parent.clientWidth);
    cssH = Math.max(1, parent.clientHeight);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
  }

  function worldFromEvent(e: PointerEvent | MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left - cssW / 2 + cam.x,
      y: e.clientY - rect.top - cssH / 2 + cam.y,
    };
  }

  function faceWorld(wx: number, wy: number) {
    const dx = wx - px;
    const dy = wy - py;
    hasAim = true;
    aimX = wx;
    aimY = wy;
    aimAng = Math.atan2(dy, dx);
    if (Math.abs(dx) > Math.abs(dy)) dir = dx < 0 ? 1 : 2;
    else dir = dy < 0 ? 3 : 0;
  }

  function interactionTargetAt(wx: number, wy: number) {
    const candidates: { c: number; r: number; d: number }[] = [];
    const consider = (c: number, r: number, radius = 30) => {
      const d = Math.hypot(c * TILE + 16 - wx, r * TILE + 16 - wy);
      if (d <= radius) candidates.push({ c, r, d });
    };
    for (const node of GATHER_NODES) {
      if (node.map === map && !opened.has(`node:${node.id}`)) consider(node.c, node.r, 32);
    }
    for (const site of SITES) {
      if (site.map === map) consider(site.c, site.r, 44);
    }
    for (const waypoint of WAYPOINTS) {
      if (waypoint.map === map && !stones.has(waypoint.id)) consider(waypoint.c, waypoint.r, 28);
    }
    if (map === "hall" && !opened.has("hall:10,3")) consider(10, 3);
    if (map === "inn" && !opened.has("inn:3,4")) consider(3, 4);
    if (map === "dungeon" && !opened.has("dungeon:3,3")) consider(3, 3);
    if (map === "over" && !opened.has("dock-sash")) consider(DOCK.c, DOCK.r, 36);
    if (map === "over" && !has("mark")) consider(26, 7, 34);
    if (map === "crypt" && !has("codex")) consider(8, 2, 34);
    if (map === "isle" && !opened.has("isle-chest")) consider(28, 6, 34);
    return candidates.reduce<(typeof candidates)[number] | null>((best, candidate) => (!best || candidate.d < best.d ? candidate : best), null);
  }

  function clickLeft(wx: number, wy: number) {
    faceWorld(wx, wy);
    huntId = 0;
    talkGo = null;
    interactGo = null;
    for (const n of NPCS) {
      if (n.map !== map || (n.id === "lyra" && lyra)) continue;
      if (Math.hypot(n.c * TILE + 16 - wx, n.r * TILE + 8 - wy) < 22) {
        talkGo = n;
        moveTo = { x: n.c * TILE + 16, y: n.r * TILE + 16 };
        return;
      }
    }
    const target = interactionTargetAt(wx, wy);
    if (target) {
      interactGo = { c: target.c, r: target.r };
      moveTo = { x: target.c * TILE + 16, y: target.r * TILE + 16 };
      return;
    }
    for (const m of mobs) {
      if (m.map !== map || m.hp <= 0) continue;
      if (Math.hypot(m.x - wx, m.y - wy) < 22) {
        huntId = m.id;
        moveTo = { x: m.x, y: m.y };
        if (Math.hypot(m.x - px, m.y - py) < 42) attack();
        return;
      }
    }
    moveTo = { x: wx, y: wy };
  }

  function clickRight(wx: number, wy: number) {
    faceWorld(wx, wy);
    if (activeSlot < 0) attack();
    else cast(activeSlot);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.repeat) return;
    keys.add(e.code);
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab"].includes(e.code)) e.preventDefault();
    if (mode === "pause") {
      if (e.code === "Escape") {
        mode = "play";
        emit(true);
      }
      return;
    }
    if (mode === "talk") {
      if (e.code === "Escape") {
        mode = "play";
        talkNpc = null;
        lastAsk = "";
        emit(true);
        return;
      }
      const i = ["Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8", "Digit9"].indexOf(e.code);
      if (i >= 0 && talkNpc) {
        const ks = talkKeys(talkNpc);
        if (ks[i]) doKeyword(ks[i].id);
      }
      return;
    }
    if ((mode === "inv" || mode === "journal" || mode === "way" || mode === "build" || mode === "atlas" || mode === "site") && (e.code === "Escape" || e.code === "KeyI" || e.code === "KeyJ" || e.code === "KeyM" || e.code === "KeyB")) {
      mode = "play";
      emit(true);
      return;
    }
    if (mode !== "play") return;
    if (e.code === "Escape") {
      mode = "pause";
      emit(true);
      return;
    }
    if (e.code === "KeyE") interact();
    if (e.code === "Space" || e.code === "KeyF") attack();
    if (e.code === "Digit1") cast(0);
    if (e.code === "Digit2") cast(1);
    if (e.code === "Digit3") cast(2);
    if (e.code === "KeyU") drinkPotion();
    if (e.code === "KeyT") townPortal();
    if (e.code === "KeyM") {
      mode = "atlas";
      emit(true);
    }
    if (e.code === "KeyB") {
      if (map === "keep") mode = "build";
      else if (siteAt(map, tileC(), tileR())) mode = "site";
      emit(true);
    }
    if (e.code === "KeyI" || e.code === "Tab") {
      mode = "inv";
      emit(true);
    }
    if (e.code === "KeyJ") {
      mode = "journal";
      emit(true);
    }
  }

  function onKeyUp(e: KeyboardEvent) {
    keys.delete(e.code);
  }

  function onPointer(e: PointerEvent) {
    if (mode !== "play") return;
    if ((e.target as HTMLElement | null)?.closest("button, input, form, aside, a")) return;
    const w = worldFromEvent(e);
    canvas.setPointerCapture(e.pointerId);
    if (e.button === 2) {
      e.preventDefault();
      holdRmb = true;
      clickRight(w.x, w.y);
    } else if (e.button === 0) {
      holdLmb = true;
      clickLeft(w.x, w.y);
    }
  }

  function onPointerMove(e: PointerEvent) {
    const w = worldFromEvent(e);
    faceWorld(w.x, w.y);
    if (holdLmb && mode === "play" && !talkGo && !huntId) moveTo = { x: w.x, y: w.y };
  }

  function onPointerUp(e: PointerEvent) {
    if (e.button === 0) holdLmb = false;
    if (e.button === 2) holdRmb = false;
  }

  function onContext(e: Event) {
    e.preventDefault();
  }

  function onBlur() {
    keys.clear();
    injected.clear();
    stickX = 0;
    stickY = 0;
  }

  resize();
  window.addEventListener("resize", resize);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  canvas.addEventListener("pointerdown", onPointer);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("contextmenu", onContext);
  window.addEventListener("blur", onBlur);

  window.__controlsTest = {
    getYaw: () => dir,
    getSpeed: () => Math.hypot(vx, vy),
    getX: () => px,
    getY: () => py,
    getMode: () => mode,
    setKeys: (codes: string[]) => {
      injected.clear();
      for (const c of codes) injected.add(c);
    },
    setSteer: (v: number) => {
      injected.clear();
      if (v > 0.2) injected.add("KeyA");
      else if (v < -0.2) injected.add("KeyD");
    },
  };

  raf = requestAnimationFrame(frame);
  emit(true);

  return {
    start(id: HeroId) {
      audio.unlock();
      reset(id);
      emit(true);
    },
    continueGame() {
      audio.unlock();
      const restored = restoreGame();
      emit(true);
      return restored;
    },
    pause() {
      if (mode === "play") mode = "pause";
      else if (mode === "pause") mode = "play";
      emit(true);
    },
    returnToMenu() {
      if (mode === "menu") return;
      persistGame(true);
      mode = "menu";
      talkNpc = null;
      lastAsk = "";
      emit(true);
    },
    keyword: doKeyword,
    attack,
    cast,
    interact,
    pickTalent(id: TalentId) {
      if (mode !== "talent") return;
      owned.add(id);
      applyTalent(id);
      recalcKeep();
      pending = [];
      mode = "play";
      say(TALENTS[id].name);
      emit(true);
    },
    townPortal,
    goCastle,
    toggleWaypoints() {
      if (mode === "atlas" || mode === "way") mode = "play";
      else if (mode === "play" || mode === "build" || mode === "site") mode = "atlas";
      emit(true);
    },
    travel,
    toggleBuild() {
      if (mode === "build" || mode === "site") mode = "play";
      else if (map === "keep" && (mode === "play" || mode === "way" || mode === "atlas")) mode = "build";
      else if (mode === "play") {
        const site = siteAt(map, tileC(), tileR());
        const option = site?.options.find((candidate) => candidate.id === raised.get(site.id));
        if (site) mode = option?.craft ? "build" : "site";
      }
      emit(true);
    },
    build: doBuild,
    rest,
    toggleInv() {
      if (mode === "inv") mode = "play";
      else if (mode === "play") mode = "inv";
      emit(true);
    },
    toggleJournal() {
      if (mode === "journal") mode = "play";
      else if (mode === "play") mode = "journal";
      emit(true);
    },
    usePotion: drinkPotion,
    closePanel() {
      if (mode === "talk" || mode === "inv" || mode === "journal" || mode === "way" || mode === "build" || mode === "atlas" || mode === "site") {
        mode = "play";
        talkNpc = null;
        lastAsk = "";
        emit(true);
      }
    },
    toggleMute() {
      audio.unlock();
      audio.setMuted(!audio.muted);
      emit(true);
    },
    setMoveStick(x: number, y: number) {
      const v = radial(x, y);
      stickX = v.x;
      stickY = v.y;
    },
    select(slot: number) {
      if (slot < 0) {
        activeSlot = -1;
        attack();
      } else cast(slot);
    },
    equip,
    craft,
    raiseSite,
    toggleAtlas() {
      if (mode === "atlas") mode = "play";
      else if (mode === "play" || mode === "way") mode = "atlas";
      emit(true);
    },
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      canvas.removeEventListener("pointerdown", onPointer);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("contextmenu", onContext);
      if (window.__controlsTest) delete window.__controlsTest;
    },
    snapshot,
    nudge(dc: number, dr: number) {
      if (mode === "play") {
        px += dc * 16;
        py += dr * 16;
        if (!tryPos(px, py)) {
          px -= dc * 16;
          py -= dr * 16;
        }
      }
    },
  };
}
