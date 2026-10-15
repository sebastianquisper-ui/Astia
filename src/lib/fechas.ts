// Utilidades de fechas (puras y probadas). Las horas siempre en la zona del teléfono.

export const pad = (n: number) => String(n).padStart(2, '0')
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const parseYmd = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const addDays = (d: Date, n: number) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  x.setDate(x.getDate() + n)
  return x
}
export const diffDays = (a: Date, b: Date) => Math.round((a.getTime() - b.getTime()) / 864e5)
/** 0 = lunes ... 6 = domingo */
export const indiceDia = (d: Date) => (d.getDay() + 6) % 7
/** "14:30" -> 870 */
export const aMinutos = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + (m || 0)
}
/** Fecha con la hora "HH:MM" puesta. */
export const conHora = (d: Date, hhmm: string) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  x.setHours(0, aMinutos(hhmm), 0, 0)
  return x
}

export const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
export const DIAS_CORTOS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom']
export const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
export const fechaCorta = (d: Date) => `${DIAS_CORTOS[indiceDia(d)]} ${d.getDate()} ${MESES[d.getMonth()]}`

/** El lunes de la semana de `d`. */
export const lunesDe = (d: Date) => addDays(d, -indiceDia(d))

/** Número de semana del ciclo (1 = la semana donde empieza). Antes del inicio da 0 o negativo. */
export function semanaDelCiclo(inicioCiclo: string, fecha: Date): number | null {
  if (!inicioCiclo) return null
  return Math.floor(diffDays(lunesDe(fecha), lunesDe(parseYmd(inicioCiclo))) / 7) + 1
}
