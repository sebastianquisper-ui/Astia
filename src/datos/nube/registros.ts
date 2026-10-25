import type { Datos, Perfil, Registro } from '../../dominio/tipos'

// Qué se guarda en Firestore y cómo. Las listas de campos son las MISMAS que valida firestore.rules:
// un campo que no esté aquí no se sube (y un campo `undefined` nunca llega, porque Firestore lo rechaza).

export const COLECCIONES = ['cursos', 'clases', 'tareas', 'semanas', 'habitos', 'rutinas', 'mejoras', 'progreso', 'planes', 'recordatorios', 'apuntes'] as const
export type Coleccion = (typeof COLECCIONES)[number]

const BASE = ['id', 'actualizadoEn', 'borradoEn']
export const CAMPOS: Record<Coleccion, string[]> = {
  cursos: [...BASE, 'nombre', 'color'],
  clases: [...BASE, 'cursoId', 'dia', 'inicio', 'fin', 'aula'],
  tareas: [...BASE, 'titulo', 'area', 'cursoId', 'categoria', 'tipo', 'fecha', 'hora', 'prioridad', 'pideEvidencia', 'metodo', 'pasos', 'estado', 'hechaEn', 'evidencia'],
  semanas: [...BASE, 'cursoId', 'semana', 'tema', 'notas'],
  habitos: [...BASE, 'nombre', 'categoria', 'color', 'frecuencia', 'minimo', 'registro'],
  rutinas: [...BASE, 'nombre', 'categoria', 'momento', 'dias', 'pasos', 'registro'],
  mejoras: [...BASE, 'texto', 'creadaEn', 'hecha'],
  progreso: [...BASE, 'fecha', 'hechas', 'enfoque', 'descanso', 'pomodoros'],
  planes: [...BASE, 'fecha', 'tareaIds'],
  recordatorios: [...BASE, 'texto', 'cuando', 'avisado', 'calendarioId'],
  apuntes: [...BASE, 'texto', 'fecha', 'hora', 'tipo'],
}
const CAMPOS_PERFIL = ['inicioCiclo', 'semanasCiclo', 'semanasEspeciales', 'enfoqueMin', 'descansoMin', 'actualizadoEn']

/** Quita lo que Firestore no acepta (`undefined`, también dentro de listas y objetos). */
function sinIndefinidos(v: unknown): unknown {
  if (Array.isArray(v)) return v.map((x) => (x === undefined ? null : sinIndefinidos(x)))
  if (v && typeof v === 'object') {
    const salida: Record<string, unknown> = {}
    for (const [k, x] of Object.entries(v)) if (x !== undefined) salida[k] = sinIndefinidos(x)
    return salida
  }
  return v
}

export function aDocumento(col: Coleccion, registro: Registro): Record<string, unknown> {
  const doc: Record<string, unknown> = {}
  for (const campo of CAMPOS[col]) {
    const v = (registro as unknown as Record<string, unknown>)[campo]
    if (v !== undefined) doc[campo] = sinIndefinidos(v)
  }
  return doc
}

export function perfilADocumento(p: Perfil): Record<string, unknown> {
  const doc: Record<string, unknown> = {}
  for (const campo of CAMPOS_PERFIL) {
    const v = (p as unknown as Record<string, unknown>)[campo]
    if (v !== undefined) doc[campo] = sinIndefinidos(v)
  }
  return doc
}

export const clave = (col: Coleccion | 'perfil', id = ''): string => `${col}/${id}`

export interface CambioPendiente {
  col: Coleccion
  registro: Registro
}

/** Lo que cambió desde la última vez que Firestore lo confirmó (`sincronizado`: clave → actualizadoEn). */
export function cambiosPendientes(datos: Datos, sincronizado: Map<string, number>): { registros: CambioPendiente[]; perfil: boolean } {
  const registros: CambioPendiente[] = []
  for (const col of COLECCIONES) {
    for (const r of datos[col] as Registro[]) {
      if ((sincronizado.get(clave(col, r.id)) ?? -1) < r.actualizadoEn) registros.push({ col, registro: r })
    }
  }
  const perfil = datos.perfil.actualizadoEn > 0 && (sincronizado.get(clave('perfil')) ?? -1) < datos.perfil.actualizadoEn
  return { registros, perfil }
}

/**
 * Cuando traes un respaldo, REEMPLAZA lo que había: lo nuevo gana a lo que hay en la nube y lo que no viene en el respaldo
 * se marca como borrado (si no, la nube lo volvería a traer).
 */
export function reemplazarDatos(actual: Datos, nuevo: Datos, ahora: number): Datos {
  const salida = { ...nuevo, perfil: { ...nuevo.perfil, actualizadoEn: ahora } } as Datos
  for (const col of COLECCIONES) {
    const nuevos = (nuevo[col] as Registro[]).map((r) => {
      const { borradoEn: _viejo, ...resto } = r
      return { ...resto, actualizadoEn: ahora }
    })
    const ids = new Set(nuevos.map((r) => r.id))
    const borrados = (actual[col] as Registro[]).filter((r) => !ids.has(r.id)).map((r) => ({ ...r, borradoEn: ahora, actualizadoEn: ahora }))
    ;(salida as unknown as Record<string, Registro[]>)[col] = [...nuevos, ...borrados]
  }
  return salida
}
