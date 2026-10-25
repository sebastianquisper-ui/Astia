import { describe, expect, it } from 'vitest'
import type { Clase, Curso, Tarea } from '../dominio/tipos'
import { interpretarPregunta, responder, type ContextoPreguntas } from './preguntas'

const curso: Curso = { id: 'c1', nombre: 'Cálculo II', color: '#fff', actualizadoEn: 0 }
const tarea = (id: string, titulo: string, fecha: string, extra: Partial<Tarea> = {}): Tarea => ({ id, titulo, area: 'universidad', cursoId: 'c1', tipo: 'tarea', fecha, prioridad: 'media', pideEvidencia: true, pasos: [], estado: 'pendiente', actualizadoEn: 0, ...extra })
const clase: Clase = { id: 'k1', cursoId: 'c1', dia: 3, inicio: '14:00', fin: '16:00', aula: 'A-101', actualizadoEn: 0 }
const AHORA = new Date(2026, 9, 15, 10, 30) // jueves
const ctx = (tareas: Tarea[]): ContextoPreguntas => ({ tareas, clases: [clase], cursos: [curso], habitos: [], progreso: [{ id: 'p', fecha: '2026-10-15', hechas: 1, enfoque: 50, descanso: 0, pomodoros: 2, actualizadoEn: 0 }], ahora: AHORA })

describe('preguntas sobre tus estudios', () => {
  it('reconoce varias formas de preguntar', () => {
    expect(interpretarPregunta('¿Cuál es el pendiente más urgente que tengo?')).toBe('urgente')
    expect(interpretarPregunta('qué pendientes tengo hoy día')).toBe('hoy')
    expect(interpretarPregunta('¿cuándo es mi próxima clase?')).toBe('clase')
    expect(interpretarPregunta('qué exámenes tengo')).toBe('examenes')
    expect(interpretarPregunta('tengo algo atrasado?')).toBe('vencidas')
    expect(interpretarPregunta('cuántos minutos he estudiado')).toBe('enfoque')
    expect(interpretarPregunta('bla bla')).toBeNull()
  })
  it('lo más urgente es la tarea que vence primero', () => {
    const r = responder('¿cuál es mi pendiente más urgente?', ctx([tarea('a', 'Informe de lab', '2026-10-20'), tarea('b', 'Práctica 4', '2026-10-16')]))
    expect(r.texto).toContain('Práctica 4')
    expect(r.texto).toContain('Cálculo II')
  })
  it('los pendientes de hoy incluyen lo vencido y no lo de después', () => {
    const r = responder('qué pendientes tengo hoy', ctx([tarea('a', 'Vencida vieja', '2026-10-10'), tarea('b', 'De hoy', '2026-10-15'), tarea('c', 'Del mes que viene', '2026-11-20')]))
    expect(r.texto).toContain('Vencida vieja')
    expect(r.texto).toContain('De hoy')
    expect(r.texto).not.toContain('mes que viene')
  })
  it('las hechas y las personales no cuentan', () => {
    const r = responder('qué pendientes tengo hoy', ctx([tarea('a', 'Hecha', '2026-10-15', { estado: 'hecha' }), tarea('b', 'Gimnasio', '2026-10-15', { area: 'personal' })]))
    expect(r.texto).not.toContain('Hecha')
    expect(r.texto).not.toContain('Gimnasio')
  })
  it('dice la próxima clase y el enfoque de hoy', () => {
    expect(responder('qué clase me toca', ctx([])).texto).toMatch(/Cálculo II.*A-101.*14:00/)
    expect(responder('cuánto enfoque llevo hoy', ctx([])).texto).toContain('50 min')
  })
  it('si no entiende, dice qué sí entiende', () => {
    const r = responder('cuál es la capital de Francia', ctx([]))
    expect(r.entendida).toBe(false)
    expect(r.texto).toContain('pendientes de hoy')
  })
})
