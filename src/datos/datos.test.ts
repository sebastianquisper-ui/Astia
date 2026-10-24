import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { Clase, Curso, Tarea } from '../dominio/tipos'
import { planDeHoy } from '../lib/plan'
import { activos, alternarTarea, borrarRegistro, crearId, datosVacios, fusionarDatos, fusionarLista, guardarRegistro, normalizarDatos, quitarCurso } from './almacenamiento'
import { crearRespaldo, importarRespaldo } from './respaldo'

const curso = (id: string, t = 1): Curso => ({ id, nombre: id, color: '#fff', actualizadoEn: t })
const tarea = (id: string, extra: Partial<Tarea> = {}): Tarea => ({
  id, titulo: id, area: 'universidad', cursoId: null, tipo: 'tarea', fecha: '2026-10-20', prioridad: 'media',
  pideEvidencia: false, pasos: [], estado: 'pendiente', actualizadoEn: 1, ...extra,
})

describe('guardar y borrar sin modificar lo anterior', () => {
  it('guardarRegistro crea y actualiza devolviendo listas nuevas', () => {
    const a = [curso('a', 1)]
    Object.freeze(a)
    Object.freeze(a[0]) // como los datos "congelados" que rompían la v1
    const b = guardarRegistro(a, { ...a[0], nombre: 'Nuevo' }, 50)
    expect(b).not.toBe(a)
    expect(b[0].nombre).toBe('Nuevo')
    expect(b[0].actualizadoEn).toBe(50)
    expect(a[0].nombre).toBe('a')
    expect(guardarRegistro(b, curso('z'), 60)).toHaveLength(2)
  })
  it('borrar deja lápida y activos() la oculta', () => {
    const l = borrarRegistro([curso('a'), curso('b')], 'a', 99)
    expect(l).toHaveLength(2)
    expect(l[0].borradoEn).toBe(99)
    expect(activos(l).map((c) => c.id)).toEqual(['b'])
  })
  it('guardar un registro borrado lo revive', () => {
    const borrado = borrarRegistro([curso('a')], 'a', 10)
    const vivo = guardarRegistro(borrado, borrado[0], 20)
    expect(vivo[0].borradoEn).toBeUndefined()
  })
  it('crearId no repite aunque se llame muchas veces seguidas', () => {
    const ids = new Set(Array.from({ length: 500 }, () => crearId()))
    expect(ids.size).toBe(500)
  })
})

describe('fusionar (una versión vieja nunca pisa una nueva)', () => {
  it('gana la modificación más nueva', () => {
    const local = [curso('a', 200)]
    const remotoViejo = [{ ...curso('a', 100), nombre: 'viejo' }]
    expect(fusionarLista(local, remotoViejo)[0].nombre).toBe('a')
    const remotoNuevo = [{ ...curso('a', 300), nombre: 'nuevo' }]
    expect(fusionarLista(local, remotoNuevo)[0].nombre).toBe('nuevo')
  })
  it('conserva lo que solo existe de un lado', () => {
    const r = fusionarLista([curso('a')], [curso('b')])
    expect(r.map((x) => x.id).sort()).toEqual(['a', 'b'])
  })
  it('un borrado más nuevo gana a una edición vieja', () => {
    const local = [borrarRegistro([curso('a', 1)], 'a', 500)[0]]
    const remoto = [{ ...curso('a', 400), nombre: 'editado' }]
    expect(fusionarLista(local, remoto)[0].borradoEn).toBe(500)
  })
  it('fusionarDatos aplica la regla a cada colección y al perfil', () => {
    const a = datosVacios()
    a.perfil = { ...a.perfil, semanasCiclo: 12, actualizadoEn: 100 }
    const b = datosVacios()
    b.perfil = { ...b.perfil, semanasCiclo: 20, actualizadoEn: 50 }
    b.tareas = [tarea('t')]
    const f = fusionarDatos(a, b)
    expect(f.perfil.semanasCiclo).toBe(12)
    expect(f.tareas).toHaveLength(1)
  })
})

describe('borrar un curso', () => {
  it('borra sus clases y semanas, y deja sus tareas sin curso', () => {
    const d = datosVacios()
    d.cursos = [curso('c1')]
    d.clases = [{ id: 'k', cursoId: 'c1', dia: 0, inicio: '08:00', fin: '10:00', aula: '', actualizadoEn: 1 } as Clase]
    d.semanas = [{ id: 'c1_1', cursoId: 'c1', semana: 1, tema: 'x', notas: '', actualizadoEn: 1 }]
    d.tareas = [tarea('t1', { cursoId: 'c1' })]
    const r = quitarCurso(d, 'c1', 77)
    expect(activos(r.cursos)).toHaveLength(0)
    expect(activos(r.clases)).toHaveLength(0)
    expect(activos(r.semanas)).toHaveLength(0)
    expect(activos(r.tareas)).toHaveLength(1)
    expect(r.tareas[0].cursoId).toBeNull()
  })
})

