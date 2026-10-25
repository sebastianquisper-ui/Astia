import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { sembrarEjemploFinanzas } from '../finanzas/ejemplo'
import { crearRepoLocal } from '../finanzas/repoLocal'
import type { RepoFinanzas } from '../finanzas/repo'
import type { UsuarioNube } from './firebase'

// Una sola cuenta de Google para todo Astia (estudios, Mi Órbita y Finanstia).
// La parte de Firebase se descarga solo cuando hace falta. En la vista previa y en las pruebas se puede usar
// "sin nube": no hay cuenta y Finanstia guarda sus datos de ejemplo en el teléfono.

type Nube = typeof import('./firebase')
export type EstadoCuenta = 'cargando' | 'fuera' | 'dentro'

export interface Cuenta {
  estado: EstadoCuenta
  usuario: UsuarioNube | null
  /** Sin nube: vista previa o pruebas. */
  local: boolean
  error: string | null
  entrando: boolean
  entrar: () => Promise<void>
  salir: () => Promise<void>
  /** Pide elegir la cuenta otra vez; dice si es la misma que está dentro. */
  confirmarIdentidad: () => Promise<boolean>
  /** La base de datos de Finanstia (null mientras no hay sesión). */
  repo: RepoFinanzas | null
}

export const modoLocal = (): boolean => {
  if (import.meta.env.VITE_VISTA === '1') return true
  try {
    return localStorage.getItem('astia.sinNube') === '1'
  } catch {
    return false
  }
}

const CuentaContext = createContext<Cuenta | null>(null)
export function useCuenta(): Cuenta {
  const c = useContext(CuentaContext)
  if (!c) throw new Error('useCuenta se usa dentro de <CuentaProvider>')
  return c
}

/** El repositorio local; en la vista previa, la primera vez trae datos de ejemplo para ver Finanstia con vida. */
function repoLocalInicial(): RepoFinanzas {
  const repo = crearRepoLocal()
  if (import.meta.env.VITE_VISTA === '1') {
    try {
      if (!localStorage.getItem('astia.finanzas.sembrado')) {
        localStorage.setItem('astia.finanzas.sembrado', '1')
        sembrarEjemploFinanzas(repo)
      }
    } catch {
      /* sin almacenamiento: queda vacío */
    }
  }
  return repo
}

const USUARIO_LOCAL: UsuarioNube = { uid: 'local', nombre: 'Vista previa', correo: 'sin cuenta', foto: null }

export function CuentaProvider({ children }: { children: ReactNode }) {
  const local = useMemo(modoLocal, [])
  const [estado, setEstado] = useState<EstadoCuenta>(local ? 'dentro' : 'cargando')
  const [usuario, setUsuario] = useState<UsuarioNube | null>(local ? USUARIO_LOCAL : null)
  const [error, setError] = useState<string | null>(null)
  const [entrando, setEntrando] = useState(false)
  const [repo, setRepo] = useState<RepoFinanzas | null>(() => (local ? repoLocalInicial() : null))
  const nube = useRef<Nube | null>(null)

  useEffect(() => {
    if (local) return
    let activo = true
    let dejarDeObservar = () => {}
    // En la vista previa (VITE_VISTA) esta rama se elimina al construir: Firebase ni se incluye
    const cargar = import.meta.env.VITE_VISTA === '1' ? Promise.reject(new Error('sin nube')) : import('./firebase')
    cargar
      .then((m) => {
        if (!activo) return
        nube.current = m
        m.resultadoRedirect().catch((err) => activo && setError(m.mensajeDeError(err)))
        dejarDeObservar = m.observarSesion((u) => {
          if (!activo) return
          setUsuario(u)
          setRepo(u ? m.crearRepo(u.uid) : null)
          setEstado(u ? 'dentro' : 'fuera')
          if (u) setError(null)
        })
      })
      .catch(() => {
        if (!activo) return
        setError('No se pudo cargar el inicio de sesión. Revisa tu conexión y vuelve a abrir Astia.')
        setEstado('fuera')
      })
    return () => {
      activo = false
      dejarDeObservar()
    }
  }, [local])

  const entrar = useCallback(async () => {
    if (!nube.current) return
    setError(null)
    setEntrando(true)
    try {
      await nube.current.iniciarSesion()
    } catch (err) {
      setError(nube.current.mensajeDeError(err))
    } finally {
      setEntrando(false)
    }
  }, [])

  const salir = useCallback(async () => {
    if (nube.current) await nube.current.cerrarSesion()
  }, [])

  const confirmarIdentidad = useCallback(async () => {
    if (local) return true
    if (!nube.current || !usuario) return false
    try {
      return await nube.current.confirmarMismaCuenta(usuario.uid)
    } catch (err) {
      setError(nube.current.mensajeDeError(err))
      return false
    }
  }, [local, usuario])

  const valor = useMemo<Cuenta>(() => ({ estado, usuario, local, error, entrando, entrar, salir, confirmarIdentidad, repo }), [estado, usuario, local, error, entrando, entrar, salir, confirmarIdentidad, repo])
  return <CuentaContext.Provider value={valor}>{children}</CuentaContext.Provider>
}
