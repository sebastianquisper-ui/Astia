import { useEffect, useState } from 'react'
import { useCuenta } from '../cuenta/CuentaProvider'
import type { EstadoPlata } from '../lib/recomendaciones'
import { estadoDinero } from './estado'
import { fechaLocal, normalizarConfig } from './modelo'
import { rangoPeriodo } from './periodos'
import type { Config, Movimiento } from './tipos'

/**
 * Cómo va tu plata, SOLO como verde/ámbar/rojo (nunca montos), para las recomendaciones de Hoy.
 * Finanstia se abre con PIN, así que esto solo lee cuando el usuario lo permitió en Ajustes (`activo`).
 */
export function usePlata(activo: boolean): EstadoPlata | null {
  const { repo } = useCuenta()
  const [config, setConfig] = useState<Config | null>(null)
  const [movsMes, setMovsMes] = useState<Movimiento[] | null>(null)
  const mes = rangoPeriodo('mes', fechaLocal())

  useEffect(() => {
    if (!activo || !repo) return
    const cortar = [repo.escucharConfig((c) => setConfig(normalizarConfig(c))), repo.escucharMovimientos(mes.desde, mes.hasta, setMovsMes)]
    return () => cortar.forEach((f) => f())
  }, [activo, repo, mes.desde, mes.hasta])

  if (!activo || !config || !movsMes) return null
  return estadoDinero({ config, movsMes }).estado
}
