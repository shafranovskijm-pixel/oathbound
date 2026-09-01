import {
  ArrowRight,
  Check,
  Coins,
  Crown,
  FlaskConical,
  Hammer,
  Leaf,
  Menu,
  Package,
  ScrollText,
  Shield,
  Shirt,
  Sparkles,
  Sword,
  TreePine,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { ItemId, Slot as EquipmentSlot } from "@/game/content";
import { mountGame, type GameHandle, type Snapshot } from "@/game/engine";
import { HERO_LIST, HEROES, SPELLS, type SpellId } from "@/game/heroes";
import { MAPS } from "@/game/world";

const IDLE: Snapshot = {
  mode: "menu",
  hp: 34,
  maxHp: 34,
  mp: 8,
  maxMp: 8,
  food: 28,
  gold: 80,
  xp: 0,
  level: 1,
  log: [],
  hint: "",
  talk: null,
  items: [],
  party: [],
  quests: [],
  spells: [],
  talents: null,
  hero: null,
  muted: false,
  place: "",
  xpNeed: 36,
  meleeCd: 0,
  buildings: [],
  waypoints: [],
  portalOpen: false,
  inKeep: false,
  canRest: false,
  keepClaimed: false,
  wep: "Ржавый меч",
  arm: "Кожа",
  cloak: "без плаща",
  helm: "без шлема",
  equipment: { wep: "sword", arm: "leather", cloak: null, helm: null },
  tide: null,
  haven: null,
  raid: null,
  guise: "oath",
  goldFlash: 0,
  activeSlot: 0,
  canCraft: false,
  recipes: [],
  you: { c: 14, r: 22, map: "over" },
  sites: [],
  nearSite: null,
  landmarks: [],
  canContinue: false,
};

const ICO: Record<SpellId | "melee" | "portal" | "bag" | "gold" | "food" | "keep" | "way", number> = {
  melee: 0,
  smite: 1,
  guard: 2,
  cleave: 3,
  bolt: 4,
  frost: 5,
  nova: 6,
  shot: 7,
  dash: 8,
  mark: 9,
  portal: 10,
  bag: 11,
  gold: 12,
  food: 13,
  keep: 14,
  way: 15,
};

function HudIco({ id }: { id: keyof typeof ICO }) {
  const i = ICO[id];
  const c = i % 4;
  const r = Math.floor(i / 4);
  return (
    <span
      className="hud-ico"
      style={{ backgroundPosition: `${(c / 3) * 100}% ${(r / 3) * 100}%` }}
      aria-hidden
    />
  );
}

const NPC_FACE: Record<string, string> = {
  edric: "/portraits/edric.png",
  bruna: "/portraits/bruna.png",
  ryn: "/portraits/ryn.png",
  eira: "/portraits/mira.png",
  halric: "/portraits/halric.png",
  lyra: "/portraits/lyra.png",
  mira: "/portraits/mira.png",
  oskar: "/portraits/oskar.png",
  soren: "/portraits/soren.png",
};

const GUISE_RU = { oath: "клятва", mage: "маг", thief: "вор", pirate: "киль" } as const;
const SLOT_RU: Record<EquipmentSlot, string> = { wep: "Оружие", arm: "Броня", cloak: "Плащ", helm: "Шлем" };
const HP_CAP = Math.max(...HERO_LIST.map((id) => HEROES[id].hp));
const MP_CAP = Math.max(...HERO_LIST.map((id) => HEROES[id].mp));

function ItemGlyph({ id, slot, size = "md" }: { id?: ItemId; slot?: EquipmentSlot; size?: "sm" | "md" | "lg" }) {
  const Icon = slot === "wep"
    ? Sword
    : slot === "arm"
      ? Shield
      : slot === "cloak"
        ? Shirt
        : slot === "helm"
          ? Crown
          : id === "potion"
            ? FlaskConical
            : id === "wood" || id === "driftwood"
              ? TreePine
              : id === "herb" || id === "kelp"
                ? Leaf
                : Package;
  const tone = slot
    ? "is-gear"
    : id === "stormheart" || id === "tide" || id === "codex" || id === "mark"
      ? "is-relic"
      : id === "potion" || id === "food"
        ? "is-consumable"
        : "is-material";
  return (
    <span className={`item-glyph ${tone} is-${size}`} aria-hidden>
      <Icon />
    </span>
  );
}

function HeroPaperDoll({ heroId, equipment }: { heroId: keyof typeof HEROES; equipment: Record<EquipmentSlot, ItemId | null> }) {
  const hero = HEROES[heroId];
  const cloak = equipment.cloak;
  const armor = equipment.arm;
  const helm = equipment.helm;
  const weapon = equipment.wep;
  const visibleLayers = [cloak, armor, helm, weapon].filter(Boolean).length;
  return (
    <div className="paper-doll">
      <div className="paper-doll-stage" aria-label={`Внешность героя: ${visibleLayers} предмета экипировки`}>
        <span className="paper-doll-aura" aria-hidden />
        {cloak && cloak !== "sash" ? (
          <svg className={`paper-doll-layer is-cloak cloak-${cloak}`} viewBox="0 0 128 128" aria-hidden>
            <path d="M42 46 Q64 38 86 46 L96 109 Q80 120 64 122 Q48 120 32 109 Z" />
            {cloak === "stormcloak" ? <path className="gear-detail" d="M37 84 Q64 103 91 84 M39 96 Q64 114 89 96" /> : null}
          </svg>
        ) : null}
        <span
          className="paper-doll-base"
          style={{ backgroundImage: `url(/sprites/${hero.sheet}.png)` }}
          aria-hidden
        />
        <svg className={`paper-doll-layer is-gear armor-${armor ?? "none"} helm-${helm ?? "none"} weapon-${weapon ?? "none"}`} viewBox="0 0 128 128" aria-hidden>
          {armor === "chain" ? (
            <>
              <path className="gear-fill armor-fill" d="M43 48 Q64 39 85 48 L87 78 Q64 89 41 78 Z" />
              <path className="gear-detail" d="M46 54 L82 75 M46 64 L75 81 M82 54 L46 75 M82 64 L53 81" />
            </>
          ) : null}
          {armor === "shellmail" ? (
            <>
              <path className="gear-fill armor-fill" d="M39 49 Q64 38 89 49 L88 80 Q64 92 40 80 Z" />
              <path className="gear-detail" d="M44 56 Q50 48 56 56 Q62 48 68 56 Q74 48 80 56 M44 69 Q50 61 56 69 Q62 61 68 69 Q74 61 80 69" />
            </>
          ) : null}
          {cloak === "sash" ? <path className="gear-fill sash-fill" d="M43 48 L83 80 L77 87 L38 55 Z" /> : null}
          {helm ? (
            <>
              <path className="gear-fill helm-fill" d="M44 34 Q64 13 84 34 L82 47 Q64 54 46 47 Z" />
              <path className="gear-detail" d="M48 37 Q64 29 80 37" />
              {helm === "firecrown" ? <path className="crown-flame" d="M46 35 L49 18 L58 28 L64 12 L70 28 L79 18 L82 35 Z" /> : null}
            </>
          ) : null}
          {weapon === "harpoon" ? (
            <>
              <path className="weapon-line" d="M86 85 L111 30" />
              <path className="weapon-fill" d="M107 35 L117 21 L114 39 L108 34 L101 31 Z" />
            </>
          ) : weapon ? (
            <>
              <path className="weapon-line" d="M88 86 L108 42" />
              <path className="weapon-fill" d="M104 46 L114 29 L111 49 Z" />
              <path className="weapon-line" d="M99 52 L113 58" />
            </>
          ) : null}
        </svg>
      </div>
      <div className="paper-doll-caption">
        <span><Sparkles /> {visibleLayers}/4 слоя видны в мире</span>
        <p>{hero.name} · {hero.title}</p>
      </div>
    </div>
  );
}

function Stick({ onChange }: { onChange: (x: number, y: number) => void }) {
  const root = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let pid: number | null = null;
    const upd = (cx: number, cy: number) => {
      const r = el.getBoundingClientRect();
      let dx = (cx - (r.left + r.width / 2)) / (r.width / 2);
      let dy = (cy - (r.top + r.height / 2)) / (r.height / 2);
      const m = Math.hypot(dx, dy);
      if (m > 1) {
        dx /= m;
        dy /= m;
      }
      setKnob({ x: dx, y: dy });
      onChange(dx, dy);
    };
    const down = (e: PointerEvent) => {
      pid = e.pointerId;
      el.setPointerCapture(e.pointerId);
      upd(e.clientX, e.clientY);
    };
    const move = (e: PointerEvent) => {
      if (pid !== e.pointerId) return;
      upd(e.clientX, e.clientY);
    };
    const up = (e: PointerEvent) => {
      if (pid !== e.pointerId) return;
      pid = null;
      setKnob({ x: 0, y: 0 });
      onChange(0, 0);
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [onChange]);
  return (
    <div ref={root} className="relative size-24 rounded-full border border-border bg-surface/80 touch-none pointer-events-auto" aria-label="Ход">
      <div className="absolute size-11 rounded-full bg-accent/90" style={{ left: `calc(50% + ${knob.x * 28}px - 22px)`, top: `calc(50% + ${knob.y * 28}px - 22px)` }} />
    </div>
  );
}

function Slot({
  label,
  name,
  icon,
  ready,
  max,
  disabled,
  on,
  onClick,
}: {
  label: string;
  name?: string;
  icon: ReactNode;
  ready: number;
  max: number;
  disabled?: boolean;
  on?: boolean;
  onClick: () => void;
}) {
  const frac = max > 0 ? Math.min(1, ready / max) : 0;
  return (
    <button
      type="button"
      className={`hud-slot${on ? " is-on" : ""}`}
      disabled={disabled}
      onClick={onClick}
      aria-label={name ?? label}
      title={name ?? label}
    >
      {icon}
      {frac > 0 ? <span className="hud-cd" style={{ height: `${frac * 100}%` }} /> : null}
      <span className="absolute bottom-0.5 right-1 font-mono text-xs text-subtle">{label}</span>
    </button>
  );
}

function WorldAtlas({
  snap,
  onClose,
  onTravel,
}: {
  snap: Snapshot;
  onClose: () => void;
  onTravel: (id: string) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const over = MAPS.over;
    const rows = over.length;
    const cols = over[0].length;
    const cssW = parent.clientWidth;
    const cssH = parent.clientHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    const pad = 12;
    const scale = Math.min((cssW - pad * 2) / cols, (cssH - pad * 2) / rows);
    const ox = pad + (cssW - pad * 2 - cols * scale) / 2;
    const oy = pad + (cssH - pad * 2 - rows * scale) / 2;
    const color: Record<string, string> = {
      "~": "#1a3340",
      M: "#4a4a48",
      W: "#3a3a3a",
      f: "#2a4a32",
      p: "#8a7a5a",
      T: "#8a7a5a",
      L: "#a04020",
      ",": "#c4b48a",
      s: "#3a4a32",
      K: "#6a5a40",
      H: "#9ab0d0",
      D: "#4a3a3a",
      F: "#5a4a32",
    };
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.fillStyle = color[over[r][c]] ?? "#3d5c4a";
        ctx.fillRect(ox + c * scale, oy + r * scale, Math.ceil(scale + 0.5), Math.ceil(scale + 0.5));
      }
    }
    ctx.font = "11px IBM Plex Mono, monospace";
    ctx.textAlign = "center";
    for (const m of snap.landmarks) {
      ctx.fillStyle = "rgba(232,228,216,0.85)";
      ctx.fillText(m.name, ox + m.c * scale, oy + m.r * scale - 4);
    }
    for (const s of snap.sites) {
      if (s.map !== "over") continue;
      ctx.fillStyle = s.built ? "#d8c070" : "rgba(232,228,216,0.55)";
      ctx.fillRect(ox + s.c * scale - 3, oy + s.r * scale - 3, 6, 6);
    }
    if (snap.you.map === "over") {
      ctx.fillStyle = "#e8e4d8";
      ctx.beginPath();
      ctx.arc(ox + snap.you.c * scale, oy + snap.you.r * scale, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [snap.landmarks, snap.sites, snap.you]);
  return (
    <div className="absolute inset-0 flex items-stretch justify-center gap-4 p-4 md:p-6 pointer-events-auto bg-bg hud-ink">
      <div className="atlas-frame flex-1 min-w-0">
        <canvas ref={ref} className="h-full w-full" aria-label="Карта мира" />
      </div>
      <aside className="atlas-legend w-44 shrink-0 overflow-auto">
        <p className="font-mono text-xs tracking-widest text-muted">КАРТА</p>
        <h2 className="mt-1 font-display text-xl">Вестмер</h2>
        <p className="mt-2 text-xs text-subtle">Белая точка — ты. Жёлтый квадрат — постройка.</p>
        <ul className="mt-4">
          {snap.waypoints.map((w) => (
            <li key={w.id}>
              <button type="button" disabled={!w.unlocked} onClick={() => onTravel(w.id)} className="choice">
                <p className="text-sm">{w.name}</p>
                <p className="text-xs text-subtle">{w.unlocked ? "Камень открыт" : "Ещё не тронут"}</p>
              </button>
            </li>
          ))}
        </ul>
        <Button className="mt-4" variant="ghost" size="sm" onClick={onClose}>Закрыть</Button>
      </aside>
    </div>
  );
}

export function Oathbound() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameHandle | null>(null);
  const [snap, setSnap] = useState<Snapshot>(IDLE);
  const [touch, setTouch] = useState(false);

  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)");
    const upd = () => setTouch(coarse.matches || window.innerWidth < 820);
    upd();
    coarse.addEventListener("change", upd);
    window.addEventListener("resize", upd);
    return () => {
      coarse.removeEventListener("change", upd);
      window.removeEventListener("resize", upd);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const h = mountGame(canvas, setSnap);
    gameRef.current = h;
    return () => {
      h.destroy();
      gameRef.current = null;
    };
  }, []);

  const g = gameRef;
  const playing = snap.mode !== "menu";
  const hpPct = snap.maxHp ? (snap.hp / snap.maxHp) * 100 : 0;
  const mpPct = snap.maxMp ? (snap.mp / snap.maxMp) * 100 : 0;
  const xpPct = snap.xpNeed ? Math.min(100, (snap.xp / snap.xpNeed) * 100) : 0;
  const hero = snap.hero ? HEROES[snap.hero] : null;
  const open = snap.mode === "play" || snap.mode === "way" || snap.mode === "build" || snap.mode === "site";
  const equippedSlots = (["wep", "arm", "cloak", "helm"] as EquipmentSlot[]).map((slot) => ({
    slot,
    item: snap.items.find((item) => item.id === snap.equipment[slot]),
  }));
  const equipmentItems = snap.items.filter((item) => item.slot);
  const inventoryItems = snap.items.filter((item) => !item.slot);
  const latestEvent = snap.log.at(-1);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-bg text-fg">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" aria-label="Oathbound" />
      <div className="absolute inset-0 pointer-events-none">
        {playing && hero ? (
          <aside className="hero-status-card absolute top-3 left-3 flex gap-3 pointer-events-none">
            <img
              src={`/portraits/${hero.id}.png`}
              alt={hero.name}
              width={72}
              height={96}
              className="h-20 w-14 rounded-md object-cover object-top border border-border-strong pointer-events-none"
            />
            <div className="w-40">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold leading-none">{hero.name}</p>
                  <p className="mt-1 text-[10px] text-muted">{snap.place}</p>
                </div>
                <span className="status-badge">{GUISE_RU[snap.guise]}</span>
              </div>
              <div className="stat-bar mt-2"><i className="bg-danger" style={{ width: `${hpPct}%` }} /></div>
              <div className="stat-bar mt-1"><i className="bg-ok" style={{ width: `${mpPct}%` }} /></div>
              <div className="stat-bar mt-1 h-1"><i className="bg-accent" style={{ width: `${xpPct}%` }} /></div>
              <p className="mt-1.5 font-mono text-[10px] tabular-nums text-muted">
                HP {Math.ceil(snap.hp)}/{snap.maxHp} · MP {Math.floor(snap.mp)}/{snap.maxMp} · УР {snap.level}
              </p>
              {snap.tide ? (
                <div className="mt-2">
                  <p className="font-mono text-[10px] tracking-widest text-muted">{snap.tide.label}</p>
                  <div className="stat-bar mt-1 h-1"><i className="bg-ok" style={{ width: `${Math.round(snap.tide.level * 100)}%` }} /></div>
                </div>
              ) : null}
              {snap.tide && snap.haven ? (
                <p className="mt-2 text-[10px] leading-normal text-subtle">{snap.haven.name}: {snap.haven.effect}</p>
              ) : null}
            </div>
          </aside>
        ) : null}

        {playing ? (
          <div className="absolute top-3 right-3 flex flex-col items-end gap-2 pointer-events-auto hud-ink">
            <div className="flex items-center gap-4">
              <span className="hud-stat">
                <HudIco id="gold" />
                <span className={snap.goldFlash > 0 ? "text-accent" : ""}>{snap.gold}</span>
              </span>
              <span className="hud-stat">
                <HudIco id="food" />
                <span>{Math.floor(snap.food)}</span>
              </span>
            </div>
            <div className="flex gap-2">
              <button type="button" className="hud-slot" onClick={() => g.current?.toggleInv()} aria-label="Сумка" title="Сумка">
                <HudIco id="bag" />
              </button>
              <button type="button" className="hud-slot" onClick={() => g.current?.toggleJournal()} aria-label="Журнал" title="Журнал">
                <ScrollText className="size-5" />
              </button>
              <button type="button" className="hud-slot" onClick={() => g.current?.toggleMute()} aria-label="Звук" title="Звук">
                {snap.muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
              </button>
              <button type="button" className="hud-slot" onClick={() => g.current?.pause()} aria-label="Пауза" title="Пауза">
                <Menu className="size-5" />
              </button>
            </div>
          </div>
        ) : null}

        {playing && snap.raid?.active ? (
          <div className="absolute top-3 left-1/2 w-[min(24rem,48vw)] -translate-x-1/2 rounded-md border border-danger/50 bg-bg/90 px-4 py-2 shadow-lg backdrop-blur-sm hud-ink">
            <div className="flex items-center justify-between gap-3 font-mono text-[10px] tracking-widest">
              <span className="text-danger">ШТУРМ · {snap.raid.status}</span>
              <span className="tabular-nums text-muted">{Math.ceil(snap.raid.havenHp)}/{snap.raid.maxHavenHp}</span>
            </div>
            <div className="stat-bar mt-1.5 h-2">
              <i
                className="bg-danger transition-[width] duration-150"
                style={{ width: `${snap.raid.maxHavenHp ? Math.max(0, (snap.raid.havenHp / snap.raid.maxHavenHp) * 100) : 0}%` }}
              />
            </div>
          </div>
        ) : null}

        {open ? (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-4 flex flex-wrap items-end justify-center gap-2 pointer-events-auto max-w-xl px-3 hud-ink">
            <Slot label="ЛКМ" name="Удар" icon={<HudIco id="melee" />} ready={snap.meleeCd} max={0.4} disabled={snap.mode !== "play"} on={snap.activeSlot < 0} onClick={() => g.current?.select(-1)} />
            {snap.spells.map((s, i) => (
              <Slot
                key={s.id}
                label={s.key}
                name={s.name}
                icon={<HudIco id={s.id} />}
                ready={s.ready}
                max={SPELLS[s.id].cd}
                disabled={snap.mode !== "play" || snap.mp < s.cost}
                on={snap.activeSlot === i}
                onClick={() => g.current?.select(i)}
              />
            ))}
            <Slot label="T" name={snap.keepClaimed ? "Врата" : "Врата закрыты"} icon={<HudIco id="portal" />} ready={0} max={1} disabled={!snap.keepClaimed || snap.mode !== "play"} onClick={() => g.current?.townPortal()} />
            <Slot label="" name={snap.inKeep ? "Двор" : snap.keepClaimed ? "Во Двор" : "Найди Двор"} icon={<HudIco id="keep" />} ready={0} max={1} disabled={!snap.keepClaimed} onClick={() => g.current?.goCastle()} />
            <Slot label="M" name="Карта мира" icon={<HudIco id="way" />} ready={0} max={1} onClick={() => g.current?.toggleAtlas()} />
            {snap.inKeep || snap.nearSite ? (
              <Button variant="ghost" size="sm" onClick={() => g.current?.toggleBuild()}>Строить / ремесло</Button>
            ) : null}
            {snap.canRest ? (
              <Button variant="ghost" size="sm" onClick={() => g.current?.rest()}>Отдых</Button>
            ) : null}
            {snap.portalOpen && snap.inKeep ? (
              <Button variant="ghost" size="sm" onClick={() => g.current?.townPortal()}>Обратно</Button>
            ) : null}
          </div>
        ) : null}

        {playing && snap.mode === "play" ? (
          <div className="world-guidance absolute left-3 top-36 w-[min(22rem,calc(100vw-1.5rem))]">
            <p className="font-mono text-[10px] tracking-[0.2em] text-accent">СЕЙЧАС</p>
            <p className="mt-1 text-sm font-medium leading-snug text-fg">{snap.hint}</p>
            {latestEvent ? (
              <div className="event-line mt-2">
                <Sparkles className="size-3.5 shrink-0" />
                <span>{latestEvent}</span>
              </div>
            ) : null}
          </div>
        ) : null}

        {snap.mode === "menu" ? (
          <div className="absolute inset-0 flex items-center justify-center p-3 md:p-8 pointer-events-auto overflow-auto hud-ink">
            <div className="w-full max-w-5xl py-6">
              <header className="mb-7 text-center">
                <p className="font-mono text-xs tracking-[0.35em] text-muted">ДВОР · КОДЕКС · КИЛЬ</p>
                <h1 className="mt-2 font-display text-4xl font-semibold tracking-wide md:text-6xl">OATHBOUND</h1>
                <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted">
                  Верни украденный Кодекс, подними свой Двор и реши, какой клятве принадлежит твоё имя.
                </p>
                {snap.canContinue ? (
                  <Button className="mt-5 min-w-56" onClick={() => g.current?.continueGame()}>
                    Продолжить
                  </Button>
                ) : null}
                <p className="mt-5 font-mono text-xs tracking-widest text-subtle">{snap.canContinue ? "НОВАЯ ИГРА" : "ВЫБЕРИ ГЕРОЯ"}</p>
              </header>
              <div className="grid gap-8 md:grid-cols-3">
                {HERO_LIST.map((id) => {
                  const h = HEROES[id];
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => g.current?.start(id)}
                      className="group flex flex-col items-center text-center"
                    >
                      <img
                        src={`/portraits/${id}.png`}
                        alt={h.name}
                        className="h-48 md:h-56 w-full object-contain object-bottom"
                      />
                      <div className="relative mt-1 flex h-24 items-end justify-center">
                        <span className="absolute bottom-2 h-3 w-16 rounded-full bg-fg/20" aria-hidden />
                        <div
                          className="hero-sprite"
                          style={{ backgroundImage: `url(/sprites/${h.sheet}.png)` }}
                          aria-hidden
                        />
                      </div>
                      <p className="mt-1 font-display text-3xl font-semibold">{h.name}</p>
                      <p className="mt-1 text-xs text-muted">{h.title}</p>
                      <div className="mt-3 w-36">
                        <div className="stat-bar h-2"><i className="bg-danger" style={{ width: `${(h.hp / HP_CAP) * 100}%` }} /></div>
                        <div className="stat-bar mt-1 h-2"><i className="bg-ok" style={{ width: `${(h.mp / MP_CAP) * 100}%` }} /></div>
                      </div>
                      <div className="mt-4 flex justify-center gap-3">
                        {h.spells.map((sid) => (
                          <span key={sid} className="pick-spell">
                            <span className="hud-slot" aria-hidden>
                              <HudIco id={sid} />
                            </span>
                            <span className="font-mono text-xs text-muted whitespace-nowrap">{SPELLS[sid].name}</span>
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}

        {snap.mode === "pause" ? (
          <div className="absolute inset-0 flex items-center justify-center p-5 pointer-events-auto bg-bg/75 backdrop-blur-sm hud-ink">
            <div className="overlay-card w-full max-w-sm text-center">
              <p className="font-mono text-xs tracking-widest text-muted">ИГРА СОХРАНЕНА</p>
              <h2 className="mt-2 font-display text-3xl font-semibold">Пауза</h2>
              <div className="mt-6 flex flex-col gap-2">
                <Button onClick={() => g.current?.pause()}>Продолжить</Button>
                <Button variant="ghost" onClick={() => g.current?.returnToMenu()}>Сохранить и выйти в меню</Button>
              </div>
              <p className="mt-4 font-mono text-xs text-subtle">Esc — продолжить</p>
            </div>
          </div>
        ) : null}

        {snap.mode === "talk" && snap.talk ? (
          <div className="talk-stage pointer-events-auto">
            <img
              src={NPC_FACE[snap.talk.portrait] ?? `/portraits/${snap.talk.portrait}.png`}
              alt={snap.talk.name}
              width={192}
              height={272}
              className="talk-face"
            />
            <div className="talk-body">
              <p className="font-mono text-xs tracking-widest text-muted">{snap.talk.role}</p>
              <p className="font-display text-3xl md:text-4xl leading-none mt-1">{snap.talk.name}</p>
              {snap.talk.ask ? (
                <p className="talk-you mt-3">ты — {snap.talk.ask}</p>
              ) : null}
              <p className="talk-line mt-3">{snap.talk.text}</p>
              <ol className="talk-list mt-4">
                {snap.talk.keys.map((k, i) => (
                  <li key={k.id}>
                    <button type="button" className="talk-ask" onClick={() => g.current?.keyword(k.id)}>
                      <span className="talk-num">{i + 1}</span>
                      <span>{k.label}</span>
                    </button>
                  </li>
                ))}
              </ol>
              <button type="button" className="talk-leave" onClick={() => g.current?.closePanel()}>
                Уйти
              </button>
            </div>
          </div>
        ) : null}

        {snap.mode === "way" ? (
          <div className="absolute inset-0 flex items-center justify-center p-5 pointer-events-auto hud-ink">
            <div className="overlay-card w-full max-w-md">
              <p className="font-mono text-xs tracking-widest text-muted">КАМНИ ПУТИ</p>
              <h2 className="mt-1 font-display text-xl font-semibold">Телепорт</h2>
              <ul className="mt-4">
                {snap.waypoints.map((w) => (
                  <li key={w.id}>
                    <button type="button" disabled={!w.unlocked} onClick={() => g.current?.travel(w.id)} className="choice">
                      <p className="text-sm font-medium">{w.name}</p>
                      <p className="text-xs text-subtle mt-1">{w.unlocked ? "Открыт" : "Ещё не тронут"}</p>
                    </button>
                  </li>
                ))}
              </ul>
              <Button className="mt-4" variant="ghost" onClick={() => g.current?.closePanel()}>Закрыть</Button>
            </div>
          </div>
        ) : null}

        {snap.mode === "atlas" ? (
          <WorldAtlas snap={snap} onClose={() => g.current?.closePanel()} onTravel={(id) => g.current?.travel(id as never)} />
        ) : null}

        {snap.mode === "site" ? (
          <div className="absolute inset-0 flex items-center justify-center p-5 pointer-events-auto overflow-auto hud-ink">
            <div className="overlay-card w-full max-w-lg">
              {(() => {
                const s = snap.sites.find((x) => x.id === snap.nearSite) ?? snap.sites[0];
                if (!s) return <p>Нет участка.</p>;
                return (
                  <>
                    <p className="font-mono text-xs tracking-widest text-muted">УЧАСТОК</p>
                    <h2 className="mt-1 font-display text-xl font-semibold">{s.name}</h2>
                    <p className="mt-2 text-sm text-muted">{s.blurb}</p>
                    {s.built ? (
                      <p className="mt-4 text-sm text-ok">Стоит: {s.built}</p>
                    ) : (
                      <ul className="mt-4">
                        {s.options.map((o) => (
                          <li key={o.id} className="choice flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium">{o.name}</p>
                              <p className="text-xs text-muted mt-1">{o.desc}</p>
                              <p className="text-xs text-subtle mt-1">{o.bonus}</p>
                            </div>
                            <Button size="sm" variant="ghost" disabled={!o.ok} onClick={() => g.current?.raiseSite(s.id, o.id)}>{o.cost} зол.</Button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <Button className="mt-4" variant="ghost" onClick={() => g.current?.closePanel()}>Закрыть</Button>
                  </>
                );
              })()}
            </div>
          </div>
        ) : null}

        {snap.mode === "build" ? (
          <div className="absolute inset-0 flex items-center justify-center p-3 md:p-5 pointer-events-auto overflow-auto hud-ink">
            <div className={`overlay-card w-full ${snap.canCraft ? "max-w-5xl" : "max-w-2xl"}`}>
              <header className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs tracking-widest text-muted">{snap.inKeep ? "ДВОР КЛЯТВЫ" : "ОСТРОВНАЯ МАСТЕРСКАЯ"}</p>
                  <h2 className="mt-1 font-display text-2xl font-semibold">{snap.inKeep ? "Стройка и ремесло" : "Создать предмет"}</h2>
                  <p className="mt-1 text-sm text-muted">Готовые рецепты стоят первыми. Нажми один раз — предмет сразу появится в сумке.</p>
                </div>
                <button type="button" className="icon-close" onClick={() => g.current?.closePanel()} aria-label="Закрыть"><X /></button>
              </header>
              {snap.inKeep ? (
                <ul className="mt-5 grid gap-2 md:grid-cols-3">
                  {snap.buildings.map((b) => (
                    <li key={b.id} className="build-card flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{b.name}</p>
                        <p className="text-xs text-muted mt-1">{b.desc}</p>
                      </div>
                      {b.built ? (
                        <span className="font-mono text-xs text-ok">стоит</span>
                      ) : (
                        <Button size="sm" variant="ghost" disabled={!b.ok} onClick={() => g.current?.build(b.id)}>{b.cost} зол.</Button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}
              {snap.canRest ? <Button className="mt-4" variant="ghost" onClick={() => g.current?.rest()}>Отдых у очага</Button> : null}
              {snap.canCraft ? (
                <div className="mt-6">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-mono text-xs tracking-widest text-muted">РЕЦЕПТЫ</p>
                    <span className="flex items-center gap-1.5 font-mono text-xs text-accent"><Coins className="size-4" />{snap.gold}</span>
                  </div>
                  <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {[...snap.recipes].sort((a, b) => Number(b.ok) - Number(a.ok)).map((r) => (
                      <li key={r.out} className="recipe-cell">
                        <button
                          type="button"
                          className={`recipe-card ${r.ok ? "is-ready" : ""}`}
                          disabled={!r.ok}
                          onClick={() => g.current?.craft(r.out)}
                        >
                          <div className="flex items-start gap-3 text-left">
                            <ItemGlyph id={r.out} slot={r.slot} size="lg" />
                            <div className="min-w-0">
                              <p className="font-display text-lg font-semibold leading-tight">{r.name}</p>
                              <p className="mt-1 text-xs leading-snug text-muted">{r.desc}</p>
                              <p className="mt-1.5 font-mono text-[10px] uppercase tracking-wider text-subtle">
                                {r.slot ? `Создастся и сразу наденется · ${SLOT_RU[r.slot]}` : "Создастся и попадёт в сумку"}
                              </p>
                            </div>
                            {r.ok ? <span className="ready-mark" title="Можно создать"><Check /></span> : null}
                          </div>
                          <div className="mt-4 flex flex-wrap gap-1.5 text-left">
                            {r.need.map((part) => (
                              <span key={part.id} className={`ingredient-chip ${part.ok ? "is-enough" : "is-missing"}`}>
                                <ItemGlyph id={part.id} size="sm" />
                                {part.name} <b>{part.have}/{part.need}</b>
                              </span>
                            ))}
                            <span className={`ingredient-chip ${snap.gold >= r.gold ? "is-enough" : "is-missing"}`}>
                              <Coins className="size-3.5" /> золото <b>{snap.gold}/{r.gold}</b>
                            </span>
                          </div>
                          <span className="craft-action">
                            <Hammer />
                            {r.ok ? "Нажми, чтобы создать" : "Собери недостающее"}
                            {r.ok ? <ArrowRight /> : null}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {snap.mode === "talent" && snap.talents ? (
          <div className="absolute inset-0 flex items-center justify-center p-5 pointer-events-auto hud-ink">
            <div className="overlay-card w-full max-w-lg">
              <p className="font-mono text-xs tracking-widest text-muted">УРОВЕНЬ {snap.level}</p>
              <h2 className="mt-1 font-display text-xl font-semibold">Талант</h2>
              <div className="mt-4">
                {snap.talents.map((t) => (
                  <button key={t.id} type="button" className="choice" onClick={() => g.current?.pickTalent(t.id)}>
                    <p className="font-display text-lg">{t.name}</p>
                    <p className="text-sm text-muted mt-1">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {snap.mode === "inv" ? (
          <div className="absolute inset-0 flex items-center justify-center p-3 md:p-5 pointer-events-auto hud-ink">
            <div className="overlay-card inventory-shell w-full max-w-5xl">
              <header className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs tracking-widest text-muted">СНАРЯЖЕНИЕ И ДОБЫЧА</p>
                  <h2 className="mt-1 font-display text-2xl font-semibold">Сумка</h2>
                  <p className="mt-1 text-sm text-muted">Найденная экипировка меняет внешний вид героя. Выбери вещь и нажми «Надеть».</p>
                </div>
                <button type="button" className="icon-close" onClick={() => g.current?.closePanel()} aria-label="Закрыть"><X /></button>
              </header>

              <section className="mt-5">
                <p className="font-mono text-[10px] tracking-[0.2em] text-muted">НАДЕТО СЕЙЧАС</p>
                <div className="inventory-loadout mt-2">
                  {snap.hero ? <HeroPaperDoll heroId={snap.hero} equipment={snap.equipment} /> : null}
                  <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
                    {equippedSlots.map(({ slot, item }) => (
                      <div key={slot} className={`equipment-slot ${item ? "is-filled" : ""}`}>
                        <ItemGlyph id={item?.id} slot={slot} />
                        <div className="min-w-0">
                          <p className="font-mono text-[10px] uppercase tracking-wider text-muted">{SLOT_RU[slot]}</p>
                          <p className="mt-0.5 truncate text-sm font-medium">{item?.name ?? "Пусто"}</p>
                          <p className="mt-1 text-[10px] leading-tight text-subtle">{item ? "Отображается на герое" : "Найди или создай предмет"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {equipmentItems.length ? (
                <section className="mt-6">
                  <p className="font-mono text-[10px] tracking-[0.2em] text-muted">ЭКИПИРОВКА</p>
                  <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {equipmentItems.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          className={`item-card w-full text-left ${item.on ? "is-equipped" : ""}`}
                          disabled={item.on}
                          onClick={() => g.current?.equip(item.id)}
                        >
                          <ItemGlyph id={item.id} slot={item.slot} size="lg" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold">{item.name}</p>
                                <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted">{item.slot ? SLOT_RU[item.slot] : "Предмет"}</p>
                              </div>
                              {item.on ? <span className="equipped-badge"><Check /> Надето</span> : null}
                            </div>
                            <p className="mt-2 text-xs leading-snug text-muted">{item.desc}</p>
                            <span className="equip-action">
                              {item.on ? "Уже видно на герое" : "Нажми карточку, чтобы надеть"}
                              {!item.on ? <ArrowRight /> : null}
                            </span>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <section className="mt-6">
                <p className="font-mono text-[10px] tracking-[0.2em] text-muted">МАТЕРИАЛЫ И ВАЖНЫЕ ПРЕДМЕТЫ</p>
                {inventoryItems.length ? (
                  <ul className="mt-2 grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                    {inventoryItems.map((item) => (
                      <li key={item.id} className="supply-card">
                        <ItemGlyph id={item.id} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium leading-tight">{item.name}</p>
                            {item.count > 1 ? <span className="item-count">×{item.count}</span> : null}
                          </div>
                          <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted">{item.desc}</p>
                          {item.id === "potion" ? (
                            <Button className="mt-2 w-full" size="sm" variant="ghost" onClick={() => g.current?.usePotion()}>Использовать</Button>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : <p className="mt-2 text-sm text-muted">Пока пусто. Ресурсы и трофеи светятся на земле — просто кликни по ним.</p>}
              </section>
            </div>
          </div>
        ) : null}

        {snap.mode === "journal" ? (
          <div className="absolute inset-0 flex items-center justify-center p-5 pointer-events-auto hud-ink">
            <div className="overlay-card w-full max-w-sm">
              <h2 className="font-display text-xl font-semibold">Клятва</h2>
              <ul className="mt-4 space-y-2">
                {snap.quests.map((q) => (
                  <li key={q.text} className={`text-sm leading-normal ${q.done ? "text-ok line-through" : "text-fg"}`}>{q.text}</li>
                ))}
              </ul>
              <Button className="mt-5" variant="ghost" onClick={() => g.current?.closePanel()}>Закрыть</Button>
            </div>
          </div>
        ) : null}

        {snap.mode === "win" ? (
          <div className="absolute inset-0 flex items-center justify-center p-5 pointer-events-auto hud-ink">
            <div className="overlay-card w-full max-w-sm">
              <p className="font-mono text-xs tracking-widest text-muted">КЛЯТВА СДЕРЖАНА</p>
              <h2 className="mt-2 font-display text-2xl font-semibold">Кодекс дома</h2>
              <p className="mt-3 text-sm text-muted leading-normal">Халрик принимает книгу. Двор стоит. Имя помнят.</p>
              <Button className="mt-5" variant="ghost" onClick={() => g.current?.start(snap.hero ?? "aldric")}>Ещё раз</Button>
            </div>
          </div>
        ) : null}

        {snap.mode === "dead" ? (
          <div className="absolute inset-0 flex items-center justify-center p-5 pointer-events-auto hud-ink">
            <div className="overlay-card w-full max-w-sm">
              <h2 className="font-display text-2xl font-semibold">Голод сильнее меча</h2>
              <p className="mt-3 text-sm text-muted">Очаг во дворе кормит. Пока его нет — Бруна.</p>
              <Button className="mt-5" variant="ghost" onClick={() => g.current?.start(snap.hero ?? "aldric")}>Снова</Button>
            </div>
          </div>
        ) : null}

        {touch && snap.mode === "play" ? (
          <div className="absolute bottom-24 left-3 right-3 flex items-end justify-between">
            <Stick onChange={(x, y) => g.current?.setMoveStick(x, y)} />
            <div className="flex flex-col gap-2 pointer-events-auto mb-2">
              <Button size="sm" onClick={() => g.current?.attack()}>Удар</Button>
              <Button size="sm" variant="subtle" onClick={() => g.current?.interact()}>E</Button>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
