export const W = 640;
export const H = 360;
export const T = 24;
export const ROWS = 15;

export type DiffKey = "facil" | "normal" | "dificil" | "opositor";

export interface DiffCfg {
  key: DiffKey;
  label: string;
  emoji: string;
  desc: string;
  hearts: number;
  /** segundos por pregunta (0 = sin límite) */
  timer: number;
  /** fracción de aciertos necesaria en la prueba final */
  pass: number;
  enemy: number;
  density: number;
  bossHp: number;
  /** pesos de selección para dificultad 1, 2 y 3 de las preguntas */
  w: [number, number, number];
  /** probabilidad de convertir una pregunta test en Verdadero/Falso */
  tf: number;
}

export const DIFFS: Record<DiffKey, DiffCfg> = {
  facil: { key: "facil", label: "Fácil", emoji: "🌱", desc: "5 vidas, sin límite de tiempo, preguntas básicas", hearts: 5, timer: 0, pass: 0.6, enemy: 0.8, density: 0.5, bossHp: 4, w: [5, 3, 1], tf: 0.35 },
  normal: { key: "normal", label: "Normal", emoji: "📘", desc: "4 vidas, 40 s por pregunta, nivel mixto", hearts: 4, timer: 40, pass: 0.6, enemy: 1, density: 0.75, bossHp: 5, w: [3, 4, 2], tf: 0.25 },
  dificil: { key: "dificil", label: "Difícil", emoji: "🔥", desc: "3 vidas, 25 s por pregunta, preguntas complejas", hearts: 3, timer: 25, pass: 0.7, enemy: 1.15, density: 1, bossHp: 6, w: [1, 3, 4], tf: 0.2 },
  opositor: { key: "opositor", label: "Opositor", emoji: "🏆", desc: "3 vidas, 18 s por pregunta, nivel examen real", hearts: 3, timer: 18, pass: 0.8, enemy: 1.3, density: 1.2, bossHp: 7, w: [0.5, 2, 6], tf: 0.15 },
};

export function mulberry32(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function shuffle<A>(arr: A[], rng: () => number = Math.random): A[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
