import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { fuentes, temas } from "@/db/schema";

const BASE = "https://www.boe.es/datosabiertos/api/legislacion-consolidada/id";

export interface SyncResult {
  id: string;
  ok: boolean;
  cambio?: boolean;
  fecha?: string;
  error?: string;
}

async function getMeta(id: string) {
  const r = await fetch(`${BASE}/${id}/metadatos`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`BOE respondió ${r.status}`);
  const j = (await r.json()) as { data?: Array<Record<string, unknown>> };
  const d = j.data?.[0];
  if (!d) throw new Error("Sin datos");
  return d;
}

/** Consulta al BOE la fecha de última actualización de cada norma y marca los temas a revisar si cambió. */
export async function syncFuentes(): Promise<SyncResult[]> {
  const rows = await db.select().from(fuentes).where(eq(fuentes.tipo, "boe"));
  const out: SyncResult[] = [];
  for (let i = 0; i < rows.length; i += 6) {
    const chunk = rows.slice(i, i + 6);
    const res = await Promise.all(
      chunk.map(async (row): Promise<SyncResult> => {
        try {
          const d = await getMeta(row.id);
          const fecha = String(d.fecha_actualizacion ?? "");
          const derogada = d.estatus_derogacion === "S" || d.vigencia_agotada === "S";
          const cambio = !!row.fechaBoe && row.fechaBoe !== fecha;
          await db
            .update(fuentes)
            .set({
              fechaBoe: fecha,
              tituloBoe: String(d.titulo ?? ""),
              ultimaSync: new Date(),
              estado: derogada ? "Derogada / sin vigencia" : "Vigente",
              ...(cambio ? { cambio: true, cambioEn: new Date() } : {}),
            })
            .where(eq(fuentes.id, row.id));
          if (cambio) {
            await db.execute(sql`UPDATE temas SET revisar = true WHERE fuentes @> ${JSON.stringify([row.id])}::jsonb`);
          }
          return { id: row.id, ok: true, cambio, fecha };
        } catch (e) {
          await db.update(fuentes).set({ estado: "Sin respuesta del BOE", ultimaSync: new Date() }).where(eq(fuentes.id, row.id));
          return { id: row.id, ok: false, error: e instanceof Error ? e.message : "error" };
        }
      }),
    );
    out.push(...res);
  }
  return out;
}

export async function marcarRevisada(id: string) {
  await db.update(fuentes).set({ cambio: false }).where(eq(fuentes.id, id));
  await db.execute(sql`UPDATE temas SET revisar = false WHERE fuentes @> ${JSON.stringify([id])}::jsonb`);
}

// ---------- Generación de preguntas "completa el artículo" desde el texto consolidado ----------

const strip = (s: string) =>
  s
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

export interface Articulo {
  titulo: string;
  texto: string;
}

export async function fetchArticulos(id: string): Promise<Articulo[]> {
  const r = await fetch(`${BASE}/${id}/texto`, {
    headers: { Accept: "application/xml" },
    signal: AbortSignal.timeout(25000),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`BOE respondió ${r.status}`);
  const xml = await r.text();
  const blocks = xml.match(/<bloque\b[^>]*tipo="precepto"[^>]*>[\s\S]*?<\/bloque>/g) ?? [];
  const arts: Articulo[] = [];
  for (const b of blocks) {
    const versions = b.split(/<version\b/);
    const cur = versions[versions.length - 1];
    const titulo = strip(cur.match(/<p class="articulo">([\s\S]*?)<\/p>/)?.[1] ?? b.match(/<p class="articulo">([\s\S]*?)<\/p>/)?.[1] ?? "");
    const paras = [...cur.matchAll(/<p class="parrafo[^"]*">([\s\S]*?)<\/p>/g)].map((m) => strip(m[1]));
    const texto = paras.join(" ");
    if (titulo && texto.length > 60) arts.push({ titulo, texto });
  }
  return arts;
}

export interface Cloze {
  articulo: string;
  enunciado: string;
  correcta: string;
  opciones: string[];
}

const NUM_WORDS = ["un", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "quince", "veinte", "treinta", "cuarenta", "cincuenta", "sesenta"];

function rnd<T>(a: T[]): T {
  return a[Math.floor(Math.random() * a.length)];
}

export function generarCloze(arts: Articulo[], n: number): Cloze[] {
  const longWords = new Set<string>();
  for (const a of arts) for (const w of a.texto.match(/\b[a-záéíóúñ]{9,}\b/g) ?? []) longWords.add(w);
  const pool = [...longWords];
  const cands: Cloze[] = [];
  const shuffled = [...arts].sort(() => Math.random() - 0.5);
  for (const a of shuffled) {
    const sentences = a.texto.split(/(?<=[.;:])\s+/).filter((s) => s.length >= 70 && s.length <= 260);
    if (!sentences.length) continue;
    const s = rnd(sentences);
    let correcta = "";
    let opciones: string[] = [];
    const num = s.match(/\b\d{1,3}\b/);
    const word = s.match(new RegExp(`\\b(${NUM_WORDS.join("|")})\\b`, "i"));
    if (num && Number(num[0]) > 1 && Number(num[0]) < 1000 && !/art[íi]culo|apartado|letra/i.test(s.slice(Math.max(0, (num.index ?? 0) - 14), num.index))) {
      correcta = num[0];
      const v = Number(correcta);
      opciones = [...new Set([v + 1, Math.max(1, v - 1), v * 2, v + 5, v + 10].filter((x) => x !== v).map(String))].slice(0, 3);
    } else if (word) {
      correcta = word[0];
      opciones = NUM_WORDS.filter((w) => w !== correcta.toLowerCase()).sort(() => Math.random() - 0.5).slice(0, 3);
    } else {
      const lw = (s.match(/\b[a-záéíóúñ]{9,}\b/g) ?? []).filter((w) => s.indexOf(w) > 12);
      if (!lw.length) continue;
      correcta = rnd(lw);
      opciones = pool.filter((w) => w !== correcta).sort(() => Math.random() - 0.5).slice(0, 3);
    }
    if (opciones.length < 3) continue;
    const enunciado = s.replace(new RegExp(`\\b${correcta}\\b`), "_____");
    cands.push({ articulo: a.titulo, enunciado, correcta, opciones });
    if (cands.length >= n) break;
  }
  return cands;
}

export async function temasDeFuente(id: string) {
  return db.execute(sql`SELECT id, titulo FROM temas WHERE fuentes @> ${JSON.stringify([id])}::jsonb ORDER BY bloque, orden`);
}

export { temas };
