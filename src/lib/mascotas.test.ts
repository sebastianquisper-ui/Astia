import { describe, expect, it } from 'vitest'
import type { Habito, ProgresoDia, Rutina, Tarea } from '../dominio/tipos'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { Rig } from '../mascotas/rig/Rig'
import { MASCOTAS, PUNTOS, XP_BUENA_SEMANA, calcularXP, debeCelebrar, equilibrio, esMascota, estadoDe, mascotaPorId, totalXP, umbralesDe, type XP } from './mascotas'

const tarea = (extra: Partial<Tarea>): Tarea => ({ id: 't', titulo: 't', area: 'universidad', cursoId: null, tipo: 'tarea', fecha: '2026-10-20', prioridad: 'media', pideEvidencia: false, pasos: [], estado: 'hecha', actualizadoEn: 1, ...extra })
const habito = (categoria: string, n: number): Habito => ({ id: 'h' + categoria, nombre: 'h', categoria, color: '#fff', frecuencia: { tipo: 'diaria' }, registro: Array.from({ length: n }, (_, i) => `2026-09-${String(i + 1).padStart(2, '0')}`), actualizadoEn: 1 })
const vacio = { tareas: [], habitos: [], rutinas: [], progreso: [] }
const xp = (a = 0, p = 0, h = 0, c = 0): XP => ({ academico: a, personal: p, habitos: h, cuidado: c })

describe('catálogo de mascotas', () => {
  it('solo está Alpi, con 4 etapas y textos completos', () => {
    expect(MASCOTAS.map((m) => m.id)).toEqual(['alpi'])
    const [alpi] = MASCOTAS
    expect(alpi.nombre && alpi.apodo && alpi.descripcion && alpi.etiquetas[0] && alpi.etiquetas[1]).toBeTruthy()
    expect(alpi.etapas).toHaveLength(4)
  })
  it('cada etapa de Alpi se dibuja en vectores (respaldo sin 3D), en cada ánimo', () => {
    MASCOTAS[0].etapas.forEach((_, i) => {
      for (const animo of ['seria', 'alerta', 'contenta', 'durmiendo'] as const) {
        const html = renderToStaticMarkup(createElement(Rig, { mascota: 'alpi', etapa: i + 1, animo }))
        expect(html, `etapa ${i + 1} ${animo}`).toContain('rig-cara')
        expect(html).not.toContain('NaN')
      }
    })
  })
  it('esMascota y mascotaPorId', () => {
    expect(esMascota('alpi')).toBe(true)
    expect(esMascota('mochi')).toBe(false) // ya no existe
    expect(esMascota('astia')).toBe(false)
    expect(mascotaPorId('alpi')?.apodo).toBe('El aventurero de los Andes')
  })
})

