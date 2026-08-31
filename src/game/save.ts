import type { ItemId, MobKind, Slot } from "./content";
import type { HeroId, SpellId, TalentId } from "./heroes";
import type { BuildId, WpId } from "./keep";
import type { SiteId } from "./data";
import type { MapId } from "./world";

export const SAVE_KEY = "oathbound.save.v1";
export const SAVE_VERSION = 1;

export type SavedMode = "play" | "talent" | "dead" | "win";

export type SavedMob = {
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

export type GameSave = {
  version: typeof SAVE_VERSION;
  updatedAt: number;
  mode: SavedMode;
  heroId: HeroId;
  map: MapId;
  px: number;
  py: number;
  dir: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  food: number;
  gold: number;
  xp: number;
  level: number;
  str: number;
  baseSpd: number;
  baseArmor: number;
  items: ItemId[];
  worn: Record<Slot, ItemId | null>;
  lyra: boolean;
  lyraHp: number;
  flags: string[];
  opened: string[];
  owned: TalentId[];
  pending: TalentId[];
  built: BuildId[];
  raised: [SiteId, string][];
  stones: WpId[];
  fieldPortal: { map: MapId; x: number; y: number } | null;
  vaultVisit: boolean;
  log: string[];
  activeSlot: number;
  mobs: SavedMob[];
  cds: Partial<Record<SpellId, number>>;
};

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const HERO_IDS = new Set(["aldric", "vessa", "kael"]);
const MAP_IDS = new Set(["over", "town", "hall", "inn", "dungeon", "crypt", "keep", "ship", "isle"]);
const MODES = new Set(["play", "talent", "dead", "win"]);
const MOB_KINDS = new Set(["orc", "skel", "wolf", "wraith", "crab"]);

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function strings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function stringPairs(value: unknown): value is [string, string][] {
  return (
    Array.isArray(value) &&
    value.every((item) => Array.isArray(item) && item.length === 2 && item.every((part) => typeof part === "string"))
  );
}

function validPortal(value: unknown) {
  return (
    value === null ||
    (record(value) && typeof value.map === "string" && MAP_IDS.has(value.map) && finite(value.x) && finite(value.y))
  );
}

function validMob(value: unknown) {
  if (!record(value)) return false;
  return (
    finite(value.id) &&
    typeof value.map === "string" &&
    MAP_IDS.has(value.map) &&
    typeof value.kind === "string" &&
    MOB_KINDS.has(value.kind) &&
    [value.x, value.y, value.hp, value.max, value.wait, value.stun, value.slow, value.poison, value.atkCd, value.flash].every(finite)
  );
}

export function decodeGameSave(raw: string | null): GameSave | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!record(value)) return null;
    if (value.version !== SAVE_VERSION || !finite(value.updatedAt)) return null;
    if (typeof value.mode !== "string" || !MODES.has(value.mode)) return null;
    if (typeof value.heroId !== "string" || !HERO_IDS.has(value.heroId)) return null;
    if (typeof value.map !== "string" || !MAP_IDS.has(value.map)) return null;
    if (
      ![
        value.px,
        value.py,
        value.dir,
        value.hp,
        value.maxHp,
        value.mp,
        value.maxMp,
        value.food,
        value.gold,
        value.xp,
        value.level,
        value.str,
        value.baseSpd,
        value.baseArmor,
        value.lyraHp,
        value.activeSlot,
      ].every(finite)
    ) {
      return null;
    }
    if (!strings(value.items) || !strings(value.flags) || !strings(value.opened)) return null;
    if (!strings(value.owned) || !strings(value.pending) || !strings(value.built) || !strings(value.stones)) return null;
    if (!strings(value.log) || !stringPairs(value.raised)) return null;
    if (!record(value.worn) || !("wep" in value.worn) || !("arm" in value.worn) || !("cloak" in value.worn)) return null;
    if (![value.worn.wep, value.worn.arm, value.worn.cloak].every((item) => item === null || typeof item === "string")) return null;
    if (typeof value.lyra !== "boolean" || typeof value.vaultVisit !== "boolean") return null;
    if (!validPortal(value.fieldPortal) || !Array.isArray(value.mobs) || !value.mobs.every(validMob)) return null;
    if (!record(value.cds) || !Object.values(value.cds).every(finite)) return null;
    return value as GameSave;
  } catch {
    return null;
  }
}

function browserStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readGameSave(storage: StorageLike | null = browserStorage()) {
  if (!storage) return null;
  try {
    return decodeGameSave(storage.getItem(SAVE_KEY));
  } catch {
    return null;
  }
}

export function writeGameSave(save: GameSave, storage: StorageLike | null = browserStorage()) {
  if (!storage) return false;
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}

export function clearGameSave(storage: StorageLike | null = browserStorage()) {
  if (!storage) return false;
  try {
    storage.removeItem(SAVE_KEY);
    return true;
  } catch {
    return false;
  }
}
