import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useAlpi3D } from '../mascotas/alpi/useAlpi3D'
import { Rig } from '../mascotas/rig/Rig'
import type { AccionAlpi } from '../mascotas/alpi/datos'
import { diffDays } from '../lib/fechas'
import { estadoDinero, expresionFinanzas, fraseFinanzas, type EstadoDinero } from './estado'
import { Billete } from './FondoDinero'
import { useFinanzas } from './FinanzasProvider'
import { RuedaAlpi } from '../mascotas/alpi/RuedaAlpi'
import { BotonVestidorFinanzas, useVestidorFinanzas } from './VestidorFinanzas'

const cargarAlpi = () => import('../mascotas/alpi/AlpiIframe')
const AlpiIframe = lazy(cargarAlpi)
void cargarAlpi()

const ANIMO = { neutro: 'seria', verde: 'contenta', ambar: 'seria', rojo: 'alerta' } as const

/** Billetes que Alpi tiene a su alrededor: juega con ellos en verde, y en rojo pide plata. */
function ExtrasDinero({ estado }: { estado: EstadoDinero }) {
  if (estado === 'neutro') return null
  if (estado === 'verde')
    return (
      <div className="fz-extras verde" aria-hidden="true">
        <Billete color="#4fa57a" valor="50" className="b1" />
        <Billete color="#3b78b8" valor="100" className="b2" />
        <Billete color="#c9902a" valor="200" className="b3" />
        <Billete color="#7d5bb0" valor="20" className="b4" />
      </div>
    )
  if (estado === 'ambar')
    return (
      <div className="fz-extras ambar" aria-hidden="true">
        <Billete color="#9b6b43" valor="20" className="b1" />
        <Billete color="#d9822b" valor="10" className="b2" />
      </div>
    )
  return (
    <div className="fz-extras rojo" aria-hidden="true">
      <div className="fz-cartel">
        <span>Una monedita, porfa</span>
        <i />
      </div>
      <Billete color="#9b6b43" valor="10" className="b1" />
      <Billete color="#d9822b" valor="20" className="b2" />
    </div>
  )
}

/** Arriba de Inicio en Finanstia: Alpi (con su propio nivel) y lo que dice de tu plata. */
export function HeroFinanzas() {
  const { config, movsMes } = useFinanzas()
  const v = useVestidorFinanzas()
  const [rueda, setRueda] = useState(false)
  const en3d = useAlpi3D()
  const info = estadoDinero({ config, movsMes })
  const alpiNivel = v.alcanzado
  const hoy = new Date()
  const semilla = diffDays(hoy, new Date(hoy.getFullYear(), 0, 0))
  const [toques, setToques] = useState(0)
  const frase = toques > 0 ? fraseTocada(info.estado, toques) : fraseFinanzas(info, semilla)

  // En verde, Alpi baila al entrar en verde (y otra vez cada vez que vuelves a él)
  const [mov, setMov] = useState<{ accion?: AccionAlpi; vez: number }>({ vez: 0 })
  const antes = useRef<EstadoDinero | null>(null)
  useEffect(() => {
    if (info.estado === 'verde' && antes.current !== 'verde') setMov((m) => ({ accion: 'bailar', vez: m.vez + 1 }))
    antes.current = info.estado
  }, [info.estado])

  // Lo que elegiste en la ruleta manda (cuando tu plata no está en rojo); si no, Alpi reacciona a tu plata
  const expresion = v.expresion ?? expresionFinanzas(info.estado)
  return (
    <div className="hero-alpi fz-hero" data-estado={info.estado}>
      <div className="planeta" aria-hidden="true" />
      <div className="hero-alpi-modelo" data-nivel={v.nivel} data-expresion={expresion}>
        {en3d ? (
          <Suspense fallback={null}>
            <AlpiIframe nivel={v.nivel} expresion={expresion} accion={mov.accion} vez={mov.vez} accesorios={v.accesorios} alTocar={() => setToques((n) => n + 1)} alDobleToque={() => (v.desbloqueado ? setRueda(true) : setToques((n) => n + 1))} />
          </Suspense>
        ) : (
          <Rig mascota="alpi" etapa={v.nivel} animo={ANIMO[info.estado]} />
        )}
        <ExtrasDinero estado={info.estado} />
      </div>
      <div className="hero-alpi-lado">
        <button className="burbuja burbuja-alpi" onClick={() => setToques((n) => n + 1)} aria-label="Hablar con Alpi">
          <p aria-live="polite">{frase}</p>
        </button>
        <a className="enlace-mascotas" href="#/mas/alpi-finanzas">
          <span className="vestidor-icono" aria-hidden="true">🐾</span>
          <span>
            <b>Mi Alpi de Finanstia</b>
            <br />
            Nivel {alpiNivel} de 4
          </span>
          <span className="enlace-mascotas-flecha" aria-hidden="true">›</span>
        </a>
        <BotonVestidorFinanzas />
        {v.desbloqueado && <p className="rueda-pista">Toca dos veces a Alpi para cambiar su expresión o hacerla bailar.</p>}
      </div>
      <RuedaAlpi abierta={rueda} alCerrar={() => setRueda(false)} elegida={v.expresion} alElegirExpresion={v.elegirExpresion} alMovimiento={(a) => setMov((m) => ({ accion: a, vez: m.vez + 1 }))} />
    </div>
  )
}

function fraseTocada(estado: EstadoDinero, n: number): string {
  const lineas: Record<EstadoDinero, string[]> = {
    neutro: ['Anota lo primero que gastaste hoy. Ya.', 'Sin registro no hay plan.'],
    verde: ['Sigue así. Pero no te confíes.', 'Un buen mes se arma día a día.', 'Aparta para tu meta ahora que puedes.'],
    ambar: ['Antes de comprar, pregúntate si lo necesitas.', 'Revisa tu presupuesto. Ahora.'],
    rojo: ['Cero gastos extra hoy. En serio.', '¿Una monedita? Estoy en la calle por tu culpa.', 'Ordena tus gastos antes de que sea tarde.'],
  }
  return lineas[estado][(n - 1) % lineas[estado].length]
}
