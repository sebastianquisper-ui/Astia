import { lazy, Suspense } from 'react'
import type { Animo } from '../lib/avatar'
import { desdeAnimo, nivelAlpi } from './alpi/datos'
import { hayWebGL } from './alpi/webgl'
import { AvatarMascota } from './AvatarMascota'
import { AvisoMascotas } from './AvisoMascotas'
import { MascotaMini } from './MascotaVista'
import { Rig } from './rig/Rig'
import { useMascota } from './useMascota'

const AlpiIframe = lazy(() => import('./alpi/AlpiIframe'))

interface Props {
  animo: Animo
  habla: boolean
  frase: string
  alTocar: () => void
}

/** La parte de arriba de Hoy: tu compañero y lo que te dice. Con Alpi, en grande sobre su planeta. */
export function HeroAstia({ animo, habla, frase, alTocar }: Props) {
  const { mascota, estado } = useMascota()
  if (mascota?.id === 'alpi' && estado && hayWebGL()) {
    const nivel = nivelAlpi(estado.indice + 1)
    const { expresion, accion } = desdeAnimo(animo)
    return (
      <div className="hero-alpi" data-animo={animo}>
        <div className="planeta" aria-hidden="true" />
        <div className="hero-alpi-modelo" data-nivel={nivel} data-expresion={expresion}>
          <Suspense fallback={<Rig mascota="alpi" etapa={nivel} animo={animo} habla={habla} />}>
            <AlpiIframe nivel={nivel} expresion={expresion} accion={accion} alTocar={alTocar} />
          </Suspense>
        </div>
        <div className="hero-alpi-lado">
          <button className="burbuja burbuja-alpi" onClick={alTocar} aria-label="Hablar con Astia">
            <p aria-live="polite">{frase}</p>
          </button>
          <button className="enlace-mascotas" onClick={() => (window.location.hash = '#/mas/mascota')}>
            <span className="enlace-mascotas-caras" aria-hidden="true">
              <MascotaMini mascota="alpi" etapa={1} tam={34} />
              <MascotaMini mascota="stella" etapa={1} tam={30} />
              <MascotaMini mascota="nube" etapa={1} tam={30} />
            </span>
            <span>Conoce a las mascotas que evolucionan contigo</span>
            <span className="enlace-mascotas-flecha" aria-hidden="true">›</span>
          </button>
        </div>
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
      <AvisoMascotas />
    </>
  )
}