describe('marcar tareas hechas', () => {
  const ahora = new Date(2026, 9, 15, 10, 0)
  it('marca hecha y suma al progreso del día; al reabrir lo resta', () => {
    const d = { ...datosVacios(), tareas: [tarea('t1')] }
    const evidencia = { foto: true, fecha: ahora.toISOString() }
    const hecha = alternarTarea(d, 't1', ahora, evidencia)
    expect(hecha.tareas[0].estado).toBe('hecha')
    expect(hecha.tareas[0].evidencia).toEqual(evidencia)
    expect(hecha.tareas[0].hechaEn).toBeDefined()
    expect(hecha.progreso.find((p) => p.fecha === '2026-10-15')?.hechas).toBe(1)
    const reabierta = alternarTarea(hecha, 't1', ahora)
    expect(reabierta.tareas[0].estado).toBe('pendiente')
    expect(reabierta.tareas[0].hechaEn).toBeUndefined()
    expect(reabierta.tareas[0].evidencia).toBeUndefined() // al reabrir, la evidencia se descarta
    expect(reabierta.progreso.find((p) => p.fecha === '2026-10-15')?.hechas).toBe(0)
  })
  it('sin evidencia no se marca hecha (antiprocrastinación)', () => {
    const d = { ...datosVacios(), tareas: [tarea('t1')] }
    expect(alternarTarea(d, 't1', ahora)).toBe(d)
    expect(alternarTarea(d, 't1', ahora, { foto: false, enlace: '  ', fecha: ahora.toISOString() })).toBe(d)
    expect(alternarTarea(d, 't1', ahora, { foto: false, enlace: 'https://classroom.google.com/c/1', fecha: ahora.toISOString() }).tareas[0].estado).toBe('hecha')
  })
  it('una tarea inexistente no cambia nada', () => {
    const d = datosVacios()
    expect(alternarTarea(d, 'nada', ahora)).toBe(d)
  })
})

describe('lectura segura de datos dañados', () => {
  it('basura devuelve datos vacíos', () => {
    expect(normalizarDatos('hola').cursos).toEqual([])
    expect(normalizarDatos(null).tareas).toEqual([])
  })
  it('descarta elementos sin id y arregla campos faltantes', () => {
    const d = normalizarDatos({ cursos: [{ nombre: 'sin id' }, curso('ok')], tareas: [{ ...tarea('t'), pasos: 'roto' }] })
    expect(d.cursos).toHaveLength(1)
    expect(d.tareas[0].pasos).toEqual([])
  })
  it('limita los valores del perfil a rangos razonables', () => {
    expect(normalizarDatos({ perfil: { semanasCiclo: 999, enfoqueMin: 1, descansoMin: 500 } }).perfil).toMatchObject({ semanasCiclo: 24, enfoqueMin: 5, descansoMin: 30 })
  })
})

