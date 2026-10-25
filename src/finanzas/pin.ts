// PIN de Finanstia. Se guarda solo en este teléfono, nunca el número: solo una huella (PBKDF2 con sal).
// Protege tu plata de quien tenga tu teléfono desbloqueado; no es cifrado de los datos.

export const PIN_MIN = 4
export const PIN_MAX = 6
const ITERACIONES = 150_000

export interface RegistroPin {
  sal: string
  huella: string
  iteraciones: number
}

export const pinValido = (pin: string): boolean => new RegExp(`^\\d{${PIN_MIN},${PIN_MAX}}$`).test(pin)

const aBase64 = (b: ArrayBuffer | Uint8Array): string => btoa(String.fromCharCode(...new Uint8Array(b instanceof Uint8Array ? b : new Uint8Array(b))))
const deBase64 = (s: string): Uint8Array => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

async function huellaDe(pin: string, sal: Uint8Array, iteraciones: number): Promise<string> {
  const clave = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: sal as BufferSource, iterations: iteraciones }, clave, 256)
  return aBase64(bits)
}

export async function crearRegistroPin(pin: string): Promise<RegistroPin> {
  if (!pinValido(pin)) throw new Error(`El PIN son ${PIN_MIN} a ${PIN_MAX} números.`)
  const sal = crypto.getRandomValues(new Uint8Array(16))
  return { sal: aBase64(sal), huella: await huellaDe(pin, sal, ITERACIONES), iteraciones: ITERACIONES }
}

export async function verificarPin(pin: string, reg: RegistroPin): Promise<boolean> {
  if (!pinValido(pin)) return false
  const huella = await huellaDe(pin, deBase64(reg.sal), reg.iteraciones)
  // Comparación sin cortar en la primera diferencia
  let dif = huella.length ^ reg.huella.length
  for (let i = 0; i < huella.length; i++) dif |= huella.charCodeAt(i) ^ (reg.huella.charCodeAt(i) || 0)
  return dif === 0
}

// ---------- guardado en el teléfono ----------

const claveRegistro = (uid: string) => `astia.finanzas.pin.${uid}`
const claveIntentos = (uid: string) => `astia.finanzas.intentos.${uid}`

export function leerRegistroPin(uid: string): RegistroPin | null {
  try {
    const crudo = localStorage.getItem(claveRegistro(uid))
    if (!crudo) return null
    const r = JSON.parse(crudo) as RegistroPin
    return r?.sal && r?.huella && r?.iteraciones ? r : null
  } catch {
    return null
  }
}

export function guardarRegistroPin(uid: string, reg: RegistroPin): void {
  try {
    localStorage.setItem(claveRegistro(uid), JSON.stringify(reg))
  } catch {
    /* sin almacenamiento: el PIN no se podrá recordar */
  }
}

export function borrarRegistroPin(uid: string): void {
  try {
    localStorage.removeItem(claveRegistro(uid))
    localStorage.removeItem(claveIntentos(uid))
  } catch {
    /* nada que borrar */
  }
}

// ---------- intentos fallidos: tras 5 errores, se espera cada vez más ----------

export interface EstadoIntentos {
  fallos: number
  /** Milisegundos desde 1970 hasta cuando se puede volver a intentar. */
  hasta: number
}

export const INTENTOS_LIBRES = 5

export function leerIntentos(uid: string): EstadoIntentos {
  try {
    const e = JSON.parse(localStorage.getItem(claveIntentos(uid)) ?? 'null') as EstadoIntentos | null
    return e && Number.isFinite(e.fallos) && Number.isFinite(e.hasta) ? e : { fallos: 0, hasta: 0 }
  } catch {
    return { fallos: 0, hasta: 0 }
  }
}

/** Segundos de espera después de este número de fallos seguidos (0 si todavía no toca esperar). */
export function esperaTrasFallos(fallos: number): number {
  if (fallos < INTENTOS_LIBRES) return 0
  return Math.min(15 * 60, 30 * 2 ** (fallos - INTENTOS_LIBRES))
}

export function anotarFallo(uid: string, ahora = Date.now()): EstadoIntentos {
  const fallos = leerIntentos(uid).fallos + 1
  const e = { fallos, hasta: ahora + esperaTrasFallos(fallos) * 1000 }
  try {
    localStorage.setItem(claveIntentos(uid), JSON.stringify(e))
  } catch {
    /* sin almacenamiento */
  }
  return e
}

export function limpiarIntentos(uid: string): void {
  try {
    localStorage.removeItem(claveIntentos(uid))
  } catch {
    /* nada */
  }
}
