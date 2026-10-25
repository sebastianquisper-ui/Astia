import type { Modo } from '../ajustes/AjustesProvider'

const MODOS: { id: Modo; texto: string }[] = [
  { id: 'academico', texto: 'Académico' },
  { id: 'personal', texto: 'Mi Órbita' },
  { id: 'finanzas', texto: 'Finanstia' },
]

export function SelectorModo({ modo, alCambiar }: { modo: Modo; alCambiar: (m: Modo) => void }) {
  return (
    <div className="modo-sel" role="group" aria-label="Modo">
      {MODOS.map((m) => (
        <button key={m.id} aria-pressed={modo === m.id} onClick={() => alCambiar(m.id)}>
          {m.texto}
        </button>
      ))}
    </div>
  )
}
