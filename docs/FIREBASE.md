# Cuenta y nube con Firebase

Astia usa **una sola cuenta de Google** (Firebase Authentication) para todo: estudios, Mi Órbita y Finanstia.
El proyecto es el mismo de "Mis Finanzas": `finanzas-personales-edb47`.

## Qué vive dónde

| Parte | Dónde se guarda |
|---|---|
| **Finanstia** (movimientos, presupuestos, metas) | Firestore, bajo `users/{uid}/config`, `users/{uid}/movimientos` y `users/{uid}/metas` (la misma forma que Mis Finanzas) |
| Estudios y Mi Órbita (cursos, horario, tareas, hábitos, rutinas, progreso, recordatorios, apuntes, perfil del ciclo) | **Primero el teléfono, y una copia en Firestore** bajo `users/{uid}/estudios/{colección}/registros/{id}` y `users/{uid}/estudios/perfil`. Se sincroniza sola (ver abajo) |
| Ajustes, sonidos, música, tus pistas | Solo en el teléfono (son preferencias del aparato) |
| PIN de Finanstia | Solo en el teléfono: una huella PBKDF2 con sal, nunca el número |
| Fotos de evidencia | Solo en el teléfono (IndexedDB) |

## Cómo se sincronizan los estudios

- La app trabaja siempre sobre el teléfono (rápida y sin internet). En segundo plano sube lo que cambia y trae lo de tus otros dispositivos.
- Cada registro lleva la fecha de su última modificación: si hay dos versiones, **gana la más nueva**. Lo borrado queda con una "lápida" para que no resucite desde otro dispositivo.
- La primera vez, lo que ya tenías en el teléfono se sube solo. Antes se guarda una copia en `astia.datos.v2.antes-de-nube`.
- Los datos del teléfono son de **una** cuenta: si entra otra en el mismo teléfono, los de la anterior se apartan (`astia.datos.v2.de-<uid>`) y no se suben a la cuenta nueva.
- Importar un respaldo **reemplaza** lo que había (lo que no viene en el respaldo queda borrado también en la nube).
- "Borrar todos mis datos" borra también la nube de estudios. **No toca Finanstia.**
- La cabecera muestra el estado: *Guardado en tu cuenta*, *Guardando…*, *Se subirá con internet* o *Sin sincronizar*.
- Las fotos de evidencia no se guardan en ningún lado: se descartan al confirmar.

## Qué hace falta en la consola de Firebase

1. **Dominio autorizado.** Authentication → Configuración → Dominios autorizados. Se autoriza por sitio (host), así que si Astia se publica en
   `sebastianquisper-ui.github.io` (como Mis Finanzas) **ya está autorizado**. Si se publica en otro dominio, agrégalo.
2. **Reglas de seguridad.** `firestore.rules` incluye las de Mis Finanzas **más las de estudios** (campos permitidos, tipos y tamaños por colección):
   cada usuario solo lee y escribe lo suyo. No se publican solas: cópialas completas en Firestore Database → Reglas → Publicar.
   **Hay que republicarlas cada vez que este archivo cambie.** Sin ellas la app sigue funcionando en el teléfono, pero la cabecera dice *Sin sincronizar*.
3. Nada más. No hay claves secretas: el `firebaseConfig` es público por diseño y lo que protege tus datos son las reglas y tu cuenta de Google.

## Cómo se prueba

```bash
npm test                 # lógica de Finanstia y de todo Astia
npm run test:firestore   # la capa de Firestore y las reglas contra el emulador (necesita Java)
npm run test:nube        # la app completa con dos teléfonos y la misma cuenta, contra los emuladores de Auth y Firestore
```

Sin conexión a una cuenta real, la vista previa y las pruebas usan Finanstia "sin nube": los mismos cálculos con los datos en el navegador.
Se activa con `VITE_VISTA=1` (vista previa) o con `localStorage['astia.sinNube'] = '1'` (pruebas).

## Inicio de sesión en el iPhone

Se intenta primero con ventana emergente (popup) y, si el sistema no la permite, con redirección. Dentro de una app instalada en la pantalla de inicio,
iOS a veces limita estas dos formas. Si en tu iPhone no deja iniciar sesión, la salida es publicar Astia en **Firebase Hosting** (mismo dominio que el
inicio de sesión, gratis en el plan Spark). Se decide después de probarlo en el teléfono real.
