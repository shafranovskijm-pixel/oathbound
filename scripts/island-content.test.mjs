import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { blocked, MAPS, SPAWN } from "../src/game/world.ts";

const source = JSON.parse(await readFile(new URL("../src/game/oathbound.json", import.meta.url), "utf8"));
const publicCopy = JSON.parse(await readFile(new URL("../public/content/oathbound.json", import.meta.url), "utf8"));

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
  for (const out of ["harpoon", "stormcloak", "shellmail"]) {
    const recipe = source.craft.find((candidate) => candidate.out === out);
    assert.ok(recipe, `${out} recipe is missing`);
    assert.ok(recipe.need.length >= 3);
    assert.ok(recipe.gold > 0);
  }
});
