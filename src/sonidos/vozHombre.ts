// Voz de hombre incluida en la app (Piper, gratis y de código abierto) para teléfonos cuyo navegador
// no entrega ninguna. Se descarga una sola vez (~63 MB) y queda guardada en el teléfono.
// La librería se carga solo al usarla, para que no pese en la app de todos los días.

export const VOZ_DE_HOMBRE = 'es_MX-ald-medium'
export const PESO_VOZ_DE_HOMBRE_MB = 63

const libreria = () => import('@mintplex-labs/piper-tts-web')

export async function vozDeHombreInstalada(): Promise<boolean> {
  try {
    return (await (await libreria()).stored()).includes(VOZ_DE_HOMBRE)
  } catch {
    return false
  }
}

/** Descarga la voz; `alAvanzar` recibe de 0 a 1 por cada archivo que baja. */
export async function descargarVozDeHombre(alAvanzar: (fraccion: number) => void) {
  const piper = await libreria()
  await piper.download(VOZ_DE_HOMBRE, (p) => p.total > 0 && alAvanzar(p.loaded / p.total))
}

export async function quitarVozDeHombre() {
  try {
    await (await libreria()).remove(VOZ_DE_HOMBRE)
  } catch {
    /* ya no estaba */
  }
}

// Un solo reproductor: en iOS solo suena si se "desbloqueó" con un toque (ver desbloquearVozDeHombre)
let reproductor: HTMLAudioElement | null = null
let turno = 0
const SILENCIO = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='

const audio = () => (reproductor ??= new Audio())

export function desbloquearVozDeHombre() {
  try {
    const a = audio()
    a.src = SILENCIO
    void a.play().catch(() => {})
  } catch {
    /* sin audio en este navegador */
  }
}

export function detenerVozDeHombre() {
  turno++
  reproductor?.pause()
}

/** Dice el texto; si algo falla lanza el error para que quien llama use la voz del teléfono. */
export async function decirConVozDeHombre(texto: string) {
  const mio = ++turno
  const piper = await libreria()
  const wav = await piper.predict({ text: texto, voiceId: VOZ_DE_HOMBRE })
  if (mio !== turno) return // llegó un aviso más nuevo mientras se generaba este
  const a = audio()
  a.src = URL.createObjectURL(wav)
  a.onended = () => URL.revokeObjectURL(a.src)
  await a.play()
}
