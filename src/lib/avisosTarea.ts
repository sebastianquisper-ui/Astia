import type { Tarea } from '../dominio/tipos'
import { leerLocal, guardarLocal } from './almacen'
import { pad } from './fechas'
import { textoVence, venceEn } from './urgencia'

// Avisos por tarea: tú eliges cuántos y cuánto antes de la entrega (y, si quieres, un aviso diario hasta entregar).
// Se guardan en el teléfono; Astia los muestra a pantalla completa y además se pueden llevar a Google Calendar o al calendario del teléfono.

export interface ConfigAvisoTarea {
  /** Minutos antes de la entrega en que debe avisar (0 = a la hora). */
  antes: number[]
  /** "HH:MM": además, un aviso todos los días a esa hora hasta la entrega (solo en el calendario). */
  diarioA?: string
}

const CLAVE = 'astia.avisosTarea'
const GRACIA_MIN = 45
/** Google Calendar permite 5 alarmas por evento. */
export const MAX_ALARMAS = 5

export const OPCIONES_ANTES = [0, 10, 30, 60, 180, 1440, 2880]

export function textoAntes(min: number): string {
  if (min === 0) return 'A la hora'
  if (min % 1440 === 0) return `${min / 1440} ${min === 1440 ? 'día' : 'días'} antes`
  if (min % 60 === 0) return `${min / 60} h antes`
  return `${min} min antes`
}

export const normalizarAntes = (a: number[]) => [...new Set(a.filter((n) => Number.isInteger(n) && n >= 0 && n <= 60 * 24 * 60))].sort((x, y) => y - x).slice(0, MAX_ALARMAS)

export const leerConfigs = () => leerLocal<Record<string, ConfigAvisoTarea>>(CLAVE, {})
export function guardarConfig(id: string, c: ConfigAvisoTarea | null): boolean {
  const todas = leerConfigs()
  if (c && (c.antes.length || c.diarioA)) todas[id] = c
  else delete todas[id]
  return guardarLocal(CLAVE, todas)
}

export interface AvisoDeTarea {
  tarea: Tarea
  antes: number
  clave: string
}

/** Los avisos de tareas pendientes cuya hora ya llegó (con margen de gracia) y no se mostraron. */
export function avisosDeTareaQueTocan(tareas: Tarea[], configs: Record<string, ConfigAvisoTarea>, ahora: Date, mostradas: ReadonlySet<string>): AvisoDeTarea[] {
  const t0 = ahora.getTime()
  const salida: AvisoDeTarea[] = []
  for (const tarea of tareas) {
    const c = configs[tarea.id]
    if (!c || tarea.estado !== 'pendiente') continue
    const vence = venceEn(tarea)
    for (const antes of c.antes) {
      const dispara = vence - antes * 60_000
      const clave = `${tarea.id} antes-${antes}`
      if (t0 >= dispara && t0 - dispara <= GRACIA_MIN * 60_000 && !mostradas.has(clave)) salida.push({ tarea, antes, clave })
    }
  }
  return salida.sort((a, b) => a.antes - b.antes)
}

export interface EventoTarea {
  titulo: string
  detalle: string
  inicio: Date
  fin: Date
  alarmas: number[]
  diario?: { hora: string; hasta: Date }
}

export function eventoDeTarea(t: Tarea, c: ConfigAvisoTarea, curso: string, ahora: Date): EventoTarea {
  const inicio = new Date(venceEn(t))
  const diario = c.diarioA && /^([01]\d|2[0-3]):[0-5]\d$/.test(c.diarioA) ? { hora: c.diarioA, hasta: inicio } : undefined
  return {
    titulo: `📝 ${t.titulo}`,
    detalle: `Entrega de Astia${curso ? ` · ${curso}` : ''}. ${textoVence(t, ahora)}.`,
    inicio,
    fin: new Date(inicio.getTime() + 15 * 60_000),
    alarmas: normalizarAntes(c.antes),
    diario,
  }
}

/** La próxima vez (hoy o mañana) que da esa hora, pero que no pase de la entrega; null si ya no cabe. */
export function primerDiario(hora: string, hasta: Date, ahora: Date): Date | null {
  const [h, m] = hora.split(':').map(Number)
  const d = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), h, m, 0, 0)
  if (d <= ahora) d.setDate(d.getDate() + 1)
  return d < hasta ? d : null
}

const utc = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
const alarma = (min: number, texto: string) => ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(texto)}`, `TRIGGER:${min === 0 ? 'PT0M' : `-PT${min}M`}`, 'END:VALARM']

/** Archivo .ics con todas las alarmas: se abre en el Calendario del iPhone/Android o en Google Calendar. */
export function crearIcs(id: string, e: EventoTarea, ahora: Date): string {
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Astia//Avisos//ES', 'CALSCALE:GREGORIAN']
  L.push('BEGIN:VEVENT', `UID:${id}-entrega@astia`, `DTSTAMP:${utc(ahora)}`, `DTSTART:${utc(e.inicio)}`, `DTEND:${utc(e.fin)}`, `SUMMARY:${esc(e.titulo)}`, `DESCRIPTION:${esc(e.detalle)}`)
  for (const m of e.alarmas) L.push(...alarma(m, e.titulo))
  L.push('END:VEVENT')
  const primero = e.diario ? primerDiario(e.diario.hora, e.diario.hasta, ahora) : null
  if (e.diario && primero) {
    L.push('BEGIN:VEVENT', `UID:${id}-diario@astia`, `DTSTAMP:${utc(ahora)}`, `DTSTART:${utc(primero)}`, `DTEND:${utc(new Date(primero.getTime() + 10 * 60_000))}`, `RRULE:FREQ=DAILY;UNTIL=${utc(e.diario.hasta)}`)
    L.push(`SUMMARY:${esc('📌 Revisa: ' + e.titulo.replace(/^📝 /, ''))}`, `DESCRIPTION:${esc(e.detalle)}`, ...alarma(0, e.titulo), 'END:VEVENT')
  }
  L.push('END:VCALENDAR')
  return L.join('\r\n') + '\r\n'
}
