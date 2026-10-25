import { arrayUnion, collection, deleteDoc, deleteField, doc, getDocs, increment, onSnapshot, orderBy, query, setDoc, updateDoc, where, writeBatch, type Firestore } from 'firebase/firestore'
import { CATEGORIA_TRANSFERENCIA, efectoCentimos, normalizarConfig } from './modelo'
import { datosDeMeta, errorDeValidacion, limpiarMovimiento, validarAporte, validarTransferencia, type RepoFinanzas } from './repo'
import type { Medio, Meta, Movimiento } from './tipos'

// Finanstia sobre Firestore: los mismos documentos que usa la app "Mis Finanzas".
// Sin conexión, commit() no se resuelve hasta que el servidor confirma, pero la escritura ya quedó en la caché local
// y quien escucha ya la ve: la pantalla no debe esperar estas promesas.

export function crearRepoFirestore(db: Firestore, uid: string): RepoFinanzas {
  const configRef = doc(db, 'users', uid, 'config', 'main')
  const movimientosRef = collection(db, 'users', uid, 'movimientos')
  const metasRef = collection(db, 'users', uid, 'metas')

  // Suma los efectos por medio y los aplica con una sola escritura al documento de configuración.
  function ajustarSaldos(batch: ReturnType<typeof writeBatch>, efectos: [Medio, number][]) {
    const acumulado: Record<string, number> = {}
    for (const [medio, delta] of efectos) acumulado[medio] = (acumulado[medio] ?? 0) + delta
    const saldosCent: Record<string, unknown> = {}
    for (const medio of Object.keys(acumulado)) if (acumulado[medio] !== 0) saldosCent[medio] = increment(acumulado[medio])
    if (Object.keys(saldosCent).length) batch.set(configRef, { saldosCent }, { merge: true })
  }

  const leer = (d: { id: string; data: () => unknown }) => ({ id: d.id, ...(d.data() as object) }) as Movimiento

  async function patasDeTransferencia(transferId: string): Promise<Movimiento[]> {
    const snap = await getDocs(query(movimientosRef, where('transferId', '==', transferId)))
    return snap.docs.map(leer)
  }

  return {
    escucharConfig(callback, alError) {
      return onSnapshot(configRef, (snap) => callback(normalizarConfig(snap.data() as never)), alError)
    },
    escucharMovimientos(desde, hasta, callback, alError) {
      const q = query(movimientosRef, where('fecha', '>=', desde), where('fecha', '<=', hasta), orderBy('fecha', 'desc'))
      return onSnapshot(q, (snap) => callback(snap.docs.map(leer)), alError)
    },
    async movimientosEntre(desde, hasta) {
      const q = query(movimientosRef, where('fecha', '>=', desde), where('fecha', '<=', hasta), orderBy('fecha', 'desc'))
      return (await getDocs(q)).docs.map(leer)
    },
    async todosLosMovimientos() {
      return (await getDocs(query(movimientosRef, orderBy('fecha', 'desc')))).docs.map(leer)
    },
    escucharMetas(callback, alError) {
      return onSnapshot(metasRef, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) }) as Meta)), alError)
    },

    crearMovimiento(mov) {
      const datos = limpiarMovimiento(mov)
      const ref = doc(movimientosRef)
      const batch = writeBatch(db)
      batch.set(ref, datos)
      ajustarSaldos(batch, [[datos.medio, efectoCentimos(datos)]])
      return { id: ref.id, listo: batch.commit() }
    },
    // Las validaciones lanzan al momento (sin esperar a la base de datos); el resto llega por la promesa.
    actualizarMovimiento(anterior, cambios) {
      if (anterior.transferId) throw errorDeValidacion('Las transferencias se editan con actualizarTransferencia.')
      const { id: _id, ...resto } = { ...anterior, ...cambios, creado: anterior.creado }
      const datos = limpiarMovimiento(resto)
      const batch = writeBatch(db)
      batch.set(doc(movimientosRef, anterior.id), datos)
      ajustarSaldos(batch, [[anterior.medio, -efectoCentimos(anterior)], [datos.medio, efectoCentimos(datos)]])
      return batch.commit()
    },
    async eliminarMovimiento(mov) {
      const borrados = mov.transferId ? await patasDeTransferencia(mov.transferId) : [mov]
      const batch = writeBatch(db)
      for (const m of borrados) batch.delete(doc(movimientosRef, m.id))
      ajustarSaldos(batch, borrados.map((m): [Medio, number] => [m.medio, -efectoCentimos(m)]))
      return { borrados, listo: batch.commit() }
    },
    restaurarMovimientos(movs) {
      const batch = writeBatch(db)
      for (const m of movs) {
        const { id, ...resto } = m
        batch.set(doc(movimientosRef, id), limpiarMovimiento(resto))
      }
      ajustarSaldos(batch, movs.map((m): [Medio, number] => [m.medio, efectoCentimos(m)]))
      return batch.commit()
    },

    crearTransferencia({ origen, destino, monto, fecha, nota = '' }) {
      validarTransferencia(origen, destino)
      const transferId = doc(movimientosRef).id
      const creado = Date.now()
      const comun = { categoria: CATEGORIA_TRANSFERENCIA, monto, fecha, nota, transferId, creado }
      const salida = limpiarMovimiento({ ...comun, tipo: 'gasto', medio: origen })
      const entrada = limpiarMovimiento({ ...comun, tipo: 'ingreso', medio: destino })
      const batch = writeBatch(db)
      batch.set(doc(movimientosRef), salida)
      batch.set(doc(movimientosRef), entrada)
      ajustarSaldos(batch, [[origen, efectoCentimos(salida)], [destino, efectoCentimos(entrada)]])
      return { transferId, listo: batch.commit() }
    },
    async actualizarTransferencia(transferId, { monto, fecha, nota }) {
      const patas = await patasDeTransferencia(transferId)
      const batch = writeBatch(db)
      const efectos: [Medio, number][] = []
      for (const p of patas) {
        const { id, ...resto } = { ...p, monto, fecha, nota }
        const nueva = limpiarMovimiento(resto)
        batch.set(doc(movimientosRef, id), nueva)
        efectos.push([p.medio, -efectoCentimos(p)], [p.medio, efectoCentimos(nueva)])
      }
      ajustarSaldos(batch, efectos)
      return batch.commit()
    },

    // Se escribe la lista completa (no arrayUnion) para no perder las categorías por defecto
    // cuando el documento todavía no existe.
    guardarCategorias(tipo, lista) {
      const campo = tipo === 'ingreso' ? 'categoriasIngreso' : 'categoriasGasto'
      const limpia = [...new Set(lista.map((c) => c.trim()).filter(Boolean))]
      return setDoc(configRef, { [campo]: limpia }, { merge: true })
    },
    definirPresupuesto(medio, categoria, tope) {
      if (tope && !(tope > 0)) throw errorDeValidacion('El tope debe ser mayor que 0.')
      return setDoc(configRef, { presupuestos: { [medio]: { [categoria]: tope ? tope : deleteField() } } }, { merge: true })
    },
    async recalcularSaldos() {
      const movs = (await getDocs(query(movimientosRef, orderBy('fecha', 'desc')))).docs.map(leer)
      const saldosCent: Record<Medio, number> = { digital: 0, efectivo: 0 }
      for (const m of movs) saldosCent[m.medio] += efectoCentimos(m)
      await setDoc(configRef, { saldosCent }, { merge: true })
      return saldosCent
    },

    crearMeta(m) {
      const datos = { ...datosDeMeta(m), aportes: [], creado: Date.now() }
      const ref = doc(metasRef)
      return { id: ref.id, listo: setDoc(ref, datos) }
    },
    actualizarMeta(meta, cambios) {
      return updateDoc(doc(metasRef, meta.id), datosDeMeta(cambios))
    },
    eliminarMeta(meta) {
      return deleteDoc(doc(metasRef, meta.id))
    },
    restaurarMeta({ id, nombre, objetivo, limite = '', aportes = [], creado = Date.now() }) {
      return setDoc(doc(metasRef, id), { nombre, objetivo, limite, aportes, creado })
    },
    aportarAMeta(meta, monto, fecha) {
      const m = validarAporte(meta, monto, fecha)
      return updateDoc(doc(metasRef, meta.id), { aportes: arrayUnion({ id: doc(metasRef).id, monto: m, fecha }) })
    },
  }
}
