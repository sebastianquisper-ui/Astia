import { useEffect, useMemo, useState } from 'react'
import { useFinanzas } from './FinanzasProvider'
import { fechaLocal } from './modelo'
import type { Movimiento } from './tipos'
import { calcularXPFinanzas, estadoAlpiFinanzas, totalXPFinanzas } from './xp'

/** El Alpi de Finanstia: su experiencia y su nivel, calculados de todos tus movimientos (los lee una vez y cuando algo cambia). */
export function useAlpiFinanzas() {
  const { datos, metas, config, movsMes, version } = useFinanzas()
  const [movs, setMovs] = useState<Movimiento[] | null>(null)

  useEffect(() => {
    let vigente = true
    datos
      .todosLosMovimientos()
      .then((m) => vigente && setMovs(m))
      .catch(() => {
        /* sin conexión o sin permiso: se queda con lo último que se leyó */
      })
    return () => {
      vigente = false
    }
  }, [datos, version, movsMes])

  return useMemo(() => {
    const xp = calcularXPFinanzas({ movs: movs ?? [], metas: metas ?? [], config, hoy: fechaLocal() })
    const total = totalXPFinanzas(xp)
    return { xp, total, estado: estadoAlpiFinanzas(total), cargado: movs !== null }
  }, [movs, metas, config])
}
