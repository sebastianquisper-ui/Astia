import type { Clase, Curso, Datos, Meta, Mejora, PlanDia, ProgresoDia, SemanaTema, Tarea } from '../dominio/tipos'
import { datosVacios } from './almacenamiento'

// Traduce entre los datos de la app (camelCase) y las filas de las tablas de Supabase
// (snake_case). El esquema está en supabase/migrations. La sincronización (parte 2b)
// usa estas funciones; `user_id` lo pone la base de datos sola (auth.uid()).

export type Fila = Record<string, unknown>

export interface Filas {
  perfiles: Fila[]
  cursos: Fila[]
  clases: Fila[]
  tareas: Fila[]
  semanas: Fila[]
  metas: Fila[]
  mejoras: Fila[]
  progreso_diario: Fila[]
  planes_dia: Fila[]
}

/** Quita los campos sin valor (la base de datos pone sus valores por defecto). */
const limpia = (f: Fila): Fila => Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined))

export function aFilas(d: Datos): Filas {
  return {
    perfiles: [
      limpia({
        inicio_ciclo: d.perfil.inicioCiclo || null,
        semanas_ciclo: d.perfil.semanasCiclo,
        enfoque_min: d.perfil.enfoqueMin,
        descanso_min: d.perfil.descansoMin,
        actualizado_en: d.perfil.actualizadoEn,
      }),
    ],
    cursos: d.cursos.map((c) => limpia({ id: c.id, nombre: c.nombre, color: c.color, actualizado_en: c.actualizadoEn, borrado_en: c.borradoEn ?? null })),
    clases: d.clases.map((c) =>
      limpia({ id: c.id, curso_id: c.cursoId, dia: c.dia, inicio: c.inicio, fin: c.fin, aula: c.aula, actualizado_en: c.actualizadoEn, borrado_en: c.borradoEn ?? null }),
    ),
    tareas: d.tareas.map((t) =>
      limpia({
        id: t.id,
        titulo: t.titulo,
        area: t.area,
        curso_id: t.cursoId,
        categoria: t.categoria ?? null,
        tipo: t.tipo,
        fecha: t.fecha,
        hora: t.hora ?? null,
        prioridad: t.prioridad,
        pide_evidencia: t.pideEvidencia,
        metodo: t.metodo ?? null,
        pasos: t.pasos,
        estado: t.estado,
        hecha_en: t.hechaEn ?? null,
        actualizado_en: t.actualizadoEn,
        borrado_en: t.borradoEn ?? null,
      }),
    ),
    semanas: d.semanas.map((s) =>
      limpia({ id: s.id, curso_id: s.cursoId, semana: s.semana, tema: s.tema, notas: s.notas, actualizado_en: s.actualizadoEn, borrado_en: s.borradoEn ?? null }),
    ),
    metas: d.metas.map((m) => limpia({ id: m.id, nombre: m.nombre, registro: m.registro, actualizado_en: m.actualizadoEn, borrado_en: m.borradoEn ?? null })),
    mejoras: d.mejoras.map((m) =>
      limpia({ id: m.id, texto: m.texto, creada_en: m.creadaEn, hecha: m.hecha, actualizado_en: m.actualizadoEn, borrado_en: m.borradoEn ?? null }),
    ),
    progreso_diario: d.progreso.map((p) =>
      limpia({ id: p.id, fecha: p.fecha, hechas: p.hechas, enfoque: p.enfoque, descanso: p.descanso, pomodoros: p.pomodoros, actualizado_en: p.actualizadoEn, borrado_en: p.borradoEn ?? null }),
    ),
    planes_dia: d.planes.map((p) => limpia({ id: p.id, fecha: p.fecha, tarea_ids: p.tareaIds, actualizado_en: p.actualizadoEn, borrado_en: p.borradoEn ?? null })),
  }
}

const num = (v: unknown): number => (typeof v === 'string' ? Number(v) : typeof v === 'bigint' ? Number(v) : (v as number))
const opt = <T>(v: T | null | undefined): T | undefined => (v === null || v === undefined ? undefined : v)
/** La nube devuelve las fechas como "AAAA-MM-DD" (a veces como Date): siempre texto. */
const dia = (v: unknown): string => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10))

