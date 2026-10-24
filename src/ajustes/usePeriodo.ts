import { etapaDe } from '../lib/etapa'
import { useAjustes } from './AjustesProvider'

/** Cómo se llama tu periodo ("Ciclo", "Bimestre"...) y tu etapa de estudios. */
export function usePeriodo() {
  const { ajustes } = useAjustes()
  const etapa = etapaDe(ajustes.etapa)
  const nombre = ajustes.periodo?.trim() || etapa.periodo
  return { etapa, nombre, minuscula: nombre.toLowerCase() }
}
