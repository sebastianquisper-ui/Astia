// "Empezar de cero": borra TODO lo que Astia guardó en este teléfono (datos, ajustes, fotos de evidencia)
// y recarga la app, que arranca como recién instalada.

export async function borrarTodoYReiniciar(): Promise<void> {
  try {
    // 'astia.sinNube' es solo para la vista previa y las pruebas: se conserva
    for (const clave of Object.keys(localStorage)) if (clave.startsWith('astia.') && clave !== 'astia.sinNube') localStorage.removeItem(clave)
  } catch {
    /* sin almacenamiento */
  }
  try {
    if (typeof indexedDB !== 'undefined') {
      await new Promise<void>((ok) => {
        const pedido = indexedDB.deleteDatabase('astia-evidencias')
        pedido.onsuccess = pedido.onerror = pedido.onblocked = () => ok()
      })
    }
  } catch {
    /* ya no hay fotos que borrar */
  }
  window.location.hash = ''
  window.location.reload()
}
