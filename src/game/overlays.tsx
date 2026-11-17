"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { shuffle } from "./config";
import { audio } from "./audio";
import { drawPerson, type Look } from "./sprites";
import type { RQ, Pair } from "./quiz";
import type { NpcSeed } from "@/content/types";
import { character } from "./characters";

/* ---------------- Retrato pixel-art ---------------- */
export function Portrait({ look, talking = true, className = "" }: { look: Look; talking?: boolean; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      drawPerson(ctx, look, 40, 90, { s: 2, state: talking ? "talk" : "idle", t });
      t += 0.15;
    };
    draw();
    const id = setInterval(draw, 150);
    return () => clearInterval(id);
  }, [look, talking]);
  return <canvas ref={ref} width={80} height={84} className={`portrait ${className}`} />;
}

/* ---------------- Diálogo de personaje ---------------- */
export function DialogBox({ npc, onClose, fuentes }: { npc: NpcSeed; onClose: () => void; fuentes?: string[] }) {
  const ch = character(npc.who);
  const [page, setPage] = useState(0);
  const [shown, setShown] = useState(0);
  const text = npc.lines[page] ?? "";
  const last = page >= npc.lines.length - 1;

  useEffect(() => {
    setShown(0);
    const id = setInterval(() => {
      setShown((s) => {
        if (s >= text.length) {
          clearInterval(id);
          return s;
        }
        if (s % 3 === 0) audio.sfx("talk");
        return s + 1;
      });
    }, 16);
    return () => clearInterval(id);
  }, [text]);

  const next = useCallback(() => {
    if (shown < text.length) {
      setShown(text.length);
      return;
    }
    audio.sfx("click");
    if (last) onClose();
    else setPage((p) => p + 1);
  }, [shown, text.length, last, onClose]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " " || e.key.toLowerCase() === "e") {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [next]);

  return (
    <div className="modal-back" onClick={next}>
      <div className="modal dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dlg-head">
          <Portrait look={ch.look} talking={shown < text.length} />
          <div>
            <div className="px dlg-name">{ch.name}</div>
            <div className="dlg-role">{ch.role}</div>
            <div className="dlg-dots">
              {npc.lines.map((_, i) => (
                <span key={i} className={i === page ? "on" : ""} />
              ))}
            </div>
          </div>
        </div>
        <p className="dlg-text" onClick={next}>
          {text.slice(0, shown)}
          <span className="caret">▌</span>
        </p>
        <div className="dlg-foot">
          <span className="dlg-src">{fuentes && fuentes.length ? "📚 Ver fuentes en la ficha del nivel" : ""}</span>
          <button className="btn" onClick={next} tabIndex={-1}>
            {shown < text.length ? "Saltar ▶▶" : last ? "¡Entendido! ✔" : "Siguiente ▶"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Test / examen ---------------- */
export interface TestResult {
  correct: number;
  wrong: number;
  blank: number;
  total: number;
  net: number;
  answers: { q: RQ; sel: number | null }[];
}

interface TestProps {
  title: string;
  sub?: string;
  questions: RQ[];
  mode: "single" | "test" | "exam" | "boss";
  timer: number;
  totalTime?: number;
  need?: number;
  penalty?: boolean;
  onStat: (id: string, ok: boolean) => void;
  onDone: (r: TestResult) => void;
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function TestRunner({ title, sub, questions, mode, timer, totalTime, need, penalty, onStat, onDone }: TestProps) {
  const exam = mode === "exam";
  const [idx, setIdx] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<{ q: RQ; sel: number | null }[]>([]);
  const [left, setLeft] = useState(exam ? (totalTime ?? 0) : timer);
  const [finished, setFinished] = useState(false);
  const q = questions[idx];
  const statsSent = useRef(false);

  const finish = useCallback(
    (list: { q: RQ; sel: number | null }[]) => {
      const full = [...list];
      while (full.length < questions.length) full.push({ q: questions[full.length], sel: null });
      setAnswers(full);
      setFinished(true);
      if (exam && !statsSent.current) {
        statsSent.current = true;
        full.forEach((a) => a.sel !== null && onStat(a.q.id, a.sel === a.q.ok));
      }
      if (mode !== "exam") audio.sfx("win");
    },
    [questions, exam, mode, onStat],
  );

  const commit = useCallback(
    (choice: number | null) => {
      if (revealed || !q) return;
      setSel(choice);
      setRevealed(true);
      const ok = choice === q.ok;
      onStat(q.id, ok);
      audio.sfx(ok ? "correct" : "wrong");
    },
    [revealed, q, onStat],
  );

  const advance = useCallback(() => {
    if (!q) return;
    const list = [...answers, { q, sel }];
    if (mode === "single" || mode === "boss") {
      setAnswers(list);
      onDone(summary(list, penalty));
      return;
    }
    if (idx + 1 >= questions.length) finish(list);
    else {
      setAnswers(list);
      setIdx(idx + 1);
      setSel(null);
      setRevealed(false);
      setLeft(exam ? left : timer);
    }
  }, [q, answers, sel, mode, penalty, onDone, idx, questions.length, finish, exam, left, timer]);

  // temporizador
  useEffect(() => {
    if (finished) return;
    if (!exam && (!timer || revealed)) return;
    if (exam && !totalTime) return;
    const id = setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          clearInterval(id);
          return 0;
        }
        if (l <= 5) audio.sfx("tick");
        return l - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [finished, exam, timer, totalTime, revealed, idx]);

  useEffect(() => {
    if (left !== 0 || finished) return;
    if (exam) {
      if (totalTime) finish([...answers, ...(q ? [{ q, sel }] : [])]);
    } else if (timer && !revealed) commit(null);
  }, [left]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (finished) return;
      const n = Number(e.key);
      if (n >= 1 && n <= (q?.opts.length ?? 0)) {
        if (exam) setSel(n - 1);
        else commit(n - 1);
      } else if ((e.key === "Enter" || e.key === " ") && (revealed || exam)) {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [finished, q, exam, revealed, commit, advance]);

  const res = useMemo(() => (finished ? summary(answers, penalty) : null), [finished, answers, penalty]);

  if (finished && res) {
    const passed = need === undefined ? true : res.correct >= need;
    const wrongs = exam ? res.answers : res.answers.filter((a) => a.sel !== a.q.ok);
    return (
      <div className="modal-back">
        <div className="modal test">
          <div className="px t-title">{exam ? "Resultado del simulacro" : passed ? "¡Prueba superada!" : "Aún no… ¡repasa!"}</div>
          <div className="t-score">
            <b>{res.correct}</b> aciertos · <b>{res.wrong}</b> fallos · <b>{res.blank}</b> en blanco
            {penalty && (
              <div>
                Nota neta (−⅓ por fallo): <b>{res.net.toFixed(2)}</b> / {res.total} → <b>{((Math.max(0, res.net) / res.total) * 10).toFixed(2)}</b> sobre 10
              </div>
            )}
            {need !== undefined && (
              <div className={passed ? "ok" : "ko"}>
                {passed ? `Necesitabas ${need} aciertos: ¡conseguido!` : `Necesitabas ${need} aciertos. Vuelve a intentarlo: las preguntas cambian.`}
              </div>
            )}
          </div>
          {wrongs.length > 0 && (
            <div className="t-review">
              <div className="px t-sub">{exam ? "Revisión" : "Para repasar"}</div>
              {wrongs.map((a, i) => (
                <div key={i} className={`rev ${a.sel === a.q.ok ? "good" : "bad"}`}>
                  <div className="rev-q">{a.q.q}</div>
                  <div>
                    ✅ {a.q.opts[a.q.ok]}
                    {a.sel !== null && a.sel !== a.q.ok && <span className="rev-mine"> · ❌ tu respuesta: {a.q.opts[a.sel]}</span>}
                    {a.sel === null && <span className="rev-mine"> · (sin responder)</span>}
                  </div>
                  {a.q.exp && <div className="rev-exp">💡 {a.q.exp}</div>}
                </div>
              ))}
            </div>
          )}
          <div className="t-foot">
            <button className="btn" tabIndex={-1} onClick={() => onDone(res)}>
              Continuar ▶
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!q) return null;
  const isTf = q.tf;
  return (
    <div className="modal-back">
      <div className={`modal test ${mode}`}>
        <div className="t-head">
          <div>
            <div className="px t-title">{title}</div>
            {sub && <div className="t-subtitle">{sub}</div>}
          </div>
          <div className="t-meta">
            {questions.length > 1 && (
              <span className="chip">
                {idx + 1}/{questions.length}
              </span>
            )}
            {(exam ? !!totalTime : !!timer) && (
              <span className={`chip ${left <= 5 ? "warn" : ""}`}>⏱ {exam ? fmt(left) : `${left}s`}</span>
            )}
            <span className="chip dif">{["", "★", "★★", "★★★"][q.dif] ?? "★"}</span>
          </div>
        </div>
        <p className="q-text">{q.q}</p>
        <div className={`opts ${isTf ? "tf" : ""}`}>
          {q.opts.map((o, i) => {
            let cls = "opt";
            if (revealed) {
              if (i === q.ok) cls += " right";
              else if (i === sel) cls += " wrong";
              else cls += " dim";
            } else if (exam && i === sel) cls += " picked";
            return (
              <button
                key={i}
                className={cls}
                tabIndex={-1}
                onClick={() => {
                  if (exam) setSel(sel === i ? null : i);
                  else commit(i);
                }}
              >
                <span className="letter">{isTf ? (i === 0 ? "V" : "F") : "ABCD"[i]}</span>
                <span>{o}</span>
              </button>
            );
          })}
        </div>
        {revealed && (
          <div className={`feedback ${sel === q.ok ? "ok" : "ko"}`}>
            <b>{sel === q.ok ? "¡Correcto! " : sel === null ? "¡Tiempo! " : "No exactamente. "}</b>
            {q.exp || `La respuesta correcta es «${q.opts[q.ok]}».`}
            {q.fuente && <div className="fsrc">📖 {q.fuente}</div>}
          </div>
        )}
        <div className="t-foot">
          {exam ? (
            <>
              <button className="btn dark" tabIndex={-1} onClick={() => finish([...answers, { q, sel }])}>
                Entregar ya
              </button>
              <button className="btn" tabIndex={-1} onClick={advance}>
                {idx + 1 >= questions.length ? "Entregar ✔" : sel === null ? "Dejar en blanco ▶" : "Siguiente ▶"}
              </button>
            </>
          ) : (
            revealed && (
              <button className="btn" tabIndex={-1} onClick={advance}>
                {mode === "test" && idx + 1 < questions.length ? "Siguiente ▶" : "Continuar ▶"}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function summary(list: { q: RQ; sel: number | null }[], penalty?: boolean): TestResult {
  let correct = 0;
  let wrong = 0;
  let blank = 0;
  for (const a of list) {
    if (a.sel === null) blank++;
    else if (a.sel === a.q.ok) correct++;
    else wrong++;
  }
  return { correct, wrong, blank, total: list.length, net: correct - (penalty ? wrong / 3 : 0), answers: list };
}

/* ---------------- Minijuegos ---------------- */
function MiniShell({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="modal-back">
      <div className="modal mini">
        <div className="px t-title">🎁 {title}</div>
        <div className="t-subtitle">{hint}</div>
        {children}
      </div>
    </div>
  );
}

export function MatchGame({ pairs, onDone }: { pairs: Pair[]; onDone: (score: number) => void }) {
  const order = useMemo(() => shuffle(pairs.map((_, i) => i)), [pairs]);
  const [selL, setSelL] = useState<number | null>(null);
  const [done, setDone] = useState<number[]>([]);
  const [bad, setBad] = useState<number | null>(null);
  const [mistakes, setMistakes] = useState(0);

  useEffect(() => {
    if (done.length === pairs.length) {
      audio.sfx("win");
      const id = setTimeout(() => onDone(Math.max(0.2, 1 - mistakes * 0.2)), 900);
      return () => clearTimeout(id);
    }
  }, [done, pairs.length, mistakes, onDone]);

  const pickR = (ri: number) => {
    if (selL === null || done.includes(ri)) return;
    if (ri === selL) {
      setDone((d) => [...d, ri]);
      audio.sfx("correct");
    } else {
      setMistakes((m) => m + 1);
      setBad(ri);
      audio.sfx("wrong");
      setTimeout(() => setBad(null), 400);
    }
    setSelL(null);
  };

  return (
    <MiniShell title="Relaciona" hint="Toca un concepto y luego su respuesta correcta.">
      <div className="match">
        <div className="col">
          {pairs.map((p, i) => (
            <button key={i} tabIndex={-1} className={`mcard ${done.includes(i) ? "done" : ""} ${selL === i ? "sel" : ""}`} onClick={() => !done.includes(i) && setSelL(i)}>
              {p.l}
            </button>
          ))}
        </div>
        <div className="col">
          {order.map((ri) => (
            <button key={ri} tabIndex={-1} className={`mcard r ${done.includes(ri) ? "done" : ""} ${bad === ri ? "bad" : ""}`} onClick={() => pickR(ri)}>
              {pairs[ri].r}
            </button>
          ))}
        </div>
      </div>
      <div className="t-subtitle">Fallos: {mistakes}</div>
    </MiniShell>
  );
}

export function OrderGame({ titulo, items, onDone }: { titulo: string; items: string[]; onDone: (score: number) => void }) {
  const shuffled = useMemo(() => {
    let s = shuffle(items.map((_, i) => i));
    if (items.length > 1 && s.every((v, i) => v === i)) s = s.reverse();
    return s;
  }, [items]);
  const [next, setNext] = useState(0);
  const [bad, setBad] = useState<number | null>(null);
  const [mistakes, setMistakes] = useState(0);

  useEffect(() => {
    if (next >= items.length) {
      audio.sfx("win");
      const id = setTimeout(() => onDone(Math.max(0.2, 1 - mistakes * 0.2)), 900);
      return () => clearTimeout(id);
    }
  }, [next, items.length, mistakes, onDone]);

  const pick = (i: number) => {
    if (i < next) return;
    if (i === next) {
      setNext(next + 1);
      audio.sfx("correct");
    } else {
      setMistakes((m) => m + 1);
      setBad(i);
      audio.sfx("wrong");
      setTimeout(() => setBad(null), 400);
    }
  };
  return (
    <MiniShell title="Ordena" hint={`${titulo} — toca los elementos en el orden correcto.`}>
      <div className="order">
        {shuffled.map((i) => (
          <button key={i} tabIndex={-1} className={`mcard ${i < next ? "done" : ""} ${bad === i ? "bad" : ""}`} onClick={() => pick(i)}>
            {i < next && <b className="num">{i + 1}</b>}
            {items[i]}
          </button>
        ))}
      </div>
      <div className="t-subtitle">Fallos: {mistakes}</div>
    </MiniShell>
  );
}

export function BlitzGame({ items, seconds, onDone }: { items: RQ[]; seconds: number; onDone: (score: number) => void }) {
  const [idx, setIdx] = useState(0);
  const [left, setLeft] = useState(seconds);
  const [flash, setFlash] = useState<"ok" | "ko" | null>(null);
  const [hits, setHits] = useState(0);
  const q = items[idx];

  const answer = useCallback(
    (v: number | null) => {
      if (flash || !q) return;
      const ok = v === q.ok;
      setFlash(ok ? "ok" : "ko");
      audio.sfx(ok ? "correct" : "wrong");
      const h = hits + (ok ? 1 : 0);
      setTimeout(() => {
        setFlash(null);
        if (idx + 1 >= items.length) onDone(h / items.length);
        else {
          setHits(h);
          setIdx(idx + 1);
          setLeft(seconds);
        }
      }, 550);
    },
    [flash, q, hits, idx, items.length, onDone, seconds],
  );

  useEffect(() => {
    if (flash) return;
    const id = setInterval(() => setLeft((l) => l - 0.1), 100);
    return () => clearInterval(id);
  }, [flash, idx]);
  useEffect(() => {
    if (left <= 0 && !flash) answer(null);
  }, [left]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!q) return null;
  return (
    <MiniShell title="Rayo V/F" hint={`¿Verdadero o falso? ${seconds} s por afirmación.`}>
      <div className="blitz-bar">
        <i style={{ width: `${Math.max(0, (left / seconds) * 100)}%` }} />
      </div>
      <p className={`q-text blitz ${flash ?? ""}`}>{q.q}</p>
      <div className="opts tf">
        <button className="opt" tabIndex={-1} onClick={() => answer(0)}>
          <span className="letter">V</span>Verdadero
        </button>
        <button className="opt" tabIndex={-1} onClick={() => answer(1)}>
          <span className="letter">F</span>Falso
        </button>
      </div>
      <div className="t-subtitle">
        {idx + 1}/{items.length} · Aciertos: {hits}
      </div>
    </MiniShell>
  );
}
