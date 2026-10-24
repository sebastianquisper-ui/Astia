import { lazy, Suspense } from 'react'
import type { Animo } from '../lib/avatar'
import { desdeAnimo } from './alpi/datos'
import { useAlpi3D } from './alpi/useAlpi3D'
import { AvatarMascota } from './AvatarMascota'
import { AvisoMascotas } from './AvisoMascotas'
import { BotonVestidor } from './alpi/Vestidor'
import { useVestidor } from './alpi/useVestidor'
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
  const vestidor = useVestidor()
  const en3d = useAlpi3D()
  if (mascota?.id === 'alpi' && estado && en3d) {
    const nivel = vestidor.nivel
    const { expresion, accion } = desdeAnimo(animo)
    return (
      <div className="hero-alpi" data-animo={animo}>
        <div className="planeta" aria-hidden="true" />
        <div className="hero-alpi-modelo" data-nivel={nivel} data-expresion={expresion}>
          <Suspense fallback={<Rig mascota="alpi" etapa={nivel} animo={animo} habla={habla} />}>
            <AlpiIframe nivel={nivel} expresion={expresion} accion={accion} accesorios={vestidor.accesorios} alTocar={alTocar} />
          </Suspense>
        </div>
        <div className="hero-alpi-lado">
          <button className="burbuja burbuja-alpi" onClick={alTocar} aria-label="Hablar con Astia">
            <p aria-live="polite">{frase}</p>
          </button>
          <BotonVestidor />
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
      {mascota?.id === 'alpi' ? <BotonVestidor className="enlace-mascotas ancho" /> : <AvisoMascotas />}
    </>
  )
}
