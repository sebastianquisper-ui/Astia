import { useEffect, useState } from 'react'
import { leerFoto } from '../datos/evidencias'
import type { Tarea } from '../dominio/tipos'

/** Muestra la evidencia con la que se cumplió una tarea: su foto y/o el enlace de la entrega. */
export function VerEvidencia({ tarea }: { tarea: Tarea }) {
  const ev = tarea.evidencia
  const [foto, setFoto] = useState<string | undefined>()
  useEffect(() => {
    if (ev?.foto) void leerFoto(tarea.id).then(setFoto)
  }, [tarea.id, ev?.foto])
  if (!ev) return null
  const dia = new Date(ev.fecha).toLocaleDateString('es-PE', { day: 'numeric', month: 'long' })
  return (
    <div className="ver-evidencia">
      <b>Evidencia entregada el {dia}</b>
      {foto && <img src={foto} alt={'Evidencia de ' + tarea.titulo} />}
      {ev.foto && !foto && <span className="nota">La foto quedó guardada en el teléfono donde la tomaste.</span>}
      {ev.enlace && (
        <a href={ev.enlace} target="_blank" rel="noreferrer">
          {ev.enlace}
        </a>
      )}
    </div>
  )
}
