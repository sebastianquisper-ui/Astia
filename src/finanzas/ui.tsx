import type { ReactNode } from 'react'
import { Icono } from '../ui/Icono'
import { NOMBRE_MEDIO, soles } from './formato'
import { esTransferencia, fechaLocal } from './modelo'
import { PERIODOS, contieneHoy, etiquetaDia, etiquetaPeriodo, moverPeriodo } from './periodos'
import { useFinanzas } from './FinanzasProvider'
import type { NivelPresupuesto } from './presupuesto'
import type { Medio, Movimiento } from './tipos'

/** Un monto en soles. Con "ocultar montos" se difumina (por CSS). */
export function Monto({ valor, signo = false, className = '' }: { valor: number; signo?: boolean; className?: string }) {
  return <span className={'monto ' + className}>{soles(valor, { signo })}</span>
}

export function Segmentado<T extends string>({ opciones, valor, alCambiar, etiqueta, ancho = false }: { opciones: { id: T; nombre: string }[]; valor: T; alCambiar: (id: T) => void; etiqueta: string; ancho?: boolean }) {
  return (
    <div className={'seg' + (ancho ? ' ancho' : '')} role="group" aria-label={etiqueta}>
      {opciones.map((o) => (
        <button key={o.id} type="button" aria-pressed={o.id === valor} onClick={() => o.id !== valor && alCambiar(o.id)}>
          {o.nombre}
        </button>
      ))}
    </div>
  )
}

export function Vacio({ children }: { children: ReactNode }) {
  return <p className="fz-vacio">{children}</p>
}

/** Barra de avance; el nivel decide el color y siempre va con texto al lado. */
export function BarraProgreso({ fraccion, nivel, etiqueta }: { fraccion: number; nivel: NivelPresupuesto | 'meta' | null; etiqueta: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, fraccion)) * 100)
  return (
    <div className={'fz-barra nivel-' + (nivel ?? 'ninguno')} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={etiqueta}>
      <span style={{ width: `${pct}%` }} />
    </div>
  )
}

/** Las dos billeteras (Digital y Efectivo) con su saldo, y el botón para transferir entre ellas. */
export function Billeteras() {
  const { config, medio, setMedio, abrirFormulario } = useFinanzas()
  const tarjeta = (m: Medio) => (
    <button type="button" className="fz-billetera" aria-pressed={m === medio} onClick={() => setMedio(m)}>
      <span className="fz-billetera-nombre">{NOMBRE_MEDIO[m]}</span>
      <Monto valor={config.saldosCent[m] / 100} className="fz-billetera-saldo cifra" />
      <span className="fz-billetera-nota">Saldo registrado</span>
    </button>
  )
  return (
    <section className="fz-billeteras" aria-label="Billeteras">
      {tarjeta('digital')}
      <button type="button" className="fz-transferir" aria-label="Transferir entre Digital y Efectivo" onClick={() => abrirFormulario({ tipo: 'transferencia' })}>
        <Icono nombre="cambiar" tam={20} />
      </button>
      {tarjeta('efectivo')}
    </section>
  )
}

export function SelectorPeriodo() {
  const { periodo, setPeriodo } = useFinanzas()
  const { tipo, ref } = periodo
  const hoy = fechaLocal()
  return (
    <section className="fz-periodo" aria-label="Periodo">
      <Segmentado
        opciones={PERIODOS}
        valor={tipo}
        etiqueta="Tipo de periodo"
        alCambiar={(nuevo) => setPeriodo({ tipo: nuevo, ref: contieneHoy(tipo, ref, hoy) ? hoy : ref })}
      />
      <div className="fz-periodo-nav">
        <button type="button" className="icono-btn" aria-label="Periodo anterior" onClick={() => setPeriodo({ tipo, ref: moverPeriodo(tipo, ref, -1) })}>
          <Icono nombre="izquierda" tam={18} />
        </button>
        <span className="fz-periodo-etiqueta" aria-live="polite">{etiquetaPeriodo(tipo, ref, hoy)}</span>
        <button type="button" className="icono-btn" aria-label="Periodo siguiente" onClick={() => setPeriodo({ tipo, ref: moverPeriodo(tipo, ref, 1) })}>
          <Icono nombre="derecha" tam={18} />
        </button>
        {!contieneHoy(tipo, ref, hoy) && (
          <button type="button" className="fz-chip" onClick={() => setPeriodo({ tipo, ref: hoy })}>Hoy</button>
        )}
      </div>
    </section>
  )
}

function descripcion(m: Movimiento): string {
  if (!esTransferencia(m)) return m.categoria
  const otro = NOMBRE_MEDIO[m.medio === 'digital' ? 'efectivo' : 'digital']
  return m.tipo === 'gasto' ? `Transferencia a ${otro}` : `Transferencia desde ${otro}`
}

export function FilaMovimiento({ m, conFecha = false }: { m: Movimiento; conFecha?: boolean }) {
  const { abrirFormulario } = useFinanzas()
  const valor = m.tipo === 'ingreso' ? m.monto : -m.monto
  const detalle = [conFecha ? etiquetaDia(m.fecha) : null, m.nota || null].filter(Boolean).join(' · ')
  const transfer = esTransferencia(m)
  return (
    <li>
      <button type="button" className="fz-mov" onClick={() => abrirFormulario({ mov: m })}>
        <span className="fz-mov-texto">
          <span className="fz-mov-categoria">
            {transfer && <span aria-hidden="true">⇄ </span>}
            {descripcion(m)}
          </span>
          {detalle && <span className="fz-mov-nota">{detalle}</span>}
        </span>
        <Monto valor={valor} signo className={'fz-mov-monto ' + (transfer ? 'transfer' : m.tipo)} />
      </button>
    </li>
  )
}
