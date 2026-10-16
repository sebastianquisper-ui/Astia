import type { Clase, Curso, Datos, Habito, Mejora, PlanDia, ProgresoDia, Prioridad, SemanaTema, Tarea, TipoTarea } from '../dominio/tipos'
import { datosVacios, normalizarDatos } from './almacenamiento'
import type { TamanoLetra, ModoTema } from '../lib/tema'

// Importar y exportar respaldos en JSON.
// - v1: el archivo que descargabas en Astia v1 (Ajustes → Descargar respaldo):
//       {app:"astia", v:1, config, tasks, itin, prog, goals, feedback}
// - v2: el formato nuevo (todo `Datos` tal cual).
// Los ids de la v1 se CONSERVAN: así los eventos que ya creaste en Google Calendar
// (con "astia-id:task-<id>") siguen coincidiendo y no se duplican.

export interface AjustesImportados {
  nombre?: string
  modoTema?: ModoTema
  tamanoLetra?: TamanoLetra
}

export interface ResumenImportacion {
  cursos: number
  clases: number
  tareasPendientes: number
  tareasHechas: number
  semanas: number
  habitos: number
  rutinas: number
  diasDeProgreso: number
  mejoras: number
}

export type Importacion =
  | { ok: true; version: 1 | 2; datos: Datos; ajustes: AjustesImportados; resumen: ResumenImportacion; avisos: string[] }
  | { ok: false; error: string }

type Obj = Record<string, unknown>
const esObj = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x)
const arr = (x: unknown): unknown[] => (Array.isArray(x) ? x : [])
const txt = (x: unknown, def = ''): string => (typeof x === 'string' ? x : def)
const num = (x: unknown, def = 0): number => (typeof x === 'number' && Number.isFinite(x) ? x : def)
const FECHA = /^\d{4}-\d{2}-\d{2}$/

function hora(x: unknown): string | undefined {
  const m = /^(\d{1,2}):(\d{2})$/.exec(txt(x))
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : undefined
}

export function resumenDe(datos: Datos): ResumenImportacion {
  const vivos = <T extends { borradoEn?: number }>(l: T[]) => l.filter((x) => x.borradoEn === undefined)
  const tareas = vivos(datos.tareas)
  return {
    cursos: vivos(datos.cursos).length,
    clases: vivos(datos.clases).length,
    tareasPendientes: tareas.filter((t) => t.estado === 'pendiente').length,
    tareasHechas: tareas.filter((t) => t.estado === 'hecha').length,
    semanas: vivos(datos.semanas).length,
    habitos: vivos(datos.habitos).length,
    rutinas: vivos(datos.rutinas).length,
    diasDeProgreso: vivos(datos.progreso).length,
    mejoras: vivos(datos.mejoras).length,
  }
}

export function importarRespaldo(entrada: unknown, ahora: number): Importacion {
  if (!esObj(entrada) || entrada.app !== 'astia') return { ok: false, error: 'Ese archivo no es un respaldo de Astia.' }
  if (entrada.v === 2) {
    const datos = normalizarDatos(entrada.datos)
    return { ok: true, version: 2, datos, ajustes: {}, resumen: resumenDe(datos), avisos: [] }
  }
  if (entrada.v === 1) return importarV1(entrada, ahora)
  return { ok: false, error: 'Este respaldo es de una versión que Astia no conoce.' }
}

