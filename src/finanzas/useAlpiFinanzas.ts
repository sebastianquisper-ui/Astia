import { useFinanzas } from './FinanzasProvider'

/** El Alpi de Finanstia: su experiencia y su nivel (los calcula el estado de Finanstia una sola vez). */
export const useAlpiFinanzas = () => useFinanzas().alpi
