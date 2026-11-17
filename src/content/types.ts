// Tipos compartidos entre servidor (BD/API) y cliente (juego).

/** Formato compacto de pregunta:
 *  - Test:  [dificultad, enunciado, CORRECTA, incorrecta1, incorrecta2, incorrecta3, explicación?]
 *  - V/F:   [dificultad, afirmación, true|false, explicación?]
 */
export type QSeed =
  | [number, string, string, string, string, string, string?]
  | [number, string, boolean, string?];

export interface NpcSeed {
  who: string;
  lines: string[];
}

export interface TemaSeed {
  n: number;
  titulo: string;
  resumen: string;
  fuentes: string[];
  npcs: NpcSeed[];
  q: QSeed[];
  /** Minijuego "ordena": [título, elementos en orden correcto] */
  orden?: [string, string[]];
}

export interface Pregunta {
  id: string;
  tema: string;
  tipo: "mcq" | "tf";
  dif: number;
  q: string;
  opts: string[];
  ok: number;
  exp: string;
  fuente?: string | null;
  origen?: string;
  activa?: boolean;
}

export interface Tema {
  id: string;
  bloque: number;
  orden: number;
  titulo: string;
  resumen: string;
  npcs: NpcSeed[];
  fuentes: string[];
  ordenItem?: { titulo: string; items: string[] } | null;
  revisar: boolean;
}

export interface Fuente {
  id: string;
  nombre: string;
  tipo: string;
  url: string;
  fechaBoe?: string | null;
  ultimaSync?: string | null;
  estado?: string | null;
  cambio: boolean;
}

export interface Content {
  temas: Tema[];
  preguntas: Pregunta[];
  fuentes: Fuente[];
  version: string;
  origen: "db" | "seed";
}
