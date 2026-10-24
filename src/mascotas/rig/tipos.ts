import type { ReactNode } from 'react'
import type { Animo } from '../../lib/avatar'

/** Lo que cada dibujo recibe: en qué etapa está, qué ánimo tiene y un prefijo para sus ids. */
export interface Contexto {
  /** Etapa a dibujar (la primera es la 1). */
  etapa: number
  animo: Animo
  habla: boolean
  /** Prefijo único por mascota en pantalla (los degradados necesitan ids que no se repitan). */
  id: string
}

/**
 * Cada mascota se dibuja en capas separadas. Al inclinarla, las capas se separan en
 * profundidad (las de atrás quedan atrás y los accesorios al frente): ese es el efecto 3D.
 */
export interface Capas {
  /** Degradados y recortes compartidos por todas las capas. */
  defs?: ReactNode
  /** Cola, alas, branquias, mochila: lo que está detrás del cuerpo. */
  atras?: ReactNode
  cuerpo: ReactNode
  /** Ojos, cejas, boca y mejillas. */
  cara?: ReactNode
  /** Sombreros, lentes, bufandas, la caja: lo que va por delante. */
  frente?: ReactNode
}

export type Dibujar = (c: Contexto) => Capas
