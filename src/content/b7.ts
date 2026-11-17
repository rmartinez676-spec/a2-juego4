import type { TemaSeed } from "./types";

// Mundo final: el banco de preguntas de estos niveles es TODO el temario (se mezcla en el juego).
export const b7: TemaSeed[] = [
  {
    n: 1,
    titulo: "Pasillo del Tribunal: repaso exprés de los 6 bloques",
    resumen: "Recorrido de repaso por todo el programa antes del examen. Las preguntas se extraen de todos los bloques.",
    fuentes: [],
    npcs: [
      { who: "carta", lines: ["Bloques I y II. La CE tiene 169 artículos; la reforma ordinaria exige 3/5 y la agravada 2/3 con disolución y referéndum. Corona, Cortes (300-400 diputados), Gobierno, Poder Judicial y TC (12 miembros, 9 años).", "La UE tiene 27 Estados: Consejo Europeo, Consejo, Comisión (monopolio de iniciativa), Parlamento, TJUE y BCE. Los reglamentos son directamente aplicables y las directivas obligan en cuanto al resultado."] },
      { who: "ley", lines: ["Bloques III y IV. En Derecho administrativo domina la Ley 39/2015 (procedimiento y recursos) y la Ley 40/2015 (régimen jurídico). Recuerda los plazos: alzada 1 mes, reposición 1 mes, contencioso 2 meses, y el silencio.", "La LCSP (Ley 9/2017) clasifica los contratos en obras, concesión, servicios, suministros… Y en políticas públicas: igualdad, dependencia, datos, transparencia, empleo, inmigración y Agenda 2030."] },
      { who: "pablo", lines: ["Bloques V y VI. El EBEP (RDL 5/2015) clasifica a los empleados públicos; recuerda derechos, deberes, situaciones administrativas y retribuciones. El presupuesto se rige por la Ley 47/2003.", "Fases del gasto: Autorización, Disposición, Obligación (reconocimiento) y Pago. Control: IGAE (interventor) y Tribunal de Cuentas. Ingresos: tributos (impuestos, tasas y contribuciones especiales)."] },
    ],
    q: [],
  },
  {
    n: 2,
    titulo: "La Sala del Examen: mini-examen con penalización",
    resumen: "Prueba larga con preguntas de todo el temario, corrección con penalización de fallos y tiempo limitado según la dificultad.",
    fuentes: [],
    npcs: [
      { who: "secretaria", lines: ["Silencio en la sala. Esta prueba es un mini-examen: 15 preguntas de todo el temario. Los fallos penalizan, así que si dudas entre todas las opciones es mejor dejar en blanco.", "Consejo del Tribunal: lee bien el enunciado, descarta opciones absurdas y vigila el tiempo. ¡Mucha suerte, opositora!"] },
      { who: "opi", lines: ["Bip-bop. Truco de estudio: repasa los fallos en «Mi progreso» y repite los mundos con dificultad Opositor. Los simulacros largos te acostumbran al ritmo real del examen.", "Y recuerda: consulta siempre el BOE y el INAP para saber si el temario ha cambiado. ¡Tú puedes, Lía!"] },
    ],
    q: [],
  },
];
