// Regla 20-20-20: cada 20 minutos mirando la pantalla, mira algo a 20 pies (6 metros) durante 20 segundos.

export const MINUTOS_ENTRE_DESCANSOS = 20
export const SEGUNDOS_DE_DESCANSO = 20

/** Cuántos segundos faltan para el próximo descanso. 0 o menos = toca descansar ya. */
export const segundosParaDescansar = (usados: number): number => MINUTOS_ENTRE_DESCANSOS * 60 - usados
