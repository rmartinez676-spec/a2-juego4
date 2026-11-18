import { eq, sql } from "drizzle-orm";
import { db, hasDb } from "@/db";
import { fuentes, temas } from "@/db/schema";
import { FUENTES } from "@/content/fuentes";
import { seedContent } from "@/content";

const BASE = "https://www.boe.es/datosabiertos/api/legislacion-consolidada/id";

export interface SyncResult {
  id: string;
  ok: boolean;
  cambio?: boolean;
  fecha?: string;
  error?: string;
}

export interface CachedBoeFuente {
  id: string;
  fechaBoe?: string | null;
  tituloBoe?: string | null;
  ultimaSync?: string | null;
  estado?: string | null;
  cambio?: boolean;
}

// Fechas base oficiales de última consolidación del BOE
export const BASELINE_BOE_DATA: Record<string, { fechaBoe: string; tituloBoe: string; estado: string }> = {
  "BOE-A-1978-31229": { fechaBoe: "20261104T091715Z", tituloBoe: "Constitución Española.", estado: "Vigente" },
  "BOE-A-1979-23709": { fechaBoe: "20260612T095630Z", tituloBoe: "Ley Orgánica 2/1979, del Tribunal Constitucional.", estado: "Vigente" },
  "BOE-A-1985-12666": { fechaBoe: "20261117T082110Z", tituloBoe: "Ley Orgánica 6/1985, del Poder Judicial.", estado: "Vigente" },
  "BOE-A-1997-25336": { fechaBoe: "20261014T075533Z", tituloBoe: "Ley 50/1997, del Gobierno.", estado: "Vigente" },
  "BOE-A-2015-10566": { fechaBoe: "20261117T092017Z", tituloBoe: "Ley 40/2015, de Régimen Jurídico del Sector Público.", estado: "Vigente" },
  "BOE-A-2015-10565": { fechaBoe: "20261116T085554Z", tituloBoe: "Ley 39/2015, del Procedimiento Administrativo Común.", estado: "Vigente" },
  "BOE-A-1985-5392": { fechaBoe: "20261005T100626Z", tituloBoe: "Ley 7/1985, Reguladora de las Bases del Régimen Local.", estado: "Vigente" },
  "BOE-A-2013-12887": { fechaBoe: "20260102T105216Z", tituloBoe: "Ley 19/2013, de Transparencia, Acceso a la Información y Buen Gobierno.", estado: "Vigente" },
  "BOE-A-2018-16673": { fechaBoe: "20261008T073957Z", tituloBoe: "Ley Orgánica 3/2018, de Protección de Datos Personales y garantía de los derechos digitales.", estado: "Vigente" },
  "BOE-A-2007-6115": { fechaBoe: "20261112T091657Z", tituloBoe: "Ley Orgánica 3/2007, para la igualdad efectiva de mujeres y hombres.", estado: "Vigente" },
  "BOE-A-2004-21760": { fechaBoe: "20261029T123715Z", tituloBoe: "Ley Orgánica 1/2004, de Medidas de Protección Integral contra la Violencia de Género.", estado: "Vigente" },
  "BOE-A-2006-21990": { fechaBoe: "20261111T093056Z", tituloBoe: "Ley 39/2006, de Promoción de la Autonomía Personal y Atención a las personas en situación de dependencia.", estado: "Vigente" },
  "BOE-A-2013-12632": { fechaBoe: "20261006T102138Z", tituloBoe: "RDL 1/2013, Ley General de derechos de las personas con discapacidad.", estado: "Vigente" },
  "BOE-A-2000-544": { fechaBoe: "20260703T065826Z", tituloBoe: "Ley Orgánica 4/2000, sobre derechos y libertades de los extranjeros en España.", estado: "Vigente" },
  "BOE-A-2009-17242": { fechaBoe: "20260615T095101Z", tituloBoe: "Ley 12/2009, reguladora del derecho de asilo y de la protección subsidiaria.", estado: "Vigente" },
  "BOE-A-2017-12902": { fechaBoe: "20261111T082551Z", tituloBoe: "Ley 9/2017, de Contratos del Sector Público.", estado: "Vigente" },
  "BOE-A-2003-20977": { fechaBoe: "20261113T094522Z", tituloBoe: "Ley 38/2003, General de Subvenciones.", estado: "Vigente" },
  "BOE-A-2003-20254": { fechaBoe: "20261029T105417Z", tituloBoe: "Ley 33/2003, del Patrimonio de las Administraciones Públicas.", estado: "Vigente" },
  "BOE-A-1954-15431": { fechaBoe: "20251216T102453Z", tituloBoe: "Ley de Expropiación Forzosa de 16 de diciembre de 1954.", estado: "Vigente" },
  "BOE-A-1998-16718": { fechaBoe: "20260305T102624Z", tituloBoe: "Ley 29/1998, reguladora de la Jurisdicción Contencioso-administrativa.", estado: "Vigente" },
  "BOE-A-2015-11719": { fechaBoe: "20261014T065148Z", tituloBoe: "RDL 5/2015, Estatuto Básico del Empleado Público (EBEP).", estado: "Vigente" },
  "BOE-A-1985-151": { fechaBoe: "20251216T205851Z", tituloBoe: "Ley 53/1984, de Incompatibilidades del personal al servicio de las Administraciones Públicas.", estado: "Vigente" },
  "BOE-A-2003-21614": { fechaBoe: "20261112T072241Z", tituloBoe: "Ley 47/2003, General Presupuestaria.", estado: "Vigente" },
  "BOE-A-2012-5730": { fechaBoe: "20261111T115813Z", tituloBoe: "Ley Orgánica 2/2012, de Estabilidad Presupuestaria y Sostenibilidad Financiera.", estado: "Vigente" },
  "BOE-A-2003-23186": { fechaBoe: "20261009T082721Z", tituloBoe: "Ley 58/2003, General Tributaria.", estado: "Vigente" },
  "BOE-A-2015-11724": { fechaBoe: "20261111T094820Z", tituloBoe: "RDL 8/2015, Ley General de la Seguridad Social.", estado: "Vigente" },
  "BOE-A-2000-12140": { fechaBoe: "20261021T094147Z", tituloBoe: "RDL 4/2000, Régimen especial de la Seguridad Social de los Funcionarios Civiles del Estado.", estado: "Vigente" },
  "BOE-A-1987-12636": { fechaBoe: "20261103T065953Z", tituloBoe: "RDL 670/1987, Clases Pasivas del Estado.", estado: "Vigente" },
  "BOE-A-2021-8447": { fechaBoe: "20260723T094129Z", tituloBoe: "Ley 7/2021, de cambio climático y transición energética.", estado: "Vigente" },
  "BOE-A-2007-21490": { fechaBoe: "20261029T131436Z", tituloBoe: "Ley 42/2007, del Patrimonio Natural y de la Biodiversidad.", estado: "Vigente" },
  "BOE-A-1986-10499": { fechaBoe: "20261106T124739Z", tituloBoe: "Ley 14/1986, General de Sanidad.", estado: "Vigente" },
  "BOE-A-2003-10715": { fechaBoe: "20261005T093029Z", tituloBoe: "Ley 16/2003, de cohesión y calidad del Sistema Nacional de Salud.", estado: "Vigente" },
  "BOE-A-2022-10757": { fechaBoe: "20261105T085410Z", tituloBoe: "Ley 11/2022, General de Telecomunicaciones.", estado: "Vigente" },
  "BOE-A-2013-12888": { fechaBoe: "20251219T174528Z", tituloBoe: "Ley 20/2013, de garantía de la unidad de mercado.", estado: "Vigente" },
  "BOE-A-2023-5365": { fechaBoe: "20260707T082228Z", tituloBoe: "Ley 3/2023, de Empleo.", estado: "Vigente" },
  "BOE-A-2015-11430": { fechaBoe: "20261116T084356Z", tituloBoe: "RDL 2/2015, Estatuto de los Trabajadores.", estado: "Vigente" },
  "BOE-A-2021-5032": { fechaBoe: "20261105T072333Z", tituloBoe: "Real Decreto 203/2021, actuación y funcionamiento del sector público por medios electrónicos.", estado: "Vigente" },
  "BOE-A-2022-7191": { fechaBoe: "20261030T072120Z", tituloBoe: "Real Decreto 311/2022, Esquema Nacional de Seguridad.", estado: "Vigente" },
  "BOE-A-2007-12946": { fechaBoe: "20251219T112019Z", tituloBoe: "Ley 15/2007, de Defensa de la Competencia.", estado: "Vigente" },
  "BOE-A-2014-3248": { fechaBoe: "20260406T104535Z", tituloBoe: "Ley 2/2014, de la Acción y del Servicio Exterior del Estado.", estado: "Vigente" },
  "BOE-A-2023-4512": { fechaBoe: "20261112T082535Z", tituloBoe: "Ley 1/2023, de Cooperación para el Desarrollo Sostenible y la Solidaridad Global.", estado: "Vigente" },
  "BOE-A-1989-8508": { fechaBoe: "20261021T114252Z", tituloBoe: "Ley 8/1989, de Tasas y Precios Públicos.", estado: "Vigente" },
};