function importarV1(r: Obj, ahora: number): Importacion {
  const avisos: string[] = []
  const datos = datosVacios()
  const config = esObj(r.config) ? r.config : {}
  const tasks = esObj(r.tasks) ? r.tasks : {}
  const itin = esObj(r.itin) ? r.itin : {}
  const prog = esObj(r.prog) ? r.prog : {}
  const goals = esObj(r.goals) ? r.goals : {}
  const feedback = esObj(r.feedback) ? r.feedback : {}

  datos.perfil = {
    inicioCiclo: FECHA.test(txt(config.startDate)) ? txt(config.startDate) : '',
    semanasCiclo: Math.min(24, Math.max(4, num(config.totalWeeks, 16))),
    enfoqueMin: Math.min(90, Math.max(5, num(config.focusMin, 25))),
    descansoMin: Math.min(30, Math.max(1, num(config.breakMin, 5))),
    actualizadoEn: ahora,
  }

  // Cursos
  const cursos: Curso[] = []
  for (const c of arr(config.courses)) {
    if (!esObj(c) || !txt(c.id) || !txt(c.name)) continue
    cursos.push({ id: txt(c.id), nombre: txt(c.name), color: txt(c.color, '#7C8CFF'), actualizadoEn: ahora })
  }
  datos.cursos = cursos
  const idsCursos = new Set(cursos.map((c) => c.id))

  // Horario
  let clasesOmitidas = 0
  const clases: Clase[] = []
  for (const b of arr(config.schedule)) {
    if (!esObj(b) || !txt(b.id)) continue
    const inicio = hora(b.start)
    const fin = hora(b.end)
    const dia = num(b.day, -1)
    if (!idsCursos.has(txt(b.courseId)) || !inicio || !fin || dia < 0 || dia > 6) {
      clasesOmitidas++
      continue
    }
    clases.push({ id: txt(b.id), cursoId: txt(b.courseId), dia, inicio, fin, aula: txt(b.room), actualizadoEn: ahora })
  }
  datos.clases = clases
  if (clasesOmitidas) avisos.push(`${clasesOmitidas} clase${clasesOmitidas === 1 ? '' : 's'} se omitió${clasesOmitidas === 1 ? '' : 'eron'} por datos incompletos o de un curso que ya no existe.`)

  // Tareas
  let tareasOmitidas = 0
  let sinCurso = 0
  const tareas: Tarea[] = []
  for (const t of arr(tasks.items)) {
    if (!esObj(t) || !txt(t.id) || !txt(t.title) || !FECHA.test(txt(t.due))) {
      tareasOmitidas++
      continue
    }
    const tipo: TipoTarea = t.type === 'examen' || t.type === 'estudio' ? t.type : 'tarea'
    const prioridad: Prioridad = t.priority === 'alta' || t.priority === 'baja' ? t.priority : 'media'
    const hecha = t.status === 'done'
    const cursoId = idsCursos.has(txt(t.courseId)) ? txt(t.courseId) : null
    if (!cursoId && txt(t.courseId)) sinCurso++
    const tarea: Tarea = {
      id: txt(t.id),
      titulo: txt(t.title).slice(0, 200),
      area: 'universidad',
      cursoId,
      tipo,
      fecha: txt(t.due),
      prioridad,
      pideEvidencia: !!t.needsEvidence,
      pasos: arr(t.steps)
        .filter(esObj)
        .map((p) => ({ texto: txt(p.t), hecho: !!p.done }))
        .filter((p) => p.texto),
      estado: hecha ? 'hecha' : 'pendiente',
      actualizadoEn: ahora,
    }
    const h = hora(t.time)
    if (h) tarea.hora = h
    if (txt(t.method)) tarea.metodo = txt(t.method)
    if (hecha) tarea.hechaEn = new Date(num(t.doneAt, ahora)).toISOString()
    tareas.push(tarea)
  }
  datos.tareas = tareas
  if (tareasOmitidas) avisos.push(`${tareasOmitidas} tarea${tareasOmitidas === 1 ? '' : 's'} se omitió${tareasOmitidas === 1 ? '' : 'eron'} por no tener título o fecha válida.`)
  if (sinCurso) avisos.push(`${sinCurso} tarea${sinCurso === 1 ? '' : 's'} quedó${sinCurso === 1 ? '' : 'aron'} sin curso porque su curso ya no existe.`)
  const idsTareas = new Set(tareas.map((t) => t.id))

  // Plan del día: "Tus 3 de hoy" elegidas a mano
  const planes: PlanDia[] = []
  if (esObj(tasks.plan)) {
    for (const [fecha, ids] of Object.entries(tasks.plan)) {
      if (!FECHA.test(fecha)) continue
      planes.push({ id: fecha, fecha, tareaIds: arr(ids).filter((i): i is string => typeof i === 'string' && idsTareas.has(i)).slice(0, 3), actualizadoEn: ahora })
    }
  }
  datos.planes = planes

  // Tema y notas por semana (clave v1: "<idCurso>_<número>")
  const semanas: SemanaTema[] = []
  if (esObj(itin.w)) {
    for (const [clave, v] of Object.entries(itin.w)) {
      const corte = clave.lastIndexOf('_')
      const cursoId = clave.slice(0, corte)
      const semana = parseInt(clave.slice(corte + 1), 10)
      if (corte < 1 || !Number.isFinite(semana) || !idsCursos.has(cursoId) || !esObj(v)) continue
      const tema = txt(v.topic).trim()
      const notas = txt(v.notes).trim()
      if (!tema && !notas) continue
      semanas.push({ id: clave, cursoId, semana, tema, notas, actualizadoEn: ahora })
    }
  }
  datos.semanas = semanas

  // Progreso diario
  const progreso: ProgresoDia[] = []
  if (esObj(prog.days)) {
    for (const [fecha, d] of Object.entries(prog.days)) {
      if (!FECHA.test(fecha) || !esObj(d)) continue
      progreso.push({ id: fecha, fecha, hechas: num(d.done), enfoque: num(d.focus), descanso: num(d.rest), pomodoros: num(d.pomos), actualizadoEn: ahora })
    }
  }
  datos.progreso = progreso

  // Metas personales de la v1: ahora son hábitos de todos los días (los puedes cambiar después)
  const habitos: Habito[] = []
  for (const g of arr(goals.items)) {
    if (!esObj(g) || !txt(g.id) || !txt(g.name)) continue
    const registro = esObj(g.log) ? Object.keys(g.log).filter((f) => FECHA.test(f) && g.log && (g.log as Obj)[f]).sort() : []
    habitos.push({ id: txt(g.id), nombre: txt(g.name), categoria: 'Otro', color: '#4FD1A5', frecuencia: { tipo: 'diaria' }, registro, actualizadoEn: ahora })
  }
  datos.habitos = habitos

  // "Pedir mejora"
  const mejoras: Mejora[] = []
  for (const m of arr(feedback.items)) {
    if (!esObj(m) || !txt(m.id) || !txt(m.text)) continue
    mejoras.push({ id: txt(m.id), texto: txt(m.text), creadaEn: num(m.at, ahora), hecha: !!m.done, actualizadoEn: ahora })
  }
  datos.mejoras = mejoras

  // Ajustes de vista que sí se pueden traer
  const ajustes: AjustesImportados = {}
  if (txt(config.name).trim()) ajustes.nombre = txt(config.name).trim()
  if (config.theme === 'hora') ajustes.modoTema = 'hora'
  else if (config.theme === 'light') ajustes.modoTema = 'claro'
  else if (config.theme === 'dark') ajustes.modoTema = 'oscuro'
  const escala = num(config.fontScale, 1)
  ajustes.tamanoLetra = escala >= 1.25 ? 'muy-grande' : escala >= 1.1 ? 'grande' : 'normal'

  return { ok: true, version: 1, datos, ajustes, resumen: resumenDe(datos), avisos }
}

/** Texto JSON del respaldo v2 (todo lo que hay en la app). */
export function crearRespaldo(datos: Datos, ahora: Date = new Date()): string {
  return JSON.stringify({ app: 'astia', v: 2, creadoEn: ahora.toISOString(), datos }, null, 1)
}
