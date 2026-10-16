import { useAjustes } from '../ajustes/AjustesProvider'
import { HoyAcademico } from './HoyAcademico'
import { HoyPersonal } from './HoyPersonal'

/** "Hoy" cambia por completo según el modo: Académico o Mi Órbita. */
export function Hoy() {
  const { ajustes } = useAjustes()
  return ajustes.modo === 'personal' ? <HoyPersonal /> : <HoyAcademico />
}
