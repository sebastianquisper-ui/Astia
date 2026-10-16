import type { Momento, Rutina } from '../dominio/tipos'
import { indiceDia, ymd } from './fechas'

export const MOMENTOS: { id: Momento; texto: string }[] = [
  { id: 'manana', texto: 'Mañana' },
  { id: 'tarde', texto: 'Tarde' },
  { id: 'noche', texto: 'Noche' },
  { id: 'libre', texto: 'Libre' },
]

export const momentoDeLaHora = (hora: number): Exclude<Momento, 'libre'> => (hora < 12 ? 'manana' : hora < 19 ? 'tarde' : 'noche')

export const hechaHoy = (r: Rutina, hoy: Date): boolean => r.registro.includes(ymd(hoy))

/** Una rutina toca hoy si no tiene días fijos o si hoy es uno de sus días. */
export const tocaHoyRutina = (r: Rutina, hoy: Date): boolean => r.dias.length === 0 || r.dias.includes(indiceDia(hoy))

/** La rutina que corresponde a este momento del día y todavía no hiciste. */
export function rutinaDeAhora(rutinas: Rutina[], ahora: Date): Rutina | undefined {
  const momento = momentoDeLaHora(ahora.getHours())
  return rutinas.find((r) => r.momento === momento && tocaHoyRutina(r, ahora) && !hechaHoy(r, ahora))
}

export function textoDias(dias: number[]): string {
  const nombres = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom']
  return dias.length === 0 || dias.length === 7 ? 'Cuando quieras' : dias.map((d) => nombres[d]).join(', ')
}
