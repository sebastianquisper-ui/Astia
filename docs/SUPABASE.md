> **Reemplazado por Firebase.** Astia usa Firebase (ver `docs/FIREBASE.md`). Este documento queda solo como referencia del plan anterior.

# Conectar Astia con Supabase (login + nube)

Esto lo haces tú una sola vez. Son unos 15 minutos y no cuesta nada (plan gratis).
Cuando termines, me pasas **solo las dos claves públicas** (ver paso 5) y yo conecto la app.

## 1. Crear el proyecto

1. Entra a <https://supabase.com> e inicia sesión (puedes usar GitHub).
2. **New project**. Nombre: `astia`. Elige una contraseña de base de datos (guárdala, pero **no me la pases**).
3. Región: la más cercana a Perú (por ejemplo *South America (São Paulo)*).

## 2. Crear las tablas

1. En el menú izquierdo: **SQL Editor → New query**.
2. Copia **todo** el contenido de `supabase/migrations/20261015000000_esquema_inicial.sql` y pégalo.
3. Pulsa **Run**. Debe decir *Success*.

> Ese archivo ya está probado: crea las tablas, activa la seguridad (cada usuario ve solo lo suyo)
> y hace que el servidor ignore cambios más viejos que los que ya tiene.

## 3. Activar el inicio de sesión con Google

1. En <https://console.cloud.google.com> crea un proyecto (por ejemplo `astia`).
2. **APIs y servicios → Pantalla de consentimiento de OAuth**: tipo *Externo*, nombre `Astia`, tu correo.
   Agrega como usuario de prueba el correo con el que vas a entrar.
3. **Credenciales → Crear credenciales → ID de cliente de OAuth**, tipo *Aplicación web*.
   En **URI de redirección autorizados** pega la que te muestra Supabase en
   *Authentication → Providers → Google* (termina en `/auth/v1/callback`).
4. Copia el **ID de cliente** y el **Secreto** y pégalos en Supabase, en *Authentication → Providers → Google*. Activa el proveedor.

> Si usas tu correo `@unmsm.edu.pe`, la universidad podría bloquear apps externas.
> Si pasa, entra con un correo personal; las dos cuentas pueden convivir.

## 4. Direcciones permitidas

En Supabase: **Authentication → URL Configuration**.
- *Site URL*: la dirección de Astia cuando esté publicada (por ejemplo `https://astia.vercel.app`).
- *Redirect URLs*: agrega también `http://localhost:5173`.

## 5. Las dos claves que me pasas

En Supabase: **Project Settings → API**.

| Qué | Dónde está | ¿Me la pasas? |
|---|---|---|
| **Project URL** | arriba, `https://xxxx.supabase.co` | Sí |
| **anon / public key** | *Project API keys* | Sí (es pública, está pensada para ir en la app) |
| **service_role key** | *Project API keys* | **NO. Nunca.** Da acceso total a todos los datos. |
| Contraseña de la base de datos | la elegiste en el paso 1 | **NO** |

En tu computador van en un archivo `.env` (copia de `.env.example`). En Vercel, en
*Settings → Environment Variables*, con los mismos nombres:
`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
