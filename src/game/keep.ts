import type { ItemId } from "./content";
import type { MapId } from "./world";

export type BuildId = "hearth" | "forge" | "vault" | "tower" | "barracks" | "gate";
export type WpId = "keep" | "westmere" | "shrine" | "hold" | "forgecamp" | "ridge" | "cape" | "mill" | "isle";

export type Building = {
  id: BuildId;
  name: string;
  cost: number;
  tier: 1 | 2 | 3;
  energy: number;
  need: ItemId[];
  requires?: BuildId[];
  desc: string;
  bonus: string;
  c: number;
  r: number;
  sprite: number;
};

export const BUILDINGS: Building[] = [
  { id: "hearth", name: "Очаг клятвы", cost: 6, tier: 1, energy: 3, need: ["wood"], desc: "Первый огонь в пустом дворе. Пока он горит, изгнанники знают, куда возвращаться.", bonus: "Отдых во дворе", c: 3, r: 3, sprite: 0 },
  { id: "forge", name: "Кузница", cost: 14, tier: 2, energy: 6, need: ["wood", "ore"], requires: ["hearth"], desc: "На старой наковальне ещё виден знак дома. Оскар снова заставит железо помнить клятву.", bonus: "+3 урона", c: 9, r: 3, sprite: 1 },
  { id: "vault", name: "Склеп десятины", cost: 12, tier: 2, energy: 5, need: ["cloth", "ore"], requires: ["hearth"], desc: "Монеты павших не тратят дважды. Двор будет брать свою долю с каждого врага.", bonus: "+15% золота", c: 15, r: 3, sprite: 2 },
  { id: "tower", name: "Башня прилива", cost: 20, tier: 3, energy: 8, need: ["ore", "cloth", "cloth"], requires: ["forge"], desc: "Камень наверху поёт в такт морю. Здесь магия снова потечёт сама.", bonus: "+6 маны · реген", c: 3, r: 10, sprite: 3 },
  { id: "barracks", name: "Казармы щита", cost: 22, tier: 3, energy: 9, need: ["wood", "ore", "hide"], requires: ["forge"], desc: "Пустые койки ждут тех, кто согласится держать стену рядом с тобой.", bonus: "+8 HP · Лира сильнее", c: 9, r: 10, sprite: 4 },
  { id: "gate", name: "Врата возвращения", cost: 18, tier: 3, energy: 10, need: ["ore", "cloth"], requires: ["tower"], desc: "Последний камень старого двора. Он помнит дороги, даже когда хозяин их забыл.", bonus: "Свободный портал", c: 15, r: 10, sprite: 5 },
];

export const WAYPOINTS: { id: WpId; name: string; map: MapId; c: number; r: number }[] = [
  { id: "keep", name: "Двор клятвы", map: "keep", c: 10, r: 8 },
  { id: "westmere", name: "Вестмер", map: "town", c: 9, r: 11 },
  { id: "shrine", name: "Северный алтарь", map: "over", c: 26, r: 8 },
  { id: "hold", name: "Пасть твердыни", map: "over", c: 42, r: 16 },
  { id: "forgecamp", name: "Костры Оскара", map: "over", c: 41, r: 29 },
  { id: "ridge", name: "Восточный кряж", map: "over", c: 64, r: 20 },
  { id: "cape", name: "Северный мыс", map: "over", c: 42, r: 8 },
  { id: "mill", name: "Южная межа", map: "over", c: 22, r: 38 },
  { id: "isle", name: "Бухта Соляного киля", map: "isle", c: 13, r: 17 },
];
