import raw from "./oathbound.json";
import type { ItemId } from "./content";
import type { WpId } from "./keep";
import type { MapId } from "./world";

export type SiteSprite = "keep" | "shack" | "beacon" | "cave";

export type SiteOpt = {
  id: string;
  name: string;
  cost: number;
  tier: 1 | 2 | 3;
  energy: number;
  need?: ItemId[];
  desc: string;
  bonus: string;
  sprite: SiteSprite;
  frame: number;
  armor?: number;
  hp?: number;
  mp?: number;
  food?: number;
  gold?: number;
  wood?: number;
  cloth?: number;
  potion?: number;
  craft?: boolean;
  rest?: boolean;
  waypoint?: WpId;
};

export type SiteId = "grove" | "mill" | "ridge" | "marsh" | "cape" | "haven";

export type Site = {
  id: SiteId;
  map: MapId;
  name: string;
  stage: string;
  blurb: string;
  c: number;
  r: number;
  options: SiteOpt[];
};

export type Landmark = { id: string; name: string; c: number; r: number };

export type GatherNode = {
  id: string;
  map: MapId;
  c: number;
  r: number;
  label: string;
  item: ItemId;
  amount: number;
  sprite: number;
};

export const LANDMARKS: Landmark[] = raw.landmarks;
export const SITES: Site[] = raw.sites as Site[];
export const GATHER_NODES: GatherNode[] = raw.gatherNodes as GatherNode[];
export const DATA_CRAFT: { out: ItemId; gold: number; need: ItemId[] }[] = raw.craft as {
  out: ItemId;
  gold: number;
  need: ItemId[];
}[];

export function siteAt(map: MapId, c: number, r: number, dist = 2) {
  return SITES.find((s) => s.map === map && Math.abs(s.c - c) + Math.abs(s.r - r) <= dist) ?? null;
}

export function gatherNodeAt(map: MapId, c: number, r: number, dist = 1) {
  return GATHER_NODES.find((node) => node.map === map && Math.abs(node.c - c) + Math.abs(node.r - r) <= dist) ?? null;
}
