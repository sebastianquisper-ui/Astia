import type { Clase, ProgresoDia, Tarea } from '../dominio/tipos'
import { addDays, aMinutos, indiceDia, lunesDe, parseYmd, semanaDelCiclo, ymd } from './fechas'

// Lógica pura de las pantallas académicas (Semana, Ciclo, Calendario, Progreso).

export interface DiaSemana {
  fecha: Date
  clases: Clase[]
  /** Tareas (pendientes y hechas) que vencen ese día, ordenadas por hora; sin hora van al final. */
  tareas: Tarea[]
}

/** Los 7 días (lunes a domingo) con sus clases y las tareas que vencen. Solo la universidad. */
export function semanaAcademica(clases: Clase[], tareas: Tarea[], lunes: Date): DiaSemana[] {
  return Array.from({ length: 7 }, (_, i) => {
    const fecha = addDays(lunes, i)
    const k = ymd(fecha)
    return {
      fecha,
      clases: clases.filter((c) => c.dia === i).sort((a, b) => aMinutos(a.inicio) - aMinutos(b.inicio)),
      tareas: tareas.filter((t) => t.area === 'universidad' && t.fecha === k).sort((a, b) => aMinutos(a.hora ?? '23:59') - aMinutos(b.hora ?? '23:59')),
    }
  })
}

export interface CargaSemana {
  semana: number
  lunes: Date
  total: number
  pendientes: number
  examenes: number
  tipo?: 'examenes' | 'libre'
}

/** Cuántas tareas (y exámenes) vencen en cada semana del ciclo. Vacío si no hay fecha de inicio. */
export function cargaDelCiclo(tareas: Tarea[], inicioCiclo: string, semanas: number, especiales: Record<string, 'examenes' | 'libre'> = {}): CargaSemana[] {
  if (!inicioCiclo) return []
  const lunes0 = lunesDe(parseYmd(inicioCiclo))
  return Array.from({ length: semanas }, (_, i) => {
    const lunes = addDays(lunes0, i * 7)
    const desde = ymd(lunes)
    const hasta = ymd(addDays(lunes, 6))
    const dentro = tareas.filter((t) => t.area === 'universidad' && t.fecha >= desde && t.fecha <= hasta)
    return {
      semana: i + 1,
      lunes,
      total: dentro.length,
      pendientes: dentro.filter((t) => t.estado === 'pendiente').length,
      examenes: dentro.filter((t) => t.tipo === 'examen').length,
      tipo: especiales[String(i + 1)],
    }
  })
}

/** Primera semana del ciclo de la que `fecha` forma parte, limitada a 1..semanas; null si no hay inicio. */
export function semanaActualDelCiclo(inicioCiclo: string, hoy: Date, semanas: number): number | null {
  const n = semanaDelCiclo(inicioCiclo, hoy)
  if (n === null || n < 1 || n > semanas) return null
  return n
}

/** Casillas del mes en filas de 7 (lunes primero); null = casilla vacía. */
export function cuadriculaDelMes(año: number, mes: number): (Date | null)[][] {
  const primero = new Date(año, mes, 1)
  const dias = new Date(año, mes + 1, 0).getDate()
  const celdas: (Date | null)[] = [...Array(indiceDia(primero)).fill(null), ...Array.from({ length: dias }, (_, i) => new Date(año, mes, i + 1))]
  while (celdas.length % 7) celdas.push(null)
  return Array.from({ length: celdas.length / 7 }, (_, f) => celdas.slice(f * 7, f * 7 + 7))
}

/** Un día cuenta como "cumplido" si hiciste una tarea o enfocaste al menos un pomodoro/minuto. */
export const diaCumplido = (p: ProgresoDia | undefined): boolean => !!p && (p.hechas > 0 || p.enfoque > 0 || p.pomodoros > 0)

export interface RachaDias {
  actual: number
  mejor: number
}

/** Días seguidos cumpliendo. La racha actual no se rompe si hoy todavía no hiciste nada (cuenta desde ayer). */
export function rachaDeDias(progreso: ProgresoDia[], hoy: Date): RachaDias {
  const hechos = new Set(progreso.filter((p) => diaCumplido(p)).map((p) => p.fecha))
  let actual = 0
  let d = hoy
  if (!hechos.has(ymd(d))) d = addDays(d, -1)
  while (hechos.has(ymd(d))) {
    actual++
    d = addDays(d, -1)
  }
  const fechas = [...hechos].sort()
  let mejor = 0
  let corrida = 0
  let previa: Date | null = null
  for (const f of fechas) {
    const fecha = parseYmd(f)
    corrida = previa && ymd(addDays(previa, 1)) === f ? corrida + 1 : 1
    mejor = Math.max(mejor, corrida)
    previa = fecha
  }
  return { actual, mejor }
}

export interface ResumenProgreso {
  hechas: number
  enfoque: number
  pomodoros: number
  diasCumplidos: number
}

/** Suma de los últimos `dias` días (incluido hoy). */
export function resumenReciente(progreso: ProgresoDia[], hoy: Date, dias: number): ResumenProgreso {
  const desde = ymd(addDays(hoy, -(dias - 1)))
  const hasta = ymd(hoy)
  const dentro = progreso.filter((p) => p.fecha >= desde && p.fecha <= hasta)
  return {
    hechas: dentro.reduce((s, p) => s + p.hechas, 0),
    enfoque: dentro.reduce((s, p) => s + p.enfoque, 0),
    pomodoros: dentro.reduce((s, p) => s + p.pomodoros, 0),
    diasCumplidos: dentro.filter((p) => diaCumplido(p)).length,
  }
}
