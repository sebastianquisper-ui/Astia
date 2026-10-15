import type { Clase, Curso, Datos, Meta, Mejora, PlanDia, ProgresoDia, Registro, SemanaTema, Tarea } from '../dominio/tipos'
import { ymd } from '../lib/fechas'

// Funciones puras para manejar los datos. Todas devuelven objetos NUEVOS (nunca modifican
// los anteriores): así React detecta los cambios y no se repite el error 1 de la v1
// (modificar datos "congelados").

export const datosVacios = (): Datos => ({
  perfil: { inicioCiclo: '', semanasCiclo: 16, enfoqueMin: 25, descansoMin: 5, actualizadoEn: 0 },
  cursos: [],
  clases: [],
  tareas: [],
  semanas: [],
  metas: [],
  mejoras: [],
  progreso: [],
  planes: [],
})

let contador = 0
/** Id nuevo, único aunque se creen varios en el mismo milisegundo. */
export function crearId(): string {
  const aleatorio = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().slice(0, 12) : Math.random().toString(36).slice(2, 12)
  return aleatorio + (contador++ % 36).toString(36)
}

/** Crea o actualiza un registro. Guardar un registro borrado lo "revive". */
export function guardarRegistro<T extends Registro>(lista: T[], item: T, ahora: number): T[] {
  const nuevo: T = { ...item, actualizadoEn: ahora }
  delete nuevo.borradoEn
  const i = lista.findIndex((x) => x.id === item.id)
  return i < 0 ? [...lista, nuevo] : lista.map((x, j) => (j === i ? nuevo : x))
}

/** Borra dejando una lápida (no desaparece: la nube necesita saber que se borró). */
export function borrarRegistro<T extends Registro>(lista: T[], id: string, ahora: number): T[] {
  return lista.map((x) => (x.id === id ? { ...x, borradoEn: ahora, actualizadoEn: ahora } : x))
}

export const activos = <T extends Registro>(lista: T[]): T[] => lista.filter((x) => x.borradoEn === undefined)

/**
 * Une dos versiones de una lista: de cada registro gana la modificación MÁS NUEVA.
 * Una lectura atrasada de la nube nunca pisa un cambio reciente (error 2 de la v1).
 * Si empatan, se queda la local.
 */
export function fusionarLista<T extends Registro>(local: T[], remoto: T[]): T[] {
  const mapa = new Map(local.map((x) => [x.id, x]))
  for (const r of remoto) {
    const l = mapa.get(r.id)
    if (!l || r.actualizadoEn > l.actualizadoEn) mapa.set(r.id, r)
  }
  return [...mapa.values()]
}

export function fusionarDatos(local: Datos, remoto: Datos): Datos {
  return {
    perfil: remoto.perfil.actualizadoEn > local.perfil.actualizadoEn ? remoto.perfil : local.perfil,
    cursos: fusionarLista(local.cursos, remoto.cursos),
    clases: fusionarLista(local.clases, remoto.clases),
    tareas: fusionarLista(local.tareas, remoto.tareas),
    semanas: fusionarLista(local.semanas, remoto.semanas),
    metas: fusionarLista(local.metas, remoto.metas),
    mejoras: fusionarLista(local.mejoras, remoto.mejoras),
    progreso: fusionarLista(local.progreso, remoto.progreso),
    planes: fusionarLista(local.planes, remoto.planes),
  }
}

/** Borra un curso con todo lo que depende de él. Sus tareas se conservan, pero "sin curso". */
export function quitarCurso(datos: Datos, id: string, ahora: number): Datos {
  return {
    ...datos,
    cursos: borrarRegistro(datos.cursos, id, ahora),
    clases: datos.clases.map((c) => (c.cursoId === id && c.borradoEn === undefined ? { ...c, borradoEn: ahora, actualizadoEn: ahora } : c)),
    semanas: datos.semanas.map((s) => (s.cursoId === id && s.borradoEn === undefined ? { ...s, borradoEn: ahora, actualizadoEn: ahora } : s)),
    tareas: datos.tareas.map((t) => (t.cursoId === id ? { ...t, cursoId: null, actualizadoEn: ahora } : t)),
  }
}

