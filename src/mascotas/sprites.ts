import { FONDOS } from './fondos'
import type { MascotaId } from '../lib/mascotas'

// Las imágenes de las mascotas (una por etapa). Vite las incluye en la app y en la copia sin internet.
const archivos = import.meta.glob('./sprites/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>

/** Imagen de una mascota en una etapa (la primera etapa es la 1). */
export function spriteDe(mascota: MascotaId, etapa: number): string {
  return archivos[`./sprites/${mascota}-${etapa}.webp`] ?? ''
}

/** Color de fondo de esa imagen: se usa para que el marco quede igual que el dibujo. */
export function fondoDe(mascota: MascotaId, etapa: number): string {
  return FONDOS[`${mascota}-${etapa}`] ?? '#f4f5f7'
}

export const hayEtapa = (mascota: MascotaId, etapa: number): boolean => spriteDe(mascota, etapa) !== ''
