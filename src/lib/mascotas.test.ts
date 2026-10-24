import { describe, expect, it } from 'vitest'
import type { Habito, ProgresoDia, Rutina, Tarea } from '../dominio/tipos'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { Rig } from '../mascotas/rig/Rig'
import { MASCOTAS, calcularXP, debeCelebrar, equilibrio, esMascota, estadoDe, mascotaPorId, totalXP, umbralesDe, type XP } from './mascotas'

const tarea = (extra: Partial<Tarea>): Tarea => ({ id: 't', titulo: 't', area: 'universidad', cursoId: null, tipo: 'tarea', fecha: '2026-10-20', prioridad: 'media', pideEvidencia: false, pasos: [], estado: 'hecha', actualizadoEn: 1, ...extra })
const habito = (categoria: string, n: number): Habito => ({ id: 'h' + categoria, nombre: 'h', categoria, color: '#fff', frecuencia: { tipo: 'diaria' }, registro: Array.from({ length: n }, (_, i) => `2026-09-${String(i + 1).padStart(2, '0')}`), actualizadoEn: 1 })
const vacio = { tareas: [], habitos: [], rutinas: [], progreso: [] }
const xp = (a = 0, p = 0, h = 0, c = 0): XP => ({ academico: a, personal: p, habitos: h, cuidado: c })

describe('catálogo de mascotas', () => {
  it('son 8, con textos completos', () => {
    expect(MASCOTAS).toHaveLength(8)
    for (const m of MASCOTAS) expect(m.nombre && m.apodo && m.descripcion && m.etiquetas[0] && m.etiquetas[1]).toBeTruthy()
    expect(new Set(MASCOTAS.map((m) => m.id)).size).toBe(8)
  })
  it('cinco tienen 4 etapas y tres tienen 3', () => {
    expect(MASCOTAS.filter((m) => m.etapas.length === 4).map((m) => m.id)).toEqual(['axolin', 'taro', 'nube', 'mochi', 'drako'])
    expect(MASCOTAS.filter((m) => m.etapas.length === 3).map((m) => m.id)).toEqual(['stella', 'hooty', 'alpi'])
  })
  it('cada etapa se dibuja por piezas, en cada ánimo, con cara y sin ids repetidos', () => {
    for (const m of MASCOTAS)
      m.etapas.forEach((_, i) => {
        for (const animo of ['seria', 'alerta', 'contenta', 'durmiendo'] as const) {
          const html = renderToStaticMarkup(createElement(Rig, { mascota: m.id, etapa: i + 1, animo }))
          expect(html, `${m.id} etapa ${i + 1} ${animo}`).toContain('rig-cara')
          expect(html).toContain('<svg')
          expect(html).not.toContain('NaN')
        }
      })
  })
  it('las etapas de una misma mascota no comparten ids de degradado', () => {
    const ids = (etapa: number) => [...renderToStaticMarkup(createElement(Rig, { mascota: 'drako', etapa, animo: 'seria' })).matchAll(/id="([^"]+)"/g)].map((r) => r[1])
    const a = ids(1)
    const b = ids(2)
    expect(a.length).toBeGreaterThan(0)
    expect(a.filter((x) => b.includes(x))).toEqual([])
  })
  it('esMascota y mascotaPorId', () => {
    expect(esMascota('mochi')).toBe(true)
    expect(esMascota('astia')).toBe(false)
    expect(mascotaPorId('drako')?.apodo).toBe('El soñador valiente')
  })
})

