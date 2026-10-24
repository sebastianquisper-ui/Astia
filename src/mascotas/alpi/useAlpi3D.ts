import { useAjustes } from '../../ajustes/AjustesProvider'
import { hayWebGL } from './webgl'

/** ¿Mostrar a Alpi en 3D? Si el teléfono puede y no lo apagaste en Ajustes. */
export function useAlpi3D(): boolean {
  const { ajustes } = useAjustes()
  return ajustes.alpi3d !== false && hayWebGL()
}
