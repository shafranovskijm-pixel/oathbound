import assert from "node:assert/strict";
import test from "node:test";
import { decodeGameSave, readGameSave, SAVE_KEY, writeGameSave, type GameSave } from "./save.ts";

const BASE: GameSave = {
  version: 1,
  updatedAt: 1,
  mode: "play",
  heroId: "aldric",
  map: "over",
  px: 464,
  py: 720,
  dir: 0,
  hp: 34,
  maxHp: 34,
  mp: 8,
  maxMp: 8,
  food: 28,
  gold: 80,
  xp: 0,
  level: 1,
  str: 12,
  baseSpd: 118,
  baseArmor: 2,
  items: ["sword", "leather"],
  worn: { wep: "sword", arm: "leather", cloak: null, helm: null },
  lyra: false,
  lyraHp: 18,
  flags: [],
  opened: [],
  owned: [],
  pending: [],
  built: [],
  raised: [],
  stones: [],
  fieldPortal: null,
  vaultVisit: false,
  raid: { active: true, wave: 2, havenHp: 64, maxHavenHp: 110, nextWave: 0, towerCd: 0.8 },
  log: ["Начало"],
  activeSlot: 0,
  mobs: [],
  groundItems: [{ id: 1, map: "over", x: 480, y: 720, item: "hide" }],
  cds: { smite: 0 },
};

test("game save round-trips through storage", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
  assert.equal(writeGameSave(BASE, storage), true);
  assert.deepEqual(readGameSave(storage), BASE);
  assert.equal(values.has(SAVE_KEY), true);
});

test("corrupt and incompatible saves fail closed", () => {
  assert.equal(decodeGameSave("not json"), null);
  assert.equal(decodeGameSave(JSON.stringify({ ...BASE, version: 2 })), null);
  assert.equal(decodeGameSave(JSON.stringify({ ...BASE, hp: "many" })), null);
  assert.equal(decodeGameSave(JSON.stringify({ ...BASE, map: "nowhere" })), null);
  assert.equal(decodeGameSave(JSON.stringify({ ...BASE, raid: { active: true, wave: "two" } })), null);
  assert.equal(decodeGameSave(JSON.stringify({ ...BASE, groundItems: [{ id: 1, map: "void", x: 0, y: 0, item: "hide" }] })), null);
});

test("legacy saves without the helmet slot still load", () => {
  const legacy = { ...BASE, worn: { wep: "sword", arm: "leather", cloak: null } };
  const decoded = decodeGameSave(JSON.stringify(legacy));
  assert.ok(decoded);
  assert.equal(decoded.worn.helm, undefined);
});

test("saves from before haven raids still load", () => {
  const { raid: _raid, ...legacy } = BASE;
  const decoded = decodeGameSave(JSON.stringify(legacy));
  assert.ok(decoded);
  assert.equal(decoded.raid, undefined);
});

test("saves from before ground loot still load", () => {
  const { groundItems: _groundItems, ...legacy } = BASE;
  const decoded = decodeGameSave(JSON.stringify(legacy));
  assert.ok(decoded);
  assert.equal(decoded.groundItems, undefined);
});