describe('experiencia (XP)', () => {
  it('sin nada hecho es 0', () => expect(totalXP(calcularXP(vacio))).toBe(0))
  it('una tarea de la universidad da 10 y un examen 20', () => {
    expect(calcularXP({ ...vacio, tareas: [tarea({}), tarea({ tipo: 'examen' })] }).academico).toBe(30)
  })
  it('lo pendiente no da XP', () => {
    expect(totalXP(calcularXP({ ...vacio, tareas: [tarea({ estado: 'pendiente' })] }))).toBe(0)
  })
  it('un pendiente personal da 8, y si es de Salud o Deporte cuenta como "cuidar de ti"', () => {
    const r = calcularXP({ ...vacio, tareas: [tarea({ area: 'personal', categoria: 'Trámites' }), tarea({ area: 'personal', categoria: 'Salud' }), tarea({ area: 'personal', categoria: 'Deporte' })] })
    expect(r).toEqual(xp(0, 8, 0, 16))
  })
  it('cada hábito cumplido da 5, en "hábitos" o en "cuidado" según su apartado', () => {
    const r = calcularXP({ ...vacio, habitos: [habito('Mente', 4), habito('Salud', 3)] })
    expect(r).toEqual(xp(0, 0, 20, 15))
  })
  it('cada rutina cumplida da 12', () => {
    const rutina = (categoria: string, n: number): Rutina => ({ id: 'r' + categoria, nombre: 'r', categoria, momento: 'manana', dias: [], pasos: [{ texto: 'a' }], registro: Array.from({ length: n }, (_, i) => `2026-09-0${i + 1}`), actualizadoEn: 1 })
    expect(calcularXP({ ...vacio, rutinas: [rutina('Deporte', 2), rutina('Mente', 1)] })).toEqual(xp(0, 0, 12, 24))
  })
  it('1 XP por cada 5 minutos de enfoque', () => {
    const dia = (enfoque: number): ProgresoDia => ({ id: 'd' + enfoque, fecha: '2026-10-01', hechas: 0, enfoque, descanso: 0, pomodoros: 0, actualizadoEn: 1 })
    expect(calcularXP({ ...vacio, progreso: [dia(25), dia(12)] }).academico).toBe(5 + 2)
  })
  it('desmarcar baja el XP (no se puede "farmear")', () => {
    const con = calcularXP({ ...vacio, habitos: [habito('Mente', 3)] })
    const sin = calcularXP({ ...vacio, habitos: [habito('Mente', 2)] })
    expect(totalXP(sin)).toBeLessThan(totalXP(con))
  })
})

describe('etapas y evolución', () => {
  const cuatro = { etapas: ['a', 'b', 'c', 'd'] }
  const tres = { etapas: ['a', 'b', 'c'] }
  it('umbrales según cuántas etapas tiene', () => {
    expect(umbralesDe(4)).toEqual([0, 100, 300, 700])
    expect(umbralesDe(3)).toEqual([0, 150, 500])
  })
  it('con poco XP está en la primera etapa y el progreso avanza', () => {
    const e = estadoDe(cuatro, xp(25, 25, 0, 0))
    expect(e).toMatchObject({ indice: 0, xpInicio: 0, xpSiguiente: 100, bloqueo: null })
    expect(e.progreso).toBeCloseTo(0.5)
  })
  it('evoluciona al llegar al XP de cada etapa', () => {
    expect(estadoDe(cuatro, xp(60, 60, 0, 0)).indice).toBe(1) // 120
    expect(estadoDe(cuatro, xp(160, 160, 0, 0)).indice).toBe(2) // 320
    expect(estadoDe(cuatro, xp(400, 400, 0, 0)).indice).toBe(3) // 800
  })
  it('una mascota de 3 etapas evoluciona con otros umbrales', () => {
    expect(estadoDe(tres, xp(80, 80, 0, 0)).indice).toBe(1) // 160
    expect(estadoDe(tres, xp(260, 260, 0, 0)).indice).toBe(2) // 520
  })
  it('la última etapa tiene el progreso completo y no hay siguiente', () => {
    expect(estadoDe(cuatro, xp(500, 500, 0, 0))).toMatchObject({ indice: 3, xpSiguiente: null, progreso: 1 })
  })
  it('equilibrio: se necesita al menos 15% de cada lado', () => {
    expect(equilibrio(xp(50, 50, 0, 0)).ok).toBe(true)
    expect(equilibrio(xp(5, 95, 0, 0))).toEqual({ ok: false, falta: 'academico' })
    expect(equilibrio(xp(95, 3, 1, 1))).toEqual({ ok: false, falta: 'personal' })
    expect(equilibrio(xp(0, 0, 0, 0)).ok).toBe(true)
  })
  it('sin equilibrio, la mascota se queda en la etapa 2 aunque tengas el XP', () => {
    const e = estadoDe(cuatro, xp(0, 400, 0, 0)) // 400 XP, todo personal
    expect(e).toMatchObject({ indice: 1, bloqueo: 'academico', progreso: 1 })
    expect(e.nombreEtapa).toBe('b')
  })
  it('los hábitos y el cuidado cuentan como lado personal', () => {
    expect(estadoDe(cuatro, xp(80, 0, 100, 120)).indice).toBe(2) // 300 total, 27% académico
  })
  it('las etapas 1 y 2 no piden equilibrio', () => {
    expect(estadoDe(cuatro, xp(0, 150, 0, 0)).indice).toBe(1)
  })
  it('solo se celebra cuando la etapa sube respecto a la última vista', () => {
    expect(debeCelebrar(1, 2)).toBe(true)
    expect(debeCelebrar(2, 2)).toBe(false)
    expect(debeCelebrar(3, 2)).toBe(false) // si baja (borraste cosas) no se celebra
    expect(debeCelebrar(undefined, 3)).toBe(false) // sin registro previo no se celebra
  })
})
