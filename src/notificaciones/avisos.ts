import type { Recordatorio } from '../dominio/tipos'

// Los avisos que Astia le entrega al servidor para que los envíe aunque la app esté cerrada.

export interface Aviso {
  id: string
  /** Momento exacto en milisegundos desde 1970. */
  cuando: number
  titulo: string
  cuerpo: string
}

/** Un mes hacia adelante es suficiente; más allá se actualiza cuando abras la app. */
const HORIZONTE_MS = 31 * 24 * 3_600_000

/** Los recordatorios que todavía no suenan y caen en el futuro. */
export function avisosDeRecordatorios(recordatorios: Recordatorio[], ahora: number): Aviso[] {
  return recordatorios
    .filter((r) => !r.avisado && r.borradoEn === undefined)
    .map((r) => ({ id: 'r-' + r.id, cuando: Date.parse(r.cuando), titulo: 'Astia te recuerda', cuerpo: r.texto }))
    .filter((a) => Number.isFinite(a.cuando) && a.cuando > ahora && a.cuando <= ahora + HORIZONTE_MS)
    .sort((a, b) => a.cuando - b.cuando)
}
