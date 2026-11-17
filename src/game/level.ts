import { ROWS, T, mulberry32 } from "./config";

export type EnemyKind = "walker" | "hopper" | "flyer";

export interface LevelData {
  cols: number;
  /** tiles[col][row]: 0 aire, 1 suelo(superficie), 2 relleno, 3 ladrillo, 4 bloque "?", 5 bloque usado */
  tiles: Uint8Array[];
  spawn: { x: number; y: number };
  coins: { x: number; y: number }[];
  enemies: { kind: EnemyKind; x: number; y: number }[];
  npcs: { x: number; y: number; who: string }[];
  blocks: { c: number; r: number }[];
  chest?: { x: number; y: number };
  checkpoint: { x: number; y: number };
  goal?: { x: number; y: number };
  isBoss: boolean;
  /** plataformas del arena (para generar libros) */
  perches: { x: number; y: number }[];
}

const GROUND = 12;

export interface BuildOpts {
  seed: number;
  npcs: string[];
  blocks: number;
  chest: boolean;
  density: number;
  length?: number;
}

export function buildLevel(o: BuildOpts): LevelData {
  const rng = mulberry32(o.seed);
  const R = (a: number, b: number) => a + Math.floor(rng() * (b - a + 1));
  const LEN = o.length ?? 104;
  const tiles: Uint8Array[] = [];
  let gh = GROUND;
  const L: LevelData = {
    cols: 0,
    tiles,
    spawn: { x: 2 * T, y: GROUND * T - 40 },
    coins: [],
    enemies: [],
    npcs: [],
    blocks: [],
    checkpoint: { x: 2 * T, y: GROUND * T - 40 },
    isBoss: false,
    perches: [],
  };

  const col = (top: number | null) => {
    const c = new Uint8Array(ROWS);
    if (top !== null) {
      c[top] = 1;
      for (let r = top + 1; r < ROWS; r++) c[r] = 2;
    }
    tiles.push(c);
    return tiles.length - 1;
  };
  const flat = (n: number) => {
    const s = tiles.length;
    for (let i = 0; i < n; i++) col(gh);
    return s;
  };
  const coin = (c: number, r: number) => L.coins.push({ x: c * T + T / 2, y: r * T + T / 2 });
  const enemy = (c: number) => {
    const p = rng();
    const kind: EnemyKind = p < 0.55 ? "walker" : p < 0.82 ? "hopper" : "flyer";
    if (kind === "flyer") L.enemies.push({ kind, x: c * T + T / 2, y: (gh - 3) * T });
    else L.enemies.push({ kind, x: c * T + T / 2, y: gh * T });
  };

  // zona inicial
  flat(8);
  for (let i = 0; i < 3; i++) coin(4 + i, gh - 3);

  const filler = () => {
    const p = rng();
    if (p < 0.3) {
      const n = R(4, 8);
      const s = flat(n);
      if (rng() < o.density * 0.8) enemy(s + R(1, n - 2));
      if (rng() < 0.5) for (let i = 0; i < 3; i++) coin(s + 1 + i, gh - 2);
    } else if (p < 0.55) {
      flat(3);
      const n = R(2, 3);
      const s = tiles.length;
      for (let i = 0; i < n; i++) col(null);
      for (let i = 0; i < n; i++) coin(s + i, gh - 3 - (i === 1 ? 1 : 0));
      if (rng() < o.density * 0.3) L.enemies.push({ kind: "flyer", x: s * T, y: (gh - 4) * T });
      flat(3);
    } else if (p < 0.78) {
      const n = R(8, 11);
      const s = flat(n);
      const pl = R(3, 5);
      const ps = s + R(1, n - pl - 1);
      for (let i = 0; i < pl; i++) {
        tiles[ps + i][gh - 4] = 3;
        coin(ps + i, gh - 5);
      }
      if (rng() < o.density * 0.8) enemy(s + n - 2);
    } else {
      const k = R(1, 2);
      flat(2);
      for (let i = 0; i < k; i++) {
        gh -= 1;
        flat(2);
      }
      const top = flat(R(3, 4));
      if (rng() < o.density * 0.6) enemy(top + 1);
      for (let i = 0; i < k; i++) {
        gh += 1;
        flat(2);
      }
    }
  };

  type Slot = { x: number; kind: "npc" | "block" | "chest" | "check"; i: number };
  const plan: Slot[] = [];
  o.npcs.forEach((_, i) => plan.push({ x: Math.round(14 + (i + 0.4) * ((LEN - 44) / Math.max(1, o.npcs.length))), kind: "npc", i }));
  for (let b = 0; b < o.blocks; b++) plan.push({ x: Math.round(22 + (b + 0.5) * ((LEN - 50) / Math.max(1, o.blocks))), kind: "block", i: b });
  if (o.chest) plan.push({ x: Math.round(LEN * 0.66), kind: "chest", i: 0 });
  plan.push({ x: Math.round(LEN * 0.5), kind: "check", i: 0 });
  plan.sort((a, b) => a.x - b.x);

  const special = (s: Slot) => {
    if (s.kind === "npc") {
      const st = flat(9);
      L.npcs.push({ x: (st + 4) * T + T / 2, y: gh * T, who: o.npcs[s.i] });
      coin(st + 1, gh - 2);
      coin(st + 7, gh - 2);
    } else if (s.kind === "block") {
      const st = flat(7);
      const c = st + 3;
      tiles[c][gh - 4] = 4;
      tiles[c - 1][gh - 4] = 3;
      tiles[c + 1][gh - 4] = 3;
      L.blocks.push({ c, r: gh - 4 });
      if (rng() < o.density * 0.7) enemy(st + 5);
    } else if (s.kind === "chest") {
      const st = flat(7);
      L.chest = { x: (st + 3) * T + T / 2, y: gh * T };
    } else {
      const st = flat(5);
      L.checkpoint = { x: (st + 2) * T + 4, y: gh * T - 40 };
      (L as LevelData & { flagX?: number }).flagX = (st + 2) * T + 4;
    }
  };

  let pi = 0;
  while (tiles.length < LEN || pi < plan.length) {
    if (pi < plan.length && tiles.length >= plan[pi].x) special(plan[pi++]);
    else filler();
  }
  flat(3);
  const gs = flat(14);
  L.goal = { x: (gs + 7) * T + T / 2, y: gh * T };
  L.cols = tiles.length;
  return L;
}

export function buildArena(): LevelData {
  const cols = 27;
  const tiles: Uint8Array[] = [];
  for (let c = 0; c < cols; c++) {
    const col = new Uint8Array(ROWS);
    col[GROUND] = 1;
    for (let r = GROUND + 1; r < ROWS; r++) col[r] = 2;
    tiles.push(col);
  }
  const plat = (c0: number, c1: number, r: number) => {
    for (let c = c0; c <= c1; c++) tiles[c][r] = 3;
  };
  plat(2, 6, 8);
  plat(20, 24, 8);
  plat(11, 15, 9);
  return {
    cols,
    tiles,
    spawn: { x: 3 * T, y: GROUND * T - 40 },
    coins: [],
    enemies: [],
    npcs: [],
    blocks: [],
    checkpoint: { x: 3 * T, y: GROUND * T - 40 },
    isBoss: true,
    perches: [
      { x: 4 * T, y: 8 * T },
      { x: 22 * T + 12, y: 8 * T },
      { x: 13 * T + 12, y: 9 * T },
    ],
  };
}
