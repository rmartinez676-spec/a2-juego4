import type { TrackDef, Wave } from "./audio";
import type { Look } from "./sprites";

export type BgKind = "academy" | "congreso" | "europa" | "ciudad" | "tribunal" | "rrhh" | "tesoro" | "examen";

export interface Theme {
  kind: BgKind;
  skies: [string, string][];
  tints: string[];
  ground: { top: string; trim: string; fill: string; line: string };
  brick: { face: string; line: string; hi: string };
  accent: string;
}

export interface BossDef {
  nombre: string;
  kind: "boletin" | "leon" | "euro" | "monitor" | "caja" | "person";
  look?: Look;
  color: string;
  proj: string;
  w: number;
  h: number;
  taunts: string[];
}

export interface MusicDef {
  root: number;
  scale: TrackDef["scale"];
  bpm: number;
  lead: Wave;
  bass: Wave;
  seed: number;
  drums: 0 | 1 | 2;
}

export interface WorldDef {
  id: number;
  nombre: string;
  sub: string;
  emoji: string;
  grad: string;
  theme: Theme;
  boss: BossDef;
  intro: string;
  music: MusicDef;
}

const JUDGE: Look = { skin: "#e8b894", hair: "#f4f4f4", style: "wig", top: "#151515", pants: "#151515", shoes: "#111", x: ["robe", "mustache"] };

