// Saludo y frases de Astia. Tono: estricta, directa, sin excusas (español peruano neutro).

export function saludoDe(hora: number): string {
  if (hora < 12) return 'Buenos días'
  if (hora < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

const FRASES_INICIO = [
  'Aún no me diste tus cursos ni tu horario. Cárgalos ahora y empezamos.',
  'Sin cursos no hay plan. Agrégalos y dejo de adivinar.',
]

/**
 * Elige una frase estable durante todo el día (no cambia cada vez que abres la app).
 * Cuando haya datos reales (fase 3) se sumarán las frases de vencidas, hoy, etc.
 */
export function fraseDelDia(ahora: Date = new Date()): string {
  const inicioAnio = new Date(ahora.getFullYear(), 0, 0)
  const dia = Math.floor((ahora.getTime() - inicioAnio.getTime()) / 864e5)
  return FRASES_INICIO[dia % FRASES_INICIO.length]
}
