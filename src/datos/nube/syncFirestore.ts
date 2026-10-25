import { collection, deleteDoc, doc, getDocs, onSnapshot, writeBatch, type Firestore } from 'firebase/firestore'
import type { Perfil, Registro } from '../../dominio/tipos'
import { aDocumento, COLECCIONES, perfilADocumento, type CambioPendiente, type Coleccion } from './registros'

// Estudios y Mi Órbita sobre Firestore:
//   users/{uid}/estudios/{coleccion}/registros/{id}   (un documento por registro)
//   users/{uid}/estudios/perfil                       (el perfil del ciclo)
// La app sigue siendo "primero el teléfono": esto solo mantiene una copia en tu cuenta y trae lo de otros dispositivos.

export type Entrega =
  | { fuente: Coleccion; registros: Registro[] }
  | { fuente: 'perfil'; perfil: Perfil | null }

export interface SyncDatos {
  /** Escucha todo; cada cambio (de la nube o de la caché sin conexión) llega por `alRecibir`. */
  suscribir: (alRecibir: (e: Entrega) => void, alError: (err: unknown) => void) => () => void
  /** Sube los cambios. La promesa se resuelve cuando el servidor confirma (sin conexión queda pendiente, pero guardado en la caché). */
  subir: (cambios: CambioPendiente[], perfil: Perfil | null) => Promise<void>
  /** Borra TODO lo de estudios de la nube (no toca Finanstia). */
  borrarTodo: () => Promise<void>
}

const TAMANO_LOTE = 400

export function crearSync(db: Firestore, uid: string): SyncDatos {
  const registrosRef = (col: Coleccion) => collection(db, 'users', uid, 'estudios', col, 'registros')
  const perfilRef = doc(db, 'users', uid, 'estudios', 'perfil')

  return {
    suscribir(alRecibir, alError) {
      const salir: (() => void)[] = []
      for (const col of COLECCIONES) {
        salir.push(
          onSnapshot(
            registrosRef(col),
            (snap) => alRecibir({ fuente: col, registros: snap.docs.map((d) => ({ ...(d.data() as object), id: d.id }) as Registro) }),
            alError,
          ),
        )
      }
      salir.push(onSnapshot(perfilRef, (snap) => alRecibir({ fuente: 'perfil', perfil: snap.exists() ? (snap.data() as Perfil) : null }), alError))
      return () => salir.forEach((f) => f())
    },

    async subir(cambios, perfil) {
      const trabajos: Promise<void>[] = []
      for (let i = 0; i < cambios.length; i += TAMANO_LOTE) {
        const lote = writeBatch(db)
        for (const { col, registro } of cambios.slice(i, i + TAMANO_LOTE)) lote.set(doc(registrosRef(col), registro.id), aDocumento(col, registro))
        trabajos.push(lote.commit())
      }
      if (perfil) {
        const lote = writeBatch(db)
        lote.set(perfilRef, perfilADocumento(perfil))
        trabajos.push(lote.commit())
      }
      await Promise.all(trabajos)
    },

    async borrarTodo() {
      for (const col of COLECCIONES) {
        const snap = await getDocs(registrosRef(col))
        for (let i = 0; i < snap.docs.length; i += TAMANO_LOTE) {
          const lote = writeBatch(db)
          for (const d of snap.docs.slice(i, i + TAMANO_LOTE)) lote.delete(d.ref)
          await lote.commit()
        }
      }
      await deleteDoc(perfilRef)
    },
  }
}
