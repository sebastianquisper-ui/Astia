import { useAjustes } from '../ajustes/AjustesProvider'
import { SemanaAcademica } from './Simples'
import { SemanaPersonal } from './SemanaPersonal'

export function Semana() {
  const { ajustes } = useAjustes()
  return ajustes.modo === 'personal' ? <SemanaPersonal /> : <SemanaAcademica />
}
