import type { TemaSeed } from "./types";
import { F } from "./fuentes";

export const hub: TemaSeed[] = [
  {
    n: 1,
    titulo: "Tu oposición: Cuerpo de Gestión de la AGE (A2)",
    resumen: "Qué es el Cuerpo de Gestión de la Administración Civil del Estado, requisitos de acceso, sistema selectivo y estructura del programa (6 bloques, 58 temas).",
    fuentes: [F.BOE, F.INAP, F.EBEP],
    npcs: [
      { who: "marga", lines: ["¡Bienvenida a la Academia, Lía! El Cuerpo de Gestión de la Administración Civil del Estado pertenece al subgrupo A2. Se accede por turno libre (oposición) o por promoción interna.", "Requisitos generales: nacionalidad española (o la equivalente de la UE en los casos previstos), 16 años cumplidos sin pasar de la edad de jubilación forzosa, capacidad funcional, no estar inhabilitada y tener Grado o Diplomatura."] },
      { who: "opi", lines: ["Bip-bop. El programa de turno libre tiene 58 temas en 6 bloques: Organización del Estado, Unión Europea, Políticas públicas, Derecho administrativo, Recursos humanos y Gestión financiera.", "Los ejercicios combinan un test y un supuesto práctico. Los detalles (nº de preguntas, penalización) los fija cada convocatoria: ¡léela siempre en el BOE!"] },
    ],
    q: [
      [1, "¿A qué subgrupo pertenece el Cuerpo de Gestión de la Administración Civil del Estado?", "A2", "A1", "C1", "C2", "Es un cuerpo del subgrupo A2, que exige título universitario de Grado (o equivalente)."],
      [1, "¿Cuántos bloques tiene el programa de turno libre del Cuerpo de Gestión?", "6", "4", "8", "10"],
      [1, "¿Cuántos temas tiene el programa de acceso libre?", "58", "35", "75", "100"],
      [1, "¿Dónde se publican las convocatorias y sus bases?", "En el BOE", "Solo en el DOUE", "En el boletín de cada ministerio", "Solo en redes sociales"],
      [1, "Para presentarse por turno libre se exigen 16 años cumplidos.", true, "Es un requisito general: 16 años cumplidos y no exceder la edad máxima de jubilación forzosa."],
      [2, "¿Qué principios rigen el acceso al empleo público (EBEP, art. 55)?", "Igualdad, mérito y capacidad", "Antigüedad y confianza", "Libre designación y urgencia", "Discrecionalidad y eficacia"],
      [2, "¿Qué sistemas selectivos prevé el EBEP?", "Oposición, concurso-oposición y, excepcionalmente, concurso", "Solo oposición", "Sorteo y entrevista", "Designación directa"],
      [3, "El formato exacto de los ejercicios es siempre idéntico en todas las convocatorias.", false, "Cada convocatoria fija sus bases en el BOE; hay que consultarlas."],
    ],
  },
  {
    n: 2,
    titulo: "BOE, INAP y fuentes oficiales de estudio",
    resumen: "Cómo se publican las normas, la legislación consolidada del BOE, el papel del INAP, EUR-Lex y la jerarquía normativa básica.",
    fuentes: [F.BOE, F.INAP, F.CE],
    npcs: [
      { who: "boletin", lines: ["El BOE publica las leyes y disposiciones generales. Salvo que la norma diga otra cosa, entra en vigor a los 20 días de su publicación completa en el BOE.", "En boe.es tienes la «legislación consolidada»: cada norma con todas sus modificaciones ya integradas. ¡Es tu mejor amiga para estudiar y para comprobar cambios!"] },
      { who: "marga", lines: ["El INAP (Instituto Nacional de Administración Pública) se ocupa de la selección y formación del personal de la AGE y publica la información de los procesos selectivos. Para Derecho europeo usa EUR-Lex.", "Jerarquía normativa: Constitución, tratados, leyes (y normas con fuerza de ley), reglamentos (Real Decreto, Orden ministerial…). Una norma inferior nunca puede contradecir a una superior."] },
    ],
    q: [
      [1, "¿Qué es la legislación consolidada del BOE?", "El texto vigente de una norma con sus modificaciones integradas", "Un resumen divulgativo de las leyes", "Solo las leyes derogadas", "Un boletín de convocatorias"],
      [1, "Si una ley no dice otra cosa, ¿cuándo entra en vigor?", "A los 20 días de su publicación completa en el BOE", "Al día siguiente de su aprobación", "A los 3 meses", "El día de la sanción real"],
      [1, "¿Qué norma ocupa la cúspide del ordenamiento español?", "La Constitución", "La ley orgánica", "El Real Decreto-ley", "El reglamento"],
      [2, "¿Qué organismo se ocupa de la selección y formación del personal de la AGE?", "INAP", "Tribunal de Cuentas", "Consejo de Estado", "Defensor del Pueblo"],
      [2, "¿Dónde se consulta el Derecho de la Unión Europea?", "EUR-Lex y el DOUE", "Solo en el BOE", "En la web del Congreso", "En el INAP exclusivamente"],
      [2, "¿Qué principio impide que un reglamento contradiga una ley?", "Jerarquía normativa", "Reserva de ley", "Irretroactividad", "Publicidad"],
      [2, "Un Real Decreto ordinario tiene rango de ley.", false, "Es un reglamento, de rango inferior a la ley (el Real Decreto-ley y el Real Decreto Legislativo sí tienen fuerza de ley)."],
    ],
    orden: ["Jerarquía normativa (de mayor a menor)", ["Constitución", "Ley", "Real Decreto (reglamento)", "Orden ministerial"]],
  },
];
