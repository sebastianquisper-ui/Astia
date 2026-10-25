import type { Pestana } from '../lib/ruta'
import { useBloqueo } from './Bloqueo'
import { Inicio } from './Inicio'
import { MasFinanzas } from './MasFinanzas'
import { Metas } from './Metas'
import { Movimientos } from './Movimientos'
import { PinPantalla } from './PinPantalla'
import { Presupuesto } from './Presupuesto'

/** El contenido de Finanstia según la pestaña. Si está bloqueado, pide el PIN. */
export function Finanstia({ pestana, sub, alAbrirMas }: { pestana: Pestana; sub: string; alAbrirMas: (sub: string) => void }) {
  const { abierto } = useBloqueo()
  if (!abierto) return <PinPantalla />
  switch (pestana) {
    case 'movimientos':
      return (
        <section className="pantalla">
          <h1 className="titulo">Movimientos</h1>
          <Movimientos />
        </section>
      )
    case 'presupuesto':
      return (
        <section className="pantalla">
          <h1 className="titulo">Presupuesto</h1>
          <Presupuesto />
        </section>
      )
    case 'metas':
      return (
        <section className="pantalla">
          <h1 className="titulo">Metas de ahorro</h1>
          <Metas />
        </section>
      )
    case 'mas':
      return <MasFinanzas sub={sub} alAbrir={alAbrirMas} />
    default:
      return (
        <section className="pantalla">
          <h1 className="titulo">Inicio</h1>
          <Inicio />
        </section>
      )
  }
}
