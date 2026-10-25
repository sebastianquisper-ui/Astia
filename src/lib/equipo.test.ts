import { describe, expect, it } from 'vitest'
import { esEquipoLimitado } from './equipo'

describe('esEquipoLimitado', () => {
  const nav = (o: object) => o as Navigator
  it('detecta poca memoria o pocos núcleos', () => {
    expect(esEquipoLimitado(nav({ deviceMemory: 2, hardwareConcurrency: 8 }))).toBe(true)
    expect(esEquipoLimitado(nav({ hardwareConcurrency: 4 }))).toBe(true)
  })
  it('detecta el ahorro de datos', () => expect(esEquipoLimitado(nav({ connection: { saveData: true }, hardwareConcurrency: 8 }))).toBe(true))
  it('un equipo potente no se limita', () => expect(esEquipoLimitado(nav({ deviceMemory: 8, hardwareConcurrency: 8 }))).toBe(false))
})
