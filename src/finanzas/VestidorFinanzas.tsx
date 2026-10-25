import { useState } from 'react'
import { useAjustes } from '../ajustes/AjustesProvider'
import { ACCESORIOS_INICIALES, nivelAlpi, type ExpresionAlpi, type NivelAlpi } from '../mascotas/alpi/datos'
import { VestidorHoja, type EstadoVestidor } from '../mascotas/alpi/Vestidor'
import { Icono } from '../ui/Icono'
import { estadoDinero } from './estado'
import { useFinanzas } from './FinanzasProvider'

/**
 * El vestidor y la ruleta del Alpi de Finanstia. Se abren cuando tu plata no está en rojo:
 * primero ordenas tus números, después juegas. La ropa y el nivel que elijas son solo de este Alpi.
 */
export function useVestidorFinanzas(): EstadoVestidor & { elegirExpresion: (e: ExpresionAlpi | null) => void; estadoDinero: ReturnType<typeof estadoDinero>['estado'] } {
  const { ajustes, cambiar } = useAjustes()
  const { config, movsMes, alpi } = useFinanzas()
  const look = ajustes.alpiLookFinanzas ?? {}
  const alcanzado = nivelAlpi(alpi.estado.nivel)
  const nivel = nivelAlpi(Math.min(look.nivel ?? alcanzado, alcanzado)) as NivelAlpi
  const accesorios = { ...ACCESORIOS_INICIALES, ...(look.accesorios ?? {}) }
  const info = estadoDinero({ config, movsMes })
  const desbloqueado = info.estado !== 'rojo'
  return {
    alcanzado,
    nivel,
    accesorios,
    desbloqueado,
    estadoDinero: info.estado,
    expresion: desbloqueado ? look.expresion : undefined,
    elegirExpresion: (e) => cambiar({ alpiLookFinanzas: { ...look, expresion: e ?? undefined } }),
    elegirNivel: (n) => cambiar({ alpiLookFinanzas: { ...look, nivel: n } }),
    alternarAccesorio: (id) => cambiar({ alpiLookFinanzas: { ...look, accesorios: { ...accesorios, [id]: !accesorios[id] } } }),
    restablecer: () => cambiar({ alpiLookFinanzas: {} }),
  }
}

/** Botón para vestir al Alpi de Finanstia (con candado mientras estés en rojo). */
export function BotonVestidorFinanzas() {
  const v = useVestidorFinanzas()
  const { irA } = useFinanzas()
  const [abierto, setAbierto] = useState(false)
  return (
    <>
      <button className={'enlace-mascotas' + (v.desbloqueado ? '' : ' bloqueado')} onClick={() => setAbierto(true)}>
        <span className="vestidor-icono" aria-hidden="true">
          <Icono nombre={v.desbloqueado ? 'mascota' : 'candado'} tam={22} />
        </span>
        <span>
          <b>Vestir a Alpi</b>
          <br />
          {v.desbloqueado ? 'Quítale o ponle ropa' : 'Se abre cuando salgas del rojo'}
        </span>
        <span className="enlace-mascotas-flecha" aria-hidden="true">›</span>
      </button>
      <VestidorHoja
        v={v}
        abierto={abierto}
        alCerrar={() => setAbierto(false)}
        bloqueado={
          <>
            <p className="sub">Primero ordenas tu plata, después juegas. Estás en rojo: revisa tu presupuesto y tus gastos, y cuando salgas te dejo vestir a Alpi.</p>
            <button className="btn" onClick={() => (setAbierto(false), irA('presupuesto'))}>Ver mi presupuesto</button>
          </>
        }
      />
    </>
  )
}
