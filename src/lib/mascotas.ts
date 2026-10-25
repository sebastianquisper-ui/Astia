import type { Habito, ProgresoDia, Rutina, Tarea } from '../dominio/tipos'
import { apartadoDe } from './apartados'

// Mascota: Alpi, el compañero que evoluciona con tus logros (la otra opción es la estrella de siempre).
// La experiencia (XP) NO se guarda: se calcula siempre a partir de lo que ya hiciste en la app
// (tareas hechas, hábitos cumplidos, rutinas, minutos de enfoque). Así no se puede "farmear"
// marcando y desmarcando, y no hay nada que sincronizar.

export type MascotaId = 'alpi'
/** 'astia' es la estrella de siempre (sin evolución). */
export type MascotaElegida = MascotaId | 'astia'

export interface Mascota {
  id: MascotaId
  nombre: string
  apodo: string
  descripcion: string
  etiquetas: [string, string]
  /** Define la voz automática: Alpi y sus evoluciones son masculinos. */
  genero: 'hombre' | 'mujer'
  /** Nombre de cada etapa, en orden (el nivel 1 es la primera). */
  etapas: string[]
}

export const MASCOTAS: Mascota[] = [
  { id: 'alpi', nombre: 'Alpi', apodo: 'El aventurero de los Andes', descripcion: 'Un compañero alpaca, suave y divertido, que te acompaña paso a paso. Representa la perseverancia, la calma y el equilibrio entre tus metas y tu bienestar.', etiquetas: ['Perseverancia', 'Bienestar'], genero: 'hombre', etapas: ['Alpaquito', 'Explorador', 'Guardián de los valles', 'Legendario'] },
]

/** Género de la mascota elegida; Astia (la estrella) es femenina. */
export const generoDeMascota = (id: MascotaElegida): 'hombre' | 'mujer' => MASCOTAS.find((m) => m.id === id)?.genero ?? 'mujer'

export const mascotaPorId = (id: string): Mascota | undefined => MASCOTAS.find((m) => m.id === id)
export const esMascota = (x: unknown): x is MascotaId => typeof x === 'string' && MASCOTAS.some((m) => m.id === x)

// ---------- experiencia ----------

export interface XP {
  /** Tareas de la universidad, exámenes y sesiones de enfoque. */
  academico: number
  /** Pendientes personales. */
  personal: number
  /** Hábitos y rutinas del día a día. */
  habitos: number
  /** Cuidar de ti: salud, deporte, descanso. */
  cuidado: number
}

/** Puntos por cada cosa cumplida. Con estos valores, un buen día suma unos 27 y una buena semana unos 160. */
export const PUNTOS = { tarea: 5, examen: 10, personal: 4, habito: 2, rutina: 6, minutosPorPunto: 10 } as const

export const AREAS_XP: { id: keyof XP; nombre: string; detalle: string }[] = [
  { id: 'academico', nombre: 'Académico', detalle: `Tareas (+${PUNTOS.tarea}), exámenes (+${PUNTOS.examen}) y 1 por cada ${PUNTOS.minutosPorPunto} min de enfoque` },
  { id: 'personal', nombre: 'Metas personales', detalle: `Pendientes personales cumplidos (+${PUNTOS.personal})` },
  { id: 'habitos', nombre: 'Hábitos', detalle: `Cada hábito cumplido (+${PUNTOS.habito}) y cada rutina (+${PUNTOS.rutina})` },
  { id: 'cuidado', nombre: 'Cuidar de ti', detalle: `Lo de Salud y Deporte: hábitos (+${PUNTOS.habito}), rutinas (+${PUNTOS.rutina}), pendientes (+${PUNTOS.personal})` },
]

export const totalXP = (xp: XP): number => xp.academico + xp.personal + xp.habitos + xp.cuidado

const esCuidado = (categoria?: string | null) => ['Salud', 'Deporte'].includes(apartadoDe(categoria).nombre)

