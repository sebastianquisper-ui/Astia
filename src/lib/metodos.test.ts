import { describe, expect, it } from 'vitest'
import type { Tarea } from '../dominio/tipos'
import { datosVacios, sumarMinutos } from '../datos/almacenamiento'
import { FASE_ARRANQUE, METODOS, esMetodo, fasesDe, metodoPorId, minutosTotales, sugerirMetodo } from './metodos'

const CFG = { enfoqueMin: 25, descansoMin: 5 }
const t = (titulo: string, tipo: Tarea['tipo'] = 'tarea', metodo?: string) => ({ titulo, tipo, metodo })

describe('biblioteca de métodos', () => {
  it('hay diez métodos con nombre, para qué sirven y por qué funcionan', () => {
    expect(METODOS).toHaveLength(10)
    for (const m of METODOS) {
      expect(m.nombre && m.paraQue && m.porque).toBeTruthy()
      expect(new Set(METODOS.map((x) => x.id)).size).toBe(10) // ids únicos
    }
  })
  it('todos tienen fases con tiempo y descripción', () => {
    for (const m of METODOS) {
      const fases = m.fases(CFG)
      expect(fases.length).toBeGreaterThanOrEqual(2)
      expect(fases.every((f) => f.minutos > 0 && f.etiqueta && f.descripcion)).toBe(true)
      expect(fases.some((f) => f.tipo === 'enfoque')).toBe(true)
    }
  })
  it('el Pomodoro usa los tiempos que tú elegiste', () => {
    expect(fasesDe('pomodoro', { enfoqueMin: 40, descansoMin: 10 }).map((f) => f.minutos)).toEqual([40, 10])
    expect(minutosTotales('pomodoro', CFG)).toBe(30)
  })
  it('los tiempos de los métodos de la v1 se conservan', () => {
    expect(minutosTotales('feynman', CFG)).toBe(45)
    expect(minutosTotales('recuperacion', CFG)).toBe(55)
    expect(minutosTotales('espaciada', CFG)).toBe(35)
    expect(minutosTotales('cornell', CFG)).toBe(40)
    expect(minutosTotales('intercalada', CFG)).toBe(55)
  })
  it('"solo 10 minutos" es una fase de enfoque de 10 minutos', () => {
    expect(FASE_ARRANQUE).toMatchObject({ minutos: 10, tipo: 'enfoque' })
  })
  it('esMetodo y metodoPorId', () => {
    expect(esMetodo('cornell')).toBe(true)
    expect(esMetodo('inventado')).toBe(false)
    expect(metodoPorId('sq3r').nombre).toContain('SQ3R')
  })
})

describe('qué método sugiere Astia', () => {
  it('un examen es recuperación activa', () => {
    expect(sugerirMetodo(t('Examen parcial de Física', 'examen'), 'Física')).toBe('recuperacion')
  })
  it('lo que tú elegiste manda sobre la sugerencia', () => {
    expect(sugerirMetodo(t('Examen parcial', 'examen', 'mapa'))).toBe('mapa')
    expect(sugerirMetodo(t('Examen parcial', 'examen', 'inventado'))).toBe('recuperacion') // un método inválido se ignora
  })
  it('estudiar matemática o física es práctica intercalada', () => {
    expect(sugerirMetodo(t('Resolver práctica', 'estudio'), 'Cálculo II')).toBe('intercalada')
  })
  it('estudiar teoría es Feynman', () => {
    expect(sugerirMetodo(t('Leer teoría de grafos', 'estudio'), 'Matemática Discreta')).toBe('feynman')
    expect(sugerirMetodo(t('Estudiar el concepto de entropía', 'estudio'), 'Física')).toBe('feynman')
  })
  it('pasar apuntes en limpio es Cornell', () => {
    expect(sugerirMetodo(t('Pasar en limpio mis notas de clase'))).toBe('cornell')
  })
  it('leer un capítulo es SQ3R', () => {
    expect(sugerirMetodo(t('Leer capítulo 3 del libro'), 'Psicología')).toBe('sq3r')
  })
  it('memorizar es con tarjetas y resumir es con mapa mental', () => {
    expect(sugerirMetodo(t('Memorizar vocabulario de inglés'))).toBe('tarjetas')
    expect(sugerirMetodo(t('Hacer un resumen del tema 4'))).toBe('mapa')
  })
  it('una guía de ejercicios de un curso numérico es resolver problemas por pasos', () => {
    expect(sugerirMetodo(t('GUÍA 4 DE CÁLCULO II'), 'Cálculo II')).toBe('polya')
    expect(sugerirMetodo(t('Taller de problemas'), 'Física')).toBe('polya')
  })
  it('una tarea general es Pomodoro', () => {
    expect(sugerirMetodo(t('Proyecto final'), 'Gestión')).toBe('pomodoro')
  })
  it('ignora tildes y mayúsculas', () => {
    expect(sugerirMetodo(t('LEER CAPÍTULO 2'))).toBe('sq3r')
  })
})

describe('registrar minutos de sesión', () => {
  it('suma al día correcto sin tocar la lista anterior', () => {
    const base = datosVacios().progreso
    Object.freeze(base)
    const a = sumarMinutos(base, '2026-10-15', { enfoque: 25, pomodoros: 1 }, 10)
    const b = sumarMinutos(a, '2026-10-15', { descanso: 5 }, 20)
    expect(b).toHaveLength(1)
    expect(b[0]).toMatchObject({ fecha: '2026-10-15', enfoque: 25, descanso: 5, pomodoros: 1, actualizadoEn: 20 })
    expect(sumarMinutos(b, '2026-10-16', { enfoque: 10 }, 30)).toHaveLength(2)
  })
  it('conserva las tareas hechas del día', () => {
    const conHechas = [{ id: '2026-10-15', fecha: '2026-10-15', hechas: 3, enfoque: 0, descanso: 0, pomodoros: 0, actualizadoEn: 1 }]
    expect(sumarMinutos(conHechas, '2026-10-15', { enfoque: 10 }, 5)[0]).toMatchObject({ hechas: 3, enfoque: 10 })
  })
})
