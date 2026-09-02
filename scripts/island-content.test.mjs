import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { ITEM, MOB, NPCS } from "../src/game/content.ts";
import { ALDRIC_TALENT_PATHS, TALENTS } from "../src/game/heroes.ts";
import { BUILDINGS } from "../src/game/keep.ts";
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

test("infernal prologue has a reachable exit and production art", async () => {
  assert.ok(MAPS.hell.length >= 28);
  assert.ok(MAPS.hell[0].length >= 40);
  assert.equal(blocked("hell", SPAWN.hell.c, SPAWN.hell.r), false);
  assert.equal(reachable("hell", SPAWN.hell, { c: 24, r: 46 }), true);
  const roomArt = await readFile(new URL("../public/sprites/hell-reception-v1.png", import.meta.url));
  const devilArt = await readFile(new URL("../public/sprites/devil-broker-v1.png", import.meta.url));
  assert.ok(roomArt.byteLength > 500_000);
  assert.equal(roomArt.readUInt32BE(16), 1536);
  assert.equal(roomArt.readUInt32BE(20), 1536);
  assert.ok(devilArt.byteLength > 150_000);
});

test("island is a navigable region instead of a single room", () => {
  assert.ok(MAPS.isle.length >= 20);
  assert.ok(MAPS.isle[0].length >= 30);
  assert.equal(blocked("isle", SPAWN.isle.c, SPAWN.isle.r), false);
});

test("starter shoal teaches gathering, gold, gear and boat construction", () => {
  assert.ok(MAPS.shoal.length >= 18);
  assert.ok(MAPS.shoal[0].length >= 26);
  const goals = [
    { id: "wreck", c: 4, r: 14 },
    { id: "bar", c: 19, r: 8 },
    { id: "boat", c: 23, r: 13 },
  ];
  for (const goal of goals) {
    assert.equal(blocked("shoal", goal.c, goal.r), false, `${goal.id} must stand on open ground`);
    assert.equal(reachable("shoal", SPAWN.shoal, goal), true, `${goal.id} must be reachable`);
  }
  const nodes = source.gatherNodes.filter((node) => node.map === "shoal");
  assert.ok(nodes.length >= 7);
  for (const node of nodes) assert.equal(reachable("shoal", SPAWN.shoal, node), true, `${node.id} must be reachable`);
  const amount = (item) => nodes.filter((node) => node.item === item).reduce((sum, node) => sum + node.amount, 0);
  assert.ok(amount("wood") >= 4);
  assert.ok(amount("cloth") >= 2);
  assert.ok(amount("ore") >= 1);
  assert.ok(amount("driftwood") >= 10, "the starter island needs enough reclaimed wood for a useful first camp");
  assert.equal(ITEM.rags.slot, "arm");
  assert.equal(ITEM.shiv.slot, "wep");
  assert.ok(ITEM.mapshard.desc.includes("семичастной"));
  const noll = NPCS.find((npc) => npc.id === "noll");
  assert.ok(noll);
  assert.equal(noll.map, "shoal");
  assert.ok(noll.words.MAP.includes("Три золотых"));
  assert.ok(noll.words.BOAT.includes("Четыре"));
  assert.ok(MOB.crab.hp >= 28, "the tutorial crab must survive long enough to teach its telegraph");
});

test("starter camp is a reachable connected upgrade graph with original art", async () => {
  const camp = BUILDINGS.filter((building) => building.map === "shoal");
  assert.equal(camp.length, 6);
  assert.equal(new Set(camp.map((building) => building.id)).size, camp.length);
  for (const building of camp) {
    assert.equal(blocked("shoal", building.c, building.r), false, `${building.id} must stand on open ground`);
    assert.equal(reachable("shoal", SPAWN.shoal, building), true, `${building.id} must be reachable`);
    assert.equal(building.sheet, "shoal-settlement-v1");
    assert.equal(building.upgrades?.length, 1, `${building.id} needs a second level`);
    for (const dependency of building.requires ?? []) {
      assert.ok(camp.some((candidate) => candidate.id === dependency), `${building.id} depends on a missing camp building`);
    }
  }
  assert.ok(camp.some((building) => building.id === "shorefire" && !building.requires?.length));
  assert.ok(camp.some((building) => building.id === "pier" && building.requires?.includes("workbench")));
  const art = await readFile(new URL("../public/sprites/shoal-settlement-v1.png", import.meta.url));
  assert.ok(art.byteLength > 100_000);
});

