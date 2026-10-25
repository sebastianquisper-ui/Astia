import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, getRedirectResult, GoogleAuthProvider, onAuthStateChanged, signInWithCredential, signInWithPopup, signInWithRedirect, signOut, type User } from 'firebase/auth'
import { connectFirestoreEmulator, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'
import { crearRepoFirestore } from '../finanzas/repoFirestore'
import { crearSync, type SyncDatos } from '../datos/nube/syncFirestore'
import type { RepoFinanzas } from '../finanzas/repo'
import { firebaseConfig } from './firebaseConfig'

// Este archivo se descarga solo cuando hace falta (la app lo carga con import() al abrir).

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
auth.languageCode = 'es'

const proveedor = new GoogleAuthProvider()
// Tras cerrar sesión, deja elegir otra cuenta en vez de reentrar con la misma.
proveedor.setCustomParameters({ prompt: 'select_account' })

// Persistencia sin conexión: la app debe poder leer y escribir en el metro o sin datos.
const db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) })

// Solo con VITE_EMULADORES=1: Auth y Firestore locales para probar sin tocar el proyecto real.
if (import.meta.env.VITE_EMULADORES) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  ;(window as unknown as { __entrarConEmulador: (email: string) => Promise<unknown> }).__entrarConEmulador = (email) =>
    signInWithCredential(auth, GoogleAuthProvider.credential(JSON.stringify({ sub: email, email, email_verified: true })))
  ;(window as unknown as { __salirConEmulador: () => Promise<void> }).__salirConEmulador = () => signOut(auth)
}

// El popup es el camino principal. Solo se usa redirect cuando el entorno no permite popups
// (por ejemplo, algunas apps instaladas en la pantalla de inicio).
const USAR_REDIRECT = new Set(['auth/popup-blocked', 'auth/operation-not-supported-in-environment'])
const SILENCIOSOS = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request'])
const codigo = (err: unknown): string | undefined => (err as { code?: string } | null)?.code

export interface UsuarioNube {
  uid: string
  nombre: string
  correo: string
  foto: string | null
}

const aUsuario = (u: User): UsuarioNube => ({ uid: u.uid, nombre: u.displayName ?? u.email ?? 'Tú', correo: u.email ?? '', foto: u.photoURL })

/** Devuelve true si inició sesión por popup; false si se cerró o pasó a redirect. */
export async function iniciarSesion(): Promise<boolean> {
  try {
    const r = await signInWithPopup(auth, proveedor)
    return !!r.user
  } catch (err) {
    if (USAR_REDIRECT.has(codigo(err) ?? '')) {
      await signInWithRedirect(auth, proveedor)
      return false
    }
    if (SILENCIOSOS.has(codigo(err) ?? '')) return false
    throw err
  }
}

export async function resultadoRedirect(): Promise<void> {
  try {
    await getRedirectResult(auth)
  } catch (err) {
    if (!SILENCIOSOS.has(codigo(err) ?? '')) throw err
  }
}

export const cerrarSesion = (): Promise<void> => signOut(auth)

export function observarSesion(callback: (usuario: UsuarioNube | null) => void): () => void {
  return onAuthStateChanged(auth, (u) => callback(u ? aUsuario(u) : null))
}

/** Pide elegir la cuenta otra vez y dice si es la misma que ya está dentro (para restablecer el PIN). */
export async function confirmarMismaCuenta(uid: string): Promise<boolean> {
  try {
    const r = await signInWithPopup(auth, proveedor)
    return r.user.uid === uid
  } catch (err) {
    if (SILENCIOSOS.has(codigo(err) ?? '')) return false
    throw err
  }
}

export const crearRepo = (uid: string): RepoFinanzas => crearRepoFirestore(db, uid)

/** La copia en la nube de tus estudios y Mi Órbita. */
export const crearSyncDatos = (uid: string): SyncDatos => crearSync(db, uid)

export function mensajeDeError(err: unknown): string {
  switch (codigo(err)) {
    case 'auth/network-request-failed':
      return 'Sin conexión. Revisa tu internet e inténtalo otra vez.'
    case 'auth/unauthorized-domain':
      return 'Este sitio no está autorizado en Firebase (Authentication → Configuración → Dominios autorizados).'
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Espera un momento e inténtalo otra vez.'
    case 'auth/user-disabled':
      return 'Esta cuenta está deshabilitada.'
    default:
      return 'No se pudo iniciar sesión. Inténtalo otra vez.'
  }
}
