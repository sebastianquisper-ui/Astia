import { describe, expect, it } from 'vitest'
import type { Tarea } from '../dominio/tipos'
import { avisosDeTareaQueTocan, crearIcs, eventoDeTarea, normalizarAntes, primerDiario, textoAntes } from './avisosTarea'

const AHORA = new Date(2026, 10, 4, 9, 0, 0)
const tarea = (hora?: string): Tarea => ({ id: 't1', actualizadoEn: 0, titulo: 'Informe, final', area: 'universidad', cursoId: null, tipo: 'tarea', fecha: '2026-11-06', hora, prioridad: 'alta', pideEvidencia: false, pasos: [], estado: 'pendiente' }) as Tarea

describe('avisos por tarea', () => {
  it('textos', () => {
    expect(textoAntes(0)).toBe('A la hora')
    expect(textoAntes(1440)).toBe('1 día antes')
    expect(textoAntes(2880)).toBe('2 días antes')
    expect(textoAntes(180)).toBe('3 h antes')
    expect(textoAntes(45)).toBe('45 min antes')
  })
  it('normaliza: sin repetidos, el más lejano primero, máximo 5', () => {
    expect(normalizarAntes([10, 1440, 10, -5, 30, 60, 180, 0])).toEqual([1440, 180, 60, 30, 10])
  })
  it('toca un aviso cuando llega su hora, una sola vez', () => {
    const t = tarea('15:00') // vence 6 nov 15:00; "1 día antes" = 5 nov 15:00
    const cfg = { t1: { antes: [1440] } }
    expect(avisosDeTareaQueTocan([t], cfg, new Date(2026, 10, 5, 15, 5), new Set())).toHaveLength(1)
    expect(avisosDeTareaQueTocan([t], cfg, new Date(2026, 10, 5, 14, 0), new Set())).toHaveLength(0)
    expect(avisosDeTareaQueTocan([t], cfg, new Date(2026, 10, 5, 16, 30), new Set())).toHaveLength(0)
    expect(avisosDeTareaQueTocan([t], cfg, new Date(2026, 10, 5, 15, 5), new Set(['t1 antes-1440']))).toHaveLength(0)
  })
  it('no avisa de tareas hechas', () => {
    expect(avisosDeTareaQueTocan([{ ...tarea('15:00'), estado: 'hecha' }], { t1: { antes: [0] } }, new Date(2026, 10, 6, 15, 1), new Set())).toHaveLength(0)
  })
  it('el aviso diario empieza hoy o mañana y no pasa de la entrega', () => {
    const hasta = new Date(2026, 10, 6, 15, 0)
    expect(primerDiario('20:00', hasta, AHORA)?.getDate()).toBe(4)
    expect(primerDiario('08:00', hasta, AHORA)?.getDate()).toBe(5)
    expect(primerDiario('08:00', new Date(2026, 10, 4, 12, 0), AHORA)).toBeNull()
  })
  it('el .ics tiene una alarma por aviso, escapa el texto y trae el evento diario', () => {
    const t = tarea('15:00')
    const ics = crearIcs('t1', eventoDeTarea(t, { antes: [1440, 60, 0], diarioA: '20:00' }, 'Cálculo', AHORA), AHORA)
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(4)
    expect(ics).toContain('TRIGGER:-PT1440M')
    expect(ics).toContain('TRIGGER:PT0M')
    expect(ics).toContain('Informe\\, final')
    expect(ics).toContain('RRULE:FREQ=DAILY;UNTIL=')
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
  })
})