function conBorrado<T extends { borradoEn?: number }>(obj: T, f: Fila): T {
  if (f.borrado_en !== null && f.borrado_en !== undefined) obj.borradoEn = num(f.borrado_en)
  return obj
}

export function deFilas(f: Partial<Filas>): Datos {
  const d = datosVacios()
  const p = f.perfiles?.[0]
  if (p) {
    d.perfil = {
      inicioCiclo: p.inicio_ciclo ? dia(p.inicio_ciclo) : '',
      semanasCiclo: num(p.semanas_ciclo),
      enfoqueMin: num(p.enfoque_min),
      descansoMin: num(p.descanso_min),
      actualizadoEn: num(p.actualizado_en),
    }
  }
  d.cursos = (f.cursos ?? []).map((r) => conBorrado<Curso>({ id: String(r.id), nombre: String(r.nombre), color: String(r.color), actualizadoEn: num(r.actualizado_en) }, r))
  d.clases = (f.clases ?? []).map((r) =>
    conBorrado<Clase>({ id: String(r.id), cursoId: String(r.curso_id), dia: num(r.dia), inicio: String(r.inicio), fin: String(r.fin), aula: String(r.aula ?? ''), actualizadoEn: num(r.actualizado_en) }, r),
  )
  d.tareas = (f.tareas ?? []).map((r) => {
    const t: Tarea = {
      id: String(r.id),
      titulo: String(r.titulo),
      area: r.area === 'personal' ? 'personal' : 'universidad',
      cursoId: opt(r.curso_id as string | null) ?? null,
      tipo: r.tipo === 'examen' || r.tipo === 'estudio' ? r.tipo : 'tarea',
      fecha: dia(r.fecha),
      prioridad: r.prioridad === 'alta' || r.prioridad === 'baja' ? r.prioridad : 'media',
      pideEvidencia: !!r.pide_evidencia,
      pasos: Array.isArray(r.pasos) ? (r.pasos as Tarea['pasos']) : [],
      estado: r.estado === 'hecha' ? 'hecha' : 'pendiente',
      actualizadoEn: num(r.actualizado_en),
    }
    const categoria = opt(r.categoria as string | null)
    const hora = opt(r.hora as string | null)
    const metodo = opt(r.metodo as string | null)
    if (categoria !== undefined) t.categoria = categoria
    if (hora !== undefined) t.hora = hora
    if (metodo !== undefined) t.metodo = metodo
    if (r.hecha_en) t.hechaEn = new Date(r.hecha_en as string | Date).toISOString()
    return conBorrado(t, r)
  })
  d.semanas = (f.semanas ?? []).map((r) =>
    conBorrado<SemanaTema>({ id: String(r.id), cursoId: String(r.curso_id), semana: num(r.semana), tema: String(r.tema ?? ''), notas: String(r.notas ?? ''), actualizadoEn: num(r.actualizado_en) }, r),
  )
  d.metas = (f.metas ?? []).map((r) => conBorrado<Meta>({ id: String(r.id), nombre: String(r.nombre), registro: Array.isArray(r.registro) ? (r.registro as string[]).map(dia) : [], actualizadoEn: num(r.actualizado_en) }, r))
  d.mejoras = (f.mejoras ?? []).map((r) =>
    conBorrado<Mejora>({ id: String(r.id), texto: String(r.texto), creadaEn: num(r.creada_en), hecha: !!r.hecha, actualizadoEn: num(r.actualizado_en) }, r),
  )
  d.progreso = (f.progreso_diario ?? []).map((r) =>
    conBorrado<ProgresoDia>({ id: String(r.id), fecha: dia(r.fecha), hechas: num(r.hechas), enfoque: num(r.enfoque), descanso: num(r.descanso), pomodoros: num(r.pomodoros), actualizadoEn: num(r.actualizado_en) }, r),
  )
  d.planes = (f.planes_dia ?? []).map((r) =>
    conBorrado<PlanDia>({ id: String(r.id), fecha: dia(r.fecha), tareaIds: Array.isArray(r.tarea_ids) ? (r.tarea_ids as string[]) : [], actualizadoEn: num(r.actualizado_en) }, r),
  )
  return d
}
