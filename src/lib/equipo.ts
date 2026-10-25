// Detecta celulares de gama baja para apagar los efectos más pesados.

interface NavegadorConMemoria extends Navigator {
  deviceMemory?: number
  connection?: { saveData?: boolean }
}

export function esEquipoLimitado(nav: NavegadorConMemoria = navigator as NavegadorConMemoria): boolean {
  if (nav.connection?.saveData) return true
  if (nav.deviceMemory !== undefined && nav.deviceMemory <= 4) return true
  return nav.hardwareConcurrency !== undefined && nav.hardwareConcurrency <= 4
}