declare global {
  var __boeCache: Map<string, CachedBoeFuente> | undefined;
  var __boeTemasRevisar: Set<string> | undefined;
}

export function getBoeCache(): Map<string, CachedBoeFuente> {
  if (!globalThis.__boeCache) {
    const map = new Map<string, CachedBoeFuente>();
    const nowIso = new Date().toISOString();
    for (const [id, base] of Object.entries(BASELINE_BOE_DATA)) {
      map.set(id, {
        id,
        fechaBoe: base.fechaBoe,
        tituloBoe: base.tituloBoe,
        estado: base.estado,
        ultimaSync: nowIso,
        cambio: false,
      });
    }
    globalThis.__boeCache = map;
  }
  return globalThis.__boeCache;
}

export function getBoeRevisarTemas(): Set<string> {
  if (!globalThis.__boeTemasRevisar) {
    globalThis.__boeTemasRevisar = new Set<string>();
  }
  return globalThis.__boeTemasRevisar;
}

async function getMeta(id: string) {
  const r = await fetch(`${BASE}/${id}/metadatos`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`BOE respondió ${r.status}`);
  const j = (await r.json()) as { data?: Array<Record<string, unknown>> };
  const d = j.data?.[0];
  if (!d) throw new Error("Sin datos");
  return d;
}

