import type { MapId } from "./world";

export type BuildId = "hearth" | "forge" | "vault" | "tower" | "barracks" | "gate";
export type WpId = "keep" | "westmere" | "shrine" | "hold" | "forgecamp" | "ridge" | "cape" | "mill" | "isle";

export type Building = {
  id: BuildId;
  name: string;
  cost: number;
  desc: string;
  bonus: string;
  c: number;
  r: number;
  sprite: number;
};

export const BUILDINGS: Building[] = [
  { id: "hearth", name: "Очаг", cost: 25, desc: "Отдых: полное HP, мана и еда.", bonus: "Отдых во дворе", c: 3, r: 3, sprite: 0 },
  { id: "forge", name: "Кузница", cost: 50, desc: "Клинок острее. +3 урона везде.", bonus: "+3 урона", c: 9, r: 3, sprite: 1 },
  { id: "vault", name: "Склеп", cost: 40, desc: "Дань двора. +15% золота с врагов.", bonus: "+15% золота", c: 15, r: 3, sprite: 2 },
  { id: "tower", name: "Башня", cost: 55, desc: "+6 маны. Мана течёт сама.", bonus: "Реген маны", c: 3, r: 10, sprite: 3 },
  { id: "barracks", name: "Казармы", cost: 60, desc: "+8 HP. Лира бьёт сильнее.", bonus: "+8 HP", c: 9, r: 10, sprite: 4 },
  { id: "gate", name: "Врата", cost: 35, desc: "Портал без маны. Камни пути открыты.", bonus: "Свободный портал", c: 15, r: 10, sprite: 5 },
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
