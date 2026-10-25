# Cuenta y nube con Firebase

Astia usa **una sola cuenta de Google** (Firebase Authentication) para todo: estudios, Mi Órbita y Finanstia.
El proyecto es el mismo de "Mis Finanzas": `finanzas-personales-edb47`.

## Qué vive dónde

| Parte | Dónde se guarda |
|---|---|
| **Finanstia** (movimientos, presupuestos, metas) | Firestore, bajo `users/{uid}/config`, `users/{uid}/movimientos` y `users/{uid}/metas` (la misma forma que Mis Finanzas) |
| Estudios y Mi Órbita (cursos, tareas, hábitos…) | Todavía en el teléfono (`localStorage`). El siguiente paso es pasarlos a Firestore con la misma cuenta |
| PIN de Finanstia | Solo en el teléfono: una huella PBKDF2 con sal, nunca el número |
| Fotos de evidencia | Solo en el teléfono (IndexedDB) |

## Qué hace falta en la consola de Firebase

1. **Dominio autorizado.** Authentication → Configuración → Dominios autorizados. Se autoriza por sitio (host), así que si Astia se publica en
   `sebastianquisper-ui.github.io` (como Mis Finanzas) **ya está autorizado**. Si se publica en otro dominio, agrégalo.
2. **Reglas de seguridad.** `firestore.rules` de este repositorio son las mismas de Mis Finanzas: cada usuario solo lee y escribe lo suyo.
   No se publican solas: cópialas en Firestore Database → Reglas → Publicar (si ya las publicaste para Mis Finanzas, no hay nada que hacer).
3. Nada más. No hay claves secretas: el `firebaseConfig` es público por diseño y lo que protege tus datos son las reglas y tu cuenta de Google.

## Cómo se prueba

```bash
npm test                 # lógica de Finanstia y de todo Astia
npm run test:firestore   # la capa de Firestore y las reglas contra el emulador (necesita Java)
```

Sin conexión a una cuenta real, la vista previa y las pruebas usan Finanstia "sin nube": los mismos cálculos con los datos en el navegador.
Se activa con `VITE_VISTA=1` (vista previa) o con `localStorage['astia.sinNube'] = '1'` (pruebas).

## Inicio de sesión en el iPhone

Se intenta primero con ventana emergente (popup) y, si el sistema no la permite, con redirección. Dentro de una app instalada en la pantalla de inicio,
iOS a veces limita estas dos formas. Si en tu iPhone no deja iniciar sesión, la salida es publicar Astia en **Firebase Hosting** (mismo dominio que el
inicio de sesión, gratis en el plan Spark). Se decide después de probarlo en el teléfono real.
