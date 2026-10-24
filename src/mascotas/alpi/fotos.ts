import nivel1 from '../../assets/alpi/foto-nivel-1.webp'
import nivel2 from '../../assets/alpi/foto-nivel-2.webp'
import nivel3 from '../../assets/alpi/foto-nivel-3.webp'
import nivel4 from '../../assets/alpi/foto-nivel-4.webp'

/** Fotos de Alpi sacadas de su modelo 3D, de frente (herramientas/alpi/fotos.mjs). Para listas y miniaturas. */
export const FOTOS_ALPI = [nivel1, nivel2, nivel3, nivel4]
export const fotoAlpi = (nivel: number): string => FOTOS_ALPI[Math.max(1, Math.min(4, Math.round(nivel))) - 1]
