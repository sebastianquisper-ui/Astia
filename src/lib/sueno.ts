// Control de sueño: tocas "Me voy a dormir" y al despertar "Ya desperté"; Astia cuenta las horas.
// La referencia es la de los adultos: 7 horas o más por noche (Academia Estadounidense de Medicina del Sueño).

export interface RegistroSueno {
  id: string
  /** Cuándo te dormiste (ISO). */
  durmio: string
  /** Cuándo despertaste (ISO); falta mientras sigues durmiendo. */
  desperto?: string
}

export const HORAS_RECOMENDADAS = 7
/** Menos de esto es una siesta, no la noche. */
const MIN_NOCHE_H = 2
/** Si pasan más horas sin que marques que despertaste, se asume que lo olvidaste. */
export const MAX_DURMIENDO_H = 16

export const horasEntre = (desde: string, hasta: string) => (new Date(hasta).getTime() - new Date(desde).getTime()) / 36e5

/** "7 h 20 min" */
export function textoDuracion(horas: number): string {
  const min = Math.round(horas * 60)
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h} h` : h === 0 ? `${m} min` : `${h} h ${m} min`
}

export type NivelSueno = 'muyPoco' | 'poco' | 'bien' | 'mucho'

export function nivelDeSueno(horas: number): NivelSueno {
  if (horas < 5) return 'muyPoco'
  if (horas < HORAS_RECOMENDADAS) return 'poco'
  if (horas <= 9.5) return 'bien'
  return 'mucho'
}

export function mensajeDeSueno(horas: number, nombre = ''): string {
  const quien = nombre.trim() ? `${nombre.trim()}, ` : ''
  const d = textoDuracion(horas)
  switch (nivelDeSueno(horas)) {
    case 'muyPoco':
      return `${quien}dormiste ${d}: muy poco. Hoy cuida tu energía y trata de acostarte más temprano.`
    case 'poco':
      return `${quien}dormiste ${d}, un poco menos de las ${HORAS_RECOMENDADAS} h recomendadas. Esta noche descansa algo más.`
    case 'bien':
      return `${quien}dormiste ${d}. Vas con buena base para un día productivo.`
    case 'mucho':
      return `${quien}dormiste ${d}: bastante. Si igual amaneces cansado, revisa a qué hora te acuestas.`
  }
}

/** El registro en curso (te dormiste y aún no marcas que despertaste), si es reciente. */
export function durmiendoAhora(registros: RegistroSueno[], ahora: Date): RegistroSueno | null {
  const r = registros.find((x) => x.desperto === undefined)
  if (!r) return null
  return horasEntre(r.durmio, ahora.toISOString()) <= MAX_DURMIENDO_H ? r : null
}

/** Un registro que quedó abierto demasiado tiempo: seguramente olvidaste marcar que despertaste. */
export function olvidado(registros: RegistroSueno[], ahora: Date): RegistroSueno | null {
  const r = registros.find((x) => x.desperto === undefined)
  return r && horasEntre(r.durmio, ahora.toISOString()) > MAX_DURMIENDO_H ? r : null
}

const completas = (registros: RegistroSueno[]) =>
  registros
    .filter((r): r is RegistroSueno & { desperto: string } => r.desperto !== undefined && horasEntre(r.durmio, r.desperto) >= MIN_NOCHE_H)
    .sort((a, b) => b.desperto.localeCompare(a.desperto))

/** Horas de la última noche, si despertaste en las últimas 20 h. */
export function ultimaNoche(registros: RegistroSueno[], ahora: Date): number | null {
  const r = completas(registros)[0]
  if (!r || horasEntre(r.desperto, ahora.toISOString()) > 20) return null
  return horasEntre(r.durmio, r.desperto)
}

/** Promedio de las noches de los últimos 7 días; null si hay menos de 3 noches. */
export function promedio7(registros: RegistroSueno[], ahora: Date): number | null {
  const recientes = completas(registros).filter((r) => horasEntre(r.desperto, ahora.toISOString()) <= 7 * 24)
  if (recientes.length < 3) return null
  return recientes.reduce((s, r) => s + horasEntre(r.durmio, r.desperto), 0) / recientes.length
}

export interface ResumenSueno {
  horasUltimaNoche: number | null
  promedio7: number | null
}
export const resumenDeSueno = (registros: RegistroSueno[], ahora: Date): ResumenSueno => ({ horasUltimaNoche: ultimaNoche(registros, ahora), promedio7: promedio7(registros, ahora) })
