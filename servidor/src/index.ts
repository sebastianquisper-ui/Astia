import { buildPushPayload } from '@block65/webcrypto-web-push'
import { aplicarAgenda, idDe, quitarSuscripcion, sacarVencidos, validarAvisos, validarSuscripcion, type Aviso, type Estado, type Suscripcion } from './logica'

// Servidor de avisos de Astia. Guarda las suscripciones de tus dispositivos y, cada minuto, envía los avisos que ya tocan.
//   POST /suscribir  { sub, avisos }   guarda o actualiza tu agenda de avisos
//   POST /prueba     { sub }           manda un aviso ahora mismo (para comprobar que llega)
//   POST /olvidar    { sub }           borra tu suscripción y tus avisos

interface Env {
  AVISOS: KVNamespace
  ORIGENES: string
  VAPID_SUBJECT: string
  VAPID_PUBLIC_KEY: string
  VAPID_PRIVATE_KEY: string
}

const CLAVE_ESTADO = 'estado'
const MAX_CUERPO = 20_000

const leerEstado = async (env: Env) => ((await env.AVISOS.get(CLAVE_ESTADO, 'json')) as Estado | null) ?? {}
const guardarEstado = (env: Env, estado: Estado) => env.AVISOS.put(CLAVE_ESTADO, JSON.stringify(estado))

function cabecerasCors(req: Request, env: Env): Record<string, string> {
  const origen = req.headers.get('Origin') ?? ''
  const permitido = env.ORIGENES.split(',').map((o) => o.trim()).includes(origen)
  return permitido ? { 'Access-Control-Allow-Origin': origen, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', Vary: 'Origin' } : {}
}

const responder = (req: Request, env: Env, cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json', ...cabecerasCors(req, env) } })

/** Devuelve el código HTTP del servicio de avisos (201 = entregado). */
async function enviar(env: Env, sub: Suscripcion, aviso: Pick<Aviso, 'id' | 'titulo' | 'cuerpo'>): Promise<number> {
  const vapid = { subject: env.VAPID_SUBJECT, publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY }
  const payload = await buildPushPayload({ data: JSON.stringify({ id: aviso.id, titulo: aviso.titulo, cuerpo: aviso.cuerpo }), options: { ttl: 3600, urgency: 'high' } }, { ...sub, expirationTime: null }, vapid)
  const res = await fetch(sub.endpoint, payload)
  return res.status
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const origen = req.headers.get('Origin') ?? ''
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cabecerasCors(req, env) })
    // Solo habla con Astia (el navegador siempre manda el origen)
    if (!env.ORIGENES.split(',').map((o) => o.trim()).includes(origen)) return new Response('No autorizado', { status: 403 })
    if (req.method !== 'POST') return responder(req, env, { error: 'Método no permitido' }, 405)
    if (Number(req.headers.get('Content-Length') ?? 0) > MAX_CUERPO) return responder(req, env, { error: 'Demasiado grande' }, 413)

    let datos: { sub?: unknown; avisos?: unknown }
    try {
      datos = await req.json()
    } catch {
      return responder(req, env, { error: 'JSON inválido' }, 400)
    }
    const sub = validarSuscripcion(datos.sub)
    if (!sub) return responder(req, env, { error: 'Suscripción inválida' }, 400)
    const id = await idDe(sub.endpoint)
    const ruta = new URL(req.url).pathname

    if (ruta === '/suscribir') {
      const estado = await leerEstado(env)
      await guardarEstado(env, aplicarAgenda(estado, id, sub, validarAvisos(datos.avisos)))
      return responder(req, env, { ok: true })
    }
    if (ruta === '/prueba') {
      const codigo = await enviar(env, sub, { id: 'prueba', titulo: 'Astia', cuerpo: 'Si ves esto con la app cerrada, los avisos funcionan.' })
      return responder(req, env, { ok: codigo >= 200 && codigo < 300, codigo })
    }
    if (ruta === '/olvidar') {
      await guardarEstado(env, quitarSuscripcion(await leerEstado(env), id))
      return responder(req, env, { ok: true })
    }
    return responder(req, env, { error: 'No existe' }, 404)
  },

  /** Cada minuto: envía lo que ya toca y olvida las suscripciones que el dispositivo ya no acepta. */
  async scheduled(_evento: ScheduledEvent, env: Env): Promise<void> {
    const estado = await leerEstado(env)
    const { vencidos, estado: nuevo } = sacarVencidos(estado, Date.now())
    if (!vencidos.length) return
    let final = nuevo
    for (const { id, sub, aviso } of vencidos) {
      try {
        const codigo = await enviar(env, sub, aviso)
        if (codigo === 404 || codigo === 410) final = quitarSuscripcion(final, id)
      } catch {
        /* un fallo no detiene a los demás */
      }
    }
    await guardarEstado(env, final)
  },
}