/** Suma (o resta) tareas hechas en el progreso de un día. */
export function sumarHechas(progreso: ProgresoDia[], fecha: string, delta: number, ahora: number): ProgresoDia[] {
  const previo = progreso.find((p) => p.id === fecha)
  const base: ProgresoDia = previo ?? { id: fecha, fecha, hechas: 0, enfoque: 0, descanso: 0, pomodoros: 0, actualizadoEn: ahora }
  return guardarRegistro(progreso, { ...base, hechas: Math.max(0, base.hechas + delta) }, ahora)
}

/** Marca o reabre una tarea y ajusta el progreso del día, todo de una vez. */
export function alternarTarea(datos: Datos, id: string, ahora: Date): Datos {
  const t = datos.tareas.find((x) => x.id === id && x.borradoEn === undefined)
  if (!t) return datos
  const ms = ahora.getTime()
  if (t.estado === 'hecha') {
    const dia = t.hechaEn ? ymd(new Date(t.hechaEn)) : ymd(ahora)
    const abierta: Tarea = { ...t, estado: 'pendiente' }
    delete abierta.hechaEn
    return { ...datos, tareas: guardarRegistro(datos.tareas, abierta, ms), progreso: sumarHechas(datos.progreso, dia, -1, ms) }
  }
  const hecha: Tarea = { ...t, estado: 'hecha', hechaEn: ahora.toISOString() }
  return { ...datos, tareas: guardarRegistro(datos.tareas, hecha, ms), progreso: sumarHechas(datos.progreso, ymd(ahora), 1, ms) }
}

// ---------- lectura segura (por si el guardado está dañado) ----------

const esObjeto = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)

function lista<T extends Registro>(x: unknown): T[] {
  if (!Array.isArray(x)) return []
  return x.filter((e): e is T => esObjeto(e) && typeof e.id === 'string' && typeof e.actualizadoEn === 'number')
}

/** Convierte cualquier cosa leída del teléfono o de un respaldo en `Datos` válidos. */
export function normalizarDatos(bruto: unknown): Datos {
  const base = datosVacios()
  if (!esObjeto(bruto)) return base
  const p = esObjeto(bruto.perfil) ? bruto.perfil : {}
  const num = (v: unknown, def: number) => (typeof v === 'number' && Number.isFinite(v) ? v : def)
  return {
    perfil: {
      inicioCiclo: typeof p.inicioCiclo === 'string' ? p.inicioCiclo : base.perfil.inicioCiclo,
      semanasCiclo: Math.min(24, Math.max(4, num(p.semanasCiclo, 16))),
      enfoqueMin: Math.min(90, Math.max(5, num(p.enfoqueMin, 25))),
      descansoMin: Math.min(30, Math.max(1, num(p.descansoMin, 5))),
      actualizadoEn: num(p.actualizadoEn, 0),
    },
    cursos: lista<Curso>(bruto.cursos),
    clases: lista<Clase>(bruto.clases),
    tareas: lista<Tarea>(bruto.tareas).map((t) => ({ ...t, pasos: Array.isArray(t.pasos) ? t.pasos : [] })),
    semanas: lista<SemanaTema>(bruto.semanas),
    metas: lista<Meta>(bruto.metas).map((m) => ({ ...m, registro: Array.isArray(m.registro) ? m.registro : [] })),
    mejoras: lista<Mejora>(bruto.mejoras),
    progreso: lista<ProgresoDia>(bruto.progreso),
    planes: lista<PlanDia>(bruto.planes).map((p2) => ({ ...p2, tareaIds: Array.isArray(p2.tareaIds) ? p2.tareaIds : [] })),
  }
}
