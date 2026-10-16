import { useState } from 'react'
import { useAjustes } from '../ajustes/AjustesProvider'
import { useDatos } from '../datos/DatosProvider'
import { useEditorTarea } from '../formularios/EditorTarea'
import { porUrgencia, urgenciaDe } from '../lib/urgencia'
import { useAviso } from '../ui/Aviso'
import { FilaTarea } from '../ui/FilaTarea'
import { useAhora } from '../ui/useAhora'
import { Vacio } from '../ui/Vacio'

/** Tareas (Académico) o Pendientes (Mi Órbita): cada modo ve solo lo suyo. */
export function Tareas() {
  const { ajustes } = useAjustes()
  const { tareas, cursos, alternar } = useDatos()
  const { abrir, nodo } = useEditorTarea()
  const avisar = useAviso()
  const ahora = useAhora()
  const [filtro, setFiltro] = useState<'pend' | 'hechas'>('pend')
  const personal = ajustes.modo === 'personal'
  const area = personal ? 'personal' : 'universidad'

  const delModo = tareas.filter((t) => t.area === area)
  const visibles = delModo.filter((t) => (filtro === 'pend' ? t.estado === 'pendiente' : t.estado === 'hecha')).sort(porUrgencia)
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
            avisar(t.estado === 'hecha' ? (personal ? 'Pendiente reabierto.' : 'Tarea reabierta.') : 'Hecha. Una menos.')
          }}
        />
      ))}
    </div>
  )

  return (
    <section className="pantalla">
      <div className="seccion-cab">
        <h1 className="titulo">{personal ? 'Pendientes' : 'Tareas'}</h1>
        <button className="btn pequeno" onClick={() => abrir(undefined, { area })}>{personal ? '+ Nuevo pendiente' : '+ Nueva tarea'}</button>
      </div>
      <p className="sub">{personal ? 'Lo que tienes que hacer fuera de clase, por apartado y fecha.' : 'Rojo: menos de 48 h · Ámbar: esta semana · Verde: después.'}</p>

      <div className="bloque">
        <div className="seg" role="group" aria-label="Estado">
          <button aria-pressed={filtro === 'pend'} onClick={() => setFiltro('pend')}>Pendientes</button>
          <button aria-pressed={filtro === 'hechas'} onClick={() => setFiltro('hechas')}>Hechas</button>
        </div>
      </div>

      {visibles.length === 0 && (
        <div className="seccion">
          <Vacio
            titulo={filtro === 'pend' ? 'Nada pendiente' : 'Aún no hay hechas'}
            texto={
              delModo.length
                ? 'Cuando haya algo en esta lista, aparecerá aquí.'
                : personal
                  ? 'Agrega un pendiente personal con el botón de arriba.'
                  : 'Agrega una tarea con el botón de arriba, o importa tu respaldo de la v1 en Más → Ajustes.'
            }
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
