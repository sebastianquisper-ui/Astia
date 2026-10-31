# Avisos con la app cerrada (sin Google Calendar)

Astia puede mandarte una notificación aunque la app esté cerrada. Para eso hace falta un **servidor pequeño y gratis** (un Cloudflare Worker) que revisa cada minuto
si te toca algún aviso y lo envía. Todo se puede hacer **desde el navegador del teléfono o de una computadora, sin instalar nada**.

> En iPhone solo funciona con **iOS 16.4 o más** y con Astia **instalada en la pantalla de inicio** (Compartir → Añadir a pantalla de inicio). No funciona en iPad.
> No está garantizado: en iPhone a veces los avisos de las web apps no llegan. Por eso hay un botón para probarlo.

## Paso 1: crear las claves
1. Abre `https://sebastianquisper-ui.github.io/Astia/claves-avisos.html` y toca **Generar claves**.
2. Copia la **pública** y la **privada** a un lugar seguro (por ejemplo, las notas del teléfono). **La privada no se la des a nadie.**

## Paso 2: crear el servidor (Cloudflare, gratis)
1. Crea una cuenta en https://dash.cloudflare.com/sign-up (no pide tarjeta).
2. **Almacenamiento** (el KV): *Storage & Databases → KV → Create* → nombre `astia-avisos`.
3. **Worker**: *Workers & Pages → Create → Create Worker* → nombre `astia-avisos` → Deploy. Luego *Edit code*, borra todo lo que trae y pega el contenido completo de
   [`servidor/astia-avisos.js`](../servidor/astia-avisos.js). Toca **Deploy**.
4. En el Worker, *Settings → Bindings → Add → KV namespace*: nombre de la variable `AVISOS`, y elige el KV `astia-avisos`.
5. *Settings → Variables and Secrets → Add*:
   - `ORIGENES` (texto) = `https://sebastianquisper-ui.github.io`
   - `VAPID_SUBJECT` (texto) = `https://sebastianquisper-ui.github.io/Astia/`
   - `VAPID_PUBLIC_KEY` (texto) = tu clave **pública**
   - `VAPID_PRIVATE_KEY` (**Secret**) = tu clave **privada**
6. *Settings → Trigger Events → Add → Cron Trigger* = `* * * * *` (cada minuto).
7. Copia la dirección del Worker (algo como `https://astia-avisos.TUUSUARIO.workers.dev`).

## Paso 3: conectar Astia
Dame (en el chat) **solo dos cosas, las dos públicas**: la dirección del Worker y la clave **pública**. Yo las pongo en `src/notificaciones/config.ts` y se publica.
(Nunca me des la privada.)

## Paso 4: probar en tu iPhone
1. Abre Astia **desde el ícono de la pantalla de inicio** → Más → Recordatorios y apuntes → **Activar avisos con la app cerrada** → Permitir.
2. Toca **Enviar aviso de prueba**, **cierra Astia** y espera unos segundos: debe llegar la notificación.
3. Crea un recordatorio ("en 2 minutos probar aviso"), cierra la app y espera.

## Cómo está hecho
- `servidor/src/index.ts`: el Worker (rutas `/suscribir`, `/prueba`, `/olvidar` y el cron de cada minuto).
- `servidor/src/logica.ts`: lo que decide qué avisos tocan (con pruebas).
- `servidor/astia-avisos.js`: el mismo Worker ya empaquetado en un solo archivo para pegarlo en el panel. Se vuelve a generar con `npm run empaquetar` dentro de `servidor`.
- `public/push-sw.js`: muestra la notificación en el teléfono. Si Astia está abierta y a la vista, no la muestra (ya avisa ella con sonido y voz).
- Los avisos y la dirección de tu dispositivo se guardan en Cloudflare. El texto de cada aviso pasa por Cloudflare y por el servicio de notificaciones de Apple.
- Con el plan gratis de Cloudflare el límite es de unos 50 dispositivos en este diseño.
