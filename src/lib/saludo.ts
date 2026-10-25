// Saludo según la hora. Las frases de Astia viven en avatar.ts.

export function saludoDe(hora: number): string {
  if (hora < 12) return 'Buenos días'
  if (hora < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

/** "Buenas tardes, Ana." — o solo "Buenas tardes." si todavía no hay nombre. */
export function saludoConNombre(hora: number, nombre: string): string {
  const quien = nombre.trim()
  return quien ? `${saludoDe(hora)}, ${quien}.` : `${saludoDe(hora)}.`
}