describe('importar el respaldo de la v1', () => {
  const fixture = JSON.parse(readFileSync(resolve(process.cwd(), 'e2e/fixtures/respaldo-v1.json'), 'utf8'))
  const r = importarRespaldo(fixture, 1000)
  if (!r.ok) throw new Error(r.error)

  it('trae cursos, horario y tareas válidos', () => {
    expect(r.resumen).toMatchObject({ cursos: 3, clases: 3, tareasPendientes: 4, tareasHechas: 1, semanas: 2, habitos: 1, rutinas: 0, diasDeProgreso: 2, mejoras: 1 })
  })
  it('conserva los ids de la v1 (para no duplicar eventos de Google Calendar)', () => {
    expect(r.datos.tareas.map((t) => t.id)).toContain('0yh6vke4')
    expect(r.datos.cursos.map((c) => c.id)).toContain('kcalc01a')
  })
  it('convierte los campos de una tarea', () => {
    const t = r.datos.tareas.find((x) => x.id === '0yh6vke4')!
    expect(t).toMatchObject({ titulo: 'GUÍA 4 DE CÁLCULO II', cursoId: 'kcalc01a', tipo: 'tarea', fecha: '2026-10-16', hora: '23:59', prioridad: 'alta', pideEvidencia: true, estado: 'pendiente', area: 'universidad' })
    expect(t.pasos).toEqual([{ texto: 'Resolver los ejercicios 1 al 5', hecho: true }, { texto: 'Pasar en limpio', hecho: false }])
  })
  it('las hechas conservan cuándo se hicieron; la hora vacía no se guarda', () => {
    const h = r.datos.tareas.find((x) => x.id === 't-hecha')!
    expect(h.estado).toBe('hecha')
    expect(h.hechaEn).toBe(new Date(1760100000000).toISOString())
    expect(h.hora).toBeUndefined()
    expect(r.datos.tareas.find((x) => x.id === 't-estudio')?.metodo).toBe('espaciada')
  })
  it('omite lo inválido y lo avisa', () => {
    expect(r.datos.tareas.map((t) => t.id)).not.toContain('t-rota')
    expect(r.datos.clases.map((c) => c.id)).not.toContain('b4')
    expect(r.datos.tareas.find((t) => t.id === 't-huerfana')?.cursoId).toBeNull()
    expect(r.avisos.join(' ')).toMatch(/omitió/)
  })
  it('trae el plan del día sin ids inexistentes, semanas con contenido, metas y progreso', () => {
    expect(r.datos.planes[0].tareaIds).toEqual(['0yh6vke4', 't-examen1'])
    expect(r.datos.semanas.map((s) => s.id).sort()).toEqual(['kcalc01a_7', 'kfis03cc_8'])
    expect(r.datos.habitos[0]).toMatchObject({ nombre: '30 minutos de inglés', categoria: 'Otro', frecuencia: { tipo: 'diaria' }, registro: ['2026-10-13', '2026-10-14'] })
    expect(r.datos.progreso.find((p) => p.fecha === '2026-10-13')).toMatchObject({ hechas: 2, enfoque: 55, descanso: 10, pomodoros: 2 })
  })
  it('trae el perfil y los ajustes de vista', () => {
    expect(r.datos.perfil).toMatchObject({ inicioCiclo: '2026-08-24', semanasCiclo: 16, enfoqueMin: 25, descansoMin: 5 })
    expect(r.ajustes).toEqual({ nombre: 'Sebastián', modoTema: 'hora', tamanoLetra: 'grande' })
  })
  it('rechaza archivos que no son de Astia', () => {
    expect(importarRespaldo({ app: 'otra' }, 1)).toMatchObject({ ok: false })
    expect(importarRespaldo('texto', 1)).toMatchObject({ ok: false })
    expect(importarRespaldo({ app: 'astia', v: 99 }, 1)).toMatchObject({ ok: false })
  })
  it('exportar y volver a importar (v2) no pierde nada', () => {
    const texto = crearRespaldo(r.datos)
    const otra = importarRespaldo(JSON.parse(texto), 5)
    if (!otra.ok) throw new Error(otra.error)
    expect(otra.version).toBe(2)
    expect(otra.datos).toEqual(r.datos)
  })
})

describe('Tus 3 de hoy', () => {
  const ahora = new Date(2026, 9, 15, 12, 0)
  const t1 = tarea('t1', { fecha: '2026-10-14' })
  const t2 = tarea('t2', { fecha: '2026-10-16' })
  const t3 = tarea('t3', { fecha: '2026-10-17' })
  const t4 = tarea('t4', { fecha: '2026-10-30' })
  it('sin plan manual, las 3 más urgentes', () => {
    expect(planDeHoy([t4, t3, t2, t1], [], 'todo', ahora).map((t) => t.id)).toEqual(['t1', 't2', 't3'])
  })
  it('lo que cumples hoy se queda en la lista, sin reordenar', () => {
    const hechaHoy = { ...t1, estado: 'hecha' as const, hechaEn: ahora.toISOString() }
    expect(planDeHoy([t4, t3, t2, hechaHoy], [], 'todo', ahora).map((t) => t.id)).toEqual(['t1', 't2', 't3'])
  })
  it('lo que cumpliste otro día ya no aparece', () => {
    const vieja = { ...t1, estado: 'hecha' as const, hechaEn: new Date(2026, 9, 10).toISOString() }
    expect(planDeHoy([vieja, t2, t3, t4], [], 'todo', ahora).map((t) => t.id)).toEqual(['t2', 't3', 't4'])
  })
  it('el plan manual manda sobre la urgencia', () => {
    const plan = [{ id: '2026-10-15', fecha: '2026-10-15', tareaIds: ['t4', 't2'], actualizadoEn: 1 }]
    expect(planDeHoy([t1, t2, t3, t4], plan, 'todo', ahora).map((t) => t.id)).toEqual(['t4', 't2'])
  })
  it('filtra por área', () => {
    const p = tarea('p', { area: 'personal', fecha: '2026-10-16' })
    expect(planDeHoy([t1, p], [], 'personal', ahora).map((t) => t.id)).toEqual(['p'])
  })
})
