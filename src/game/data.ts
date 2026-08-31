import raw from "./oathbound.json";
import type { ItemId } from "./content";
import type { WpId } from "./keep";

export type SiteSprite = "keep" | "shack" | "beacon" | "cave";

export type SiteOpt = {
  id: string;
  name: string;
  cost: number;
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
  potion?: number;
  craft?: boolean;
  rest?: boolean;
  waypoint?: WpId;
};

export type SiteId = "grove" | "mill" | "ridge" | "marsh" | "cape";

export type Site = {
  id: SiteId;
  name: string;
  blurb: string;
  c: number;
  r: number;
  options: SiteOpt[];
};

export type Landmark = { id: string; name: string; c: number; r: number };

export const LANDMARKS: Landmark[] = raw.landmarks;
export const SITES: Site[] = raw.sites as Site[];
export const DATA_CRAFT: { out: ItemId; gold: number; need: ItemId[] }[] = raw.craft as {
  out: ItemId;
  gold: number;
  need: ItemId[];
}[];

export function siteAt(c: number, r: number, dist = 2) {
  return SITES.find((s) => Math.abs(s.c - c) + Math.abs(s.r - r) <= dist) ?? null;
}
