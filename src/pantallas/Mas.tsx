import { useAjustes, type Modo } from '../ajustes/AjustesProvider'
import { Icono, type NombreIcono } from '../ui/Icono'
import { Vacio } from '../ui/Vacio'
import { Ajustes } from './Ajustes'
import { Enfoque } from './Enfoque'
import { Horario } from './Horario'
import { Mascotas } from './Mascotas'
import { Rutinas } from './Rutinas'

interface Entrada {
  id: string
  titulo: string
  detalle: string
  icono: NombreIcono
  /** En qué modos aparece. */
  modos: Modo[]
}

// Todas las funciones principales tienen su propia entrada visible (error 4 de la v1:
// el horario estaba escondido dentro de Ajustes). Cada modo muestra solo lo suyo.
const ENTRADAS: Entrada[] = [
  { id: 'horario', titulo: 'Horario de clases', detalle: 'Tus clases de lunes a domingo', icono: 'reloj', modos: ['academico'] },
  { id: 'rutinas', titulo: 'Rutinas', detalle: 'Tu mañana, tu noche y tus entrenamientos', icono: 'rutinas', modos: ['personal'] },
  { id: 'mascota', titulo: 'Mi mascota', detalle: 'Elige a tu compañero y míralo evolucionar', icono: 'mascota', modos: ['academico', 'personal'] },
  { id: 'calendario', titulo: 'Calendario', detalle: 'Fechas importantes del mes', icono: 'calendario', modos: ['academico', 'personal'] },
  { id: 'ciclo', titulo: 'Ciclo completo', detalle: 'Las 16 semanas y su carga', icono: 'ciclo', modos: ['academico'] },
  { id: 'progreso', titulo: 'Progreso y rachas', detalle: 'Cuántos días seguidos cumples', icono: 'progreso', modos: ['academico', 'personal'] },
  { id: 'enfoque', titulo: 'Enfoque y descanso', detalle: 'Pomodoro, Feynman, Cornell y más técnicas', icono: 'enfoque', modos: ['academico'] },
  { id: 'ajustes', titulo: 'Ajustes', detalle: 'Tema, tamaño de letra, respaldo', icono: 'ajustes', modos: ['academico', 'personal'] },
  { id: 'mejora', titulo: 'Pedir mejora', detalle: 'Cuéntame qué le falta a Astia', icono: 'mejora', modos: ['academico', 'personal'] },
]

export function Mas({ sub, alAbrir }: { sub: string; alAbrir: (sub: string) => void }) {
  const { ajustes } = useAjustes()
  if (sub === 'ajustes') return <Ajustes alVolver={() => alAbrir('')} />
  if (sub === 'horario') return <Horario alVolver={() => alAbrir('')} />
  if (sub === 'enfoque') return <Enfoque alVolver={() => alAbrir('')} />
  if (sub === 'mascota') return <Mascotas alVolver={() => alAbrir('')} />
  if (sub === 'rutinas') return <Rutinas alVolver={() => alAbrir('')} />

  const entrada = ENTRADAS.find((e) => e.id === sub)
  if (entrada) {
    return (
      <section className="pantalla">
        <button className="volver" onClick={() => alAbrir('')}>
          <Icono nombre="izquierda" /> Más
        </button>
        <h1 className="titulo">{entrada.titulo}</h1>
        <p className="sub">{entrada.detalle}</p>
        <div className="seccion">
          <Vacio titulo="En construcción" texto="Esta pantalla se completa en las próximas fases." />
        </div>
      </section>
    )
  }

  return (
    <section className="pantalla">
      <h1 className="titulo">Más</h1>
      <div className="seccion" style={{ marginTop: 14 }}>
        <div className="lista">
          {ENTRADAS.filter((e) => e.modos.includes(ajustes.modo)).map((e) => (
            <button key={e.id} className="fila" onClick={() => alAbrir(e.id)}>
              <span className="ico">
                <Icono nombre={e.icono} tam={24} />
              </span>
              <span className="texto">
                <b>{e.titulo}</b>
                <span>{e.detalle}</span>
              </span>
              <Icono nombre="derecha" tam={18} />
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
