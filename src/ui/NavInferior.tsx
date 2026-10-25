import { Icono, type NombreIcono } from './Icono'
import type { Pestana } from '../lib/ruta'
import type { Modo } from '../ajustes/AjustesProvider'

interface Item {
  id: Pestana | 'registrar'
  texto: string
  icono: NombreIcono
}

// La pestaña del medio cambia con el modo: Cursos (académico) o Hábitos (Mi Órbita).
// Finanstia tiene su propia barra, con el botón + al centro.
function itemsDe(modo: Modo): Item[] {
  if (modo === 'finanzas')
    return [
      { id: 'hoy', texto: 'Inicio', icono: 'hoy' },
      { id: 'movimientos', texto: 'Movimientos', icono: 'tareas' },
      { id: 'registrar', texto: 'Registrar', icono: 'mas' },
      { id: 'presupuesto', texto: 'Presupuesto', icono: 'dinero' },
      { id: 'metas', texto: 'Metas', icono: 'metas' },
    ]
  return [
    { id: 'hoy', texto: 'Hoy', icono: 'hoy' },
    { id: 'semana', texto: 'Semana', icono: 'semana' },
    modo === 'personal' ? { id: 'habitos', texto: 'Hábitos', icono: 'habitos' } : { id: 'cursos', texto: 'Cursos', icono: 'cursos' },
    { id: 'tareas', texto: modo === 'personal' ? 'Pendientes' : 'Tareas', icono: 'tareas' },
    { id: 'mas', texto: 'Más', icono: 'mas' },
  ]
}

export function NavInferior({ activa, modo, alElegir, alRegistrar }: { activa: Pestana; modo: Modo; alElegir: (p: Pestana) => void; alRegistrar?: () => void }) {
  return (
    <nav className="nav" aria-label="Navegación principal">
      <div className="dentro">
        {itemsDe(modo).map((it) => {
          const id = it.id
          return id === 'registrar' ? (
            <button key="registrar" className="nav-mas" onClick={alRegistrar} aria-label="Registrar un movimiento">
              <span className="pastilla">
                <Icono nombre="mas2" />
              </span>
            </button>
          ) : (
            <button key={id} aria-current={activa === id ? 'page' : undefined} onClick={() => alElegir(id)}>
              <span className="pastilla">
                <Icono nombre={it.icono} />
              </span>
              {it.texto}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