describe('experiencia (XP)', () => {
  it('sin nada hecho es 0', () => expect(totalXP(calcularXP(vacio))).toBe(0))
  it('una tarea de la universidad da 5 y un examen 10', () => {
    expect(calcularXP({ ...vacio, tareas: [tarea({}), tarea({ tipo: 'examen' })] }).academico).toBe(15)
  })
  it('lo pendiente no da XP', () => {
    expect(totalXP(calcularXP({ ...vacio, tareas: [tarea({ estado: 'pendiente' })] }))).toBe(0)
  })
  it('un pendiente personal da 4, y si es de Salud o Deporte cuenta como "cuidar de ti"', () => {
    const r = calcularXP({ ...vacio, tareas: [tarea({ area: 'personal', categoria: 'Trámites' }), tarea({ area: 'personal', categoria: 'Salud' }), tarea({ area: 'personal', categoria: 'Deporte' })] })
    expect(r).toEqual(xp(0, 4, 0, 8))
  })
  it('cada hábito cumplido da 2, en "hábitos" o en "cuidado" según su apartado', () => {
    const r = calcularXP({ ...vacio, habitos: [habito('Mente', 4), habito('Salud', 3)] })
    expect(r).toEqual(xp(0, 0, 8, 6))
  })
  it('cada rutina cumplida da 6', () => {
    const rutina = (categoria: string, n: number): Rutina => ({ id: 'r' + categoria, nombre: 'r', categoria, momento: 'manana', dias: [], pasos: [{ texto: 'a' }], registro: Array.from({ length: n }, (_, i) => `2026-09-0${i + 1}`), actualizadoEn: 1 })
    expect(calcularXP({ ...vacio, rutinas: [rutina('Deporte', 2), rutina('Mente', 1)] })).toEqual(xp(0, 0, 6, 12))
  })
  it('1 XP por cada 10 minutos de enfoque', () => {
    const dia = (enfoque: number): ProgresoDia => ({ id: 'd' + enfoque, fecha: '2026-10-01', hechas: 0, enfoque, descanso: 0, pomodoros: 0, actualizadoEn: 1 })
    expect(calcularXP({ ...vacio, progreso: [dia(25), dia(12)] }).academico).toBe(2 + 1)
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
    expect(umbralesDe(4)).toEqual([0, 130, 510, 1280])
    expect(umbralesDe(3)).toEqual([0, 260, 1280])
  })
  it('el nivel máximo se alcanza a la mitad del ciclo con buen ritmo, sea corto o largo', () => {
    for (const semanas of [8, 10, 12, 16, 24]) {
      const tope = umbralesDe(4, semanas)[3]
      expect(tope / XP_BUENA_SEMANA).toBeCloseTo(semanas / 2, 0) // semanas buenas necesarias = la mitad del ciclo
    }
    expect(umbralesDe(4, 10)).toEqual([0, 80, 320, 800])
    expect(umbralesDe(4, 24)).toEqual([0, 190, 770, 1920])
  })
  it('un buen día suma unos 27 XP y una buena semana, unos 160', () => {
    const { tarea: t, habito: h, rutina: r, minutosPorPunto: m } = PUNTOS
    const buenDia = 2 * t + 3 * h + r + Math.floor(50 / m)
    expect(buenDia).toBe(27)
    expect(Math.round(buenDia * 6)).toBeGreaterThanOrEqual(XP_BUENA_SEMANA - 5)
  })
  it('los niveles intermedios no llegan demasiado pronto: el 2 a unos 5 días buenos, el 3 a la tercera semana', () => {
    const [, n2, n3] = umbralesDe(4, 16)
    expect(n2 / 27).toBeGreaterThan(4)
    expect(n3 / XP_BUENA_SEMANA).toBeGreaterThan(3)
  })
  it('con poco XP está en la primera etapa y el progreso avanza', () => {
    const e = estadoDe(cuatro, xp(32, 33, 0, 0))
    expect(e).toMatchObject({ indice: 0, xpInicio: 0, xpSiguiente: 130, bloqueo: null })
    expect(e.progreso).toBeCloseTo(0.5)
  })
  it('evoluciona al llegar al XP de cada etapa', () => {
    expect(estadoDe(cuatro, xp(70, 70, 0, 0)).indice).toBe(1) // 140
    expect(estadoDe(cuatro, xp(260, 260, 0, 0)).indice).toBe(2) // 520
    expect(estadoDe(cuatro, xp(650, 650, 0, 0)).indice).toBe(3) // 1300
  })
  it('una mascota de 3 etapas evoluciona con otros umbrales', () => {
    expect(estadoDe(tres, xp(140, 140, 0, 0)).indice).toBe(1) // 280
    expect(estadoDe(tres, xp(650, 650, 0, 0)).indice).toBe(2) // 1300
  })
  it('la última etapa tiene el progreso completo y no hay siguiente', () => {
    expect(estadoDe(cuatro, xp(700, 700, 0, 0))).toMatchObject({ indice: 3, xpSiguiente: null, progreso: 1 })
  })
  it('equilibrio: se necesita al menos 15% de cada lado', () => {
    expect(equilibrio(xp(50, 50, 0, 0)).ok).toBe(true)
    expect(equilibrio(xp(5, 95, 0, 0))).toEqual({ ok: false, falta: 'academico' })
    expect(equilibrio(xp(95, 3, 1, 1))).toEqual({ ok: false, falta: 'personal' })
    expect(equilibrio(xp(0, 0, 0, 0)).ok).toBe(true)
  })
  it('sin equilibrio, la mascota se queda en la etapa 2 aunque tengas el XP', () => {
    const e = estadoDe(cuatro, xp(0, 1400, 0, 0)) // 1400 XP, todo personal
    expect(e).toMatchObject({ indice: 1, bloqueo: 'academico', progreso: 1 })
    expect(e.nombreEtapa).toBe('b')
  })
  it('los hábitos y el cuidado cuentan como lado personal', () => {
    expect(estadoDe(cuatro, xp(150, 0, 200, 200)).indice).toBe(2) // 550 total, 27% académico
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
