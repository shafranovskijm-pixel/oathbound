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
  buildingLevels: [],
  raised: [],
  stones: [],
  fieldPortal: null,
  vaultVisit: false,
  raid: { active: true, wave: 2, havenHp: 64, maxHavenHp: 110, nextWave: 0, towerCd: 0.8 },
  keepDefense: { active: false, wave: 0, hp: 90, maxHp: 90, nextWave: 0, towerCd: 0, day: 3, wins: 1 },
  campDefense: { active: false, wave: 0, hp: 60, maxHp: 60, nextWave: 0, towerCd: 0, day: 2, wins: 1 },
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
  assert.equal(decodeGameSave(JSON.stringify({ ...BASE, keepDefense: { active: true, wave: "two" } })), null);
  assert.equal(decodeGameSave(JSON.stringify({ ...BASE, campDefense: { active: true, wave: "two" } })), null);
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

test("saves from before courtyard defense still load", () => {
  const { keepDefense: _keepDefense, ...legacy } = BASE;
  const decoded = decodeGameSave(JSON.stringify(legacy));
  assert.ok(decoded);
  assert.equal(decoded.keepDefense, undefined);
});

test("saves from before starter-camp defense still load", () => {
  const { campDefense: _campDefense, ...legacy } = BASE;
  const decoded = decodeGameSave(JSON.stringify(legacy));
  assert.ok(decoded);
  assert.equal(decoded.campDefense, undefined);
});

test("settlement upgrades survive and older building saves default cleanly", () => {
  const upgraded: GameSave = { ...BASE, built: ["shorefire", "workbench"], buildingLevels: [["shorefire", 2], ["workbench", 1]] };
  const decoded = decodeGameSave(JSON.stringify(upgraded));
  assert.deepEqual(decoded?.buildingLevels, [["shorefire", 2], ["workbench", 1]]);

  const { buildingLevels: _levels, ...legacy } = upgraded;
  const oldDecoded = decodeGameSave(JSON.stringify(legacy));
  assert.ok(oldDecoded);
  assert.equal(oldDecoded.buildingLevels, undefined);
});

test("boat transport and enemy guards survive a save round-trip", () => {
  const voyage: GameSave = {
    ...BASE,
    map: "strait",
    transport: "boat",
    transportAngle: 0.75,
    mobs: [{ id: 7, map: "strait", x: 400, y: 280, kind: "skiff", hp: 31, max: 44, wait: 0, stun: 0, slow: 0, poison: 0, atkCd: 0, flash: 0, guard: 0, campUnit: true }],
  };
  const decoded = decodeGameSave(JSON.stringify(voyage));
  assert.ok(decoded);
  assert.equal(decoded.transport, "boat");
  assert.equal(decoded.mobs[0].kind, "skiff");
  assert.equal(decoded.mobs[0].guard, 0);
  assert.equal(decoded.mobs[0].campUnit, true);
});
