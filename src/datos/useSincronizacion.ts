import { useEffect, useRef, useState } from 'react'
import type { Datos, Registro } from '../dominio/tipos'
import { datosVacios, fusionarLista, normalizarDatos } from './almacenamiento'
import { cambiosPendientes, clave, COLECCIONES } from './nube/registros'
import type { SyncDatos } from './nube/syncFirestore'

// Mantiene una copia de tus estudios en tu cuenta de Firebase sin cambiar cómo funciona la app: primero el teléfono,
// y la nube se pone al día sola (al abrir, al cambiar algo y al volver el internet). Cada registro se mezcla por su fecha de
// modificación: gana el más nuevo, y lo borrado queda con lápida para que no resucite desde otro dispositivo.

export type EstadoNube = 'local' | 'conectando' | 'guardando' | 'al-dia' | 'error'

const CLAVE_DUENO = 'astia.datos.dueno'
const CLAVE_ANTES = 'astia.datos.v2.antes-de-nube'
const CLAVE_DE_OTRA = 'astia.datos.v2.de-'

interface Opciones {
  sync: SyncDatos | null
  uid: string | null
  reales: Datos
  setReales: (f: (d: Datos) => Datos) => void
}

export function useSincronizacion({ sync, uid, reales, setReales }: Opciones): EstadoNube {
  const mapa = useRef(new Map<string, number>())
  const fuentes = useRef(new Set<string>())
  const enVuelo = useRef(0)
  const [listo, setListo] = useState(false)
  const [estado, setEstado] = useState<EstadoNube>(sync ? 'conectando' : 'local')
  const actual = useRef(reales)
  actual.current = reales

  useEffect(() => {
    mapa.current = new Map()
    fuentes.current = new Set()
    enVuelo.current = 0
    setListo(false)
    if (!sync || !uid) {
      setEstado('local')
      return
    }
    setEstado('conectando')

    // Los datos del teléfono son de UNA cuenta: si entra otra, los de la anterior se apartan para no subirlos a la cuenta nueva
    try {
      const dueno = localStorage.getItem(CLAVE_DUENO)
      if (dueno && dueno !== uid) {
        localStorage.setItem(CLAVE_DE_OTRA + dueno, JSON.stringify(actual.current))
        setReales(() => datosVacios())
      } else if (!dueno && !localStorage.getItem(CLAVE_ANTES)) {
        localStorage.setItem(CLAVE_ANTES, JSON.stringify(actual.current)) // copia de seguridad antes de la primera mezcla
      }
      localStorage.setItem(CLAVE_DUENO, uid)
    } catch {
      /* sin almacenamiento: se sigue igual */
    }

    const marcar = (k: string, v: number) => mapa.current.set(k, Math.max(mapa.current.get(k) ?? -1, v))
    return sync.suscribir(
      (e) => {
        if (e.fuente === 'perfil') {
          if (e.perfil) {
            const perfil = normalizarDatos({ perfil: e.perfil }).perfil
            marcar(clave('perfil'), perfil.actualizadoEn)
            setReales((d) => (perfil.actualizadoEn > d.perfil.actualizadoEn ? { ...d, perfil } : d))
          }
        } else {
          const col = e.fuente
          const registros = (normalizarDatos({ [col]: e.registros })[col] as Registro[]) ?? []
          for (const r of registros) marcar(clave(col, r.id), r.actualizadoEn)
          setReales((d) => ({ ...d, [col]: fusionarLista(d[col] as Registro[], registros) }))
        }
        fuentes.current.add(e.fuente)
        if (fuentes.current.size === COLECCIONES.length + 1) setListo(true)
      },
      () => setEstado('error'),
    )
  }, [sync, uid, setReales])

  // Sube lo que cambió (se espera a haber recibido lo de la nube para no pisar nada más nuevo)
  useEffect(() => {
    if (!sync || !listo) return
    const { registros, perfil } = cambiosPendientes(reales, mapa.current)
    if (!registros.length && !perfil) {
      if (enVuelo.current === 0) setEstado((e) => (e === 'conectando' || e === 'guardando' ? 'al-dia' : e))
      return
    }
    for (const { col, registro } of registros) mapa.current.set(clave(col, registro.id), registro.actualizadoEn)
    if (perfil) mapa.current.set(clave('perfil'), reales.perfil.actualizadoEn)
    enVuelo.current++
    setEstado('guardando')
    sync
      .subir(registros, perfil ? reales.perfil : null)
      .then(() => {
        enVuelo.current--
        if (enVuelo.current === 0) setEstado((e) => (e === 'guardando' ? 'al-dia' : e))
      })
      .catch(() => {
        enVuelo.current--
        for (const { col, registro } of registros) mapa.current.delete(clave(col, registro.id)) // se reintenta en el próximo cambio
        if (perfil) mapa.current.delete(clave('perfil'))
        setEstado('error')
      })
  }, [reales, listo, sync])

  return estado
}
