import type { Content, Pregunta } from "@/content/types";
import { shuffle, type DiffCfg } from "./config";
import type { Stats } from "./store";

export interface RQ {
  id: string;
  tema: string;
  bloque: number;
  q: string;
  opts: string[];
  ok: number;
  exp: string;
  dif: number;
  tf: boolean;
  fuente?: string | null;
}

export const bloqueOf = (temaId: string) => {
  const m = temaId.match(/^b(\d+)/);
  return m ? Number(m[1]) : 0;
};

/** Convierte una pregunta en una instancia jugable: mezcla opciones o la transforma en Verdadero/Falso. */
export function prepare(p: Pregunta, tfProb: number): RQ {
  const base = { id: p.id, tema: p.tema, bloque: bloqueOf(p.tema), dif: p.dif, fuente: p.fuente };
  if (p.tipo === "tf") return { ...base, q: p.q, opts: ["Verdadero", "Falso"], ok: p.ok, exp: p.exp, tf: true };
  const correct = p.opts[p.ok];
  if (Math.random() < tfProb && p.opts.length > 1) {
    const wrongs = p.opts.filter((_, i) => i !== p.ok);
    const truth = Math.random() < 0.5;
    const shown = truth ? correct : wrongs[Math.floor(Math.random() * wrongs.length)];
    return {
      ...base,
      q: `¿Verdadero o falso?\n${p.q}\n→ «${shown}»`,
      opts: ["Verdadero", "Falso"],
      ok: truth ? 0 : 1,
      exp: truth ? p.exp : `Falso. La respuesta correcta es «${correct}». ${p.exp}`,
      tf: true,
    };
  }
  const order = shuffle(p.opts.map((_, i) => i));
  return { ...base, q: p.q, opts: order.map((i) => p.opts[i]), ok: order.indexOf(p.ok), exp: p.exp, tf: false };
}

function weighted<A>(items: A[], n: number, w: (a: A) => number): A[] {
  const pool = [...items];
  const out: A[] = [];
  while (out.length < n && pool.length) {
    const ws = pool.map((x) => Math.max(0.001, w(x)));
    let r = Math.random() * ws.reduce((a, b) => a + b, 0);
    let k = 0;
    for (; k < pool.length - 1; k++) {
      r -= ws[k];
      if (r <= 0) break;
    }
    out.push(pool[k]);
    pool.splice(k, 1);
  }
  return out;
}

export interface PickOpts {
  temaId?: string;
  bloque?: number;
  n: number;
  used?: Set<string>;
  reviewN?: number;
  hard?: boolean;
  tf?: number;
  onlyFailed?: boolean;
}

/** Selección ponderada: favorece las menos vistas, las falladas y la dificultad elegida. */
export function pickQuestions(content: Content, stats: Stats, diff: DiffCfg, o: PickOpts): RQ[] {
  const all = content.preguntas;
  let main: Pregunta[];
  let review: Pregunta[] = [];
  if (o.onlyFailed) main = all.filter((p) => (stats.wrong[p.id] ?? 0) > (stats.right[p.id] ?? 0));
  else if (o.temaId) {
    const b = bloqueOf(o.temaId);
    if (b === 7) main = all;
    else {
      main = all.filter((p) => p.tema === o.temaId);
      review = all.filter((p) => bloqueOf(p.tema) === b && p.tema !== o.temaId);
    }
  } else if (o.bloque !== undefined && o.bloque !== 7) main = all.filter((p) => bloqueOf(p.tema) === o.bloque);
  else main = all;

  const used = o.used ?? new Set<string>();
  const w = (p: Pregunta) => {
    const dw = diff.w[Math.min(2, Math.max(0, p.dif - 1))] * (o.hard ? [0.6, 1, 1.5][p.dif - 1] ?? 1 : 1);
    const seen = stats.seen[p.id] ?? 0;
    const bad = (stats.wrong[p.id] ?? 0) > (stats.right[p.id] ?? 0) ? 1.8 : 1;
    return (dw * bad) / (1 + seen);
  };
  const fresh = (list: Pregunta[]) => list.filter((p) => !used.has(p.id));
  const rN = review.length && o.reviewN === undefined ? Math.min(2, Math.floor(o.n / 3)) : Math.min(o.reviewN ?? 0, review.length);
  let chosen = weighted(fresh(main), o.n - rN, w);
  chosen = chosen.concat(weighted(fresh(review), rN, w));
  if (chosen.length < o.n) chosen = chosen.concat(weighted(fresh(review).filter((p) => !chosen.includes(p)), o.n - chosen.length, w));
  if (chosen.length < o.n) chosen = chosen.concat(weighted(main.filter((p) => !chosen.includes(p)), o.n - chosen.length, w));
  if (chosen.length < o.n) chosen = chosen.concat(weighted(all.filter((p) => !chosen.includes(p)), o.n - chosen.length, w));
  chosen.forEach((p) => used.add(p.id));
  return shuffle(chosen).map((p) => prepare(p, o.tf ?? diff.tf));
}

export interface Pair {
  l: string;
  r: string;
}

/** Minijuego "Relaciona": empareja enunciados cortos con sus respuestas. */
export function makeMatch(content: Content, temaId: string, n = 4): Pair[] | null {
  const b = bloqueOf(temaId);
  let pool = content.preguntas.filter((p) => p.tipo === "mcq" && (b === 7 || p.tema === temaId) && p.q.length <= 90 && p.opts[p.ok].length <= 40);
  if (pool.length < 3) pool = content.preguntas.filter((p) => p.tipo === "mcq" && bloqueOf(p.tema) === b && p.q.length <= 90 && p.opts[p.ok].length <= 40);
  if (pool.length < 3) return null;
  const seen = new Set<string>();
  const pairs: Pair[] = [];
  for (const p of shuffle(pool)) {
    const r = p.opts[p.ok];
    if (seen.has(r)) continue;
    seen.add(r);
    pairs.push({ l: p.q, r });
    if (pairs.length >= n) break;
  }
  return pairs.length >= 3 ? pairs : null;
}

export function makeBlitz(content: Content, stats: Stats, diff: DiffCfg, temaId: string, n = 8): RQ[] {
  return pickQuestions(content, stats, diff, { temaId, n, tf: 1, reviewN: 3 });
}
