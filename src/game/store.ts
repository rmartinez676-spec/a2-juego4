import type { DiffKey } from "./config";

export interface Progress {
  levels: Record<string, { stars: number; best: number }>;
  diff: DiffKey;
  unlockAll: boolean;
}
export interface Stats {
  seen: Record<string, number>;
  right: Record<string, number>;
  wrong: Record<string, number>;
}

const PK = "opos.progress.v1";
const SK = "opos.stats.v1";

export const emptyProgress = (): Progress => ({ levels: {}, diff: "normal", unlockAll: false });
export const emptyStats = (): Stats => ({ seen: {}, right: {}, wrong: {} });

function load<T>(key: string, fallback: () => T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback();
    return { ...fallback(), ...JSON.parse(raw) } as T;
  } catch {
    return fallback();
  }
}
function save(key: string, v: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* sin almacenamiento */
  }
}

export const loadProgress = () => load(PK, emptyProgress);
export const saveProgress = (p: Progress) => save(PK, p);
export const loadStats = () => load(SK, emptyStats);
export const saveStats = (s: Stats) => save(SK, s);

export function recordAnswer(s: Stats, id: string, ok: boolean): Stats {
  s.seen[id] = (s.seen[id] ?? 0) + 1;
  if (ok) s.right[id] = (s.right[id] ?? 0) + 1;
  else s.wrong[id] = (s.wrong[id] ?? 0) + 1;
  saveStats(s);
  return s;
}
