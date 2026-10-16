import { useCallback, useState } from 'react'
import type { Tarea } from '../dominio/tipos'
import { useDatos } from '../datos/DatosProvider'
import { Hoja } from '../ui/Hoja'
import { useAviso } from '../ui/Aviso'
import { FormTarea } from './FormTarea'

/**
 * Para crear o editar tareas desde cualquier pantalla.
 * Uso: const { abrir, nodo } = useEditorTarea()  →  abrir() crea, abrir(id) edita; pon {nodo} en la pantalla.
 */
export function useEditorTarea() {
  const { cursos, tareas, guardarTarea, borrarTarea } = useDatos()
  const avisar = useAviso()
  const [estado, setEstado] = useState<{ id?: string; plantilla?: Partial<Tarea> } | null>(null)
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
            avisar(personal ? (inicial ? 'Pendiente actualizado.' : 'Pendiente agregado.') : inicial ? 'Tarea actualizada.' : 'Tarea agregada.')
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
          alCerrar={cerrar}
        />
      )}
    </Hoja>
  )
  return { abrir, nodo }
}
