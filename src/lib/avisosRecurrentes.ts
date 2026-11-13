import { leerLocal, guardarLocal } from './almacen'
import { pad, ymd } from './fechas'

// Avisos que se repiten (hábitos, rutinas y el "anota tus gastos" de Finanstia): tú eliges a qué horas del día.
// Solo avisan los días que toca y mientras no lo hayas cumplido ese día.

export interface ConfigRecurrente {
  horas: string[]
}

const CLAVE = 'astia.avisosRec'
const GRACIA_MIN = 45
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/
export const horasValidas = (h: string[]) => [...new Set(h.filter((x) => HHMM.test(x)))].sort()

export const leerRecurrentes = () => leerLocal<Record<string, ConfigRecurrente>>(CLAVE, {})
export function guardarRecurrente(id: string, c: ConfigRecurrente | null): boolean {
  const todas = leerRecurrentes()
  const horas = c ? horasValidas(c.horas) : []
  if (horas.length) todas[id] = { horas }
  else delete todas[id]
  return guardarLocal(CLAVE, todas)
}

export interface ItemRecurrente {
  id: string
  titulo: string
  /** Hoy corresponde y todavía no está cumplido. */
  pendienteHoy: boolean
  etiqueta: string
  sub: string
  destino: string
  modo: 'academico' | 'personal' | 'finanzas'
}

export interface AvisoRecurrente {
  item: ItemRecurrente
  hora: string
  clave: string
}

export function recurrentesQueTocan(items: ItemRecurrente[], configs: Record<string, ConfigRecurrente>, ahora: Date, mostradas: ReadonlySet<string>): AvisoRecurrente[] {
  const min = ahora.getHours() * 60 + ahora.getMinutes()
  const salida: AvisoRecurrente[] = []
  for (const item of items) {
    const c = configs[item.id]
    if (!c || !item.pendienteHoy) continue
    for (const hora of horasValidas(c.horas)) {
      const [h, m] = hora.split(':').map(Number)
      const dif = min - (h * 60 + m)
      const clave = `${item.id} ${ymd(ahora)} ${hora}`
      if (dif >= 0 && dif <= GRACIA_MIN && !mostradas.has(clave)) salida.push({ item, hora, clave })
    }
  }
  return salida
}

const DIAS_ICS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
const utc = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`

/** La regla de repetición: todos los días, o solo los días que tocan (0 = lunes). */
export function reglaRepeticion(dias: number[] | null): string {
  return dias && dias.length && dias.length < 7 ? `FREQ=WEEKLY;BYDAY=${[...dias].sort().map((d) => DIAS_ICS[d]).join(',')}` : 'FREQ=DAILY'
}

/** Primera vez (hoy o mañana) que da esa hora. */
export function primeraVez(hora: string, ahora: Date): Date {
  const [h, m] = hora.split(':').map(Number)
  const d = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), h, m, 0, 0)
  if (d <= ahora) d.setDate(d.getDate() + 1)
  return d
}

/** .ics con un evento repetido por cada hora, con su alarma a la hora exacta. */
export function icsRecurrente(id: string, titulo: string, horas: string[], dias: number[] | null, ahora: Date): string {
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Astia//Avisos//ES', 'CALSCALE:GREGORIAN']
  horasValidas(horas).forEach((h, i) => {
    const ini = primeraVez(h, ahora)
    L.push('BEGIN:VEVENT', `UID:${id}-${i}@astia`, `DTSTAMP:${utc(ahora)}`, `DTSTART:${utc(ini)}`, `DTEND:${utc(new Date(ini.getTime() + 10 * 60_000))}`, `RRULE:${reglaRepeticion(dias)}`, `SUMMARY:${esc(titulo)}`)
    L.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(titulo)}`, 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT')
  })
  L.push('END:VCALENDAR')
  return L.join('\r\n') + '\r\n'
}
