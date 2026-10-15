// En la vista previa web no hay service worker (no corre dentro de una página alojada),
// así que este archivo reemplaza a `virtual:pwa-register` por una función vacía.
export function registerSW(): () => Promise<void> {
  return async () => {}
}