test("first-night attackers have open routes to the shorefire", () => {
  const fire = BUILDINGS.find((building) => building.id === "shorefire");
  const watch = BUILDINGS.find((building) => building.id === "watchpost");
  const shelter = BUILDINGS.find((building) => building.id === "shelter");
  assert.ok(fire);
  assert.ok(watch?.requires?.includes("workbench"));
  assert.ok(shelter?.requires?.includes("shorefire"));
  const waves = [
    [[4, 12], [24, 12]],
    [[6, 5], [24, 9], [5, 15]],
    [[5, 6], [24, 7], [21, 16], [8, 16]],
  ];
  for (const points of waves) {
    for (const [c, r] of points) {
      assert.equal(blocked("shoal", c, r), false, `night spawn ${c},${r} must be open`);
      assert.equal(reachable("shoal", { c, r }, fire), true, `night spawn ${c},${r} must reach the shorefire`);
    }
  }
});

test("Aldric has three readable two-step combat paths and production art", async () => {
  const paths = Object.entries(ALDRIC_TALENT_PATHS);
  assert.deepEqual(paths.map(([path]) => path).sort(), ["blade", "oath", "shield"]);
  for (const [path, [first, second]] of paths) {
    assert.equal(TALENTS[first].hero, "aldric");
    assert.equal(TALENTS[first].path, path);
    assert.equal(TALENTS[first].tier, 1);
    assert.equal(TALENTS[second].hero, "aldric");
    assert.equal(TALENTS[second].path, path);
    assert.equal(TALENTS[second].tier, 2);
    assert.equal(TALENTS[second].requires, first);
    assert.ok(TALENTS[first].desc.length >= 28);
    assert.ok(TALENTS[second].desc.length >= 28);
  }
  const actionArt = await readFile(new URL("../public/sprites/hero-aldric-action-v2.png", import.meta.url));
  const shoreActionArt = await readFile(new URL("../public/sprites/hero-aldric-shore-action-v2.png", import.meta.url));
  const skillArt = await readFile(new URL("../public/sprites/aldric-skills-v2.png", import.meta.url));
  assert.ok(actionArt.byteLength > 250_000);
  assert.ok(shoreActionArt.byteLength > 250_000);
  assert.ok(skillArt.byteLength > 250_000);
});

test("starter island lore is discoverable and backed by original art", async () => {
  const finds = source.loreFinds.filter((find) => find.map === "shoal");
  assert.ok(finds.length >= 5);
  assert.equal(new Set(finds.map((find) => find.id)).size, finds.length);
  for (const find of finds) {
    assert.equal(blocked("shoal", find.c, find.r), false, `${find.id} must stand on open ground`);
    assert.equal(reachable("shoal", SPAWN.shoal, find), true, `${find.id} must be reachable`);
    assert.ok(find.title.length >= 8);
    assert.ok(find.text.length >= 80, `${find.id} needs a meaningful environmental story`);
    assert.ok(find.frame >= 0 && find.frame <= 4);
  }
  const islandArt = await readFile(new URL("../public/sprites/island-life-v2.png", import.meta.url));
  const seaArt = await readFile(new URL("../public/sprites/sea-combat-v2.png", import.meta.url));
  assert.ok(islandArt.byteLength > 100_000);
  assert.ok(seaArt.byteLength > 100_000);
});

test("the maiden voyage has a steerable sea corridor and worthy ships", () => {
  assert.ok(MAPS.strait.length >= 20);
  assert.ok(MAPS.strait[0].length >= 40);
  assert.equal(MAPS.strait[SPAWN.strait.r][SPAWN.strait.c], "~");
  assert.ok(MAPS.strait.flat().filter((tile) => tile === "M").length >= 12, "the strait needs visible reefs");
  assert.ok(MOB.skiff.hp >= 40);
  assert.ok(MOB.skiff.atk >= 6);
});

test("island gathering nodes have stable ids and reachable positions", () => {
  const islandNodes = source.gatherNodes.filter((node) => node.map === "isle");
  const ids = source.gatherNodes.map((node) => node.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(islandNodes.length >= 9);
  for (const node of islandNodes) {
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

test("every construction plot is reachable and has three distinct choices", () => {
  const ids = source.sites.map((site) => site.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(source.sites.length, 6);
  for (const site of source.sites) {
    assert.equal(blocked(site.map, site.c, site.r), false, `${site.id} plot must stand on open ground`);
    assert.equal(reachable(site.map, SPAWN[site.map], site), true, `${site.id} plot must be reachable from its map entrance`);
    assert.equal(site.options.length, 3, `${site.id} must offer exactly three readable choices`);
    assert.equal(new Set(site.options.map((option) => option.id)).size, 3, `${site.id} choices must be unique`);
    for (const option of site.options) {
      assert.ok(option.name.length >= 4);
      assert.ok(option.desc.length >= 40, `${site.id}/${option.id} needs environmental lore`);
      assert.ok(option.cost > 0);
    }
  }
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