/** Consulta al BOE la fecha de última actualización de cada norma y marca los temas a revisar si cambió. */
export async function syncFuentes(idsToSync?: string[]): Promise<SyncResult[]> {
  const cache = getBoeCache();
  const revisarTemas = getBoeRevisarTemas();

  let targetRows: Array<{ id: string; fechaBoe?: string | null }>;

  if (hasDb && db) {
    const all = await db.select().from(fuentes).where(eq(fuentes.tipo, "boe"));
    targetRows = idsToSync ? all.filter((r) => idsToSync.includes(r.id)) : all;
  } else {
    const allBoe = FUENTES.filter((f) => f.tipo === "boe");
    const filtered = idsToSync ? allBoe.filter((f) => idsToSync.includes(f.id)) : allBoe;
    targetRows = filtered.map((f) => ({
      id: f.id,
      fechaBoe: cache.get(f.id)?.fechaBoe ?? BASELINE_BOE_DATA[f.id]?.fechaBoe ?? null,
    }));
  }

  const out: SyncResult[] = [];
  const chunkSize = 8;

  for (let i = 0; i < targetRows.length; i += chunkSize) {
    const chunk = targetRows.slice(i, i + chunkSize);
    const res = await Promise.all(
      chunk.map(async (row): Promise<SyncResult> => {
        try {
          const d = await getMeta(row.id);
          const fecha = String(d.fecha_actualizacion ?? "");
          const titulo = String(d.titulo ?? "");
          const derogada = d.estatus_derogacion === "S" || d.vigencia_agotada === "S";
          const estado = derogada ? "Derogada / sin vigencia" : "Vigente";

          const prevFecha = row.fechaBoe || cache.get(row.id)?.fechaBoe || BASELINE_BOE_DATA[row.id]?.fechaBoe;
          const cambio = !!prevFecha && prevFecha !== fecha;
          const now = new Date();

          cache.set(row.id, {
            id: row.id,
            fechaBoe: fecha,
            tituloBoe: titulo,
            estado,
            ultimaSync: now.toISOString(),
            cambio,
          });

          if (cambio) {
            const seed = seedContent();
            for (const t of seed.temas) {
              if (t.fuentes.includes(row.id)) {
                revisarTemas.add(t.id);
              }
            }
          }

          if (hasDb && db) {
            await db
              .update(fuentes)
              .set({
                fechaBoe: fecha,
                tituloBoe: titulo,
                ultimaSync: now,
                estado,
                ...(cambio ? { cambio: true, cambioEn: now } : {}),
              })
              .where(eq(fuentes.id, row.id));

            if (cambio) {
              await db.execute(sql`UPDATE temas SET revisar = true WHERE fuentes @> ${JSON.stringify([row.id])}::jsonb`);
            }
          }

          return { id: row.id, ok: true, cambio, fecha };
        } catch (e) {
          const now = new Date();
          const prev = cache.get(row.id);
          if (prev) {
            prev.ultimaSync = now.toISOString();
          }
          if (hasDb && db) {
            await db.update(fuentes).set({ estado: "Sin respuesta del BOE", ultimaSync: now }).where(eq(fuentes.id, row.id));
          }
          return { id: row.id, ok: false, error: e instanceof Error ? e.message : "error" };
        }
      }),
    );
    out.push(...res);
  }
  return out;
}

export async function marcarRevisada(id: string) {
  const cache = getBoeCache();
  const revisarTemas = getBoeRevisarTemas();

  const c = cache.get(id);
  if (c) c.cambio = false;

  const seed = seedContent();
  for (const t of seed.temas) {
    if (t.fuentes.includes(id)) {
      const remainingChanges = t.fuentes.some((fid) => fid !== id && cache.get(fid)?.cambio);
      if (!remainingChanges) {
        revisarTemas.delete(t.id);
      }
    }
  }

  if (hasDb && db) {
    await db.update(fuentes).set({ cambio: false }).where(eq(fuentes.id, id));
    await db.execute(sql`UPDATE temas SET revisar = false WHERE fuentes @> ${JSON.stringify([id])}::jsonb`);
  }
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
    signal: AbortSignal.timeout(20000),
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
  if (hasDb && db) {
    return db.execute(sql`SELECT id, titulo FROM temas WHERE fuentes @> ${JSON.stringify([id])}::jsonb ORDER BY bloque, orden`);
  }
  const seed = seedContent();
  return seed.temas.filter((t) => t.fuentes.includes(id)).map((t) => ({ id: t.id, titulo: t.titulo }));
}

export { temas };
