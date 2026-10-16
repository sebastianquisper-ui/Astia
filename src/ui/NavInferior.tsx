import { Icono, type NombreIcono } from './Icono'
import type { Pestana } from '../lib/ruta'
import type { Modo } from '../ajustes/AjustesProvider'

// La pestaña del medio cambia con el modo: Cursos (académico) o Hábitos (Mi Órbita).
function itemsDe(modo: Modo, tareasTexto: string): { id: Pestana; texto: string; icono: NombreIcono }[] {
  return [
    { id: 'hoy', texto: 'Hoy', icono: 'hoy' },
    { id: 'semana', texto: 'Semana', icono: 'semana' },
    modo === 'personal' ? { id: 'habitos', texto: 'Hábitos', icono: 'habitos' } : { id: 'cursos', texto: 'Cursos', icono: 'cursos' },
    { id: 'tareas', texto: tareasTexto, icono: 'tareas' },
    { id: 'mas', texto: 'Más', icono: 'mas' },
  ]
}

export function NavInferior({ activa, modo, alElegir }: { activa: Pestana; modo: Modo; alElegir: (p: Pestana) => void }) {
  return (
    <nav className="nav" aria-label="Navegación principal">
      <div className="dentro">
        {itemsDe(modo, modo === 'personal' ? 'Pendientes' : 'Tareas').map((it) => (
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
