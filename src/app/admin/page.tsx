"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface FuenteRow {
  id: string;
  nombre: string;
  tipo: string;
  url: string;
  fechaBoe: string | null;
  ultimaSync: string | null;
  estado: string | null;
  cambio: boolean;
}
interface TemaRow {
  id: string;
  titulo: string;
  bloque: number;
  orden: number;
  revisar: boolean;
  fuentes: string[];
}
interface PregRow {
  id: string;
  enunciado: string;
  opciones: string[];
  correcta: number;
  dif: number;
  activa: boolean;
  origen: string;
  explicacion: string;
}
interface Cloze {
  articulo: string;
  enunciado: string;
  correcta: string;
  opciones: string[];
}

const fmt = (s?: string | null) => (s && s.length >= 8 ? `${s.slice(6, 8)}/${s.slice(4, 6)}/${s.slice(0, 4)}` : "—");

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [fuentes, setFuentes] = useState<FuenteRow[]>([]);
  const [temas, setTemas] = useState<TemaRow[]>([]);
  const [pregs, setPregs] = useState<PregRow[]>([]);
  const [tema, setTema] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [protegido, setProtegido] = useState(false);
  const [noDb, setNoDb] = useState(false);
  const [gen, setGen] = useState<Cloze[]>([]);
  const [genFuente, setGenFuente] = useState("");
  const [sel, setSel] = useState<number[]>([]);
  const [form, setForm] = useState({ q: "", o0: "", o1: "", o2: "", o3: "", ok: 0, dif: 2, exp: "", fuente: "" });

  useEffect(() => {
    document.body.classList.add("admin-page");
    setToken(sessionStorage.getItem("opos.admin") ?? "");
    return () => document.body.classList.remove("admin-page");
  }, []);

  const call = useCallback(
    async (body?: Record<string, unknown>, query = "") => {
      const r = await fetch(`/api/admin${query}`, {
        method: body ? "POST" : "GET",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: body ? JSON.stringify(body) : undefined,
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Error");
      return j;
    },
    [token],
  );

  const refresh = useCallback(async () => {
    try {
      const j = await call(undefined, tema ? `?tema=${encodeURIComponent(tema)}` : "");
      setFuentes(j.fuentes);
      setTemas(j.temas);
      setPregs(j.preguntas);
      setProtegido(j.protegido);
      setNoDb(!!j.noDb);
      setMsg("");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error");
    }
  }, [call, tema]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error");
    }
    setBusy(false);
  };

  const sync = () =>
    run(async () => {
      const boe = fuentes.filter((f) => f.tipo === "boe");
      const list = boe.length > 0 ? boe : [{ id: "BOE-A-1978-31229" }];
      const batchSize = 10;
      let totalOk = 0;
      let totalChg = 0;
      let totalCount = 0;

      for (let i = 0; i < list.length; i += batchSize) {
        const batch = list.slice(i, i + batchSize);
        const batchIds = batch.map((x) => x.id);
        setMsg(`Consultando BOE (${Math.min(i + batchSize, list.length)}/${list.length} normas)...`);
        const j = await call({ action: "sync", ids: batchIds });
        const ok = (j.res as Array<{ ok: boolean }>).filter((x) => x.ok).length;
        const chg = (j.res as Array<{ cambio?: boolean }>).filter((x) => x.cambio).length;
        totalOk += ok;
        totalChg += chg;
        totalCount += (j.res as unknown[]).length;
      }

      setMsg(`✓ Sincronizado con el BOE: ${totalOk}/${totalCount} normas consultadas · ${totalChg} con cambios recientes.`);
      await refresh();
    });

  const generar = () =>
    run(async () => {
      const j = await call({ action: "gen", fuente: genFuente, n: 10 });
      setGen(j.items);
      setSel(j.items.map((_: Cloze, i: number) => i));
      setMsg(`Texto consolidado leído (${j.total} preceptos). Revisa y guarda las preguntas que te sirvan.`);
    });

  const guardarGen = () =>
    run(async () => {
      if (!tema) throw new Error("Elige primero el tema al que añadir las preguntas");
      const f = fuentes.find((x) => x.id === genFuente);
      const items = sel.map((i) => gen[i]);
      await call({ action: "saveGen", tema, items, fuenteNombre: f?.nombre ?? "BOE" });
      setGen([]);
      setMsg(`${items.length} preguntas guardadas.`);
      await refresh();
    });

  const addQ = () =>
    run(async () => {
      if (!tema) throw new Error("Elige un tema");
      await call({ action: "addQ", tema, q: form.q, opts: [form.o0, form.o1, form.o2, form.o3], ok: form.ok, dif: form.dif, exp: form.exp, fuente: form.fuente });
      setForm({ q: "", o0: "", o1: "", o2: "", o3: "", ok: 0, dif: 2, exp: "", fuente: "" });
      await refresh();
    });

  const boeFuentes = fuentes.filter((f) => f.tipo === "boe");
  const box = "rounded-xl bg-white p-4 shadow";
  const inp = "w-full rounded border border-slate-300 p-2 text-sm";
  const btn = "rounded bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50";

  return (
    <main className="mx-auto max-w-5xl space-y-5 bg-slate-100 p-4 text-slate-900" style={{ minHeight: "100vh" }}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Panel del temario · OPOS QUEST</h1>
          <p className="text-sm text-slate-600">Sincroniza las normas con el BOE y gestiona el banco de preguntas.</p>
        </div>
        <Link href="/" className="rounded bg-amber-400 px-3 py-2 text-sm font-bold">
          ← Volver al juego
        </Link>
      </header>

      {noDb && (
        <div className="rounded border border-blue-300 bg-blue-50 p-3 text-sm text-blue-900">
          ℹ️ <b>Sincronización directa con el BOE:</b> Las normas se consultan en tiempo real con la API oficial de datos abiertos del BOE. No es obligatorio tener base de datos para sincronizar ni para generar preguntas.
        </div>
      )}

      {protegido && (
        <div className={box}>
          <label className="text-sm font-semibold">Token de administración</label>
          <div className="mt-1 flex gap-2">
            <input
              className={inp}
              type="password"
              value={token}
              onChange={(e) => {
                setToken(e.target.value);
                sessionStorage.setItem("opos.admin", e.target.value);
              }}
            />
            <button className={btn} onClick={() => void refresh()}>
              Entrar
            </button>
          </div>
        </div>
      )}
      {msg && <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm">{msg}</div>}

      <section className={box}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold">1. Conexión con el BOE (legislación consolidada)</h2>
          <button className={btn} disabled={busy} onClick={sync}>
            {busy ? "Consultando…" : "🔄 Sincronizar con el BOE"}
          </button>
        </div>
        <p className="mb-3 text-sm text-slate-600">
          Se consulta la fecha de última actualización de cada norma. Si cambia respecto a la última vez, el tema se marca como «revisar» en el juego hasta que lo valides. El servidor también sincroniza solo una vez al día.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase text-slate-500">
                <th className="p-1">Norma</th>
                <th className="p-1">Act. BOE</th>
                <th className="p-1">Estado</th>
                <th className="p-1"></th>
              </tr>
            </thead>
            <tbody>
              {fuentes.map((f) => (
                <tr key={f.id} className={`border-b ${f.cambio ? "bg-red-50" : ""}`}>
                  <td className="p-1">
                    <a className="text-indigo-700 underline" href={f.url} target="_blank" rel="noreferrer">
                      {f.nombre}
                    </a>
                  </td>
                  <td className="p-1 whitespace-nowrap">{f.tipo === "boe" ? fmt(f.fechaBoe) : "—"}</td>
                  <td className="p-1">{f.cambio ? "⚠ Modificada: revisar" : f.tipo === "boe" ? (f.estado ?? "Sin sincronizar") : "Manual"}</td>
                  <td className="p-1">
                    {f.cambio && (
                      <button className="rounded bg-green-600 px-2 py-1 text-xs text-white" onClick={() => void run(async () => { await call({ action: "validar", id: f.id }); await refresh(); })}>
                        Marcar revisada
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={box}>
        <h2 className="mb-3 text-lg font-bold">2. Banco de preguntas por tema</h2>
        <select className={inp} value={tema} onChange={(e) => setTema(e.target.value)}>
          <option value="">— Elige un tema —</option>
          {temas.map((t) => (
            <option key={t.id} value={t.id}>
              B{t.bloque}.{t.orden} · {t.titulo} {t.revisar ? "⚠" : ""}
            </option>
          ))}
        </select>

        {tema && (
          <>
            <div className="mt-4 grid gap-2 rounded border border-slate-200 p-3">
              <div className="text-sm font-semibold">Añadir pregunta propia</div>
              <textarea className={inp} placeholder="Enunciado" value={form.q} onChange={(e) => setForm({ ...form, q: e.target.value })} />
              {(["o0", "o1", "o2", "o3"] as const).map((k, i) => (
                <div key={k} className="flex items-center gap-2">
                  <input type="radio" checked={form.ok === i} onChange={() => setForm({ ...form, ok: i })} />
                  <input className={inp} placeholder={`Opción ${"ABCD"[i]}${form.ok === i ? " (correcta)" : ""}`} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
                </div>
              ))}
              <input className={inp} placeholder="Explicación (opcional)" value={form.exp} onChange={(e) => setForm({ ...form, exp: e.target.value })} />
              <div className="flex flex-wrap gap-2">
                <input className={inp + " flex-1"} placeholder="Fuente (p. ej. art. 14 CE)" value={form.fuente} onChange={(e) => setForm({ ...form, fuente: e.target.value })} />
                <select className={inp + " w-40"} value={form.dif} onChange={(e) => setForm({ ...form, dif: Number(e.target.value) })}>
                  <option value={1}>Dificultad ★</option>
                  <option value={2}>Dificultad ★★</option>
                  <option value={3}>Dificultad ★★★</option>
                </select>
                <button className={btn} disabled={busy} onClick={addQ}>
                  Añadir
                </button>
              </div>
            </div>

            <div className="mt-4 rounded border border-slate-200 p-3">
              <div className="text-sm font-semibold">Generar preguntas «completa el artículo» desde el BOE</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <select className={inp + " flex-1"} value={genFuente} onChange={(e) => setGenFuente(e.target.value)}>
                  <option value="">— Norma del BOE —</option>
                  {boeFuentes.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nombre}
                    </option>
                  ))}
                </select>
                <button className={btn} disabled={busy || !genFuente} onClick={generar}>
                  Generar 10
                </button>
              </div>
              {gen.length > 0 && (
                <div className="mt-3 space-y-2">
                  {gen.map((g, i) => (
                    <label key={i} className="flex gap-2 rounded bg-slate-50 p-2 text-sm">
                      <input type="checkbox" checked={sel.includes(i)} onChange={(e) => setSel(e.target.checked ? [...sel, i] : sel.filter((x) => x !== i))} />
                      <span>
                        <b>{g.articulo}</b> — {g.enunciado}
                        <br />
                        <span className="text-green-700">✔ {g.correcta}</span> <span className="text-slate-500">· {g.opciones.join(" · ")}</span>
                      </span>
                    </label>
                  ))}
                  <button className={btn} disabled={busy || !sel.length} onClick={guardarGen}>
                    Guardar {sel.length} en este tema
                  </button>
                </div>
              )}
            </div>

            <div className="mt-4 space-y-2">
              <div className="text-sm font-semibold">Preguntas del tema ({pregs.length})</div>
              {pregs.map((p) => (
                <div key={p.id} className={`rounded border p-2 text-sm ${p.activa ? "" : "opacity-50"}`}>
                  <div className="flex justify-between gap-2">
                    <b>{p.enunciado}</b>
                    <span className="whitespace-nowrap text-xs text-slate-500">
                      {"★".repeat(p.dif)} · {p.origen}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600">
                    {p.opciones.map((o, i) => (
                      <span key={i} className={i === p.correcta ? "font-bold text-green-700" : ""}>
                        {"ABCD"[i]}) {o}{" "}
                      </span>
                    ))}
                  </div>
                  <div className="mt-1 flex gap-2">
                    <button className="text-xs text-indigo-700 underline" onClick={() => void run(async () => { await call({ action: "toggleQ", id: p.id, activa: !p.activa }); await refresh(); })}>
                      {p.activa ? "Desactivar" : "Activar"}
                    </button>
                    {p.origen !== "seed" && (
                      <button className="text-xs text-red-700 underline" onClick={() => void run(async () => { await call({ action: "delQ", id: p.id }); await refresh(); })}>
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