/** XP a partir de lo que hay hoy en la app. Recibe solo registros activos (no borrados). */
export function calcularXP(d: { tareas: Tarea[]; habitos: Habito[]; rutinas: Rutina[]; progreso: ProgresoDia[] }): XP {
  const xp: XP = { academico: 0, personal: 0, habitos: 0, cuidado: 0 }
  for (const t of d.tareas) {
    if (t.estado !== 'hecha') continue
    if (t.area === 'universidad') xp.academico += t.tipo === 'examen' ? PUNTOS.examen : PUNTOS.tarea
    else if (esCuidado(t.categoria)) xp.cuidado += PUNTOS.personal
    else xp.personal += PUNTOS.personal
  }
  for (const h of d.habitos) xp[esCuidado(h.categoria) ? 'cuidado' : 'habitos'] += PUNTOS.habito * h.registro.length
  for (const r of d.rutinas) xp[esCuidado(r.categoria) ? 'cuidado' : 'habitos'] += PUNTOS.rutina * r.registro.length
  for (const p of d.progreso) xp.academico += Math.floor(p.enfoque / PUNTOS.minutosPorPunto)
  return xp
}

// ---------- etapas ----------

/** Lo que suma una buena semana (cumplir casi todo cada día). De ahí sale cuánto cuesta cada nivel. */
export const XP_BUENA_SEMANA = 160

/**
 * XP total que se necesita para llegar a cada etapa (la primera es 0). Depende de cuánto dura tu ciclo: con buen ritmo
 * llegas al nivel máximo a la mitad del ciclo, y con la mitad de ritmo, al final. Los niveles intermedios están en
 * el 10% y el 40% de ese camino, para que haya un premio pronto pero el final se haga esperar.
 */
export function umbralesDe(etapas: number, semanas = 16): number[] {
  const tope = XP_BUENA_SEMANA * (semanas / 2)
  const r = (x: number) => Math.max(10, Math.round(x / 10) * 10)
  return etapas >= 4 ? [0, r(tope * 0.1), r(tope * 0.4), r(tope)] : etapas === 3 ? [0, r(tope * 0.2), r(tope)] : etapas === 2 ? [0, r(tope * 0.5)] : [0]
}

/** Mínimo de XP que debe venir de cada lado (estudios / vida personal) para evolucionar a la etapa 3 o más. */
export const EQUILIBRIO_MINIMO = 0.15

export interface Equilibrio {
  ok: boolean
  /** El lado que se quedó corto. */
  falta: 'academico' | 'personal' | null
}

export function equilibrio(xp: XP): Equilibrio {
  const total = totalXP(xp)
  if (total === 0) return { ok: true, falta: null }
  const personal = xp.personal + xp.habitos + xp.cuidado
  if (xp.academico / total < EQUILIBRIO_MINIMO) return { ok: false, falta: 'academico' }
  if (personal / total < EQUILIBRIO_MINIMO) return { ok: false, falta: 'personal' }
  return { ok: true, falta: null }
}

export interface EstadoMascota {
  /** Posición de la etapa actual (0 = la primera). */
  indice: number
  etapas: number
  nombreEtapa: string
  /** XP total en que empezó esta etapa y en que empieza la siguiente (null si ya es la última). */
  xpInicio: number
  xpSiguiente: number | null
  /** 0 a 1: cuánto falta para la siguiente etapa. */
  progreso: number
  /** Si tienes el XP pero te falta equilibrio entre áreas, cuál lado está corto. */
  bloqueo: 'academico' | 'personal' | null
}

/** En qué etapa está una mascota con este XP. La etapa 3 en adelante pide equilibrio entre estudios y vida personal. */
export function estadoDe(mascota: Pick<Mascota, 'etapas'>, xp: XP, semanas = 16): EstadoMascota {
  const total = totalXP(xp)
  const n = mascota.etapas.length
  const umbrales = umbralesDe(n, semanas)
  let porXP = 0
  umbrales.forEach((u, i) => {
    if (total >= u) porXP = i
  })
  const eq = equilibrio(xp)
  const bloqueado = porXP >= 2 && !eq.ok
  const indice = bloqueado ? 1 : porXP
  const siguiente = indice < n - 1 ? umbrales[indice + 1] : null
  const progreso = siguiente === null ? 1 : bloqueado ? 1 : Math.min(1, (total - umbrales[indice]) / (siguiente - umbrales[indice]))
  return { indice, etapas: n, nombreEtapa: mascota.etapas[indice], xpInicio: umbrales[indice], xpSiguiente: siguiente, progreso, bloqueo: bloqueado ? eq.falta : null }
}

/** ¿Hay que celebrar una evolución? Solo si la etapa subió desde la última vez que la viste. */
export const debeCelebrar = (vista: number | undefined, actual: number): boolean => vista !== undefined && actual > vista
