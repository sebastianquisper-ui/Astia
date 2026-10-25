import { useState } from 'react'
import { useAviso } from '../ui/Aviso'
import { Icono, type NombreIcono } from '../ui/Icono'
import { Ajustes } from '../pantallas/Ajustes'
import { Sonidos } from '../pantallas/Sonidos'
import { AlpiFinanzasPantalla } from './AlpiFinanzasPantalla'
import { useBloqueo } from './Bloqueo'
import { Comparar } from './Comparar'
import { useFinanzas } from './FinanzasProvider'
import { fechaLocal } from './modelo'

interface Entrada {
  id: string
  titulo: string
  detalle: string
  icono: NombreIcono
}

const ENTRADAS: Entrada[] = [
  { id: 'comparar', titulo: 'Comparar periodos', detalle: 'Este mes contra el anterior, o los que quieras', icono: 'progreso' },
  { id: 'alpi-finanzas', titulo: 'Mi Alpi de Finanstia', detalle: 'Su nivel y cómo gana experiencia con tu plata', icono: 'mascota' },
  { id: 'respaldo', titulo: 'Respaldo de mis finanzas', detalle: 'Copia tus movimientos, metas y presupuestos', icono: 'tramites' },
  { id: 'sonidos', titulo: 'Sonidos', detalle: 'Qué suena al cumplir una meta y más', icono: 'sonido' },
  { id: 'ajustes', titulo: 'Ajustes y cuenta', detalle: 'Tema, letra, tu cuenta de Google', icono: 'ajustes' },
]

/** Más, en Finanstia. */
export function MasFinanzas({ sub, alAbrir }: { sub: string; alAbrir: (sub: string) => void }) {
  const volver = () => alAbrir('')
  const { montosOcultos, alternarMontos } = useFinanzas()
  const { bloquear } = useBloqueo()
  if (sub === 'ajustes') return <Ajustes alVolver={volver} />
  if (sub === 'sonidos') return <Sonidos alVolver={volver} />
  if (sub === 'alpi-finanzas') return <AlpiFinanzasPantalla alVolver={volver} />
  if (sub === 'respaldo') return <Respaldo alVolver={volver} />
  if (sub === 'comparar')
    return (
      <section className="pantalla">
        <button className="volver" onClick={volver}>
          <Icono nombre="izquierda" /> Más
        </button>
        <h1 className="titulo">Comparar periodos</h1>
        <Comparar />
      </section>
    )
  return (
    <section className="pantalla">
      <h1 className="titulo">Más</h1>
      <div className="seccion" style={{ marginTop: 14 }}>
        <div className="lista">
          {ENTRADAS.map((e) => (
            <button key={e.id} className="fila" onClick={() => alAbrir(e.id)}>
              <span className="ico"><Icono nombre={e.icono} tam={24} /></span>
              <span className="texto">
                <b>{e.titulo}</b>
                <span>{e.detalle}</span>
              </span>
              <Icono nombre="derecha" tam={18} />
            </button>
          ))}
          <button className="fila" onClick={alternarMontos} aria-pressed={montosOcultos}>
            <span className="ico"><Icono nombre={montosOcultos ? 'ojoOff' : 'ojo'} tam={24} /></span>
            <span className="texto">
              <b>{montosOcultos ? 'Mostrar montos' : 'Ocultar montos'}</b>
              <span>Difumina todos los números de Finanstia</span>
            </span>
          </button>
          <button className="fila" onClick={bloquear}>
            <span className="ico"><Icono nombre="candado" tam={24} /></span>
            <span className="texto">
              <b>Bloquear Finanstia</b>
              <span>Vuelve a pedir tu PIN</span>
            </span>
          </button>
        </div>
      </div>
    </section>
  )
}

function Respaldo({ alVolver }: { alVolver: () => void }) {
  const { datos, config, metas, alFallar } = useFinanzas()
  const avisar = useAviso()
  const [texto, setTexto] = useState<string | null>(null)
  const esVista = import.meta.env.VITE_VISTA === '1'

  const armar = async () => {
    try {
      const movimientos = await datos.todosLosMovimientos()
      return JSON.stringify({ app: 'Finanstia', version: 1, exportado: new Date().toISOString(), perfil: { movimientos, metas: metas ?? [], presupuestos: config.presupuestos, categoriasGasto: config.categoriasGasto, categoriasIngreso: config.categoriasIngreso } }, null, 2)
    } catch (err) {
      alFallar(err)
      return null
    }
  }
  const copiar = async () => {
    const json = await armar()
    if (!json) return
    try {
      await navigator.clipboard.writeText(json)
      avisar('Respaldo copiado. Pégalo en un lugar seguro.')
    } catch {
      setTexto(json)
    }
  }
  const descargar = async () => {
    const json = await armar()
    if (!json) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
    a.download = `finanstia-respaldo-${fechaLocal()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    avisar('Respaldo descargado. Guárdalo en un lugar seguro y bórralo del teléfono cuando termines.')
  }
  return (
    <section className="pantalla">
      <button className="volver" onClick={alVolver}>
        <Icono nombre="izquierda" /> Más
      </button>
      <h1 className="titulo">Respaldo de mis finanzas</h1>
      <p className="sub">Una copia de tus movimientos, metas y presupuestos. Tiene tus datos de dinero: guárdala en un lugar seguro y no la subas a ningún repositorio público.</p>
      <div className="acciones">
        {!esVista && <button className="btn suave" onClick={descargar}>Descargar</button>}
        <button className="btn suave" onClick={copiar}>Copiar</button>
      </div>
      {texto && <textarea className="fz-respaldo" readOnly rows={8} value={texto} aria-label="Respaldo en texto" onFocus={(e) => e.currentTarget.select()} />}
    </section>
  )
}
