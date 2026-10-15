import { describe, expect, it } from 'vitest'
import type { Clase, Tarea } from '../dominio/tipos'
import { claseAhora, formatoCuenta } from './ahora'
import { animoDe, fraseDe, frasesToque } from './avatar'
import { addDays, aMinutos, diffDays, indiceDia, parseYmd, ymd } from './fechas'
import { porUrgencia, textoVence, urgenciaDe } from './urgencia'

const tarea = (fecha: string, hora?: string, estado: Tarea['estado'] = 'pendiente'): Tarea => ({
  id: 'x', titulo: 'x', area: 'universidad', cursoId: null, tipo: 'tarea', fecha, hora, estado,
})

describe('fechas', () => {
  it('ymd y parseYmd son inversos', () => {
    expect(ymd(parseYmd('2026-10-15'))).toBe('2026-10-15')
  })
  it('lunes es 0 y domingo es 6', () => {
    expect(indiceDia(new Date(2026, 9, 12))).toBe(0) // lunes 12 oct 2026
    expect(indiceDia(new Date(2026, 9, 18))).toBe(6)
  })
  it('suma días cruzando de mes', () => {
    expect(ymd(addDays(new Date(2026, 9, 30), 3))).toBe('2026-11-02')
    expect(diffDays(new Date(2026, 9, 18), new Date(2026, 9, 15))).toBe(3)
  })
  it('aMinutos convierte horas', () => {
    expect(aMinutos('14:30')).toBe(870)
  })
})

describe('urgencia (semáforo)', () => {
  const ahora = new Date(2026, 9, 15, 12, 0)
  it('vencida si ya pasó', () => expect(urgenciaDe(tarea('2026-10-15', '11:00'), ahora)).toBe('vencida'))
  it('roja si falta menos de 48 h', () => expect(urgenciaDe(tarea('2026-10-17', '11:00'), ahora)).toBe('roja'))
  it('ámbar si es esta semana', () => expect(urgenciaDe(tarea('2026-10-20'), ahora)).toBe('ambar'))
  it('verde si falta más de una semana', () => expect(urgenciaDe(tarea('2026-10-30'), ahora)).toBe('verde'))
  it('hecha manda sobre todo', () => expect(urgenciaDe(tarea('2026-10-01', undefined, 'hecha'), ahora)).toBe('hecha'))
  it('sin hora vence a las 23:59 de ese día', () => {
    expect(urgenciaDe(tarea('2026-10-15'), new Date(2026, 9, 15, 23, 0))).toBe('roja')
    expect(urgenciaDe(tarea('2026-10-15'), new Date(2026, 9, 16, 0, 1))).toBe('vencida')
  })
  it('textos del plazo', () => {
    expect(textoVence(tarea('2026-10-15', '21:00'), ahora)).toBe('Hoy 21:00')
    expect(textoVence(tarea('2026-10-16', '15:00'), ahora)).toBe('Mañana 15:00')
    expect(textoVence(tarea('2026-10-13', '10:00'), ahora)).toBe('Vencida hace 2 d')
    expect(textoVence(tarea('2026-10-18'), ahora)).toBe('Domingo')
    expect(textoVence(tarea('2026-10-15', undefined, 'hecha'), ahora)).toBe('Hecha')
  })
  it('ordena de más urgente a menos', () => {
    const lista = [tarea('2026-10-30'), tarea('2026-10-13'), tarea('2026-10-16')].sort(porUrgencia)
    expect(lista.map((t) => t.fecha)).toEqual(['2026-10-13', '2026-10-16', '2026-10-30'])
  })
})

describe('claseAhora', () => {
  const clases: Clase[] = [
    { id: 'a', cursoId: 'c1', dia: 3, inicio: '08:00', fin: '10:00', aula: 'A' }, // jueves
    { id: 'b', cursoId: 'c2', dia: 3, inicio: '14:00', fin: '16:00', aula: 'B' },
    { id: 'c', cursoId: 'c1', dia: 0, inicio: '08:00', fin: '10:00', aula: 'A' }, // lunes
  ]
  it('detecta que estás en clase y cuánto falta', () => {
    const e = claseAhora(clases, new Date(2026, 9, 15, 9, 0)) // jueves 15 oct, 9:00
    expect(e.tipo).toBe('en-clase')
    expect(e.clase?.id).toBe('a')
    expect(e.minutos).toBe(60)
    expect(e.progreso).toBeCloseTo(0.5)
  })
  it('entre clases, da la siguiente del día', () => {
    const e = claseAhora(clases, new Date(2026, 9, 15, 12, 0))
    expect(e.tipo).toBe('proxima')
    expect(e.clase?.id).toBe('b')
    expect(e.minutos).toBe(120)
  })
  it('pasada la última clase, salta al siguiente día con clases', () => {
    const e = claseAhora(clases, new Date(2026, 9, 15, 18, 0))
    expect(e.clase?.id).toBe('c') // lunes
    expect(e.inicio?.getDate()).toBe(19)
  })
  it('sin clases devuelve "ninguna"', () => {
    expect(claseAhora([], new Date()).tipo).toBe('ninguna')
  })
  it('formatea la cuenta regresiva', () => {
    expect(formatoCuenta(35)).toEqual({ n: '35', u: 'min' })
    expect(formatoCuenta(80)).toEqual({ n: '1:20', u: 'h' })
    expect(formatoCuenta(2900)).toEqual({ n: '2', u: 'días' })
  })
})

describe('avatar', () => {
  const base = { hora: 15, hayCursos: true, vencidas: 0, porHacer: 3, hechas: 0 }
  it('estricta por defecto', () => expect(animoDe(base)).toBe('seria'))
  it('alerta si hay vencidas', () => expect(animoDe({ ...base, vencidas: 2 })).toBe('alerta'))
  it('contenta si cumpliste todo', () => expect(animoDe({ ...base, porHacer: 0, hechas: 3 })).toBe('contenta'))
  it('duerme de madrugada', () => {
    expect(animoDe({ ...base, hora: 23 })).toBe('durmiendo')
    expect(animoDe({ ...base, hora: 3 })).toBe('durmiendo')
  })
  it('las vencidas mandan sobre lo hecho', () => expect(animoDe({ ...base, vencidas: 1, porHacer: 0, hechas: 3 })).toBe('alerta'))
  it('la frase usa singular y plural', () => {
    expect(fraseDe({ ...base, vencidas: 1 }, 'Sebastián', 0)).toContain('1 pendiente vencida')
    expect(fraseDe({ ...base, vencidas: 3 }, 'Sebastián', 0)).toContain('3 pendientes vencidas')
  })
  it('sin cursos pide cargarlos', () => expect(fraseDe({ ...base, hayCursos: false }, 'Sebastián', 0)).toContain('cursos'))
  it('al tocarla tiene varias frases con el nombre', () => {
    const f = frasesToque('Sebastián')
    expect(f.length).toBeGreaterThan(3)
    expect(f.some((x) => x.includes('Sebastián'))).toBe(true)
  })
})