export const WORLDS: WorldDef[] = [
  {
    id: 0,
    nombre: "Academia OPOS",
    sub: "Tu campamento base: la oposición, el BOE y cómo estudiar",
    emoji: "🎓",
    grad: "linear-gradient(135deg,#ffb347,#ff7e5f)",
    theme: {
      kind: "academy",
      skies: [["#ffe9c7", "#ffc58a"], ["#cfe8ff", "#ffe5b4"], ["#2b2d5b", "#7a4a8c"]],
      tints: ["rgba(0,0,0,0)", "rgba(255,160,60,0.1)", "rgba(20,20,80,0.12)"],
      ground: { top: "#c98a3c", trim: "#e8b05a", fill: "#7a4a1d", line: "#5e3813" },
      brick: { face: "#9a5b2b", line: "#6b3b16", hi: "#c98a4c" },
      accent: "#ffcc00",
    },
    boss: { nombre: "Don Boletín", kind: "boletin", color: "#f2e6b8", proj: "#fffdf0", w: 62, h: 74, taunts: ["¡Soy el Boletín que nunca descansa!", "¡Demuestra que te has leído las bases!"] },
    intro: "Bienvenida a la Academia. Aquí empieza tu camino hacia la plaza.",
    music: { root: 55, scale: "major", bpm: 104, lead: "square", bass: "triangle", seed: 11, drums: 1 },
  },
  {
    id: 1,
    nombre: "Palacio de las Cortes",
    sub: "Bloque I · Organización del Estado y de la Administración Pública",
    emoji: "🏛️",
    grad: "linear-gradient(135deg,#c0392b,#7b1e2b)",
    theme: {
      kind: "congreso",
      skies: [["#8ec5ff", "#fde9c0"], ["#ff9a6b", "#ffd9a0"], ["#1c2a5a", "#8c4a7a"], ["#b8d8ff", "#fff3d0"]],
      tints: ["rgba(0,0,0,0)", "rgba(255,120,40,0.08)", "rgba(10,20,80,0.2)", "rgba(0,0,0,0)"],
      ground: { top: "#a3202e", trim: "#e0b84c", fill: "#6b5f58", line: "#4e443e" },
      brick: { face: "#d8c9a3", line: "#a8996e", hi: "#efe4c6" },
      accent: "#e0b84c",
    },
    boss: { nombre: "La Leona del Congreso", kind: "leon", color: "#c08a30", proj: "#5a3b10", w: 84, h: 70, taunts: ["¡GRRR! Nadie pasa sin conocer la Constitución.", "¡Mis enmiendas te devorarán!"] },
    intro: "Columnas, tapices y leones de bronce: las instituciones del Estado.",
    music: { root: 50, scale: "mixolydian", bpm: 112, lead: "pulse", bass: "triangle", seed: 21, drums: 1 },
  },
  {
    id: 2,
    nombre: "Bruselas, Capital de Europa",
    sub: "Bloque II · Unión Europea",
    emoji: "🇪🇺",
    grad: "linear-gradient(135deg,#0b3d9a,#2f6fe0)",
    theme: {
      kind: "europa",
      skies: [["#2a62c9", "#8ec5ff"], ["#0b2a6b", "#4a7fe0"], ["#0a1440", "#3a3a9b"]],
      tints: ["rgba(0,0,0,0)", "rgba(255,200,60,0.07)", "rgba(0,0,40,0.15)"],
      ground: { top: "#2e59a8", trim: "#ffcc00", fill: "#1c3b7a", line: "#13295a" },
      brick: { face: "#3a6fd0", line: "#1f4aa0", hi: "#7aa5f0" },
      accent: "#ffd700",
    },
    boss: { nombre: "El Euro Gigante", kind: "euro", color: "#f0c030", proj: "#ffd700", w: 84, h: 84, taunts: ["¡Soy la moneda de 20 países!", "¡Tratados, directivas y reglamentos: respóndeme!"] },
    intro: "Doce estrellas sobre fondo azul. ¡Hora de recorrer Europa!",
    music: { root: 53, scale: "lydian", bpm: 120, lead: "square", bass: "triangle", seed: 31, drums: 1 },
  },
  {
    id: 3,
    nombre: "Ciudad de las Políticas Públicas",
    sub: "Bloque III · Políticas públicas",
    emoji: "🏙️",
    grad: "linear-gradient(135deg,#11998e,#38ef7d)",
    theme: {
      kind: "ciudad",
      skies: [["#9be7ff", "#e8fff4"], ["#ffd1a0", "#fff0d0"], ["#16324f", "#4f7fa8"], ["#a8f0d0", "#f4fff0"]],
      tints: ["rgba(0,0,0,0)", "rgba(255,150,60,0.08)", "rgba(0,10,60,0.18)", "rgba(0,0,0,0)"],
      ground: { top: "#4caf50", trim: "#2e7d32", fill: "#8d6e4a", line: "#6b5236" },
      brick: { face: "#e8e8e8", line: "#b5b5b5", hi: "#ffffff" },
      accent: "#2ecc71",
    },
    boss: { nombre: "El Gran Cita Previa", kind: "monitor", color: "#5c6b7a", proj: "#ffffff", w: 72, h: 76, taunts: ["NO HAY CITAS DISPONIBLES.", "¡Vuelva usted mañana!"] },
    intro: "Administración digital, igualdad, sanidad, empleo y mucho más.",
    music: { root: 57, scale: "major", bpm: 126, lead: "square", bass: "sawtooth", seed: 41, drums: 1 },
  },
  {
    id: 4,
    nombre: "Tribunal del Derecho Administrativo",
    sub: "Bloque IV · Derecho administrativo general",
    emoji: "⚖️",
    grad: "linear-gradient(135deg,#6a3093,#a044ff)",
    theme: {
      kind: "tribunal",
      skies: [["#d9d4c7", "#f6f0e0"], ["#c9b6a3", "#efe0cc"], ["#2a2438", "#5a4a6a"], ["#cfd8dc", "#f4f4f0"]],
      tints: ["rgba(0,0,0,0)", "rgba(120,80,40,0.1)", "rgba(10,0,40,0.25)", "rgba(0,0,0,0)"],
      ground: { top: "#d8d2c4", trim: "#a49c8a", fill: "#8a8374", line: "#6a6458" },
      brick: { face: "#6a4c93", line: "#4a3068", hi: "#9a7cc0" },
      accent: "#c9a227",
    },
    boss: { nombre: "El Magistrado Supremo", kind: "person", look: JUDGE, color: "#151515", proj: "#8b5a2b", w: 52, h: 84, taunts: ["¡Orden en la sala! ¡Recurso desestimado!", "¡Tu recurso de alzada no prosperará!"] },
    intro: "Leyes, actos, contratos y recursos. El corazón de la oposición.",
    music: { root: 57, scale: "dorian", bpm: 96, lead: "pulse", bass: "triangle", seed: 51, drums: 1 },
  },
  {
    id: 5,
    nombre: "Torre de Recursos Humanos",
    sub: "Bloque V · Administración de recursos humanos",
    emoji: "👥",
    grad: "linear-gradient(135deg,#f7971e,#ffd200)",
    theme: {
      kind: "rrhh",
      skies: [["#cfe3f2", "#f2f7fb"], ["#f6d7b0", "#fbeedd"], ["#26364d", "#51698c"]],
      tints: ["rgba(0,0,0,0)", "rgba(255,150,60,0.08)", "rgba(0,10,50,0.2)"],
      ground: { top: "#9fb3c8", trim: "#7c93ab", fill: "#5e6f84", line: "#47566a" },
      brick: { face: "#e67e22", line: "#b35c11", hi: "#f4a65a" },
      accent: "#e67e22",
    },
    boss: {
      nombre: "El Jefe de Personal",
      kind: "person",
      look: { skin: "#e0a98a", hair: "#2b2b2b", style: "short", top: "#37474f", pants: "#263238", shoes: "#111", glasses: true, x: ["tie", "briefcase"] },
      color: "#37474f",
      proj: "#c0392b",
      w: 52,
      h: 84,
      taunts: ["¡Sellaré tu baja voluntaria!", "¡Tu expediente tiene un error!"],
    },
    intro: "Funcionarios, laborales, derechos, retribuciones y carrera profesional.",
    music: { root: 52, scale: "major", bpm: 132, lead: "square", bass: "sawtooth", seed: 61, drums: 1 },
  },
  {
    id: 6,
    nombre: "Cámara Acorazada de Hacienda",
    sub: "Bloque VI · Gestión financiera y Seguridad Social",
    emoji: "💶",
    grad: "linear-gradient(135deg,#134e5e,#c9a227)",
    theme: {
      kind: "tesoro",
      skies: [["#0f2433", "#2c5364"], ["#2a1f0f", "#6b4a1e"], ["#101a2b", "#2d4a6a"]],
      tints: ["rgba(0,0,0,0)", "rgba(255,190,60,0.1)", "rgba(0,0,0,0.15)"],
      ground: { top: "#f1c40f", trim: "#b8860b", fill: "#3b4a5a", line: "#2a3644" },
      brick: { face: "#c9a227", line: "#8a6d12", hi: "#f5dc7a" },
      accent: "#f1c40f",
    },
    boss: { nombre: "La Caja Fuerte del Déficit", kind: "caja", color: "#59636e", proj: "#f1c40f", w: 76, h: 76, taunts: ["¿Estabilidad presupuestaria? ¡JA!", "¡Mis créditos extraordinarios te aplastarán!"] },
    intro: "Presupuestos, gasto, ingresos, control y nóminas. ¡Cuida cada euro!",
    music: { root: 51, scale: "minor", bpm: 118, lead: "pulse", bass: "sawtooth", seed: 71, drums: 1 },
  },
  {
    id: 7,
    nombre: "El Examen Final",
    sub: "Mundo final · Todo el temario, tribunal incluido",
    emoji: "📝",
    grad: "linear-gradient(135deg,#1f1c2c,#7b2d8e)",
    theme: {
      kind: "examen",
      skies: [["#1a1330", "#3b2a5f"], ["#2b0f1f", "#5a1f3a"], ["#0a0a1a", "#2a2a4a"]],
      tints: ["rgba(0,0,0,0)", "rgba(120,0,40,0.12)", "rgba(0,0,0,0.2)"],
      ground: { top: "#5a4a8a", trim: "#a98be0", fill: "#2a2145", line: "#1d1632" },
      brick: { face: "#5a4a8a", line: "#3a2d63", hi: "#8a7ac0" },
      accent: "#ff4d6d",
    },
    boss: {
      nombre: "El Presidente del Tribunal",
      kind: "person",
      look: { skin: "#d9a47f", hair: "#b0b0b0", style: "wig", top: "#7b1e2b", pants: "#2b0f14", shoes: "#111", glasses: true, x: ["robe", "beard"] },
      color: "#7b1e2b",
      proj: "#ffffff",
      w: 56,
      h: 90,
      taunts: ["Bienvenida al examen. No se permiten dudas.", "¡Las plazas son limitadas, opositora!"],
    },
    intro: "El gran día. Todo lo que has aprendido, en una sola prueba.",
    music: { root: 57, scale: "harmonic", bpm: 138, lead: "sawtooth", bass: "square", seed: 81, drums: 2 },
  },
];

