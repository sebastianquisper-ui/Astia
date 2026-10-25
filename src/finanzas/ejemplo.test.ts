import { describe, expect, it } from 'vitest'
import { estadoDinero } from './estado'
import { sembrarEjemploFinanzas } from './ejemplo'
import { fechaLocal } from './modelo'
import { crearRepoLocal } from './repoLocal'
import { calcularXPFinanzas, estadoAlpiFinanzas, totalXPFinanzas } from './xp'
import { rangoPeriodo } from './periodos'
import type { Config, Meta, Movimiento } from './tipos'

const leer = async (hoy: Date) => {
  const repo = crearRepoLocal({ guardar: false })
  sembrarEjemploFinanzas(repo, hoy)
  await new Promise((r) => setTimeout(r, 20))
  const movs = await repo.todosLosMovimientos()
  const config = await new Promise<Config>((ok) => { const f = repo.escucharConfig((c) => { ok(c); queueMicrotask(f) }) })
  const metas = await new Promise<Meta[]>((ok) => { const f = repo.escucharMetas((m) => { ok(m); queueMicrotask(f) }) })
  return { movs, config, metas }
}

describe('datos de ejemplo de la vista previa', () => {
  for (const [nombre, hoy] of [['a fin de mes', new Date(2026, 9, 25)], ['a inicio de mes', new Date(2026, 9, 3)], ['en enero', new Date(2027, 0, 15)]] as const) {
    it(`dejan a Alpi contenta con su plata (${nombre})`, async () => {
      const { movs, config, metas } = await leer(hoy)
      const mes = rangoPeriodo('mes', fechaLocal(hoy))
      const movsMes: Movimiento[] = movs.filter((m) => m.fecha >= mes.desde && m.fecha <= mes.hasta)
      expect(movs.every((m) => m.fecha <= fechaLocal(hoy))).toBe(true) // nada en el futuro
      expect(estadoDinero({ config, movsMes }).estado).toBe('verde')
      expect(metas).toHaveLength(2)
      expect(metas.every((m) => m.aportes.length > 0)).toBe(true)
      expect(config.saldosCent.digital).toBeGreaterThan(0)
    })
  }
  it('dan algo de experiencia pero no el nivel máximo', async () => {
    const { movs, config, metas } = await leer(new Date(2026, 9, 25))
    const total = totalXPFinanzas(calcularXPFinanzas({ movs, metas, config, hoy: '2026-10-25' }))
    expect(total).toBeGreaterThan(0)
    expect(estadoAlpiFinanzas(total).nivel).toBeLessThan(4)
  })
})
