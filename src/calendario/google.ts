// Google Calendar: Astia crea un evento con alarma para cada recordatorio (así te avisa aunque la app esté cerrada)
// y lo borra cuando pasa. Solo toca los eventos que ella misma creó. El permiso es solo el de crear y borrar eventos.

/** El ID de cliente de Google (público, como firebaseConfig). Se completa al crear el cliente OAuth; vacío = apagado. */
export const CLIENT_ID = ''
const SCOPE = 'https://www.googleapis.com/auth/calendar.events'
const API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'

export const calendarioConfigurado = (): boolean => CLIENT_ID !== ''

interface RespuestaToken {
  access_token?: string
  expires_in?: number | string
  error?: string
}
interface ClienteToken {
  requestAccessToken: (opciones?: { prompt?: string }) => void
}
interface GoogleId {
  accounts: { oauth2: { initTokenClient: (c: { client_id: string; scope: string; callback: (r: RespuestaToken) => void; error_callback?: (e: unknown) => void }) => ClienteToken } }
}
const google = (): GoogleId | undefined => (globalThis as unknown as { google?: GoogleId }).google

let cargando: Promise<void> | null = null
function cargarGoogle(): Promise<void> {
  if (google()?.accounts?.oauth2) return Promise.resolve()
  cargando ??= new Promise<void>((ok, mal) => {
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = () => ok()
    s.onerror = () => {
      cargando = null
      mal(new Error('No se pudo cargar Google. Revisa tu internet.'))
    }
    document.head.appendChild(s)
  })
  return cargando
}

let token: { valor: string; vence: number } | null = null
const vigente = () => (token && token.vence > Date.now() + 30_000 ? token.valor : null)

/** Pide permiso a Google. `interactivo` abre la ventana de Google (debe venir de un toque); si no, intenta sin ventana. */
export async function conectarCalendario(interactivo: boolean): Promise<boolean> {
  if (!calendarioConfigurado()) return false
  if (vigente()) return true
  try {
    await cargarGoogle()
  } catch {
    return false
  }
  return new Promise<boolean>((ok) => {
    const cliente = google()!.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (r) => {
        if (r.access_token) {
          token = { valor: r.access_token, vence: Date.now() + Number(r.expires_in ?? 3000) * 1000 }
          ok(true)
        } else ok(false)
      },
      error_callback: () => ok(false),
    })
    cliente.requestAccessToken({ prompt: interactivo ? '' : 'none' })
  })
}

export const calendarioConectado = (): boolean => vigente() !== null

export interface EventoRecordatorio {
  id: string
  texto: string
  cuando: Date
}

/** Crea el evento con alarma a la hora exacta. Devuelve el id del evento en Google. */
export async function crearEventoRecordatorio(r: EventoRecordatorio): Promise<string> {
  const t = vigente()
  if (!t) throw new Error('Sin permiso de Google Calendar')
  const zona = Intl.DateTimeFormat().resolvedOptions().timeZone
  const fin = new Date(r.cuando.getTime() + 5 * 60_000)
  const res = await fetch(API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      summary: `⏰ ${r.texto}`,
      description: 'Recordatorio de Astia. Se borra solo cuando pasa.',
      start: { dateTime: r.cuando.toISOString(), timeZone: zona },
      end: { dateTime: fin.toISOString(), timeZone: zona },
      reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 0 }] },
      extendedProperties: { private: { astia: r.id } },
    }),
  })
  if (!res.ok) throw new Error(`Google Calendar respondió ${res.status}`)
  const evento = (await res.json()) as { id?: string }
  if (!evento.id) throw new Error('Google Calendar no devolvió el evento')
  return evento.id
}

/** Borra un evento que creó Astia. Si ya no existe, cuenta como borrado. */
export async function borrarEventoRecordatorio(idEvento: string): Promise<boolean> {
  const t = vigente()
  if (!t) return false
  try {
    const res = await fetch(`${API}/${encodeURIComponent(idEvento)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${t}` } })
    return res.ok || res.status === 404 || res.status === 410
  } catch {
    return false
  }
}

/** Solo para pruebas. */
export const _olvidarToken = () => {
  token = null
}
export const _ponerToken = (valor: string) => {
  token = { valor, vence: Date.now() + 3_000_000 }
}
