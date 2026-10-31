import { CLAVE_PUBLICA_VAPID, URL_SERVIDOR } from './config'
import type { Aviso } from './avisos'

// Avisos con la app cerrada (Web Push). En iPhone solo funciona con Astia instalada en la pantalla de inicio (iOS 16.4 o más)
// y después de aceptar el permiso con un toque. Los envía el servidor de la carpeta `servidor`.

export const pushConfigurado = () => URL_SERVIDOR !== '' && CLAVE_PUBLICA_VAPID !== ''

export const pushSoportado = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

/** En iPhone, el permiso solo se puede pedir si la app está instalada en la pantalla de inicio. */
export const esAppInstalada = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

export const permisoDeAvisos = (): NotificationPermission | 'no-soportado' => (pushSoportado() ? Notification.permission : 'no-soportado')

function aBytes(base64Url: string): Uint8Array<ArrayBuffer> {
  const relleno = '='.repeat((4 - (base64Url.length % 4)) % 4)
  const crudo = atob((base64Url + relleno).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(crudo, (c) => c.charCodeAt(0))
}

async function suscripcionActual(): Promise<PushSubscription | null> {
  const registro = await navigator.serviceWorker.ready
  return registro.pushManager.getSubscription()
}

async function llamar(ruta: string, cuerpo: unknown): Promise<Response> {
  return fetch(URL_SERVIDOR.replace(/\/$/, '') + ruta, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) })
}

export type ResultadoActivar = 'ok' | 'denegado' | 'no-instalada' | 'no-soportado' | 'fallo'

/** Pide el permiso y suscribe este dispositivo. Debe llamarse desde un toque del usuario. */
export async function activarAvisos(): Promise<ResultadoActivar> {
  if (!pushSoportado() || !pushConfigurado()) return 'no-soportado'
  if (!esAppInstalada()) return 'no-instalada'
  try {
    if ((await Notification.requestPermission()) !== 'granted') return 'denegado'
    const registro = await navigator.serviceWorker.ready
    const sub = (await registro.pushManager.getSubscription()) ?? (await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: aBytes(CLAVE_PUBLICA_VAPID) }))
    const r = await llamar('/suscribir', { sub: sub.toJSON(), avisos: [] })
    return r.ok ? 'ok' : 'fallo'
  } catch {
    return 'fallo'
  }
}

/** Le pide al servidor un aviso inmediato, para comprobar que llega con la app cerrada. */
export async function enviarAvisoDePrueba(): Promise<boolean> {
  try {
    const sub = await suscripcionActual()
    if (!sub) return false
    const r = await llamar('/prueba', { sub: sub.toJSON() })
    return r.ok && ((await r.json()) as { ok?: boolean }).ok === true
  } catch {
    return false
  }
}

/** Le entrega al servidor la lista actual de avisos (reemplaza la anterior). */
export async function sincronizarAvisos(avisos: Aviso[]): Promise<boolean> {
  try {
    const sub = await suscripcionActual()
    if (!sub) return false
    return (await llamar('/suscribir', { sub: sub.toJSON(), avisos })).ok
  } catch {
    return false
  }
}

/** Apaga los avisos en este dispositivo y pide al servidor que olvide todo. */
export async function desactivarAvisos(): Promise<void> {
  try {
    const sub = await suscripcionActual()
    if (!sub) return
    await llamar('/olvidar', { sub: sub.toJSON() }).catch(() => {})
    await sub.unsubscribe()
  } catch {
    /* ya estaba apagado */
  }
}
