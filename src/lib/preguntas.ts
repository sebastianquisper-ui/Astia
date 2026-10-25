import type { Clase, Curso, Habito, ProgresoDia, Tarea } from '../dominio/tipos'
import { claseAhora, formatoCuenta } from './ahora'
import { rachaDeDias, resumenReciente } from './academico'
import { addDays, DIAS, indiceDia, ymd } from './fechas'
import { cumplimientoDeHoy } from './habitos'
import { porUrgencia, textoVence, urgenciaDe } from './urgencia'

// Preguntas habladas o escritas sobre tus estudios ("¿qué pendientes tengo hoy?"). Son reglas del español:
// no usan internet, no cuestan nada y responden al instante con tus datos reales.

export interface ContextoPreguntas {
  tareas: Tarea[]
  clases: Clase[]
  cursos: Curso[]
  habitos: Habito[]
  progreso: ProgresoDia[]
  ahora: Date
}

export type Intencion = 'urgente' | 'vencidas' | 'examenes' | 'semana' | 'clase' | 'enfoque' | 'habitos' | 'racha' | 'hoy'

export interface Respuesta {
  /** Si Astia entendió la pregunta. */
  entendida: boolean
  texto: string
}

const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// El orden importa: lo más específico primero
const REGLAS: [Intencion, RegExp][] = [
  ['urgente', /\b(mas urgente|urgente|prioridad|prioritari|por cual empiezo|que hago primero|empezar por|primero)/],
  ['vencidas', /\b(vencid|atrasad|retrasad|me falto|se me paso|debo)/],
  ['examenes', /\b(examen|examenes|parcial|parciales|final|finales|prueba|pruebas|evaluacion)\b/],
  ['semana', /\b(semana|proximos dias|esta semana)\b/],
  ['clase', /\b(clase|clases|me toca|horario|curso ahora|que sigue)\b/],
  ['enfoque', /\b(enfoque|enfoc|estudiado|estudie|pomodoro|minutos)/],
  ['habitos', /\b(habito|habitos|rutina|rutinas)\b/],
  ['racha', /\b(racha|dias seguidos|constancia)\b/],
  ['hoy', /\b(hoy|pendiente|pendientes|que tengo|por hacer|tareas|que debo hacer|que falta)\b/],
]

export function interpretarPregunta(frase: string): Intencion | null {
  const t = sinTildes(frase)
  for (const [intencion, regla] of REGLAS) if (regla.test(t)) return intencion
  return null
}

const nombreCurso = (t: Tarea, cursos: Curso[]) => cursos.find((c) => c.id === t.cursoId)?.nombre
const linea = (t: Tarea, cursos: Curso[], ahora: Date) => `${t.titulo}${nombreCurso(t, cursos) ? ' (' + nombreCurso(t, cursos) + ')' : ''}: ${textoVence(t, ahora).toLowerCase()}`
const lista = (ts: Tarea[], cursos: Curso[], ahora: Date, max = 5) => {
  const mostradas = ts.slice(0, max).map((t) => '• ' + linea(t, cursos, ahora))
  if (ts.length > max) mostradas.push(`…y ${ts.length - max} más.`)
  return mostradas.join('\n')
}
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

