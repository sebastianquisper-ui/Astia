import { Icono, type NombreIcono } from './Icono'
import type { Pestana } from '../lib/ruta'

const ITEMS: { id: Pestana; texto: string; icono: NombreIcono }[] = [
  { id: 'hoy', texto: 'Hoy', icono: 'hoy' },
  { id: 'semana', texto: 'Semana', icono: 'semana' },
  { id: 'cursos', texto: 'Cursos', icono: 'cursos' },
  { id: 'tareas', texto: 'Tareas', icono: 'tareas' },
  { id: 'mas', texto: 'Más', icono: 'mas' },
]

export function NavInferior({ activa, alElegir }: { activa: Pestana; alElegir: (p: Pestana) => void }) {
  return (
    <nav className="nav" aria-label="Navegación principal">
      <div className="dentro">
        {ITEMS.map((it) => (
          <button key={it.id} aria-current={activa === it.id ? 'page' : undefined} onClick={() => alElegir(it.id)}>
            <span className="pastilla">
              <Icono nombre={it.icono} />
            </span>
            {it.texto}
          </button>
        ))}
      </div>
    </nav>
  )
}
