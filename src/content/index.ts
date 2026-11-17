import type { Content, Pregunta, QSeed, Tema, TemaSeed } from "./types";
import { FUENTES } from "./fuentes";
import { hub } from "./hub";
import { b1 } from "./b1";
import { b2 } from "./b2";
import { b3 } from "./b3";
import { b4 } from "./b4";
import { b5 } from "./b5";
import { b6 } from "./b6";
import { b7 } from "./b7";

/** Mundos: 0 = Academia, 1-6 = bloques del programa oficial, 7 = examen final. */
const MUNDOS: [number, TemaSeed[]][] = [
  [0, hub],
  [1, b1],
  [2, b2],
  [3, b3],
  [4, b4],
  [5, b5],
  [6, b6],
  [7, b7],
];

export function temaId(bloque: number, n: number) {
  return `b${bloque}t${n}`;
}

export function seedTemas(): Tema[] {
  return MUNDOS.flatMap(([bloque, temas]) =>
    temas.map((t) => ({
      id: temaId(bloque, t.n),
      bloque,
      orden: t.n,
      titulo: t.titulo,
      resumen: t.resumen,
      npcs: t.npcs,
      fuentes: t.fuentes,
      ordenItem: t.orden ? { titulo: t.orden[0], items: t.orden[1] } : null,
      revisar: false,
    })),
  );
}

function toPregunta(tema: string, i: number, q: QSeed): Pregunta {
  const id = `${tema}-${i + 1}`;
  if (typeof q[2] === "boolean") {
    return { id, tema, tipo: "tf", dif: q[0], q: q[1], opts: ["Verdadero", "Falso"], ok: q[2] ? 0 : 1, exp: (q[3] as string | undefined) ?? "", origen: "seed" };
  }
  const m = q as [number, string, string, string, string, string, string?];
  return { id, tema, tipo: "mcq", dif: m[0], q: m[1], opts: [m[2], m[3], m[4], m[5]], ok: 0, exp: m[6] ?? "", origen: "seed" };
}

export function seedPreguntas(): Pregunta[] {
  return MUNDOS.flatMap(([bloque, temas]) => temas.flatMap((t) => t.q.map((q, i) => toPregunta(temaId(bloque, t.n), i, q))));
}

function hash(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

const _temas = seedTemas();
const _preg = seedPreguntas();
/** Cambia automáticamente cuando cambia el contenido semilla: la BD se resincroniza sola. */
export const SEED_VERSION = `s${_preg.length}-${hash(JSON.stringify([_temas, _preg, FUENTES]))}`;

export function seedContent(): Content {
  return {
    version: SEED_VERSION,
    origen: "seed",
    temas: _temas,
    preguntas: _preg,
    fuentes: FUENTES.map((f) => ({ id: f.id, nombre: f.nombre, tipo: f.tipo, url: f.url ?? "", cambio: false })),
  };
}
