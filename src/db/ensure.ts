import { and, eq, notInArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { fuentes, meta, preguntas, temas } from "@/db/schema";
import { SEED_VERSION, seedContent } from "@/content";
import { FUENTES } from "@/content/fuentes";

declare global {
  // eslint-disable-next-line no-var
  var __oposReady: Promise<void> | undefined;
}

const DDL = [
  `CREATE TABLE IF NOT EXISTS temas (
    id text PRIMARY KEY, bloque integer NOT NULL, orden integer NOT NULL, titulo text NOT NULL,
    resumen text NOT NULL DEFAULT '', npcs jsonb NOT NULL DEFAULT '[]'::jsonb, orden_item jsonb,
    fuentes jsonb NOT NULL DEFAULT '[]'::jsonb, revisar boolean NOT NULL DEFAULT false, origen text NOT NULL DEFAULT 'seed')`,
  `CREATE TABLE IF NOT EXISTS preguntas (
    id text PRIMARY KEY, tema_id text NOT NULL, tipo text NOT NULL DEFAULT 'mcq', dif integer NOT NULL DEFAULT 2,
    enunciado text NOT NULL, opciones jsonb NOT NULL, correcta integer NOT NULL DEFAULT 0,
    explicacion text NOT NULL DEFAULT '', fuente text, activa boolean NOT NULL DEFAULT true,
    origen text NOT NULL DEFAULT 'seed', creada timestamptz DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS fuentes (
    id text PRIMARY KEY, nombre text NOT NULL, tipo text NOT NULL DEFAULT 'boe', url text NOT NULL,
    fecha_boe text, titulo_boe text, ultima_sync timestamptz, estado text,
    cambio boolean NOT NULL DEFAULT false, cambio_en timestamptz)`,
  `CREATE TABLE IF NOT EXISTS meta (k text PRIMARY KEY, v text NOT NULL)`,
];

async function init() {
  for (const stmt of DDL) await db.execute(sql.raw(stmt));

  const cur = await db.select().from(meta).where(eq(meta.k, "seed_version"));
  if (cur[0]?.v === SEED_VERSION) return;

  const seed = seedContent();

  await db
    .insert(temas)
    .values(
      seed.temas.map((t) => ({
        id: t.id,
        bloque: t.bloque,
        orden: t.orden,
        titulo: t.titulo,
        resumen: t.resumen,
        npcs: t.npcs,
        ordenItem: t.ordenItem ?? null,
        fuentes: t.fuentes,
        origen: "seed",
      })),
    )
    .onConflictDoUpdate({
      target: temas.id,
      set: {
        bloque: sql`excluded.bloque`,
        orden: sql`excluded.orden`,
        titulo: sql`excluded.titulo`,
        resumen: sql`excluded.resumen`,
        npcs: sql`excluded.npcs`,
        ordenItem: sql`excluded.orden_item`,
        fuentes: sql`excluded.fuentes`,
      },
    });

  const rows = seed.preguntas.map((p) => ({
    id: p.id,
    temaId: p.tema,
    tipo: p.tipo,
    dif: p.dif,
    enunciado: p.q,
    opciones: p.opts,
    correcta: p.ok,
    explicacion: p.exp,
    fuente: p.fuente ?? null,
    origen: "seed",
  }));
  for (let i = 0; i < rows.length; i += 100) {
    await db
      .insert(preguntas)
      .values(rows.slice(i, i + 100))
      .onConflictDoUpdate({
        target: preguntas.id,
        set: {
          temaId: sql`excluded.tema_id`,
          tipo: sql`excluded.tipo`,
          dif: sql`excluded.dif`,
          enunciado: sql`excluded.enunciado`,
          opciones: sql`excluded.opciones`,
          correcta: sql`excluded.correcta`,
          explicacion: sql`excluded.explicacion`,
          fuente: sql`excluded.fuente`,
        },
        setWhere: eq(preguntas.origen, "seed"),
      });
  }
  await db.delete(preguntas).where(and(eq(preguntas.origen, "seed"), notInArray(preguntas.id, rows.map((r) => r.id))));

  await db
    .insert(fuentes)
    .values(FUENTES.map((f) => ({ id: f.id, nombre: f.nombre, tipo: f.tipo, url: f.url ?? "" })))
    .onConflictDoUpdate({
      target: fuentes.id,
      set: { nombre: sql`excluded.nombre`, tipo: sql`excluded.tipo`, url: sql`excluded.url` },
    });

  await db
    .insert(meta)
    .values({ k: "seed_version", v: SEED_VERSION })
    .onConflictDoUpdate({ target: meta.k, set: { v: SEED_VERSION } });
}

/** Crea las tablas si no existen y carga/actualiza el temario semilla. */
export function ensureDb(): Promise<void> {
  if (!globalThis.__oposReady) {
    globalThis.__oposReady = init().catch((e) => {
      globalThis.__oposReady = undefined;
      throw e;
    });
  }
  return globalThis.__oposReady;
}