export function responder(frase: string, c: ContextoPreguntas): Respuesta {
  const intencion = interpretarPregunta(frase)
  const uni = c.tareas.filter((t) => t.area === 'universidad' && t.estado === 'pendiente').sort(porUrgencia)
  const hoyYmd = ymd(c.ahora)
  // Sin datos cargados, "nada pendiente" engaña: mejor decir qué falta
  const hayTareas = c.tareas.some((t) => t.area === 'universidad')
  if (!hayTareas && ['urgente', 'vencidas', 'examenes', 'semana', 'hoy'].includes(intencion ?? '')) {
    return { entendida: true, texto: 'Todavía no tienes tareas cargadas, así que no tengo qué contarte. Agrega una con «+ Nueva tarea» en Hoy, o con el botón Dictar.' }
  }
  if (intencion === 'clase' && !c.clases.length) return { entendida: true, texto: 'Todavía no cargaste tu horario. Agrégalo en Más → Horario de clases y te digo qué te toca.' }
  if (intencion === 'habitos' && !c.habitos.length) return { entendida: true, texto: 'Todavía no tienes hábitos creados. Crea uno en la pestaña Hábitos.' }
  switch (intencion) {
    case 'urgente': {
      const t = uni[0]
      if (!t) return { entendida: true, texto: 'No tienes nada pendiente en la universidad. Aprovecha para adelantar o descansar.' }
      const cuando = urgenciaDe(t, c.ahora) === 'vencida' ? 'Ya está vencida' : 'Vence ' + textoVence(t, c.ahora).toLowerCase()
      return { entendida: true, texto: `Empieza por «${t.titulo}»${nombreCurso(t, c.cursos) ? ' de ' + nombreCurso(t, c.cursos) : ''}. ${cuando}.` }
    }
    case 'vencidas': {
      const v = uni.filter((t) => urgenciaDe(t, c.ahora) === 'vencida')
      if (!v.length) return { entendida: true, texto: 'No tienes tareas vencidas. Bien.' }
      return { entendida: true, texto: `Tienes ${plural(v.length, 'tarea vencida', 'tareas vencidas')}:\n${lista(v, c.cursos, c.ahora)}` }
    }
    case 'examenes': {
      const e = uni.filter((t) => t.tipo === 'examen')
      if (!e.length) return { entendida: true, texto: 'No tienes exámenes registrados por ahora.' }
      return { entendida: true, texto: `Tus exámenes:\n${lista(e, c.cursos, c.ahora)}` }
    }
    case 'semana': {
      const hasta = ymd(addDays(c.ahora, 7))
      const s = uni.filter((t) => t.fecha <= hasta)
      if (!s.length) return { entendida: true, texto: 'No tienes nada que venza en los próximos 7 días.' }
      return { entendida: true, texto: `En los próximos 7 días tienes ${plural(s.length, 'pendiente', 'pendientes')}:\n${lista(s, c.cursos, c.ahora, 6)}` }
    }
    case 'clase': {
      const e = claseAhora(c.clases, c.ahora)
      if (e.tipo === 'ninguna' || !e.clase || !e.inicio) return { entendida: true, texto: 'No veo clases en tu horario para los próximos días.' }
      const curso = c.cursos.find((x) => x.id === e.clase!.cursoId)?.nombre ?? 'Clase'
      const cuenta = formatoCuenta(e.minutos)
      const donde = e.clase.aula ? ` en ${e.clase.aula}` : ''
      if (e.tipo === 'en-clase') return { entendida: true, texto: `Estás en ${curso}${donde}. Termina en ${cuenta.n} ${cuenta.u}.` }
      const dia = e.inicio.toDateString() === c.ahora.toDateString() ? 'hoy' : DIAS[indiceDia(e.inicio)].toLowerCase()
      return { entendida: true, texto: `Tu próxima clase es ${curso}${donde}, ${dia} a las ${e.clase.inicio} (en ${cuenta.n} ${cuenta.u}).` }
    }
    case 'enfoque': {
      const hoy = c.progreso.find((p) => p.fecha === hoyYmd)
      const semana = resumenReciente(c.progreso, c.ahora, 7)
      return { entendida: true, texto: `Hoy llevas ${hoy?.enfoque ?? 0} min de enfoque y ${plural(hoy?.pomodoros ?? 0, 'pomodoro', 'pomodoros')}. En 7 días: ${semana.enfoque} min.` }
    }
    case 'habitos': {
      const { hechos, total } = cumplimientoDeHoy(c.habitos, c.ahora)
      if (!total) return { entendida: true, texto: 'Hoy no te toca ningún hábito.' }
      const faltan = c.habitos.filter((h) => !h.registro.includes(hoyYmd)).length
      return { entendida: true, texto: `Hábitos de hoy: ${hechos} de ${total}.${hechos < total && faltan ? ' Aún te falta cumplir.' : ' Todo al día.'}` }
    }
    case 'racha': {
      const r = rachaDeDias(c.progreso, c.ahora)
      return { entendida: true, texto: `Llevas ${plural(r.actual, 'día seguido', 'días seguidos')}. Tu mejor racha: ${r.mejor}.` }
    }
    case 'hoy': {
      const delDia = uni.filter((t) => t.fecha <= hoyYmd)
      if (!delDia.length) {
        const sig = uni[0]
        return { entendida: true, texto: sig ? `Nada vence hoy. Lo siguiente es «${sig.titulo}», ${textoVence(sig, c.ahora).toLowerCase()}.` : 'Nada pendiente. Estás al día.' }
      }
      return { entendida: true, texto: `Para hoy (o ya vencidas) tienes ${plural(delDia.length, 'pendiente', 'pendientes')}:\n${lista(delDia, c.cursos, c.ahora)}` }
    }
    default:
      return {
        entendida: false,
        texto: 'No entendí esa pregunta. Puedo decirte: tus pendientes de hoy, lo más urgente, lo vencido, tus exámenes, lo de esta semana, tu próxima clase, tu enfoque, tus hábitos y tu racha.',
      }
  }
}
