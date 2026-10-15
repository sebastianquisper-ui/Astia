// Saludo según la hora. Las frases de Astia viven en avatar.ts.

export function saludoDe(hora: number): string {
  if (hora < 12) return 'Buenos días'
  if (hora < 19) return 'Buenas tardes'
  return 'Buenas noches'
}
