// Guardado en el teléfono (localStorage) SIN romper la app si el navegador lo bloquea
// (por ejemplo en modo privado). Si falla, devolvemos el valor por defecto.

export function leerLocal<T>(clave: string, porDefecto: T): T {
  try {
    const crudo = localStorage.getItem(clave)
    return crudo === null ? porDefecto : (JSON.parse(crudo) as T)
  } catch {
    return porDefecto
  }
}

/** Devuelve false si no se pudo guardar, para poder avisar al usuario (nada de fallos silenciosos). */
export function guardarLocal(clave: string, valor: unknown): boolean {
  try {
    localStorage.setItem(clave, JSON.stringify(valor))
    return true
  } catch {
    return false
  }
}
