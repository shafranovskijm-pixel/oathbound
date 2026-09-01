import type { ItemId } from "./content";
import type { MapId } from "./world";

export type BuildId =
  | "shorefire"
  | "shelter"
  | "cache"
  | "workbench"
  | "watchpost"
  | "pier"
  | "hearth"
  | "forge"
  | "vault"
  | "tower"
  | "barracks"
  | "gate";
export type WpId = "keep" | "westmere" | "shrine" | "hold" | "forgecamp" | "ridge" | "cape" | "mill" | "isle";

export type Building = {
  id: BuildId;
  map: MapId;
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
  sheet: "keep" | "shoal-settlement-v1";
  upgrades?: {
    cost: number;
    energy: number;
    need: ItemId[];
    bonus: string;
  }[];
};

export const BUILDINGS: Building[] = [
  { id: "shorefire", map: "shoal", name: "Костёр потерпевших", cost: 0, tier: 1, energy: 1, need: ["driftwood"], desc: "Камни восьмого костра снова держат огонь. С него начинается место, куда хочется вернуться.", bonus: "Отдых · центр лагеря", c: 13, r: 10, sprite: 0, sheet: "shoal-settlement-v1", upgrades: [{ cost: 1, energy: 1, need: ["driftwood"], bonus: "Сытный отдых · огонь не гаснет" }] },
  { id: "shelter", map: "shoal", name: "Парусный кров", cost: 0, tier: 1, energy: 1, need: ["driftwood", "driftwood"], requires: ["shorefire"], desc: "Порванный парус становится первой крышей. Дождь по полотну звучит почти как дом.", bonus: "Отдых · защита от шторма", c: 7, r: 14, sprite: 1, sheet: "shoal-settlement-v1", upgrades: [{ cost: 1, energy: 1, need: ["driftwood", "cloth"], bonus: "+1 броня на острове" }] },
  { id: "cache", map: "shoal", name: "Склад прилива", cost: 1, tier: 1, energy: 1, need: ["driftwood"], requires: ["shorefire"], desc: "Сухие бочки и сеть над ними. Теперь море не сможет унести всё нажитое за одну ночь.", bonus: "Запасы лагеря", c: 12, r: 14, sprite: 2, sheet: "shoal-settlement-v1", upgrades: [{ cost: 1, energy: 1, need: ["driftwood"], bonus: "+1 к собранным ресурсам" }] },
  { id: "workbench", map: "shoal", name: "Верстак из плавника", cost: 0, tier: 1, energy: 1, need: ["driftwood", "driftwood"], requires: ["shorefire"], desc: "Неровная доска, камень вместо молота и хороший свет. Этого уже достаточно, чтобы делать вещи руками.", bonus: "Открывает простой крафт", c: 15, r: 15, sprite: 3, sheet: "shoal-settlement-v1", upgrades: [{ cost: 1, energy: 1, need: ["driftwood", "ore"], bonus: "Крафт дешевле на 1 зол." }] },
  { id: "watchpost", map: "shoal", name: "Дозорная мачта", cost: 1, tier: 2, energy: 1, need: ["driftwood", "driftwood"], requires: ["workbench"], desc: "Вторая жизнь сломанной мачты. С площадки видно рифы, крабьи тропы и паруса раньше, чем они видят тебя.", bonus: "Подсветка угроз · защита лагеря", c: 21, r: 10, sprite: 4, sheet: "shoal-settlement-v1", upgrades: [{ cost: 1, energy: 1, need: ["driftwood", "cloth"], bonus: "+2 урона на острове" }] },
  { id: "pier", map: "shoal", name: "Причал Трёх досок", cost: 1, tier: 2, energy: 1, need: ["driftwood", "driftwood"], requires: ["workbench"], desc: "Три доски, четыре сваи и узел, которому можно доверить лодку. Отсюда начинается дорога за картой.", bonus: "Лодке нужно меньше дерева и ткани", c: 22, r: 14, sprite: 5, sheet: "shoal-settlement-v1", upgrades: [{ cost: 1, energy: 1, need: ["driftwood", "driftwood"], bonus: "Укреплённый причал · будущая верфь" }] },
  { id: "hearth", map: "keep", name: "Очаг клятвы", cost: 6, tier: 1, energy: 3, need: ["wood"], desc: "Первый огонь в пустом дворе. Пока он горит, изгнанники знают, куда возвращаться.", bonus: "Отдых во дворе", c: 3, r: 3, sprite: 0, sheet: "keep" },
  { id: "forge", map: "keep", name: "Кузница", cost: 14, tier: 2, energy: 6, need: ["wood", "ore"], requires: ["hearth"], desc: "На старой наковальне ещё виден знак дома. Оскар снова заставит железо помнить клятву.", bonus: "+3 урона", c: 9, r: 3, sprite: 1, sheet: "keep" },
  { id: "vault", map: "keep", name: "Склеп десятины", cost: 12, tier: 2, energy: 5, need: ["cloth", "ore"], requires: ["hearth"], desc: "Монеты павших не тратят дважды. Двор будет брать свою долю с каждого врага.", bonus: "+15% золота", c: 15, r: 3, sprite: 2, sheet: "keep" },
  { id: "tower", map: "keep", name: "Башня прилива", cost: 20, tier: 3, energy: 8, need: ["ore", "cloth", "cloth"], requires: ["forge"], desc: "Камень наверху поёт в такт морю. Здесь магия снова потечёт сама.", bonus: "+6 маны · реген", c: 3, r: 10, sprite: 3, sheet: "keep" },
  { id: "barracks", map: "keep", name: "Казармы щита", cost: 22, tier: 3, energy: 9, need: ["wood", "ore", "hide"], requires: ["forge"], desc: "Пустые койки ждут тех, кто согласится держать стену рядом с тобой.", bonus: "+8 HP · Лира сильнее", c: 9, r: 10, sprite: 4, sheet: "keep" },
  { id: "gate", map: "keep", name: "Врата возвращения", cost: 18, tier: 3, energy: 10, need: ["ore", "cloth"], requires: ["tower"], desc: "Последний камень старого двора. Он помнит дороги, даже когда хозяин их забыл.", bonus: "Свободный портал", c: 15, r: 10, sprite: 5, sheet: "keep" },
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
