import type { Area } from '../dominio/tipos'

export type FiltroArea = 'todo' | Area

const OPCIONES: { id: FiltroArea; texto: string }[] = [
  { id: 'todo', texto: 'Todo' },
  { id: 'universidad', texto: 'Universidad' },
  { id: 'personal', texto: 'Mi Órbita' },
]

export function SelectorArea({ valor, alCambiar }: { valor: FiltroArea; alCambiar: (v: FiltroArea) => void }) {
  return (
    <div className="seg" role="group" aria-label="Área">
      {OPCIONES.map((o) => (
        <button key={o.id} aria-pressed={valor === o.id} onClick={() => alCambiar(o.id)}>
          {o.texto}
        </button>
      ))}
    </div>
  )
}
