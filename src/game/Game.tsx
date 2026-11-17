"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Content } from "@/content/types";
import { DIFFS, hashStr, shuffle, type DiffKey } from "./config";
import { audio } from "./audio";
import { Engine, type GameEvent } from "./engine";
import { buildArena, buildLevel } from "./level";
import { MAP_TRACK, MENU_TRACK, WORLDS, trackFor } from "./worlds";
import { emptyProgress, emptyStats, loadProgress, loadStats, recordAnswer, saveProgress, type Progress, type Stats } from "./store";
import { makeBlitz, makeMatch, pickQuestions, type Pair, type RQ } from "./quiz";
import { BlitzGame, DialogBox, MatchGame, OrderGame, TestRunner, type TestResult } from "./overlays";
import type { Tema } from "@/content/types";

/* ---------------- tipos auxiliares ---------------- */
interface LevelRef {
  id: string;
  world: number;
  idx: number;
  boss: boolean;
  tema?: Tema;
  label: string;
  title: string;
}
type Screen = "title" | "worlds" | "world" | "stats" | "play" | "sim";
interface SimCfg {
  qs: RQ[];
  mode: "exam" | "test";
  title: string;
  penalty: boolean;
  totalTime: number;
}

const fmtDate = (s?: string | null) => (s && s.length >= 8 ? `${s.slice(6, 8)}/${s.slice(4, 6)}/${s.slice(0, 4)}` : "—");
const stars = (n: number) => "★".repeat(n) + "☆".repeat(3 - n);

function levelsOf(content: Content, w: number): LevelRef[] {
  const ts = content.temas.filter((t) => t.bloque === w).sort((a, b) => a.orden - b.orden);
  const list: LevelRef[] = ts.map((t, i) => ({ id: t.id, world: w, idx: i, boss: false, tema: t, label: `${w}-${i + 1}`, title: t.titulo }));
  list.push({ id: `b${w}boss`, world: w, idx: ts.length, boss: true, label: `${w}-★`, title: WORLDS[w].boss.nombre });
  return list;
}

function useMuted() {
  return useSyncExternalStore(
    (cb) => audio.subscribe(cb),
    () => audio.isMuted(),
    () => false,
  );
}
function MuteBtn({ className = "" }: { className?: string }) {
  const m = useMuted();
  return (
    <button
      className={`icon-btn ${className}`}
      tabIndex={-1}
      aria-label={m ? "Activar sonido" : "Silenciar"}
      title={m ? "Activar sonido" : "Silenciar"}
      onClick={(e) => {
        audio.toggleMute();
        e.currentTarget.blur();
      }}
    >
      {m ? "🔇" : "🔊"}
    </button>
  );
}

