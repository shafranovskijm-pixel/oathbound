export type HeroId = "aldric" | "vessa" | "kael";
export type SpellId = "smite" | "guard" | "cleave" | "bolt" | "frost" | "nova" | "shot" | "dash" | "mark";
export type TalentId =
  | "iron"
  | "blood"
  | "wide"
  | "holy"
  | "stamina"
  | "whirl"
  | "mind"
  | "pierce"
  | "freeze"
  | "big"
  | "siphon"
  | "storm"
  | "crit"
  | "swift"
  | "venom"
  | "blink"
  | "luck"
  | "twin";

export type SpellDef = { id: SpellId; name: string; key: string; cost: number; cd: number; desc: string };

export const SPELLS: Record<SpellId, SpellDef> = {
  smite: { id: "smite", name: "Кара", key: "1", cost: 5, cd: 1.4, desc: "Святой удар вперёд." },
  guard: { id: "guard", name: "Страж", key: "2", cost: 6, cd: 6, desc: "Щит на 2.4 с." },
  cleave: { id: "cleave", name: "Размах", key: "3", cost: 4, cd: 2.2, desc: "Круговой удар." },
  bolt: { id: "bolt", name: "Стрела", key: "1", cost: 4, cd: 0.7, desc: "Огненный снаряд." },
  frost: { id: "frost", name: "Иней", key: "2", cost: 6, cd: 2.4, desc: "Замедляет и бьёт." },
  nova: { id: "nova", name: "Вспышка", key: "3", cost: 10, cd: 5, desc: "Кольцо огня вокруг." },
  shot: { id: "shot", name: "Выстрел", key: "1", cost: 3, cd: 0.55, desc: "Стрела из лука." },
  dash: { id: "dash", name: "Рывок", key: "2", cost: 4, cd: 3.2, desc: "Сквозь удар." },
  mark: { id: "mark", name: "Метка", key: "3", cost: 5, cd: 4, desc: "Следующий удар ×2." },
};

export const TALENTS: Record<TalentId, { name: string; desc: string; hero: HeroId }> = {
  iron: { name: "Железная шкура", desc: "+3 брони.", hero: "aldric" },
  blood: { name: "Жажда", desc: "Ближний бой лечит 2 HP.", hero: "aldric" },
  wide: { name: "Широкий клинок", desc: "Дальше и шире удар.", hero: "aldric" },
  holy: { name: "Святое жало", desc: "Кара сильнее и оглушает.", hero: "aldric" },
  stamina: { name: "Жила", desc: "+14 макс. HP.", hero: "aldric" },
  whirl: { name: "Вихрь", desc: "Обычный удар бьёт вокруг.", hero: "aldric" },
  mind: { name: "Ясный ум", desc: "+10 макс. маны.", hero: "vessa" },
  pierce: { name: "Пронзание", desc: "Стрела проходит цель.", hero: "vessa" },
  freeze: { name: "Стужа", desc: "Иней замораживает дольше.", hero: "vessa" },
  big: { name: "Большое кольцо", desc: "Вспышка шире.", hero: "vessa" },
  siphon: { name: "Сифон", desc: "Убийство: +5 MP.", hero: "vessa" },
  storm: { name: "Буря", desc: "Стрела дешевле.", hero: "vessa" },
  crit: { name: "Точка", desc: "25% крит ×2.", hero: "kael" },
  swift: { name: "Лёгкий шаг", desc: "+22 к скорости.", hero: "kael" },
  venom: { name: "Яд", desc: "Выстрел травит.", hero: "kael" },
  blink: { name: "Длинный рывок", desc: "Рывок дальше.", hero: "kael" },
  luck: { name: "Находка", desc: "Больше золота с врагов.", hero: "kael" },
  twin: { name: "Двойной", desc: "20% второй выстрел.", hero: "kael" },
};

export type HeroDef = {
  id: HeroId;
  name: string;
  title: string;
  blurb: string;
  sheet: string;
  hp: number;
  mp: number;
  str: number;
  spd: number;
  armor: number;
  spells: SpellId[];
};

export const HEROES: Record<HeroId, HeroDef> = {
  aldric: {
    id: "aldric",
    name: "Алдрик",
    title: "Клятвоносец",
    blurb: "Клинок и щит. Живёт дольше, бьёт в упор.",
    sheet: "hero-aldric",
    hp: 34,
    mp: 8,
    str: 12,
    spd: 118,
    armor: 2,
    spells: ["smite", "guard", "cleave"],
  },
  vessa: {
    id: "vessa",
    name: "Весса",
    title: "Пепельная",
    blurb: "Огонь и лёд. Кость тонкая, воля жжёт.",
    sheet: "hero-vessa",
    hp: 20,
    mp: 24,
    str: 5,
    spd: 126,
    armor: 0,
    spells: ["bolt", "frost", "nova"],
  },
  kael: {
    id: "kael",
    name: "Каэль",
    title: "Тень тропы",
    blurb: "Скорость, яд, удар из шага.",
    sheet: "hero-kael",
    hp: 24,
    mp: 14,
    str: 8,
    spd: 150,
    armor: 1,
    spells: ["shot", "dash", "mark"],
  },
};

export const HERO_LIST: HeroId[] = ["aldric", "vessa", "kael"];
