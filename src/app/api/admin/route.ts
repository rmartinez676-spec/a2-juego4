import { asc, desc, eq } from "drizzle-orm";
import { db, hasDb } from "@/db";
import { ensureDb } from "@/db/ensure";
import { fuentes, preguntas, temas } from "@/db/schema";
import { fetchArticulos, generarCloze, getBoeCache, getBoeRevisarTemas, marcarRevisada, syncFuentes } from "@/lib/boe";
import { seedContent } from "@/content";

export const dynamic = "force-dynamic";

function authorized(req: Request) {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return true; // sin ADMIN_TOKEN configurado, el panel es libre (uso personal/local)
  return req.headers.get("x-admin-token") === token;
}

const deny = () => Response.json({ error: "No autorizado: indica el ADMIN_TOKEN" }, { status: 401 });

export async function GET(req: Request) {
  if (!authorized(req)) return deny();
  const url = new URL(req.url);
  const tema = url.searchParams.get("tema");
  const cache = getBoeCache();
  const rev = getBoeRevisarTemas();

  if (!hasDb || !db) {
    const seed = seedContent();
    const f = seed.fuentes.map((x) => {
      const c = cache.get(x.id);
      return {
        ...x,
        fechaBoe: c?.fechaBoe ?? null,
        tituloBoe: c?.tituloBoe ?? null,
        ultimaSync: c?.ultimaSync ?? null,
        estado: c?.estado ?? (x.tipo === "boe" ? "Vigente" : null),
        cambio: c?.cambio ?? false,
      };
    });
    const t = seed.temas.map((x) => ({
      id: x.id,
      titulo: x.titulo,
      bloque: x.bloque,
      orden: x.orden,
      revisar: x.revisar || rev.has(x.id),
      fuentes: x.fuentes,
    }));
    const p = tema
      ? seed.preguntas
          .filter((x) => x.tema === tema)
          .map((x) => ({
            id: x.id,
            enunciado: x.q,
            opciones: x.opts,
            correcta: x.ok,
            dif: x.dif,
            activa: true,
            origen: x.origen ?? "seed",
            explicacion: x.exp ?? "",
          }))
      : [];
    return Response.json({ fuentes: f, temas: t, preguntas: p, protegido: !!process.env.ADMIN_TOKEN, noDb: true });
  }

  await ensureDb();
  const [fDb, t, p] = await Promise.all([
    db.select().from(fuentes).orderBy(asc(fuentes.tipo), asc(fuentes.nombre)),
    db.select({ id: temas.id, titulo: temas.titulo, bloque: temas.bloque, orden: temas.orden, revisar: temas.revisar, fuentes: temas.fuentes }).from(temas).orderBy(asc(temas.bloque), asc(temas.orden)),
    tema ? db.select().from(preguntas).where(eq(preguntas.temaId, tema)).orderBy(desc(preguntas.creada)) : Promise.resolve([]),
  ]);

  const f = fDb.map((x) => {
    const c = cache.get(x.id);
    return {
      ...x,
      fechaBoe: x.fechaBoe || c?.fechaBoe || null,
      tituloBoe: x.tituloBoe || c?.tituloBoe || null,
      ultimaSync: x.ultimaSync ? new Date(x.ultimaSync).toISOString() : c?.ultimaSync || null,
      estado: x.estado || c?.estado || null,
      cambio: x.cambio || c?.cambio || false,
    };
  });

  return Response.json({ fuentes: f, temas: t, preguntas: p, protegido: !!process.env.ADMIN_TOKEN });
}

export async function POST(req: Request) {
  if (!authorized(req)) return deny();
  const b = (await req.json()) as Record<string, unknown>;

  try {
    switch (b.action) {
      case "sync": {
        const ids = Array.isArray(b.ids) ? (b.ids as string[]) : undefined;
        const res = await syncFuentes(ids);
        return Response.json({ ok: true, res });
      }
      case "validar": {
        await marcarRevisada(String(b.id));
        return Response.json({ ok: true });
      }
      case "gen": {
        const arts = await fetchArticulos(String(b.fuente));
        const items = generarCloze(arts, Math.min(20, Number(b.n) || 8));
        return Response.json({ ok: true, items, total: arts.length });
      }
      case "addQ": {
        if (!hasDb || !db) {
          return Response.json(
            { error: "Base de datos no configurada. Añade DATABASE_URL en Vercel para guardar preguntas personalizadas en el servidor." },
            { status: 400 },
          );
        }
        await ensureDb();
        const opts = (b.opts as string[]).map((x) => String(x).trim()).filter(Boolean);
        if (opts.length < 2 || !String(b.q ?? "").trim()) return Response.json({ error: "Faltan datos" }, { status: 400 });
        await db.insert(preguntas).values({
          id: `adm-${Date.now().toString(36)}${Math.floor(Math.random() * 99)}`,
          temaId: String(b.tema),
          tipo: "mcq",
          dif: Math.min(3, Math.max(1, Number(b.dif) || 2)),
          enunciado: String(b.q).trim(),
          opciones: opts,
          correcta: Math.min(opts.length - 1, Math.max(0, Number(b.ok) || 0)),
          explicacion: String(b.exp ?? ""),
          fuente: b.fuente ? String(b.fuente) : null,
          origen: "admin",
        });
        return Response.json({ ok: true });
      }
      case "delQ": {
        if (!hasDb || !db) {
          return Response.json({ error: "Base de datos no configurada." }, { status: 400 });
        }
        await ensureDb();
        await db.delete(preguntas).where(eq(preguntas.id, String(b.id)));
        return Response.json({ ok: true });
      }
      case "toggleQ": {
        if (!hasDb || !db) {
          return Response.json({ error: "Base de datos no configurada." }, { status: 400 });
        }
        await ensureDb();
        await db.update(preguntas).set({ activa: !!b.activa }).where(eq(preguntas.id, String(b.id)));
        return Response.json({ ok: true });
      }
      case "saveGen": {
        if (!hasDb || !db) {
          return Response.json(
            { error: "Base de datos no configurada. Añade DATABASE_URL en Vercel para guardar preguntas personalizadas en el servidor." },
            { status: 400 },
          );
        }
        await ensureDb();
        const items = b.items as Array<{ articulo: string; enunciado: string; correcta: string; opciones: string[] }>;
        const fuenteNombre = String(b.fuenteNombre ?? "BOE");
        for (const it of items) {
          const opts = [it.correcta, ...it.opciones].sort(() => Math.random() - 0.5);
          await db.insert(preguntas).values({
            id: `boe-${Date.now().toString(36)}${Math.floor(Math.random() * 9999)}`,
            temaId: String(b.tema),
            tipo: "mcq",
            dif: 2,
            enunciado: `Completa el texto legal: «${it.enunciado}»`,
            opciones: opts,
            correcta: opts.indexOf(it.correcta),
            explicacion: `Texto literal consolidado del BOE (${it.articulo} — ${fuenteNombre}).`,
            fuente: `${it.articulo} · ${fuenteNombre}`,
            origen: "boe",
          });
        }
        return Response.json({ ok: true, guardadas: items.length });
      }
      default:
        return Response.json({ error: "Acción desconocida" }, { status: 400 });
    }
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
