import { useCallback, useState } from 'react'
import type { Tarea } from '../dominio/tipos'
import { useDatos } from '../datos/DatosProvider'
import { Hoja } from '../ui/Hoja'
import { useAviso } from '../ui/Aviso'
import { AvisosTarea } from './AvisosTarea'
import { FormTarea } from './FormTarea'

/**
 * Para crear o editar tareas desde cualquier pantalla.
 * Uso: const { abrir, nodo } = useEditorTarea()  →  abrir() crea, abrir(id) edita; pon {nodo} en la pantalla.
 */
export function useEditorTarea() {
  const { cursos, tareas, guardarTarea, borrarTarea } = useDatos()
  const avisar = useAviso()
  const [estado, setEstado] = useState<{ id?: string; plantilla?: Partial<Tarea> } | null>(null)
  const [avisosDe, setAvisosDe] = useState<string | null>(null)
  const abrir = useCallback((id?: string, plantilla?: Partial<Tarea>) => setEstado({ id, plantilla }), [])
  const cerrar = useCallback(() => setEstado(null), [])
  const inicial = estado?.id ? tareas.find((t) => t.id === estado.id) : undefined
  const personal = (inicial?.area ?? estado?.plantilla?.area) === 'personal'

  const nodo = (
    <Hoja titulo={personal ? (inicial ? 'Editar pendiente' : 'Nuevo pendiente') : inicial ? 'Editar tarea' : 'Nueva tarea'} abierta={estado !== null} alCerrar={cerrar}>
      {estado && (
        <FormTarea
          key={estado.id ?? 'nueva'}
          inicial={inicial}
          plantilla={estado.plantilla}
          cursos={cursos}
          alGuardar={(t) => {
            guardarTarea(t)
            cerrar()
            avisar(personal ? (inicial ? 'Pendiente actualizado.' : 'Pendiente agregado.') : inicial ? 'Tarea actualizada.' : 'Tarea agregada.', 'ok', { accion: 'Configurar avisos', alAccion: () => setAvisosDe(t.id), duracion: 7000 })
          }}
          alBorrar={
            inicial
              ? () => {
                  borrarTarea(inicial.id)
                  cerrar()
                  avisar(personal ? 'Pendiente borrado.' : 'Tarea borrada.')
                }
              : undefined
          }
          alConfigurarAvisos={inicial ? () => { cerrar(); setAvisosDe(inicial.id) } : undefined}
          alCerrar={cerrar}
        />
      )}
    </Hoja>
  )
  const paraAvisos = avisosDe ? tareas.find((t) => t.id === avisosDe) : undefined
  const nodoAvisos = (
    <Hoja titulo="Configurar avisos" abierta={paraAvisos !== undefined} alCerrar={() => setAvisosDe(null)}>
      {paraAvisos && <AvisosTarea key={paraAvisos.id} tarea={paraAvisos} curso={cursos.find((c) => c.id === paraAvisos.cursoId)} alCerrar={() => setAvisosDe(null)} />}
    </Hoja>
  )
  return { abrir, nodo: <>{nodo}{nodoAvisos}</> }
}
