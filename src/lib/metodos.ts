import type { Tarea } from '../dominio/tipos'

// Métodos de estudio. Astia sugiere uno según la tarea y tú puedes cambiarlo.
// Cada método es una lista de fases con su tiempo: la sesión guiada las recorre en orden.
// Son técnicas de estudio muy conocidas; sirven de guía, no son una receta exacta.

export type MetodoId = 'pomodoro' | 'feynman' | 'recuperacion' | 'espaciada' | 'cornell' | 'intercalada' | 'sq3r' | 'mapa' | 'tarjetas' | 'polya'

export interface Fase {
  etiqueta: string
  minutos: number
  tipo: 'enfoque' | 'descanso'
  descripcion: string
}

/** Tiempos que tú eliges para el Pomodoro (Más → Enfoque y descanso). */
export interface ConfigTiempos {
  enfoqueMin: number
  descansoMin: number
}

export interface Metodo {
  id: MetodoId
  nombre: string
  /** Para qué tipo de tarea sirve. */
  paraQue: string
  /** Por qué funciona (corto y sin exagerar). */
  porque: string
  fases: (cfg: ConfigTiempos) => Fase[]
}

const f = (etiqueta: string, minutos: number, descripcion: string, tipo: Fase['tipo'] = 'enfoque'): Fase => ({ etiqueta, minutos, tipo, descripcion })

export const METODOS: Metodo[] = [
  {
    id: 'pomodoro',
    nombre: 'Pomodoro',
    paraQue: 'Tareas largas o que te dan pereza empezar',
    porque: 'Bloques cortos de enfoque con descanso fijo: es más fácil empezar cuando sabes que hay un descanso cerca.',
    fases: (c) => [f('Enfoque', c.enfoqueMin, 'Una sola tarea. Nada de celular.'), f('Descanso', c.descansoMin, 'Levántate y mira lejos. Cuando suene, vuelves.', 'descanso')],
  },
  {
    id: 'feynman',
    nombre: 'Feynman',
    paraQue: 'Temas teóricos y conceptos',
    porque: 'Si no lo puedes explicar simple, todavía no lo entiendes. Explicarlo te muestra exactamente dónde fallas.',
    fases: () => [
      f('Estudia el tema', 20, 'Lee el material y marca las ideas clave.'),
      f('Explícalo sin mirar', 10, 'Cierra todo. Explícalo en voz alta o por escrito, como a alguien de 12 años.'),
      f('Busca los huecos', 10, 'Vuelve al material solo donde te trabaste.'),
      f('Explícalo otra vez', 5, 'Más simple y con un ejemplo tuyo.'),
    ],
  },
  {
    id: 'recuperacion',
    nombre: 'Recuperación activa',
    paraQue: 'Prepararte para un examen',
    porque: 'Recordar sin mirar fija más que releer. Te acostumbra a sacar la información cuando la necesites.',
    fases: () => [
      f('Repaso rápido', 10, 'Mira tus apuntes una sola vez, sin detenerte.'),
      f('Escribe lo que recuerdas', 15, 'Cierra los apuntes. Escribe todo lo que recuerdes del tema.'),
      f('Pausa corta', 5, 'Levántate y mira lejos.', 'descanso'),
      f('Compara', 10, 'Abre los apuntes y marca lo que faltó o tenías mal.'),
      f('Preguntas sin mirar', 15, 'Resuelve preguntas o ejercicios sin ayuda.'),
    ],
  },
  {
    id: 'espaciada',
    nombre: 'Repetición espaciada',
    paraQue: 'Repasar varios días antes de un examen',
    porque: 'Un repaso corto cada día rinde más que estudiar todo la noche anterior.',
    fases: () => [f('Recuerda sin mirar', 10, 'Escribe lo que recuerdes de los temas del examen.'), f('Revisa lo que faltó', 10, 'Compara con tus apuntes y corrige.'), f('Ejercicios', 15, 'Resuelve algunos ejercicios o preguntas.')],
  },
  {
    id: 'cornell',
    nombre: 'Cornell',
    paraQue: 'Ordenar tus apuntes de clase',
    porque: 'Convierte tus notas en preguntas que luego puedes usar para autoexaminarte.',
    fases: () => [
      f('Pasa tus notas', 20, 'Divide la hoja: notas a la derecha, columna angosta a la izquierda, espacio abajo.'),
      f('Preguntas clave', 10, 'En la columna izquierda, una pregunta por cada idea.'),
      f('Resumen', 5, 'Abajo, resume la clase en 3 o 4 líneas.'),
      f('Autoexamen', 5, 'Tapa la derecha y responde las preguntas de la izquierda.'),
    ],
  },
  {
    id: 'intercalada',
    nombre: 'Práctica intercalada',
    paraQue: 'Matemática, Física y Programación',
    porque: 'Mezclar tipos de ejercicio te enseña a elegir el camino, no solo a repetirlo.',
    fases: () => [
      f('Ejercicios tipo A', 15, 'Resuelve ejercicios de un primer tipo.'),
      f('Ejercicios tipo B', 15, 'Cambia a otro tipo de ejercicio.'),
      f('Pausa corta', 5, 'Levántate y mira lejos.', 'descanso'),
      f('Mezcla', 15, 'Alterna tipos sin seguir el orden del libro.'),
      f('Revisa errores', 5, 'Anota en qué te equivocaste y por qué.'),
    ],
  },
  {
    id: 'sq3r',
    nombre: 'SQ3R (lectura activa)',
    paraQue: 'Leer capítulos, artículos o libros',
    porque: 'Leer con preguntas en la cabeza y repasar al final retiene mucho más que leer de corrido.',
    fases: () => [
      f('Hojea', 5, 'Mira títulos, resúmenes y gráficos. Todavía no leas.'),
      f('Pregunta', 3, 'Convierte cada título en una pregunta.'),
      f('Lee', 20, 'Lee buscando responder tus preguntas. Subraya poco.'),
      f('Recita', 10, 'Cierra el texto y responde en voz alta con tus palabras.'),
      f('Repasa', 5, 'Mira tus notas y vuelve solo a lo que no recordaste.'),
    ],
  },
  {
    id: 'mapa',
    nombre: 'Mapa mental',
    paraQue: 'Resumir y relacionar muchas ideas',
    porque: 'Dibujar las conexiones entre ideas te obliga a entender cómo se relacionan.',
    fases: () => [
      f('Reúne las ideas', 10, 'Escribe las ideas principales del tema, sin ordenar.'),
      f('Arma el mapa', 15, 'Pon el tema al centro y ramifica las ideas por grupos.'),
      f('Conecta', 5, 'Une con flechas las ideas que se relacionan y escribe por qué.'),
      f('Explícalo', 5, 'Sin mirar los apuntes, cuenta el mapa en voz alta.'),
    ],
  },
  {
    id: 'tarjetas',
    nombre: 'Tarjetas de estudio',
    paraQue: 'Memorizar definiciones, fórmulas y vocabulario',
    porque: 'Cada tarjeta te hace recordar sin mirar, y las que fallas vuelven a aparecer.',
    fases: () => [
      f('Crea las tarjetas', 15, 'Pregunta de un lado, respuesta del otro. Una idea por tarjeta.'),
      f('Repaso sin mirar', 15, 'Responde cada tarjeta antes de voltearla. Separa las que fallas.'),
      f('Pausa corta', 5, 'Levántate y mira lejos.', 'descanso'),
      f('Repasa las falladas', 10, 'Solo las que fallaste, hasta acertarlas.'),
    ],
  },
  {
    id: 'polya',
    nombre: 'Resolver problemas por pasos',
    paraQue: 'Guías de ejercicios y problemas difíciles',
    porque: 'Entender y planear antes de calcular evita empezar mal y perder tiempo.',
    fases: () => [
      f('Entiende el problema', 5, 'Reescríbelo con tus palabras: ¿qué te piden? ¿qué datos tienes?'),
      f('Planea', 5, '¿Qué ejercicio parecido ya resolviste? Elige un camino antes de calcular.'),
      f('Resuelve', 25, 'Sigue tu plan. Si te trabas 5 minutos, prueba otro camino.'),
      f('Pausa corta', 5, 'Levántate y mira lejos.', 'descanso'),
      f('Revisa', 10, 'Verifica el resultado y anota en qué te equivocaste.'),
    ],
  },
]

