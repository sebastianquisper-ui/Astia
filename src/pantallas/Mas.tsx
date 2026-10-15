import { Icono, type NombreIcono } from '../ui/Icono'
import { Vacio } from '../ui/Vacio'
import { Ajustes } from './Ajustes'

interface Entrada {
  id: string
  titulo: string
  detalle: string
  icono: NombreIcono
}

// Todas las funciones principales tienen su propia entrada visible (error 4 de la v1:
// el horario estaba escondido dentro de Ajustes).
const ENTRADAS: Entrada[] = [
  { id: 'horario', titulo: 'Horario de clases', detalle: 'Tus clases de lunes a domingo', icono: 'reloj' },
  { id: 'orbita', titulo: 'Mi Órbita', detalle: 'Deberes, trámites y vida personal', icono: 'orbita' },
  { id: 'calendario', titulo: 'Calendario', detalle: 'Fechas importantes del mes', icono: 'calendario' },
  { id: 'ciclo', titulo: 'Ciclo completo', detalle: 'Las 16 semanas y su carga', icono: 'ciclo' },
  { id: 'progreso', titulo: 'Progreso y rachas', detalle: 'Cuántos días seguidos cumples', icono: 'progreso' },
  { id: 'metas', titulo: 'Metas personales', detalle: 'Hábitos con su propia racha', icono: 'metas' },
  { id: 'enfoque', titulo: 'Enfoque y descanso', detalle: 'Métodos de estudio y temporizador', icono: 'enfoque' },
  { id: 'ajustes', titulo: 'Ajustes', detalle: 'Tema, tamaño de letra, nombre', icono: 'ajustes' },
  { id: 'mejora', titulo: 'Pedir mejora', detalle: 'Cuéntame qué le falta a Astia', icono: 'mejora' },
]

export function Mas({ sub, alAbrir }: { sub: string; alAbrir: (sub: string) => void }) {
  if (sub === 'ajustes') return <Ajustes alVolver={() => alAbrir('')} />

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
          {ENTRADAS.map((e) => (
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
