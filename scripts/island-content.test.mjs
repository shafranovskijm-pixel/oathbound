import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { ITEM, MOB, NPCS } from "../src/game/content.ts";
import { blocked, MAPS, SPAWN } from "../src/game/world.ts";

const source = JSON.parse(await readFile(new URL("../src/game/oathbound.json", import.meta.url), "utf8"));
const publicCopy = JSON.parse(await readFile(new URL("../public/content/oathbound.json", import.meta.url), "utf8"));

function reachable(map, start, target) {
  const seen = new Set([`${start.c},${start.r}`]);
  const queue = [start];
  while (queue.length) {
    const point = queue.shift();
    if (point.c === target.c && point.r === target.r) return true;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const c = point.c + dc;
      const r = point.r + dr;
      const key = `${c},${r}`;
      if (seen.has(key) || blocked(map, c, r)) continue;
      seen.add(key);
      queue.push({ c, r });
    }
  }
  return false;
}

test("public content mirrors the source of truth", () => {
  assert.deepEqual(publicCopy, source);
});

test("island is a navigable region instead of a single room", () => {
  assert.ok(MAPS.isle.length >= 20);
  assert.ok(MAPS.isle[0].length >= 30);
  assert.equal(blocked("isle", SPAWN.isle.c, SPAWN.isle.r), false);
});

test("island gathering nodes have stable ids and reachable positions", () => {
  const ids = source.gatherNodes.map((node) => node.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.length >= 9);
  for (const node of source.gatherNodes) {
    assert.equal(node.map, "isle");
    assert.equal(blocked(node.map, node.c, node.r), false, `${node.id} must be reachable`);
    assert.ok(node.amount > 0);
  }
});

test("island settlement and its three build choices are valid", () => {
  const haven = source.sites.find((site) => site.id === "haven");
  assert.ok(haven);
  assert.equal(haven.map, "isle");
  assert.equal(blocked(haven.map, haven.c, haven.r), false);
  assert.equal(haven.options.length, 3);
  assert.equal(new Set(haven.options.map((option) => option.id)).size, 3);
});

test("island equipment recipes are defined exactly once", () => {
  const outputs = source.craft.map((recipe) => recipe.out);
  assert.equal(new Set(outputs).size, outputs.length);
  for (const out of ["harpoon", "stormcloak", "shellmail", "tidehelm"]) {
    const recipe = source.craft.find((candidate) => candidate.out === out);
    assert.ok(recipe, `${out} recipe is missing`);
    assert.ok(recipe.need.length >= 3);
    assert.ok(recipe.gold > 0);
  }
});

test("tidal grotto has a safe entrance and a boss arena", () => {
  assert.ok(MAPS.grotto.length >= 14);
  assert.ok(MAPS.grotto[0].length >= 20);
  assert.equal(blocked("grotto", SPAWN.grotto.c, SPAWN.grotto.r), false);
  assert.equal(blocked("grotto", 11, 4), false);
  assert.equal(reachable("isle", SPAWN.isle, { c: 30, r: 7 }), true);
  assert.equal(reachable("grotto", SPAWN.grotto, { c: 11, r: 4 }), true);
});

test("living haven has a reachable quest giver and three helmet rewards", () => {
  const eira = NPCS.find((npc) => npc.id === "eira");
  assert.ok(eira);
  assert.equal(eira.map, "isle");
  assert.equal(reachable("isle", SPAWN.isle, eira), true);
  for (const id of ["havenhood", "saltvisor", "firecrown"]) {
    assert.equal(ITEM[id].slot, "helm");
    assert.ok(ITEM[id].name.length > 4);
  }
});

test("haven siege content and every landing point are valid", () => {
  const eira = NPCS.find((npc) => npc.id === "eira");
  const ryn = NPCS.find((npc) => npc.id === "ryn");
  assert.ok(eira?.words.RAID);
  assert.ok(eira?.words.REPAIR);
  assert.ok(ryn?.words.RAID);
  assert.ok(MOB.raider.hp >= 20);
  assert.ok(ITEM.keelsigil.name.toLowerCase().includes("киля"));
  const waves = [
    [[7, 18], [21, 20], [6, 13]],
    [[23, 17], [28, 12], [9, 16], [21, 20]],
    [[6, 13], [7, 18], [23, 17], [29, 16], [18, 8]],
  ];
  for (const points of waves) {
    for (const [c, r] of points) {
      assert.equal(blocked("isle", c, r), false, `raid spawn ${c},${r} must be open`);
      assert.equal(reachable("isle", { c, r }, { c: 13, r: 17 }), true, `raid spawn ${c},${r} must reach the haven`);
    }
  }
});
