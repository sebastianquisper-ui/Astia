import type { Modo } from '../ajustes/AjustesProvider'

export function SelectorModo({ modo, alCambiar }: { modo: Modo; alCambiar: (m: Modo) => void }) {
  return (
    <div className="modo-sel" role="group" aria-label="Modo">
      <button aria-pressed={modo === 'academico'} onClick={() => alCambiar('academico')}>Académico</button>
      <button aria-pressed={modo === 'personal'} onClick={() => alCambiar('personal')}>Mi Órbita</button>
    </div>
  )
}
