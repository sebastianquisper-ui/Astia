import type { Clase, Tarea } from '../dominio/tipos'
import { claseAhora } from './ahora'
import { pad, ymd } from './fechas'
import { porUrgencia, urgenciaDe } from './urgencia'

// Alarmas de Astia: avisos a pantalla completa (como la del curso que te toca) a las horas que tú eliges,
// más un aviso antes de cada clase. Aquí solo está la lógica; la pantalla vive en recordatorios/PantallaAviso.tsx.

export interface AjustesAlarmas {
  /** Interruptor general. */
  activo?: boolean
  /** Horas del día "HH:MM" en que Astia te revisa los pendientes. */
  horas?: string[]
  /** Minutos antes de cada clase (0 = no avisar). */
  claseMin?: number
  /** Si es true, a la hora elegida solo avisa cuando hay algo pendiente. */
  soloSiPendientes?: boolean
  /** Crear las alarmas diarias también en Google Calendar (llegan con la app cerrada). */
  enCalendario?: boolean
}

export const HORAS_SUGERIDAS = ['08:00', '14:00', '20:00']
export const OPCIONES_CLASE = [0, 5, 10, 15, 30]
/** Si la app estaba cerrada a la hora de la alarma, al abrirla se muestra si pasaron menos de estos minutos. */
const GRACIA_MIN = 45

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/
export const horaValida = (s: string) => HHMM.test(s)

/** Horas válidas, sin repetir y en orden. */
export function normalizarHoras(horas: string[] | undefined): string[] {
  return [...new Set((horas ?? []).filter(horaValida))].sort()
}

export const claveDeAlarma = (fecha: Date, hhmm: string) => `${ymd(fecha)} ${hhmm}`

/**
 * Las alarmas diarias que ya llegaron hoy (dentro del margen de gracia) y todavía no se mostraron.
 * `mostradas` guarda las claves "AAAA-MM-DD HH:MM" ya usadas.
 */
export function alarmasPendientes(horas: string[], ahora: Date, mostradas: ReadonlySet<string>): string[] {
  const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes()
  return normalizarHoras(horas).filter((h) => {
    const [hh, mm] = h.split(':').map(Number)
    const dif = minutosAhora - (hh * 60 + mm)
    return dif >= 0 && dif <= GRACIA_MIN && !mostradas.has(claveDeAlarma(ahora, h))
  })
}

export interface ClaseInminente {
  clase: Clase
  /** Minutos que faltan para que empiece. */
  minutos: number
  /** Para no repetir el aviso: "AAAA-MM-DD id-de-clase". */
  clave: string
}

/** La próxima clase si empieza dentro de `minutosAntes` minutos (o menos); si no, null. */
export function claseInminente(clases: Clase[], ahora: Date, minutosAntes: number): ClaseInminente | null {
  if (minutosAntes <= 0) return null
  const e = claseAhora(clases, ahora)
  if (e.tipo !== 'proxima' || !e.clase || e.minutos > minutosAntes) return null
  return { clase: e.clase, minutos: e.minutos, clave: `${ymd(ahora)} clase-${e.clase.id}` }
}

/** Pendientes por orden de urgencia (vencidas primero). */
export function pendientesParaAlarma(tareas: Tarea[], ahora: Date): Tarea[] {
  return tareas.filter((t) => t.estado === 'pendiente' && urgenciaDe(t, ahora) !== 'hecha').sort(porUrgencia)
}

/** "08:00" -> "8:00 a. m." para mostrar. */
export function horaBonita(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  return `${h % 12 === 0 ? 12 : h % 12}:${pad(m)} ${h < 12 ? 'a. m.' : 'p. m.'}`
}

/** Cuánto falta para que empiece la clase, en palabras. */
export const textoFalta = (min: number) => (min <= 1 ? 'ya va a empezar' : `empieza en ${min} min`)