export const METODO_IDS = METODOS.map((m) => m.id)
export const esMetodo = (x: unknown): x is MetodoId => typeof x === 'string' && (METODO_IDS as string[]).includes(x)
export const metodoPorId = (id: MetodoId): Metodo => METODOS.find((m) => m.id === id) ?? METODOS[0]

export const fasesDe = (id: MetodoId, cfg: ConfigTiempos): Fase[] => metodoPorId(id).fases(cfg)
export const minutosTotales = (id: MetodoId, cfg: ConfigTiempos): number => fasesDe(id, cfg).reduce((a, p) => a + p.minutos, 0)

/** "Solo 10 minutos para arrancar": una sola fase corta para vencer la pereza de empezar. */
export const FASE_ARRANQUE: Fase = { etiqueta: 'Solo 10 minutos', minutos: 10, tipo: 'enfoque', descripcion: 'Una sola cosa, hasta que suene. Después decides si sigues.' }

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

const NUMERICO = /matem|calculo|fisica|discreta|algebra|program|codigo|algoritmo|ejercicio|problema|practica|trigono|quimica|estadistic|logica/
const TEORIA = /leer|lectura|capitulo|teoria|concepto|investig|ensayo|exposicion|definicion|psicolog|historia|filosof|entender/
const LECTURA = /leer|lectura|capitulo|libro|articulo|paper/
const MEMORIZAR = /memoriz|vocabulario|definicion|formula|aprender de memoria/
const RESUMEN = /resumen|esquema|mapa mental|sintesis|organizar ideas/
const EJERCICIOS = /guia|ejercicio|problema|practica|taller/
const APUNTES = /apunte|notas de clase|mis notas|cornell|pasar notas|pasar en limpio/

/**
 * Elige el método que mejor le va a la tarea (si tú ya elegiste uno, ese).
 * Se mira el tipo (examen, estudio, tarea) y las palabras del título y del curso.
 */
export function sugerirMetodo(t: Pick<Tarea, 'titulo' | 'tipo' | 'metodo'>, nombreCurso = ''): MetodoId {
  if (esMetodo(t.metodo)) return t.metodo
  if (t.tipo === 'examen') return 'recuperacion'
  const x = norm(t.titulo + ' ' + nombreCurso)
  if (APUNTES.test(x)) return 'cornell'
  if (MEMORIZAR.test(x)) return 'tarjetas'
  if (RESUMEN.test(x)) return 'mapa'
  const numerico = NUMERICO.test(x)
  const teoria = TEORIA.test(x)
  if (t.tipo === 'estudio') return numerico && !teoria ? 'intercalada' : 'feynman'
  if (LECTURA.test(norm(t.titulo))) return 'sq3r'
  if (numerico && EJERCICIOS.test(norm(t.titulo))) return 'polya'
  if (teoria) return 'feynman'
  return 'pomodoro'
}
