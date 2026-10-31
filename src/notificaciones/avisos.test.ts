import { describe, expect, it } from 'vitest'
import type { Recordatorio } from '../dominio/tipos'
import { avisosDeRecordatorios } from './avisos'

const AHORA = Date.parse('2026-10-31T12:00:00Z')
const r = (id: string, cuando: string, extra: Partial<Recordatorio> = {}): Recordatorio => ({ id, texto: 'Comprar pan', cuando, actualizadoEn: 0, ...extra })

describe('avisosDeRecordatorios', () => {
  it('toma los recordatorios futuros, del más próximo al más lejano', () => {
    const lista = avisosDeRecordatorios([r('b', '2026-10-31T15:00:00Z'), r('a', '2026-10-31T13:00:00Z')], AHORA)
    expect(lista.map((a) => a.id)).toEqual(['r-a', 'r-b'])
    expect(lista[0]).toMatchObject({ titulo: 'Astia te recuerda', cuerpo: 'Comprar pan', cuando: Date.parse('2026-10-31T13:00:00Z') })
  })
  it('deja fuera los ya avisados, los pasados, los borrados y los de fecha rota', () => {
    const lista = avisosDeRecordatorios([r('1', '2026-10-31T13:00:00Z', { avisado: true }), r('2', '2026-10-31T11:00:00Z'), r('3', '2026-10-31T13:00:00Z', { borradoEn: 5 }), r('4', 'no es fecha')], AHORA)
    expect(lista).toEqual([])
  })
  it('no manda lo que cae a más de un mes', () => expect(avisosDeRecordatorios([r('1', '2027-03-01T10:00:00Z')], AHORA)).toEqual([]))
})
