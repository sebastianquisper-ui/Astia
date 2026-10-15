import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icono } from './Icono'

// Hoja inferior: un panel que sube desde abajo (formularios, confirmaciones).
// Se dibuja en la capa superior de la página (portal): si no, la barra de navegación
// quedaba por encima y tapaba los botones de abajo.
export function Hoja({ titulo, abierta, alCerrar, children }: { titulo: string; abierta: boolean; alCerrar: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!abierta) return
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && alCerrar()
    document.addEventListener('keydown', alTeclear)
    const previo = document.body.style.overflow
    document.body.style.overflow = 'hidden' // la página de atrás no se mueve
    return () => {
      document.removeEventListener('keydown', alTeclear)
      document.body.style.overflow = previo
    }
  }, [abierta, alCerrar])

  if (!abierta) return null
  return createPortal(
    <div className="hoja-fondo" onClick={alCerrar}>
      <div className="hoja" role="dialog" aria-modal="true" aria-label={titulo} onClick={(e) => e.stopPropagation()}>
        <div className="hoja-asa" aria-hidden="true" />
        <div className="hoja-cab">
          <h2 className="titulo">{titulo}</h2>
          <button className="icono-btn" onClick={alCerrar} aria-label="Cerrar">
            <Icono nombre="cerrar" tam={20} />
          </button>
        </div>
        <div className="hoja-cuerpo">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
