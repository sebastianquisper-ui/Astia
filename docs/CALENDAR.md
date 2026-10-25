# Recordatorios y Google Calendar

Los recordatorios ("en 10 minutos comprar pan") funcionan **sin configurar nada** mientras Astia está abierta: suenan y Alpi los dice en voz alta.

Para que además lleguen **con la app cerrada**, Astia crea un evento con alarma en tu Google Calendar y lo **borra solo cuando pasa**
(solo toca los eventos que ella misma creó). Eso necesita un paso de configuración, una sola vez:

1. En https://console.cloud.google.com elige el proyecto (por ejemplo `astia-gemini`) y activa **Google Calendar API** (APIs y servicios → Biblioteca).
2. **Pantalla de consentimiento de OAuth**: tipo *Externo*, nombre "Astia", tu correo. En *Usuarios de prueba* agrega tu cuenta de Google.
   Mientras esté en modo "Prueba" Google mostrará "app no verificada": para uso personal se acepta una vez.
3. **Credenciales → Crear credenciales → ID de cliente de OAuth → Aplicación web**. En *Orígenes autorizados de JavaScript* agrega
   `https://sebastianquisper-ui.github.io`. No hace falta URI de redireccionamiento.
4. Copia el **ID de cliente** (termina en `.apps.googleusercontent.com`; es público, no es una clave secreta) y pégalo en
   `src/calendario/google.ts` como valor de `CLIENT_ID`. Con eso aparece el interruptor "También en Google Calendar" en Más → Recordatorios y apuntes.

Permiso que pide: solo `calendar.events` (crear y borrar eventos). Las alarmas suenan con la app de Google Calendar instalada y las notificaciones permitidas
(o con tu cuenta agregada al Calendario del iPhone). El permiso dura alrededor de una hora: si caducó, Astia lo vuelve a pedir con un toque.
