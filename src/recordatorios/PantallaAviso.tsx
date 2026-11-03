import { useEffect } from 'react'
import type { Tarea } from '../dominio/tipos'
import { horaBonita, textoFalta } from '../lib/alarmas'
import { textoVence, urgenciaDe } from '../lib/urgencia'

/** Lo que se muestra a pantalla completa. */
export type AvisoGrande =
  | { tipo: 'clase'; curso: string; aula: string; inicio: string; minutos: number }
  | { tipo: 'alarma'; hora: string; pendientes: Tarea[]; cursoDe: (t: Tarea) => string }

/**
 * Aviso que tapa toda la pantalla, como cuando te toca un curso: no se puede ignorar sin tocar algo.
 * Funciona con Astia abierta; con la app cerrada llega la alarma de Google Calendar.
 */
export function PantallaAviso({ aviso, alCerrar, alPosponer, alVerPendientes }: { aviso: AvisoGrande; alCerrar: () => void; alPosponer: () => void; alVerPendientes: () => void }) {
  // Escape cierra; el resto de la app queda tapada
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && alCerrar()
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [alCerrar])

  const ahora = new Date()
  const titulo = aviso.tipo === 'clase' ? aviso.curso : 'Revisa tus pendientes'
  return (
    <div className="aviso-grande" role="alertdialog" aria-modal="true" aria-labelledby="ag-titulo">
      <div className="aviso-grande-cuerpo">
        <p className="aviso-grande-etiqueta">{aviso.tipo === 'clase' ? 'Tu próxima clase' : `Alarma de las ${horaBonita(aviso.hora)}`}</p>
        <h1 id="ag-titulo" className="aviso-grande-titulo">{titulo}</h1>
        {aviso.tipo === 'clase' ? (
          <>
            <p className="aviso-grande-cuenta">{textoFalta(aviso.minutos)}</p>
            <p className="aviso-grande-sub">{aviso.inicio}{aviso.aula ? ` · ${aviso.aula}` : ''}</p>
          </>
        ) : (
          <>
            <p className="aviso-grande-cuenta">{aviso.pendientes.length === 1 ? '1 pendiente' : `${aviso.pendientes.length} pendientes`}</p>
            <ul className="aviso-grande-lista">
              {aviso.pendientes.slice(0, 5).map((t) => (
                <li key={t.id} className={urgenciaDe(t, ahora)}>
                  <b>{t.titulo}</b>
                  <span>{[aviso.cursoDe(t), textoVence(t, ahora)].filter(Boolean).join(' · ')}</span>
                </li>
              ))}
            </ul>
            {aviso.pendientes.length > 5 && <p className="aviso-grande-sub">y {aviso.pendientes.length - 5} más</p>}
          </>
        )}
      </div>
      <div className="aviso-grande-acciones">
        {aviso.tipo === 'alarma' && <button className="btn" onClick={alVerPendientes}>Ver mis pendientes</button>}
        <button className="btn suave" onClick={alPosponer}>Recordarme en 10 min</button>
        <button className="btn suave" onClick={alCerrar}>Entendido</button>
      </div>
    </div>
  )
}
