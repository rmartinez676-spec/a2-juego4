// Motor de audio chiptune con Web Audio API: música procedural por mundo/submundo/jefe + efectos.
// El silencio funciona con un nodo de ganancia maestro y deteniendo el secuenciador.

export type Wave = "square" | "triangle" | "sawtooth" | "sine" | "pulse";

export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  harmonic: [0, 2, 3, 5, 7, 8, 11],
  pentatonic: [0, 2, 4, 7, 9],
} as const;

export interface TrackDef {
  id: string;
  bpm: number;
  root: number;
  scale: keyof typeof SCALES;
  prog: number[];
  lead: Wave;
  bass: Wave;
  seed: number;
  drums: 0 | 1 | 2;
  arp?: boolean;
  vol?: number;
}

function rng32(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Pattern {
  lead: (number | null)[];
  bass: (number | null)[];
  arp: (number | null)[];
  kick: boolean[];
  snare: boolean[];
  hat: boolean[];
}

const STEPS = 8; // corcheas por compás
const BARS = 8;

function buildPattern(def: TrackDef): Pattern {
  const rng = rng32(def.seed);
  const sc = SCALES[def.scale];
  const n = sc.length;
  const note = (d: number) => def.root + sc[((d % n) + n) % n] + 12 * Math.floor(d / n);
  const pick = <A,>(a: A[]) => a[Math.floor(rng() * a.length)];
  const rhythms = [
    [1, 0, 1, 1, 0, 1, 1, 0],
    [1, 1, 0, 1, 1, 0, 1, 0],
    [1, 0, 1, 0, 1, 1, 0, 1],
    [1, 1, 1, 0, 1, 0, 1, 1],
    [1, 0, 0, 1, 1, 0, 1, 1],
  ];
  const lead: (number | null)[] = [];
  const bass: (number | null)[] = [];
  const arp: (number | null)[] = [];
  const bassStyle = Math.floor(rng() * 3);
  let prev = def.prog[0] + 7;
  const barLead = (chord: number, rhythm: number[]) => {
    const out: (number | null)[] = [];
    for (let s = 0; s < STEPS; s++) {
      if (!rhythm[s]) {
        out.push(null);
        continue;
      }
      let cand: number;
      if (s % 4 === 0) {
        const tones = [chord, chord + 2, chord + 4, chord + 7, chord + 9];
        cand = tones.reduce((best, c) => (Math.abs(c - prev) < Math.abs(best - prev) ? c : best), tones[0]);
      } else cand = prev + pick([-2, -1, -1, 1, 1, 2]);
      cand = Math.max(chord, Math.min(chord + 11, cand));
      out.push(note(cand));
      prev = cand;
    }
    return out;
  };
  const phraseA: (number | null)[][] = [];
  const rhA = rhythms[Math.floor(rng() * rhythms.length)];
  const rhB = rhythms[Math.floor(rng() * rhythms.length)];
  for (let b = 0; b < 4; b++) phraseA.push(barLead(def.prog[b % def.prog.length], b % 2 ? rhB : rhA));
  for (let b = 0; b < BARS; b++) {
    const chord = def.prog[b % def.prog.length];
    if (b < 4) lead.push(...phraseA[b]);
    else if (b === 7) lead.push(...barLead(chord, rhB));
    else lead.push(...phraseA[b - 4]);
    const r = note(chord - 7);
    const t3 = note(chord - 7 + 2);
    const f5 = note(chord - 7 + 4);
    for (let s = 0; s < STEPS; s++) {
      if (bassStyle === 0) bass.push(s % 2 === 0 ? (s % 4 === 0 ? r : f5) : null);
      else if (bassStyle === 1) bass.push(s % 2 === 0 ? r : r + 12);
      else bass.push([r, null, t3, null, f5, null, t3, null][s]);
      if (def.arp) arp.push([note(chord), note(chord + 2), note(chord + 4), note(chord + 7)][s % 4] + 12);
      else arp.push(null);
    }
  }
  const total = STEPS * BARS;
  const kick: boolean[] = [];
  const snare: boolean[] = [];
  const hat: boolean[] = [];
  for (let i = 0; i < total; i++) {
    const s = i % STEPS;
    kick.push(def.drums === 2 ? s === 0 || s === 3 || s === 4 || s === 7 : s === 0 || s === 4);
    snare.push(s === 2 || s === 6);
    hat.push(def.drums === 2 ? true : s % 2 === 1);
  }
  return { lead, bass, arp, kick, snare, hat };
}

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private pulse: PeriodicWave | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private pattern: Pattern | null = null;
  private def: TrackDef | null = null;
  private step = 0;
  private next = 0;
  private wanted: TrackDef | null = null;
  private muted = false;
  private listeners = new Set<() => void>();

  constructor() {
    if (typeof window !== "undefined") {
      try {
        this.muted = window.localStorage.getItem("opos.mute") === "1";
      } catch {
        /* sin almacenamiento */
      }
      document.addEventListener("visibilitychange", () => {
        if (!this.ctx) return;
        if (document.hidden) void this.ctx.suspend();
        else if (!this.muted) void this.ctx.resume();
      });
    }
  }

  /** Debe llamarse dentro de un gesto del usuario (toque/click/tecla). */
  unlock() {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.9;
      this.master.connect(this.ctx.destination);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0.32;
      this.musicBus.connect(this.master);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = 0.55;
      this.sfxBus.connect(this.master);
      const len = this.ctx.sampleRate;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const N = 32;
      const real = new Float32Array(N);
      const imag = new Float32Array(N);
      for (let k = 1; k < N; k++) real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * 0.25);
      this.pulse = this.ctx.createPeriodicWave(real, imag);
    }
    if (this.ctx.state !== "running" && !this.muted) void this.ctx.resume();
    if (this.wanted && !this.timer && !this.muted) this.startLoop();
  }

  isMuted() {
    return this.muted;
  }

  subscribe(cb: () => void) {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  setMuted(m: boolean) {
    this.muted = m;
    try {
      window.localStorage.setItem("opos.mute", m ? "1" : "0");
    } catch {
      /* ignore */
    }
    if (this.ctx && this.master) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setValueAtTime(m ? 0 : 0.9, this.ctx.currentTime);
      if (m) {
        this.stopLoop();
      } else {
        void this.ctx.resume();
        if (this.wanted) this.startLoop();
      }
    }
    this.listeners.forEach((l) => l());
  }

  toggleMute() {
    this.unlock();
    this.setMuted(!this.muted);
    if (!this.muted) this.sfx("click");
  }

  play(def: TrackDef | null) {
    if (def && this.wanted?.id === def.id && this.timer) return;
    this.wanted = def;
    this.stopLoop();
    if (def && this.ctx && !this.muted) this.startLoop();
  }

  stop() {
    this.wanted = null;
    this.stopLoop();
  }

  private startLoop() {
    if (!this.ctx || !this.wanted) return;
    this.stopLoop();
    this.def = this.wanted;
    this.pattern = buildPattern(this.def);
    this.step = 0;
    this.next = this.ctx.currentTime + 0.06;
    this.timer = setInterval(() => this.tick(), 30);
  }

  private stopLoop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private tick() {
    const ctx = this.ctx;
    const def = this.def;
    const p = this.pattern;
    if (!ctx || !def || !p || ctx.state !== "running") return;
    const dur = 60 / def.bpm / 2;
    if (this.next < ctx.currentTime - 0.25) this.next = ctx.currentTime + 0.05;
    while (this.next < ctx.currentTime + 0.14) {
      const i = this.step;
      const t = this.next;
      const v = def.vol ?? 1;
      const l = p.lead[i];
      if (l !== null) this.tone(mtof(l), t, dur * 0.9, def.lead, 0.22 * v, this.musicBus!);
      const b = p.bass[i];
      if (b !== null) this.tone(mtof(b), t, dur * 0.85, def.bass, 0.3 * v, this.musicBus!);
      const a = p.arp[i];
      if (a !== null) this.tone(mtof(a), t, dur * 0.5, "square", 0.07 * v, this.musicBus!);
      if (def.drums) {
        if (p.kick[i]) this.kick(t);
        if (p.snare[i]) this.hit(t, 1800, 0.12, 0.2, "bandpass");
        if (p.hat[i]) this.hit(t, 8000, 0.03, 0.08, "highpass");
      }
      this.step = (i + 1) % (STEPS * BARS);
      this.next += dur;
    }
  }

  private tone(freq: number, t: number, dur: number, type: Wave, vol: number, dest: AudioNode, slideTo?: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    if (type === "pulse" && this.pulse) o.setPeriodicWave(this.pulse);
    else o.type = type === "pulse" ? "square" : type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.03, dur));
    o.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private kick(t: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    o.connect(g);
    g.connect(this.musicBus!);
    o.start(t);
    o.stop(t + 0.16);
  }

  private hit(t: number, freq: number, dur: number, vol: number, type: BiquadFilterType, dest?: AudioNode) {
    const ctx = this.ctx!;
    const s = ctx.createBufferSource();
    s.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f);
    f.connect(g);
    g.connect(dest ?? this.musicBus!);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.02);
  }

  sfx(name: "jump" | "coin" | "stomp" | "hurt" | "correct" | "wrong" | "block" | "talk" | "win" | "lose" | "bossHit" | "door" | "click" | "tick") {
    if (this.muted) return;
    if (!this.ctx) return;
    if (this.ctx.state !== "running") void this.ctx.resume();
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const d = this.sfxBus!;
    const seq = (notes: number[], step: number, type: Wave, vol = 0.3, len = 0.12) => notes.forEach((n, i) => this.tone(mtof(n), t + i * step, len, type, vol, d));
    switch (name) {
      case "jump":
        this.tone(330, t, 0.16, "square", 0.22, d, 700);
        break;
      case "coin":
        seq([83, 88], 0.07, "square", 0.22, 0.18);
        break;
      case "stomp":
        this.tone(220, t, 0.12, "square", 0.3, d, 70);
        break;
      case "hurt":
        this.tone(300, t, 0.35, "sawtooth", 0.3, d, 70);
        break;
      case "correct":
        seq([72, 76, 79, 84], 0.07, "square", 0.25, 0.16);
        break;
      case "wrong":
        seq([60, 55, 50], 0.12, "sawtooth", 0.25, 0.2);
        break;
      case "block":
        this.tone(140, t, 0.12, "square", 0.3, d, 90);
        this.hit(t, 900, 0.06, 0.2, "bandpass", d);
        break;
      case "talk":
        this.tone(520 + Math.random() * 120, t, 0.05, "square", 0.12, d);
        break;
      case "tick":
        this.tone(900, t, 0.04, "square", 0.1, d);
        break;
      case "click":
        this.tone(660, t, 0.06, "square", 0.15, d);
        break;
      case "win":
        seq([72, 72, 72, 76, 79, 76, 79, 84], 0.12, "square", 0.25, 0.18);
        break;
      case "lose":
        seq([67, 64, 60, 55, 48], 0.17, "triangle", 0.35, 0.3);
        break;
      case "bossHit":
        this.hit(t, 600, 0.3, 0.4, "lowpass", d);
        this.tone(180, t, 0.3, "sawtooth", 0.3, d, 50);
        break;
      case "door":
        seq([60, 64, 67], 0.08, "triangle", 0.3, 0.2);
        break;
    }
  }
}

export const audio = new AudioEngine();
