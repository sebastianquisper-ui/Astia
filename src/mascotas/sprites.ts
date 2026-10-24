import { FONDOS } from './fondos'
import type { MascotaId } from '../lib/mascotas'

/** Color de fondo de la miniatura de esa etapa. */
export function fondoDe(mascota: MascotaId, etapa: number): string {
  return FONDOS[`${mascota}-${etapa}`] ?? '#f4f5f7'
}
