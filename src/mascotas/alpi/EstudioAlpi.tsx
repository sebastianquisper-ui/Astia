import { Icono } from '../../ui/Icono'
import { useMascota } from '../useMascota'
import AlpiIframe from './AlpiIframe'
import { nivelAlpi } from './datos'

/** Alpi con todos sus controles: niveles, expresiones, acciones, accesorios y vistas. */
export default function EstudioAlpi({ alVolver }: { alVolver: () => void }) {
  const { mascota, estado } = useMascota()
  const nivel = nivelAlpi(mascota?.id === 'alpi' && estado ? estado.indice + 1 : 1)
  return (
    <section className="pantalla estudio-alpi">
      <button className="volver" onClick={alVolver}>
        <Icono nombre="izquierda" /> Mi mascota
      </button>
      <h1 className="titulo">Alpi en 3D</h1>
      <p className="sub">Prueba sus niveles, expresiones y acciones. Arrástrala para girarla y tócala para que reaccione.</p>
      <div className="estudio-marco">
        <AlpiIframe nivel={nivel} embebida={false} sonido />
      </div>
    </section>
  )
}