/* ---------------- componente raíz ---------------- */
export default function Game() {
  const [mounted, setMounted] = useState(false);
  const [content, setContent] = useState<Content | null>(null);
  const [err, setErr] = useState(false);
  const [progress, setProgress] = useState<Progress>(emptyProgress());
  const stats = useRef<Stats>(emptyStats());
  const [, setSv] = useState(0);
  const [screen, setScreen] = useState<Screen>("title");
  const [world, setWorld] = useState(0);
  const [play, setPlay] = useState<{ level: LevelRef; attempt: number } | null>(null);
  const [briefing, setBriefing] = useState<LevelRef | null>(null);
  const [modal, setModal] = useState<null | "settings" | "help" | "sim">(null);
  const [sim, setSim] = useState<SimCfg | null>(null);

  const load = useCallback(() => {
    setErr(false);
    fetch("/api/temario")
      .then((r) => r.json())
      .then((c: Content) => setContent(c))
      .catch(() => setErr(true));
  }, []);

  useEffect(() => {
    setMounted(true);
    setProgress(loadProgress());
    stats.current = loadStats();
    load();
    try {
      void document.fonts?.load("8px PS2P");
    } catch {
      /* ignore */
    }
    const f = () => audio.unlock();
    window.addEventListener("pointerdown", f);
    window.addEventListener("keydown", f);
    window.addEventListener("touchend", f);
    return () => {
      window.removeEventListener("pointerdown", f);
      window.removeEventListener("keydown", f);
      window.removeEventListener("touchend", f);
    };
  }, [load]);

  useEffect(() => {
    if (screen === "title") audio.play(MENU_TRACK);
    else if (screen === "worlds" || screen === "stats" || screen === "sim") audio.play(MAP_TRACK);
    else if (screen === "world") audio.play(trackFor(world, 0, false));
  }, [screen, world]);

  const diff = DIFFS[progress.diff];
  const update = (p: Progress) => {
    setProgress(p);
    saveProgress(p);
  };
  const onStat = useCallback((id: string, ok: boolean) => {
    recordAnswer(stats.current, id, ok);
    setSv((v) => v + 1);
  }, []);

  const stars_of = (id: string) => progress.levels[id]?.stars ?? 0;
  const worldUnlocked = (w: number) => progress.unlockAll || w === 0 || stars_of(`b${w - 1}boss`) > 0;
  const levelUnlocked = (l: LevelRef, list: LevelRef[]) => {
    if (progress.unlockAll) return true;
    if (l.idx === 0) return worldUnlocked(l.world);
    return stars_of(list[l.idx - 1].id) > 0;
  };

  if (!mounted) return <div className="g-root" />;
  if (!content)
    return (
      <div className="g-root center">
        <div className="loading px">{err ? "No se pudo cargar el temario" : "Cargando temario…"}</div>
        {err && (
          <button className="btn" onClick={load}>
            Reintentar
          </button>
        )}
      </div>
    );

  const startLevel = (l: LevelRef) => {
    setBriefing(null);
    setPlay({ level: l, attempt: 0 });
    setScreen("play");
  };

  const startSim = (n: number, scope: number | "all", penalty: boolean) => {
    const qs = pickQuestions(content, stats.current, diff, { bloque: scope === "all" ? undefined : scope, n, tf: 0.1, reviewN: 0, used: new Set() });
    setModal(null);
    setSim({ qs, mode: "exam", title: scope === "all" ? "Simulacro de examen" : `Simulacro · ${WORLDS[scope].nombre}`, penalty, totalTime: Math.round(qs.length * 54) });
    setScreen("sim");
  };
  const startReview = () => {
    const qs = pickQuestions(content, stats.current, diff, { n: 10, onlyFailed: true, reviewN: 0, used: new Set() }).slice(0, 10);
    if (!qs.length) return false;
    setSim({ qs, mode: "test", title: "Repaso de fallos", penalty: false, totalTime: 0 });
    setScreen("sim");
    return true;
  };

  const nextOf = (l: LevelRef): LevelRef | null => {
    const list = levelsOf(content, l.world);
    if (l.idx + 1 < list.length) return list[l.idx + 1];
    if (l.world < 7) return levelsOf(content, l.world + 1)[0] ?? null;
    return null;
  };

  return (
    <div className="g-root">
      {screen === "title" && (
        <TitleScreen
          diffLabel={`${diff.emoji} ${diff.label}`}
          onPlay={() => setScreen("worlds")}
          onSim={() => setModal("sim")}
          onStats={() => setScreen("stats")}
          onSettings={() => setModal("settings")}
          onHelp={() => setModal("help")}
        />
      )}

      {screen === "worlds" && (
        <div className="g-screen map-screen">
          <div className="bar">
            <button className="btn small dark" onClick={() => setScreen("title")}>
              ◀ Inicio
            </button>
            <div className="px bar-title">MAPA DEL TEMARIO</div>
            <div className="bar-right">
              <span className="chip">
                {diff.emoji} {diff.label}
              </span>
              <MuteBtn />
            </div>
          </div>
          <div className="wgrid">
            {WORLDS.map((w) => {
              const list = levelsOf(content, w.id);
              const got = list.reduce((a, l) => a + stars_of(l.id), 0);
              const done = list.filter((l) => stars_of(l.id) > 0).length;
              const lock = !worldUnlocked(w.id);
              return (
                <button
                  key={w.id}
                  className={`wcard ${lock ? "lock" : ""}`}
                  style={{ background: w.grad }}
                  onClick={() => {
                    if (lock) {
                      audio.sfx("wrong");
                      return;
                    }
                    audio.sfx("click");
                    setWorld(w.id);
                    setScreen("world");
                  }}
                >
                  <div className="wemoji">{w.emoji}</div>
                  <div className="px wnum">{w.id === 0 ? "INICIO" : w.id === 7 ? "FINAL" : `MUNDO ${w.id}`}</div>
                  <div className="wname">{w.nombre}</div>
                  <div className="wsub">{w.sub}</div>
                  <div className="wprog">
                    ★ {got}/{list.length * 3} · {done}/{list.length} niveles
                  </div>
                  {lock && <div className="wlock">🔒</div>}
                </button>
              );
            })}
          </div>
          <div className="map-foot">
            <img src="/images/lia-walk.png" alt="Lía" className="map-lia" />
            <div>
              Completa el jefe de cada mundo para desbloquear el siguiente. ¿Prefieres estudiar a tu aire? Activa «Modo estudio» en Ajustes.
            </div>
          </div>
        </div>
      )}

      {screen === "world" &&
        (() => {
          const w = WORLDS[world];
          const list = levelsOf(content, world);
          return (
            <div className="g-screen world-screen" style={{ ["--wg" as string]: w.grad }}>
              <div className="bar">
                <button className="btn small dark" onClick={() => setScreen("worlds")}>
                  ◀ Mapa
                </button>
                <div className="px bar-title">
                  {w.emoji} {world === 0 ? "INICIO" : world === 7 ? "FINAL" : `MUNDO ${world}`}
                </div>
                <div className="bar-right">
                  <MuteBtn />
                </div>
              </div>
              <div className="world-head" style={{ background: w.grad }}>
                <div className="wname big">{w.nombre}</div>
                <div className="wsub">{w.sub}</div>
                <div className="wsub it">{w.intro}</div>
              </div>
              <div className="lvl-list">
                {list.map((l) => {
                  const lock = !levelUnlocked(l, list);
                  const s = stars_of(l.id);
                  return (
                    <button
                      key={l.id}
                      className={`lvl ${l.boss ? "boss" : ""} ${lock ? "lock" : ""} ${s ? "done" : ""}`}
                      onClick={() => {
                        if (lock) {
                          audio.sfx("wrong");
                          return;
                        }
                        audio.sfx("click");
                        setBriefing(l);
                      }}
                    >
                      <span className="px lvl-n">{l.boss ? "👹" : l.label}</span>
                      <span className="lvl-t">
                        {l.boss ? `Jefe final: ${l.title}` : l.title}
                        {l.tema?.revisar && <em className="rev-tag"> ⚠ revisar</em>}
                      </span>
                      <span className="lvl-s">{lock ? "🔒" : stars(s)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}

      {screen === "stats" && <StatsScreen content={content} progress={progress} stats={stats.current} onBack={() => setScreen("title")} onReview={startReview} onReset={() => { update(emptyProgress()); stats.current = emptyStats(); localStorage.removeItem("opos.stats.v1"); setSv((v) => v + 1); }} />}

      {screen === "play" && play && (
        <PlayScreen
          key={play.level.id + ":" + play.attempt}
          content={content}
          level={play.level}
          diffKey={progress.diff}
          stats={stats.current}
          onStat={onStat}
          onExit={() => {
            setWorld(play.level.world);
            setPlay(null);
            setScreen("world");
          }}
          onRetry={() => setPlay({ level: play.level, attempt: play.attempt + 1 })}
          next={nextOf(play.level)}
          onNext={(n) => setPlay({ level: n, attempt: 0 })}
          onComplete={(id, st, score) => {
            const prev = progress.levels[id];
            update({ ...progress, levels: { ...progress.levels, [id]: { stars: Math.max(prev?.stars ?? 0, st), best: Math.max(prev?.best ?? 0, score) } } });
          }}
        />
      )}

      {screen === "sim" && sim && (
        <div className="g-screen dark">
          <TestRunner
            title={sim.title}
            sub={sim.mode === "exam" ? (sim.penalty ? "Los fallos restan ⅓ de acierto" : "Sin penalización") : "Preguntas que has fallado antes"}
            questions={sim.qs}
            mode={sim.mode}
            timer={0}
            totalTime={sim.totalTime || undefined}
            penalty={sim.penalty}
            onStat={onStat}
            onDone={() => {
              setSim(null);
              setScreen(sim.mode === "exam" ? "worlds" : "stats");
            }}
          />
        </div>
      )}

      {briefing && screen === "world" && (
        <Briefing
          level={briefing}
          content={content}
          diffKey={progress.diff}
          onDiff={(d) => update({ ...progress, diff: d })}
          onClose={() => setBriefing(null)}
          onPlay={() => startLevel(briefing)}
        />
      )}

      {modal === "settings" && (
        <div className="modal-back" onClick={() => setModal(null)}>
          <div className="modal settings" onClick={(e) => e.stopPropagation()}>
            <div className="px t-title">⚙ Ajustes</div>
            <div className="px t-sub">Dificultad</div>
            <div className="diffs">
              {(Object.keys(DIFFS) as DiffKey[]).map((k) => (
                <button key={k} className={`diff ${progress.diff === k ? "on" : ""}`} onClick={() => update({ ...progress, diff: k })}>
                  <b>
                    {DIFFS[k].emoji} {DIFFS[k].label}
                  </b>
                  <span>{DIFFS[k].desc}</span>
                </button>
              ))}
            </div>
            <label className="switch">
              <input type="checkbox" checked={progress.unlockAll} onChange={(e) => update({ ...progress, unlockAll: e.target.checked })} />
              <span>
                <b>Modo estudio:</b> todos los mundos y niveles desbloqueados
              </span>
            </label>
            <div className="row">
              <MuteBtn />
              <span>Música y efectos</span>
              <a className="btn small alt" href="/admin">
                🔄 Actualizar temario (BOE)
              </a>
            </div>
            <div className="t-foot">
              <button className="btn" onClick={() => setModal(null)}>
                Listo ✔
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === "help" && (
        <div className="modal-back" onClick={() => setModal(null)}>
          <div className="modal help" onClick={(e) => e.stopPropagation()}>
            <div className="px t-title">❓ Cómo se juega</div>
            <ul>
              <li>
                <b>Mover:</b> ← → / A D · <b>Saltar:</b> ↑ / Espacio / Z (mantén para saltar más) · <b>Hablar:</b> E / X. En el móvil: botones ◀ ▶ y A (saltar) / B (hablar).
              </li>
              <li>Habla con los <b>personajes</b> (¡!): te explican el tema. Salta sobre los enemigos para eliminarlos.</li>
              <li>Golpea los bloques <b>?</b> desde abajo: pregunta rápida. Si aciertas, ganas puntos y un café (+1 ❤).</li>
              <li>El <b>cofre ★</b> contiene un minijuego: Relaciona, Ordena o Rayo V/F.</li>
              <li>Al final, la <b>puerta PRUEBA</b>: un test del tema. Las preguntas cambian en cada intento.</li>
              <li>El <b>jefe final</b> de cada mundo: recoge los libros de ley 📕 y responde bien para dañarlo.</li>
              <li>El <b>Simulacro</b> reproduce un examen con todo el temario y penalización por fallos.</li>
              <li>Ajusta la <b>dificultad</b> (vidas, tiempo y tipo de pregunta) en Ajustes.</li>
            </ul>
            <div className="t-foot">
              <button className="btn" onClick={() => setModal(null)}>
                ¡A jugar!
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === "sim" && <SimSetup onClose={() => setModal(null)} onStart={startSim} total={content.preguntas.length} />}
    </div>
  );
}

/* ---------------- pantalla de título ---------------- */
function TitleScreen({ diffLabel, onPlay, onSim, onStats, onSettings, onHelp }: { diffLabel: string; onPlay: () => void; onSim: () => void; onStats: () => void; onSettings: () => void; onHelp: () => void }) {
  return (
    <div className="g-screen title" style={{ backgroundImage: "linear-gradient(180deg,rgba(10,8,40,.25),rgba(10,8,40,.78)),url(/images/title-bg.jpg)" }}>
      <div className="top-right">
        <MuteBtn />
      </div>
      <div className="title-wrap">
        <div className="title-left">
          <div className="logo px">
            <span>OPOS</span>
            <span className="q">QUEST</span>
          </div>
          <div className="tagline">
            <b>A2 · Cuerpo de Gestión de la Administración Civil del Estado</b>
            <br />6 mundos · 58 temas · jefes finales · examen del Tribunal
          </div>
          <div className="menu">
            <button className="btn big" onClick={onPlay}>
              ▶ JUGAR
            </button>
            <button className="btn alt" onClick={onSim}>
              📝 Simulacro de examen
            </button>
            <div className="menu-row">
              <button className="btn small dark" onClick={onStats}>
                📊 Progreso
              </button>
              <button className="btn small dark" onClick={onSettings}>
                ⚙ {diffLabel}
              </button>
              <button className="btn small dark" onClick={onHelp}>
                ❓
              </button>
            </div>
          </div>
        </div>
        <img src="/images/lia-win.png" alt="Lía, la opositora" className="title-lia" />
      </div>
    </div>
  );
}

/* ---------------- ficha del nivel ---------------- */
function Briefing({ level, content, diffKey, onDiff, onClose, onPlay }: { level: LevelRef; content: Content; diffKey: DiffKey; onDiff: (d: DiffKey) => void; onClose: () => void; onPlay: () => void }) {
  const w = WORLDS[level.world];
  const t = level.tema;
  const fuentes = (t?.fuentes ?? []).map((id) => content.fuentes.find((f) => f.id === id)).filter(Boolean) as Content["fuentes"];
  const inWorld = (id: string) => Number(id.match(/^b(\d+)/)?.[1]) === level.world;
  const nq =
    level.world === 7 || (!t && level.world === 7)
      ? content.preguntas.length
      : t
        ? content.preguntas.filter((p) => p.tema === t.id).length
        : content.preguntas.filter((p) => inWorld(p.tema)).length;
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal brief" onClick={(e) => e.stopPropagation()}>
        <div className="px brief-n">{level.boss ? "👹 JEFE FINAL" : `Nivel ${level.label}`}</div>
        <div className="brief-title">{level.boss ? w.boss.nombre : level.title}</div>
        {level.boss ? (
          <p className="brief-text">
            {w.boss.taunts[0]} Esquiva sus ataques, recoge los <b>libros de ley 📕</b> que aparecen en las plataformas y responde correctamente para dañarlo. Cada error te cuesta una vida.
          </p>
        ) : (
          <p className="brief-text">{t?.resumen}</p>
        )}
        {t?.revisar && <div className="warn-box">⚠ El BOE ha publicado cambios en alguna norma de este tema. Revisa la fuente oficial.</div>}
        {fuentes.length > 0 && (
          <div className="fuentes">
            {fuentes.map((f) => (
              <a key={f.id} className={`fuente ${f.cambio ? "chg" : ""}`} href={f.url} target="_blank" rel="noreferrer">
                📖 {f.nombre}
                {f.fechaBoe && <small> · BOE act. {fmtDate(f.fechaBoe)}</small>}
                {f.cambio && <small> · ⚠ modificada</small>}
              </a>
            ))}
          </div>
        )}
        <div className="brief-meta">
          Banco de preguntas: <b>{nq}</b> · Dificultad:
          <span className="diff-mini">
            {(Object.keys(DIFFS) as DiffKey[]).map((k) => (
              <button key={k} className={`chip btnchip ${k === diffKey ? "on" : ""}`} onClick={() => onDiff(k)} title={DIFFS[k].desc}>
                {DIFFS[k].emoji} {DIFFS[k].label}
              </button>
            ))}
          </span>
        </div>
        <div className="t-foot">
          <button className="btn dark" onClick={onClose}>
            Volver
          </button>
          <button className="btn big" onClick={onPlay}>
            ▶ Jugar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- simulacro ---------------- */
function SimSetup({ onClose, onStart, total }: { onClose: () => void; onStart: (n: number, scope: number | "all", penalty: boolean) => void; total: number }) {
  const [n, setN] = useState(30);
  const [scope, setScope] = useState<number | "all">("all");
  const [pen, setPen] = useState(true);
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal settings" onClick={(e) => e.stopPropagation()}>
        <div className="px t-title">📝 Simulacro de examen</div>
        <p className="brief-text">Test sin ayudas ni explicaciones hasta el final, con cuenta atrás y corrección con penalización. Banco total: {total} preguntas.</p>
        <div className="px t-sub">Nº de preguntas</div>
        <div className="chips">
          {[20, 30, 50, 100].map((v) => (
            <button key={v} className={`chip btnchip ${n === v ? "on" : ""}`} onClick={() => setN(v)}>
              {v}
            </button>
          ))}
        </div>
        <div className="px t-sub">Materia</div>
        <div className="chips">
          <button className={`chip btnchip ${scope === "all" ? "on" : ""}`} onClick={() => setScope("all")}>
            Todo el temario
          </button>
          {WORLDS.slice(0, 7).map((w) => (
            <button key={w.id} className={`chip btnchip ${scope === w.id ? "on" : ""}`} onClick={() => setScope(w.id)}>
              {w.emoji} {w.id === 0 ? "Inicio" : `B${w.id}`}
            </button>
          ))}
        </div>
        <label className="switch">
          <input type="checkbox" checked={pen} onChange={(e) => setPen(e.target.checked)} />
          <span>Los fallos restan ⅓ de acierto (dejar en blanco no penaliza)</span>
        </label>
        <div className="t-foot">
          <button className="btn dark" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn big" onClick={() => onStart(n, scope, pen)}>
            Empezar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- progreso ---------------- */
function StatsScreen({ content, progress, stats, onBack, onReview, onReset }: { content: Content; progress: Progress; stats: Stats; onBack: () => void; onReview: () => boolean; onReset: () => void }) {
  const [msg, setMsg] = useState("");
  const failed = content.preguntas.filter((p) => (stats.wrong[p.id] ?? 0) > (stats.right[p.id] ?? 0)).length;
  const totalSeen = Object.values(stats.seen).reduce((a, b) => a + b, 0);
  const rows = WORLDS.map((w) => {
    const qs = content.preguntas.filter((p) => Number(p.tema.match(/^b(\d+)/)?.[1]) === w.id);
    const r = qs.reduce((a, p) => a + (stats.right[p.id] ?? 0), 0);
    const x = qs.reduce((a, p) => a + (stats.wrong[p.id] ?? 0), 0);
    const list = levelsOf(content, w.id);
    return { w, pct: r + x ? Math.round((r / (r + x)) * 100) : null, n: r + x, st: list.reduce((a, l) => a + (progress.levels[l.id]?.stars ?? 0), 0), max: list.length * 3 };
  });
  return (
    <div className="g-screen map-screen">
      <div className="bar">
        <button className="btn small dark" onClick={onBack}>
          ◀ Inicio
        </button>
        <div className="px bar-title">MI PROGRESO</div>
        <div className="bar-right">
          <MuteBtn />
        </div>
      </div>
      <div className="stats-wrap">
        <div className="stat-top">
          <img src="/images/lia-study.png" alt="Lía estudiando" className="study-lia" />
          <div>
            <div className="stat-big">
              <b>{totalSeen}</b> preguntas respondidas
            </div>
            <div className="stat-big">
              <b>{failed}</b> pendientes de repasar
            </div>
            <button
              className="btn"
              onClick={() => {
                if (!onReview()) setMsg("¡No tienes fallos pendientes! Sigue jugando para detectar tus puntos débiles.");
              }}
            >
              🎯 Repasar mis fallos
            </button>
            {msg && <div className="t-subtitle">{msg}</div>}
          </div>
        </div>
        {rows.map(({ w, pct, n, st, max }) => (
          <div key={w.id} className="srow">
            <span className="srow-n">
              {w.emoji} {w.nombre}
            </span>
            <div className="sbar">
              <i style={{ width: `${pct ?? 0}%`, background: pct === null ? "transparent" : pct >= 70 ? "#2ecc71" : pct >= 50 ? "#f1c40f" : "#e74c3c" }} />
            </div>
            <span className="srow-v">
              {pct === null ? "—" : `${pct}% (${n})`} · ★{st}/{max}
            </span>
          </div>
        ))}
        <div className="t-foot">
          <button
            className="btn small dark"
            onClick={() => {
              if (confirm("¿Borrar todo el progreso y las estadísticas?")) onReset();
            }}
          >
            🗑 Borrar progreso
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- juego ---------------- */
type Ov =
  | { k: "npc"; i: number }
  | { k: "q"; purpose: "block" | "boss"; i: number; qs: RQ[] }
  | { k: "test"; qs: RQ[]; need: number; penalty: boolean }
  | { k: "mini"; type: "match" | "order" | "blitz"; pairs?: Pair[]; blitz?: RQ[] }
  | { k: "dead" }
  | { k: "pause" }
  | { k: "win"; stars: number; score: number; coins: number; acc: number };

function useTouch() {
  const [t, setT] = useState(false);
  useEffect(() => {
    setT(window.matchMedia?.("(pointer: coarse)").matches || navigator.maxTouchPoints > 0 || "ontouchstart" in window);
  }, []);
  return t;
}

function PlayScreen({
  content,
  level,
  diffKey,
  stats,
  onStat,
  onExit,
  onRetry,
  next,
  onNext,
  onComplete,
}: {
  content: Content;
  level: LevelRef;
  diffKey: DiffKey;
  stats: Stats;
  onStat: (id: string, ok: boolean) => void;
  onExit: () => void;
  onRetry: () => void;
  next: LevelRef | null;
  onNext: (n: LevelRef) => void;
  onComplete: (id: string, stars: number, score: number) => void;
}) {
  const diff = DIFFS[diffKey];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const eng = useRef<Engine | null>(null);
  const used = useRef(new Set<string>());
  const handler = useRef<(e: GameEvent) => void>(() => undefined);
  const [ov, setOv] = useState<Ov | null>(null);
  const touch = useTouch();
  const tema = level.tema;
  const world = WORLDS[level.world];
  const [canFs, setCanFs] = useState(false);

  const testN = tema?.id === "b7t2" ? 15 : tema?.id === "b7t1" ? 8 : 5;
  const pick = (n: number, extra: { hard?: boolean; reviewN?: number } = {}) =>
    pickQuestions(content, stats, diff, { temaId: tema?.id, bloque: level.boss ? level.world : undefined, n, used: used.current, ...extra });

  const complete = (acc: number) => {
    const e = eng.current;
    if (!e) return;
    const s = e.stats();
    let st: number;
    if (level.boss) st = 1 + (s.hearts >= Math.ceil(s.maxHearts / 2) ? 1 : 0) + (s.heartsLost === 0 ? 1 : 0);
    else st = 1 + (acc >= 0.8 ? 1 : 0) + (acc >= 0.8 && s.talked === s.npcs ? 1 : 0);
    e.finish();
    audio.sfx("win");
    onComplete(level.id, st, s.score);
    setOv({ k: "win", stars: st, score: s.score, coins: s.coins, acc });
  };

  handler.current = (e: GameEvent) => {
    switch (e.t) {
      case "npc":
        setOv({ k: "npc", i: e.i });
        break;
      case "block":
        setOv({ k: "q", purpose: "block", i: e.i, qs: pick(1) });
        break;
      case "book":
        setOv({ k: "q", purpose: "boss", i: 0, qs: pick(1, { hard: true, reviewN: 0 }) });
        break;
      case "goal": {
        const penalty = tema?.id === "b7t2";
        setOv({ k: "test", qs: pick(testN), need: Math.ceil(diff.pass * testN), penalty });
        break;
      }
      case "chest": {
        const pairs = tema ? makeMatch(content, tema.id) : null;
        const types: ("match" | "order" | "blitz")[] = ["blitz"];
        if (pairs) types.push("match", "match");
        if (tema?.ordenItem) types.push("order", "order", "order");
        const type = types[Math.floor(Math.random() * types.length)];
        setOv({ k: "mini", type, pairs: pairs ?? undefined, blitz: type === "blitz" ? makeBlitz(content, stats, diff, tema?.id ?? "b0t1", 8) : undefined });
        break;
      }
      case "dead":
        setOv({ k: "dead" });
        break;
      case "bossDown":
        complete(1);
        break;
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current!;
    const data = level.boss
      ? buildArena()
      : buildLevel({ seed: hashStr(level.id), npcs: (tema?.npcs ?? []).map((n) => n.who), blocks: 3, chest: true, density: diff.density, length: 96 + (tema?.npcs.length ?? 0) * 6 });
    const e = new Engine(canvas, { level: data, world, diff, sub: level.idx, title: level.title, label: level.label, onEvent: (ev) => handler.current(ev) });
    eng.current = e;
    e.start();
    audio.play(trackFor(level.world, level.idx, level.boss));
    setCanFs(!!document.fullscreenEnabled);
    const key = (ev: KeyboardEvent) => {
      if ((ev.key === "Escape" || ev.key.toLowerCase() === "p") && !e.over) {
        if (!e.paused) {
          e.pause();
          setOv({ k: "pause" });
        }
      }
    };
    const vis = () => {
      if (document.hidden && !e.paused && !e.over) {
        e.pause();
        setOv({ k: "pause" });
      }
    };
    window.addEventListener("keydown", key);
    document.addEventListener("visibilitychange", vis);
    return () => {
      window.removeEventListener("keydown", key);
      document.removeEventListener("visibilitychange", vis);
      e.destroy();
      eng.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resume = () => {
    setOv(null);
    eng.current?.resume();
  };
  const toggleFs = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else
      document.documentElement
        .requestFullscreen?.()
        .then(() => (screen.orientation as unknown as { lock?: (o: string) => Promise<void> })?.lock?.("landscape").catch(() => undefined))
        .catch(() => undefined);
  };

  const bind = (k: "left" | "right" | "jump" | "act") => {
    const up = () => eng.current?.setVirtual(k, false);
    return {
      onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture?.(e.pointerId);
        eng.current?.setVirtual(k, true);
      },
      onPointerUp: up,
      onPointerCancel: up,
      onLostPointerCapture: up,
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    };
  };

  const finishTest = (r: TestResult, need: number) => {
    if (r.correct >= need) complete(r.correct / Math.max(1, r.total));
    else {
      eng.current?.goalFail();
      setOv(null);
    }
  };

  return (
    <div className="g-stage">
      <canvas ref={canvasRef} className="g-canvas" />
      <div className="rotate-hint">📱↻ Gira el móvil en horizontal para jugar mejor</div>

      {ov === null && (
        <div className="g-top">
          <button
            className="icon-btn"
            tabIndex={-1}
            aria-label="Pausa"
            onClick={(e) => {
              e.currentTarget.blur();
              eng.current?.pause();
              setOv({ k: "pause" });
            }}
          >
            ⏸
          </button>
          <MuteBtn />
          {canFs && (
            <button className="icon-btn" tabIndex={-1} aria-label="Pantalla completa" onClick={(e) => { e.currentTarget.blur(); toggleFs(); }}>
              ⛶
            </button>
          )}
        </div>
      )}

      {touch && ov === null && (
        <div className="tc">
          <div className="tc-left">
            <button className="tbtn" aria-label="Izquierda" {...bind("left")}>
              ◀
            </button>
            <button className="tbtn" aria-label="Derecha" {...bind("right")}>
              ▶
            </button>
          </div>
          <div className="tc-right">
            <button className="tbtn b" aria-label="Hablar" {...bind("act")}>
              B
            </button>
            <button className="tbtn a" aria-label="Saltar" {...bind("jump")}>
              A
            </button>
          </div>
        </div>
      )}

      {ov?.k === "npc" && tema?.npcs[ov.i] && <DialogBox npc={tema.npcs[ov.i]} fuentes={tema.fuentes} onClose={resume} />}

      {ov?.k === "q" && (
        <TestRunner
          key={ov.qs[0]?.id + ov.purpose + ov.i}
          title={ov.purpose === "boss" ? `⚔ ${world.boss.nombre}` : "Bloque de pregunta"}
          sub={ov.purpose === "boss" ? "¡Acierta para dañar al jefe!" : "Acierta para ganar puntos y un café ☕"}
          questions={ov.qs}
          mode={ov.purpose === "boss" ? "boss" : "single"}
          timer={diff.timer}
          onStat={onStat}
          onDone={(r) => {
            const ok = r.correct > 0;
            setOv(null);
            if (ov.purpose === "boss") eng.current?.bossResult(ok);
            else eng.current?.blockResult(ov.i, ok);
          }}
        />
      )}

      {ov?.k === "test" && (
        <TestRunner
          title={tema?.id === "b7t2" ? "Mini-examen del Tribunal" : "Prueba del tema"}
          sub={tema?.titulo}
          questions={ov.qs}
          mode="test"
          timer={diff.timer}
          need={ov.need}
          penalty={ov.penalty}
          onStat={onStat}
          onDone={(r) => finishTest(r, ov.need)}
        />
      )}

      {ov?.k === "mini" && ov.type === "match" && ov.pairs && (
        <MatchGame
          pairs={ov.pairs}
          onDone={(s) => {
            setOv(null);
            eng.current?.chestResult(s);
          }}
        />
      )}
      {ov?.k === "mini" && ov.type === "order" && tema?.ordenItem && (
        <OrderGame
          titulo={tema.ordenItem.titulo}
          items={tema.ordenItem.items}
          onDone={(s) => {
            setOv(null);
            eng.current?.chestResult(s);
          }}
        />
      )}
      {ov?.k === "mini" && ov.type === "blitz" && ov.blitz && (
        <BlitzGame
          items={ov.blitz}
          seconds={diff.timer ? Math.max(5, Math.round(diff.timer / 4)) : 9}
          onDone={(s) => {
            setOv(null);
            eng.current?.chestResult(s);
          }}
        />
      )}

      {ov?.k === "pause" && (
        <div className="modal-back">
          <div className="modal settings">
            <div className="px t-title">⏸ Pausa</div>
            <div className="row">
              <MuteBtn />
              <span>Música y efectos</span>
            </div>
            <div className="t-foot wrap">
              <button className="btn dark" onClick={onExit}>
                Salir al mapa
              </button>
              <button className="btn alt" onClick={onRetry}>
                Reiniciar nivel
              </button>
              <button className="btn" onClick={resume}>
                ▶ Seguir
              </button>
            </div>
          </div>
        </div>
      )}

      {ov?.k === "dead" && (
        <div className="modal-back">
          <div className="modal result">
            <img src="/images/lia-study.png" alt="" className="res-lia" />
            <div className="px t-title">¡Casi!</div>
            <p className="brief-text">Te has quedado sin vidas. Repasa el tema con los personajes y vuelve a intentarlo: las preguntas serán distintas.</p>
            <div className="t-foot wrap">
              <button className="btn dark" onClick={onExit}>
                Salir
              </button>
              <button className="btn" onClick={onRetry}>
                ↻ Reintentar
              </button>
            </div>
          </div>
        </div>
      )}

      {ov?.k === "win" && (
        <div className="modal-back">
          <div className="modal result">
            <img src="/images/lia-win.png" alt="" className="res-lia" />
            <div className="px t-title">{level.boss ? "¡JEFE DERROTADO!" : "¡NIVEL SUPERADO!"}</div>
            <div className="big-stars">{stars(ov.stars)}</div>
            <div className="t-score">
              Puntos: <b>{ov.score}</b> · Monedas: <b>{ov.coins}</b>
              {!level.boss && (
                <>
                  {" "}
                  · Acierto en la prueba: <b>{Math.round(ov.acc * 100)}%</b>
                </>
              )}
            </div>
            {level.id === "b7boss" && <p className="brief-text">🎉 ¡Has completado el examen final! Ahora toca repetir con dificultad «Opositor» y hacer simulacros hasta que la plaza sea tuya.</p>}
            <div className="t-foot wrap">
              <button className="btn dark" onClick={onExit}>
                Mapa
              </button>
              <button className="btn alt" onClick={onRetry}>
                ↻ Repetir
              </button>
              {next && (
                <button className="btn" onClick={() => onNext(next)}>
                  Siguiente ▶
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { shuffle };
