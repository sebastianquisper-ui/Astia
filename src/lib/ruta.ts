// Rutas con "hash" (#/hoy, #/mas/ajustes). Así el gesto de volver del iPhone funciona
// y más adelante los atajos de iOS podrán abrir una pantalla exacta.

export type Pestana = 'hoy' | 'semana' | 'cursos' | 'habitos' | 'tareas' | 'mas'
export const PESTANAS: Pestana[] = ['hoy', 'semana', 'cursos', 'habitos', 'tareas', 'mas']

export interface Ruta {
  pestana: Pestana
  /** Sub-pantalla dentro de "Más" (ajustes, horario...). Vacío = lista principal. */
  sub: string
}

export function leerRuta(hash: string): Ruta {
  const partes = hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  const primera = partes[0] as Pestana | undefined
  const pestana = primera && PESTANAS.includes(primera) ? primera : 'hoy'
  return { pestana, sub: pestana === 'mas' ? (partes[1] ?? '') : '' }
}

export function hashDe(ruta: Ruta): string {
  return '#/' + ruta.pestana + (ruta.sub ? '/' + ruta.sub : '')
}
