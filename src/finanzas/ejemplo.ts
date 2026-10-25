import { fechaLocal } from './modelo'
import { sumarDias } from './periodos'
import type { RepoFinanzas } from './repo'

/**
 * Datos inventados para la vista previa (no son los de nadie): un mes con sueldo, gastos de todo tipo,
 * un presupuesto y dos metas, para ver Finanstia con vida. Se cargan una sola vez.
 */
export function sembrarEjemploFinanzas(repo: RepoFinanzas, hoy = new Date()): void {
  const h = fechaLocal(hoy)
  const diaHoy = hoy.getDate()
  // Fechas ancladas a cada mes (no a "hace N días"), para que los gastos de antes caigan siempre en los meses pasados
  const delMes = (delta: number, dia: number) => {
    const f = new Date(hoy.getFullYear(), hoy.getMonth() + delta, 1)
    f.setDate(delta === 0 ? Math.min(Math.max(1, dia), diaHoy) : Math.min(dia, 28))
    return fechaLocal(f)
  }
  const mov = (tipo: 'gasto' | 'ingreso', categoria: string, monto: number, fecha: string, medio: 'digital' | 'efectivo' = 'digital', nota = '') =>
    repo.crearMovimiento({ tipo, categoria, monto, fecha, medio, nota })

  // Hace dos meses y el mes pasado: sirven para comparar y para la experiencia de Alpi
  mov('ingreso', 'Sueldo', 1000, delMes(-2, 1))
  mov('gasto', 'Almuerzos', 180, delMes(-2, 8))
  mov('gasto', 'Pasajes', 70, delMes(-2, 15))
  mov('ingreso', 'Sueldo', 1100, delMes(-1, 1))
  mov('gasto', 'Almuerzos', 160, delMes(-1, 6), 'digital', 'menú de la semana')
  mov('gasto', 'ComerRico', 85.5, delMes(-1, 12))
  mov('gasto', 'Tecnología', 120, delMes(-1, 18))
  mov('gasto', 'Pasajes', 44, delMes(-1, 22), 'efectivo')

  // Este mes: ordenado, para ver a Alpi contenta con su plata
  mov('ingreso', 'Sueldo', 1200, delMes(0, 1))
  mov('ingreso', 'Propina', 50, delMes(0, 3), 'efectivo')
  mov('gasto', 'Almuerzos', 14.5, delMes(0, 2), 'digital', 'menú')
  mov('gasto', 'Pasajes', 6, delMes(0, 2), 'efectivo')
  mov('gasto', 'ComerRico', 32, delMes(0, 4))
  mov('gasto', 'Almuerzos', 16, delMes(0, 5), 'digital', 'con Ana')
  mov('gasto', 'Tecnología', 89.9, delMes(0, 6), 'digital', 'cable y mouse')
  mov('gasto', 'Extras', 25, delMes(0, 7))
  mov('gasto', 'Pasajes', 8.5, delMes(0, 8), 'efectivo')
  mov('gasto', 'Almuerzos', 13, delMes(0, 9))
  repo.crearTransferencia({ origen: 'digital', destino: 'efectivo', monto: 100, fecha: delMes(0, 3), nota: 'cajero' })

  void repo.definirPresupuesto('digital', 'Almuerzos', 150)
  void repo.definirPresupuesto('digital', 'Tecnología', 200)
  void repo.definirPresupuesto('efectivo', 'Pasajes', 60)

  void repo.crearMeta({ nombre: 'Laptop nueva', objetivo: 3200, limite: sumarDias(h, 210) })
  void repo.crearMeta({ nombre: 'Viaje a Cusco', objetivo: 800 })
  const unaVez = (nombre: string, aportes: [number, string][]) => {
    const off = repo.escucharMetas((metas) => {
      const meta = metas.find((m) => m.nombre === nombre)
      if (!meta || meta.aportes.length) return
      off()
      for (const [monto, fecha] of aportes) void repo.aportarAMeta(meta, monto, fecha)
    })
  }
  unaVez('Laptop nueva', [[500, delMes(-1, 10)], [350, delMes(0, 4)]])
  unaVez('Viaje a Cusco', [[200, delMes(0, 6)]])
}
