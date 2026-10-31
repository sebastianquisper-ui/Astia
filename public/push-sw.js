// Se suma al service worker de Astia: muestra los avisos que llegan con la app cerrada.

self.addEventListener('push', (evento) => {
  let datos = {}
  try {
    datos = evento.data ? evento.data.json() : {}
  } catch {
    datos = { titulo: 'Astia', cuerpo: evento.data ? evento.data.text() : '' }
  }
  evento.waitUntil(
    (async () => {
      // Si Astia está abierta y a la vista, ella misma avisa (con sonido y la voz de Alpi): no se duplica
      const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      if (ventanas.some((v) => v.visibilityState === 'visible') && datos.id !== 'prueba') return
      await self.registration.showNotification(datos.titulo || 'Astia', {
        body: datos.cuerpo || '',
        icon: 'icons/icon-192.png',
        badge: 'icons/favicon-64.png',
        tag: datos.id || undefined,
      })
    })(),
  )
})

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close()
  evento.waitUntil(
    (async () => {
      const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      if (ventanas.length) return ventanas[0].focus()
      return self.clients.openWindow(self.registration.scope)
    })(),
  )
})