export const MENU_TRACK: TrackDef = { id: "menu", bpm: 100, root: 55, scale: "pentatonic", prog: [0, 3, 4, 2], lead: "square", bass: "triangle", seed: 5, drums: 1 };
export const MAP_TRACK: TrackDef = { id: "map", bpm: 92, root: 53, scale: "major", prog: [0, 5, 3, 4], lead: "triangle", bass: "square", seed: 9, drums: 0, vol: 0.9 };

const PROGS = [
  [0, 4, 5, 3],
  [0, 5, 3, 4],
  [0, 3, 4, 0],
  [5, 3, 0, 4],
  [0, 2, 5, 4],
];
const OFFS = [0, 2, 4, -3, 5, -5, 7, -1, 3, -2, 1, 6, -4];
const LEADS: Wave[] = ["square", "pulse", "triangle", "sawtooth"];

/** Música distinta por mundo, por submundo (tema) y por jefe final. */
export function trackFor(world: number, sub: number, boss: boolean): TrackDef {
  const m = WORLDS[world].music;
  if (boss) {
    return {
      id: `w${world}boss`,
      bpm: m.bpm + 34,
      root: m.root - 2,
      scale: world === 7 ? "harmonic" : "phrygian",
      prog: [0, 5, 3, 4],
      lead: "sawtooth",
      bass: "sawtooth",
      seed: m.seed * 7 + 3,
      drums: 2,
      arp: true,
    };
  }
  return {
    id: `w${world}s${sub}`,
    bpm: m.bpm + (sub % 3) * 4 - 4,
    root: m.root + OFFS[sub % OFFS.length],
    scale: m.scale,
    prog: PROGS[(sub + m.seed) % PROGS.length],
    lead: sub === 0 ? m.lead : LEADS[(sub + world) % LEADS.length],
    bass: m.bass,
    seed: m.seed * 100 + sub,
    drums: m.drums,
  };
}
