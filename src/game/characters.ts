import type { Look } from "./sprites";

export interface Character {
  name: string;
  role: string;
  look: Look;
}

const L = (skin: string, hair: string, style: Look["style"], top: string, pants: string, x: string[] = [], glasses = false, shoes = "#3a2a22"): Look => ({
  skin,
  hair,
  style,
  top,
  pants,
  shoes,
  glasses,
  x,
});

/** La protagonista: Lía, la opositora pelirroja con gafas redondas y moño. */
export const LIA: Look = {
  skin: "#f7cfae",
  hair: "#e5642b",
  hair2: "#b8451d",
  style: "bun",
  top: "#9da3a9",
  top2: "#2c8a8a",
  pants: "#27304f",
  shoes: "#7a5230",
  glasses: true,
  x: ["phones", "robotTee", "book"],
};

export const CHARACTERS: Record<string, Character> = {
  // Academia
  marga: { name: "Profe Marga", role: "Tutora de la Academia", look: L("#e8b894", "#9a9a9a", "bun", "#7b4fa0", "#3d3d5c", ["book"], true) },
  boletin: { name: "Don Boletín", role: "Bibliotecario del BOE", look: L("#f0c8a0", "#d9d9d9", "bald", "#d9b44a", "#4a3b2a", ["beard", "tie"], true) },
  opi: { name: "Opi, el robot", role: "Asistente de estudio", look: L("#9fb8cc", "#6b7f91", "bald", "#cfd8e0", "#6b7f91", ["antenna"], false, "#444") },
  // Mundo 1
  carta: { name: "Doña Carta Magna", role: "Guardiana de la Constitución", look: L("#f2c9a5", "#4a2c1a", "long", "#1e7a46", "#1e7a46", ["book", "badge"]) },
  rey: { name: "Su Majestad", role: "La Corona", look: L("#f0c4a0", "#3a2a1a", "short", "#1b3a6b", "#10223f", ["crown", "cape"]) },
  diputada: { name: "Diputada Dora", role: "Congreso de los Diputados", look: L("#d9a47f", "#2a1a12", "long", "#b3202a", "#2b2b3b", ["badge"]) },
  senador: { name: "Senador Severo", role: "Senado", look: L("#f0c4a0", "#b0b0b0", "short", "#2b3a55", "#2b2b3b", ["tie", "mustache"]) },
  magistrado: { name: "Magistrado Mateo", role: "Poder Judicial", look: L("#e8b894", "#f4f4f4", "wig", "#151515", "#151515", ["robe"], false, "#111") },
  ministro: { name: "Ministro Marcos", role: "Gobierno y Administración", look: L("#e0a98a", "#5a3a1a", "short", "#2b2b2b", "#2b2b2b", ["tie", "briefcase"], false, "#111") },
  alcaldesa: { name: "Alcaldesa Alma", role: "Administración local", look: L("#e0a98a", "#8b3a2a", "curly", "#e0a000", "#4a3b2a", ["badge"]) },
  // Mundo 2
  europa: { name: "Europa Eva", role: "Embajadora de la UE", look: L("#f4cba8", "#e8c34a", "long", "#1a3fa0", "#10265f", ["stars"]) },
  comisario: { name: "Comisario Klaus", role: "Comisión Europea", look: L("#f0c4a0", "#cfcfcf", "short", "#34495e", "#263238", ["tie", "stars"], true, "#111") },
  euro: { name: "Mr. Euro", role: "Banco Central Europeo", look: L("#f3d08a", "#caa43b", "bald", "#e6b422", "#1a3fa0", ["tie", "badge"], false, "#111") },
  jueza: { name: "Jueza Judit", role: "Tribunal de Justicia de la UE", look: L("#d9a47f", "#222222", "long", "#7b1e2b", "#7b1e2b", ["robe"], true, "#111") },
  agricultor: { name: "Agricultor Agustín", role: "PAC y pesca", look: L("#d9a47f", "#6b4a2a", "short", "#3a7d44", "#4a3b2a", ["hat", "mustache"]) },
  // Mundo 3
  digital: { name: "Dra. Digital", role: "Administración electrónica", look: L("#c68b66", "#222222", "side", "#16a085", "#2c3e50", ["phones"], true) },
  eco: { name: "Eco-Elena", role: "Política ambiental", look: L("#f2c9a5", "#a0522d", "long", "#2e8b57", "#556b2f", ["scarf"]) },
  sanz: { name: "Doctor Sanz", role: "Sistema sanitario", look: L("#e8b894", "#2a2a2a", "short", "#ecf0f1", "#2c3e50", ["coat"], true) },
  irene: { name: "Irene Igualdad", role: "Políticas de igualdad", look: L("#d9a47f", "#5a2a7a", "long", "#8e44ad", "#34224a", ["badge"]) },
  pension: { name: "Don Pensión", role: "Seguridad Social", look: L("#f0c4a0", "#e0e0e0", "short", "#8b5a2b", "#4a3b2a", ["cane", "mustache"], true) },
  paco: { name: "Paco Empleo", role: "Servicios de empleo", look: L("#d9a47f", "#222222", "short", "#e67e22", "#34495e", ["helmet"]) },
  amira: { name: "Amira", role: "Inmigración y asilo", look: L("#b5835a", "#1a1a1a", "long", "#c0392b", "#34495e", ["scarf"]) },
  tere: { name: "Tere Transparencia", role: "Gobierno abierto", look: L("#f2c9a5", "#222222", "short", "#ecf0f1", "#455a64", ["badge"], true) },
  dani: { name: "Dani Datos", role: "Protección de datos", look: L("#e8b894", "#3a2a1a", "short", "#2c3e50", "#1a252f", ["phones"], true) },
  // Mundo 4
  ley: { name: "Doña Ley", role: "Fuentes del Derecho", look: L("#f0c4a0", "#f4f4f4", "wig", "#5b2c83", "#5b2c83", ["robe"], false, "#111") },
  reglamento: { name: "Ramón Reglamento", role: "Normas y reglamentos", look: L("#e0a98a", "#333333", "short", "#34495e", "#263238", ["tie", "briefcase"], false, "#111") },
  acto: { name: "Alberta Acto", role: "Acto administrativo", look: L("#d9a47f", "#7a3b1a", "bun", "#c0392b", "#2c3e50", ["book"], true) },
  contrata: { name: "Carlos Contrata", role: "Contratos públicos", look: L("#e8b894", "#222222", "short", "#f39c12", "#34495e", ["helmet", "briefcase"]) },
  expropio: { name: "Don Expropio", role: "Expropiación y patrimonio", look: L("#f0c4a0", "#999999", "short", "#6b4423", "#4a3b2a", ["hat", "mustache"]) },
  recursa: { name: "Rita Recursos", role: "Recursos y justicia", look: L("#e8b894", "#111111", "long", "#1a1a1a", "#1a1a1a", ["robe"], true, "#111") },
  // Mundo 5
  paula: { name: "Paula Personal", role: "Recursos humanos", look: L("#f2c9a5", "#c0392b", "side", "#2980b9", "#2c3e50", ["badge", "book"]) },
  sindi: { name: "Sindi Sindical", role: "Negociación colectiva", look: L("#d9a47f", "#222222", "curly", "#e74c3c", "#2c3e50") },
  oscar: { name: "Óscar Opositor", role: "Funcionario de carrera", look: L("#e8b894", "#4a3a2a", "short", "#2c3e50", "#1a252f", ["tie"], true, "#111") },
  mutua: { name: "Doña Mutua", role: "MUFACE y clases pasivas", look: L("#e8b894", "#bbbbbb", "bun", "#ecf0f1", "#455a64", ["coat"], true) },
  ines: { name: "Inés Inclusión", role: "Acceso y discapacidad", look: L("#f2c9a5", "#6b3a1a", "long", "#27ae60", "#34495e", ["badge"]) },
  // Mundo 6
  pablo: { name: "Pablo Presupuesto", role: "Presupuestos del Estado", look: L("#e0a98a", "#222222", "short", "#2c3e50", "#1a252f", ["visor", "tie"], false, "#111") },
  inesi: { name: "Inés Interventora", role: "Intervención General (IGAE)", look: L("#f2c9a5", "#333333", "bun", "#7f8c8d", "#34495e", ["visor"], true) },
  tomas: { name: "Tomás Tesorero", role: "Tesorería y pagos", look: L("#f0c4a0", "#888888", "bald", "#f1c40f", "#34495e", ["tie", "briefcase"], false, "#111") },
  cecilia: { name: "Consejera Cecilia", role: "Tribunal de Cuentas", look: L("#d9a47f", "#222222", "long", "#1a5276", "#1a5276", ["robe"], false, "#111") },
  fiscal: { name: "Fiscal Fede", role: "Tributos e ingresos", look: L("#e8b894", "#3a2a1a", "short", "#922b21", "#34495e", ["tie", "briefcase"], true, "#111") },
  // Final
  secretaria: { name: "Secretaria del Tribunal", role: "Examen final", look: L("#f2c9a5", "#222222", "bun", "#1a1a1a", "#1a1a1a", ["robe"], true, "#111") },
};

export function character(key: string): Character {
  return CHARACTERS[key] ?? CHARACTERS.opi;
}
