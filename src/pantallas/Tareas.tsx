import { useState } from 'react'
import { useDatos } from '../datos/DatosProvider'
import { useEditorTarea } from '../formularios/EditorTarea'
import { porUrgencia, urgenciaDe } from '../lib/urgencia'
import { useAviso } from '../ui/Aviso'
import { FilaTarea } from '../ui/FilaTarea'
import { SelectorArea, type FiltroArea } from '../ui/SelectorArea'
import { useAhora } from '../ui/useAhora'
import { Vacio } from '../ui/Vacio'

export function Tareas() {
  const { tareas, cursos, hayDatos, alternar } = useDatos()
  const { abrir, nodo } = useEditorTarea()
  const avisar = useAviso()
  const ahora = useAhora()
  const [filtro, setFiltro] = useState<'pend' | 'hechas'>('pend')
  const [area, setArea] = useState<FiltroArea>('todo')

  const visibles = tareas
    .filter((t) => (area === 'todo' || t.area === area) && (filtro === 'pend' ? t.estado === 'pendiente' : t.estado === 'hecha'))
    .sort(porUrgencia)
  const vencidas = visibles.filter((t) => urgenciaDe(t, ahora) === 'vencida')
  const resto = visibles.filter((t) => urgenciaDe(t, ahora) !== 'vencida')

  const lista = (items: typeof visibles) => (
    <div className="tlista">
      {items.map((t) => (
        <FilaTarea
          key={t.id}
          tarea={t}
          curso={cursos.find((c) => c.id === t.cursoId)}
          ahora={ahora}
          alAbrir={() => abrir(t.id)}
          alAlternar={() => {
            alternar(t.id)
            avisar(t.estado === 'hecha' ? 'Tarea reabierta.' : 'Hecha. Una menos.')
          }}
        />
      ))}
    </div>
  )

  return (
    <section className="pantalla">
      <div className="seccion-cab">
        <h1 className="titulo">Tareas</h1>
        <button className="btn pequeno" onClick={() => abrir()}>+ Nueva tarea</button>
      </div>
      <p className="sub">Rojo: menos de 48 h · Ámbar: esta semana · Verde: después.</p>

      <div className="bloque">
        <div className="seg" role="group" aria-label="Estado">
          <button aria-pressed={filtro === 'pend'} onClick={() => setFiltro('pend')}>Pendientes</button>
          <button aria-pressed={filtro === 'hechas'} onClick={() => setFiltro('hechas')}>Hechas</button>
        </div>
      </div>
      <div className="bloque">
        <SelectorArea valor={area} alCambiar={setArea} />
      </div>

      {visibles.length === 0 && (
        <div className="seccion">
          <Vacio
            titulo={hayDatos ? (filtro === 'pend' ? 'Nada pendiente' : 'Aún no hay hechas') : 'Nada pendiente'}
            texto={hayDatos ? 'Cuando haya tareas en esta lista, aparecerán aquí.' : 'Agrega una tarea con el botón de arriba, o importa tu respaldo de la v1 en Más → Ajustes.'}
          />
        </div>
      )}
      {vencidas.length > 0 && (
        <div className="seccion">
          <h2 className="titulo rojo">Vencidas</h2>
          {lista(vencidas)}
        </div>
      )}
      {resto.length > 0 && (
        <div className="seccion">
          {vencidas.length > 0 && <h2 className="titulo">Por venir</h2>}
          {lista(resto)}
        </div>
      )}
      {nodo}
    </section>
  )
}
