import { asc, eq } from "drizzle-orm";
import { db, hasDb } from "@/db";
import { ensureDb } from "@/db/ensure";
import { fuentes, preguntas, temas } from "@/db/schema";
import { SEED_VERSION, seedContent } from "@/content";
import { getBoeCache, getBoeRevisarTemas, syncFuentes } from "@/lib/boe";
import type { Content } from "@/content/types";

export const dynamic = "force-dynamic";

const DAY = 24 * 3600 * 1000;

function getEnrichedSeed(): Content {
  const cache = getBoeCache();
  const rev = getBoeRevisarTemas();
  const seed = seedContent();
  return {
    ...seed,
    temas: seed.temas.map((t) => ({
      ...t,
      revisar: t.revisar || rev.has(t.id),
    })),
    fuentes: seed.fuentes.map((f) => {
      const c = cache.get(f.id);
      return {
        ...f,
        fechaBoe: c?.fechaBoe ?? null,
        tituloBoe: c?.tituloBoe ?? null,
        ultimaSync: c?.ultimaSync ?? null,
        estado: c?.estado ?? (f.tipo === "boe" ? "Vigente" : null),
        cambio: c?.cambio ?? false,
      };
    }),
  };
}

export async function GET() {
  try {
    const cache = getBoeCache();

    // Sincronización automática con el BOE como máximo una vez al día (sin bloquear la respuesta)
    const boeEntries = Array.from(cache.values());
    const stale = boeEntries.some((x) => !x.ultimaSync || Date.now() - new Date(x.ultimaSync).getTime() > DAY);
    if (stale && !globalThis.__boeSyncRunning) {
      globalThis.__boeSyncRunning = true;
      void syncFuentes()
        .catch(() => undefined)
        .finally(() => {
          globalThis.__boeSyncRunning = false;
        });
    }

    if (!hasDb || !db) {
      return Response.json(getEnrichedSeed(), { headers: { "Cache-Control": "no-store" } });
    }

    await ensureDb();
    const [t, p, f] = await Promise.all([
      db.select().from(temas).orderBy(asc(temas.bloque), asc(temas.orden)),
      db.select().from(preguntas).where(eq(preguntas.activa, true)),
      db.select().from(fuentes),
    ]);

    const content: Content = {
      version: SEED_VERSION,
      origen: "db",
      temas: t.map((x) => ({
        id: x.id,
        bloque: x.bloque,
        orden: x.orden,
        titulo: x.titulo,
        resumen: x.resumen,
        npcs: x.npcs,
        fuentes: x.fuentes,
        ordenItem: x.ordenItem,
        revisar: x.revisar,
      })),
      preguntas: p.map((x) => ({
        id: x.id,
        tema: x.temaId,
        tipo: x.tipo === "tf" ? "tf" : "mcq",
        dif: x.dif,
        q: x.enunciado,
        opts: x.opciones,
        ok: x.correcta,
        exp: x.explicacion,
        fuente: x.fuente,
        origen: x.origen,
      })),
      fuentes: f.map((x) => {
        const c = cache.get(x.id);
        return {
          id: x.id,
          nombre: x.nombre,
          tipo: x.tipo,
          url: x.url,
          fechaBoe: x.fechaBoe || c?.fechaBoe || null,
          tituloBoe: x.tituloBoe || c?.tituloBoe || null,
          ultimaSync: x.ultimaSync ? new Date(x.ultimaSync).toISOString() : c?.ultimaSync || null,
          estado: x.estado || c?.estado || null,
          cambio: x.cambio || c?.cambio || false,
        };
      }),
    };
    return Response.json(content, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json(getEnrichedSeed(), { headers: { "Cache-Control": "no-store" } });
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __boeSyncRunning: boolean | undefined;
}
