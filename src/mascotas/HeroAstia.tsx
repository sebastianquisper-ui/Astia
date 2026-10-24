import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { Animo } from '../lib/avatar'
import { expresionPorProgreso, type AccionAlpi, type ProgresoAlpi } from './alpi/datos'
import { RuedaAlpi } from './alpi/RuedaAlpi'
import { useAlpi3D } from './alpi/useAlpi3D'
import { AvatarMascota } from './AvatarMascota'
import { AvisoMascotas } from './AvisoMascotas'
import { BotonVestidor } from './alpi/Vestidor'
import { useVestidor } from './alpi/useVestidor'
import { useMascota } from './useMascota'

const cargarAlpi = () => import('./alpi/AlpiIframe')
const AlpiIframe = lazy(cargarAlpi)
// Se empieza a descargar apenas abre la app, para que Alpi aparezca ya en 3D
void cargarAlpi()

interface Props {
  animo: Animo
  habla: boolean
  frase: string
  alTocar: () => void
  /** Cómo vas hoy: de ahí sale la expresión de Alpi. */
  progreso: ProgresoAlpi
  /** Acabas de cumplir algo: Alpi baila. */
  baila?: boolean
}

/** La parte de arriba de Hoy: tu compañero y lo que te dice. Con Alpi, en grande sobre su planeta. */
export function HeroAstia({ animo, habla, frase, alTocar, progreso, baila = false }: Props) {
  const { mascota, estado } = useMascota()
  const vestidor = useVestidor()
  const en3d = useAlpi3D()
  // Un movimiento a hacer una vez (`vez` cambia para repetirlo). Cada vez que cumples algo, Alpi baila.
  const [mov, setMov] = useState<{ accion?: AccionAlpi; vez: number }>({ vez: 0 })
  const hacer = (accion: AccionAlpi) => setMov((m) => ({ accion, vez: m.vez + 1 }))
  const bailabaAntes = useRef(false)
  useEffect(() => {
    if (baila && !bailabaAntes.current) setMov((m) => ({ accion: 'bailar', vez: m.vez + 1 }))
    bailabaAntes.current = baila
  }, [baila])
  // Con todo cumplido, tocar dos veces a Alpi abre la ruleta de emotes y movimientos
  const [rueda, setRueda] = useState(false)
  const alDobleToque = () => (vestidor.desbloqueado ? setRueda(true) : alTocar())
  if (mascota?.id === 'alpi' && estado && en3d) {
    const nivel = vestidor.nivel
    const auto = expresionPorProgreso(animo, progreso, { baila })
    // Lo que elegiste en el vestidor manda, salvo que acabes de cumplir algo (baila)
    const expresion = vestidor.expresion && !baila ? vestidor.expresion : auto.expresion
    return (
      <div className="hero-alpi" data-animo={animo}>
        <div className="planeta" aria-hidden="true" />
        <div className="hero-alpi-modelo" data-nivel={nivel} data-expresion={expresion}>
          <Suspense fallback={null}>
            <AlpiIframe nivel={nivel} expresion={expresion} accion={mov.accion} vez={mov.vez} accesorios={vestidor.accesorios} alTocar={alTocar} alDobleToque={alDobleToque} />
          </Suspense>
        </div>
        <div className="hero-alpi-lado">
          <button className="burbuja burbuja-alpi" onClick={alTocar} aria-label="Hablar con Astia">
            <p aria-live="polite">{frase}</p>
          </button>
          <BotonVestidor />
          {vestidor.desbloqueado && <p className="rueda-pista">Toca dos veces a Alpi para cambiar su expresión o hacerla bailar.</p>}
        </div>
        <RuedaAlpi abierta={rueda} alCerrar={() => setRueda(false)} elegida={vestidor.expresion} alElegirExpresion={vestidor.elegirExpresion} alMovimiento={hacer} />
      </div>
    )
  }
  return (
    <>
      <div className="hero" data-animo={animo}>
        <button className="avatar-btn" onClick={alTocar} aria-label="Hablar con Astia">
          <AvatarMascota animo={animo} habla={habla} />
        </button>
        <div className="burbuja" aria-live="polite">
          <p>{frase}</p>
        </div>
      </div>
      {mascota?.id === 'alpi' ? <BotonVestidor className="enlace-mascotas ancho" /> : <AvisoMascotas />}
    </>
  )
}
