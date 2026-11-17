import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureDb } from "@/db/ensure";
import { fuentes, preguntas, temas } from "@/db/schema";
import { SEED_VERSION, seedContent } from "@/content";
import { syncFuentes } from "@/lib/boe";
import type { Content } from "@/content/types";

export const dynamic = "force-dynamic";

const DAY = 24 * 3600 * 1000;

export async function GET() {
  try {
    await ensureDb();
    const [t, p, f] = await Promise.all([
      db.select().from(temas).orderBy(asc(temas.bloque), asc(temas.orden)),
      db.select().from(preguntas).where(eq(preguntas.activa, true)),
      db.select().from(fuentes),
    ]);

    // Sincronización automática con el BOE como máximo una vez al día (sin bloquear la respuesta)
    const boeRows = f.filter((x) => x.tipo === "boe");
    const stale = boeRows.some((x) => !x.ultimaSync || Date.now() - new Date(x.ultimaSync).getTime() > DAY);
    if (stale && !globalThis.__boeSyncRunning) {
      globalThis.__boeSyncRunning = true;
      void syncFuentes()
        .catch(() => undefined)
        .finally(() => {
          globalThis.__boeSyncRunning = false;
        });
    }

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
      fuentes: f.map((x) => ({
        id: x.id,
        nombre: x.nombre,
        tipo: x.tipo,
        url: x.url,
        fechaBoe: x.fechaBoe,
        ultimaSync: x.ultimaSync ? new Date(x.ultimaSync).toISOString() : null,
        estado: x.estado,
        cambio: x.cambio,
      })),
    };
    return Response.json(content, { headers: { "Cache-Control": "no-store" } });
  } catch {
    // Si la base de datos no está disponible, el juego sigue funcionando con el temario incluido.
    return Response.json(seedContent(), { headers: { "Cache-Control": "no-store" } });
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __boeSyncRunning: boolean | undefined;
}
