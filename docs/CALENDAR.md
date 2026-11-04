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

## Alarmas a pantalla completa (Más → Recordatorios y apuntes)
Tú eliges a qué horas del día Astia te revisa los pendientes (las que quieras) y cuántos minutos antes de cada clase te avisa (5 a 30, o no).
Con Astia abierta (o al abrirla hasta 45 min después de la hora) el aviso **tapa toda la pantalla**, suena y Alpi lo dice; tiene "Ver mis pendientes",
"Recordarme en 10 min" y "Entendido". Con **"También en Google Calendar"** cada hora se crea además como evento diario con aviso (se reemplazan solas al cambiar las horas).
Límite honesto: con la app cerrada solo puede llegar la notificación normal de Google Calendar, no una pantalla completa propia (el navegador/iPhone no lo permite).
Código: `src/lib/alarmas.ts` (lógica con pruebas), `src/recordatorios/MotorAlarmas.tsx`, `PantallaAviso.tsx`, `PanelAlarmas.tsx`.

## Avisos por tarea ("Configurar avisos")
Al guardar una tarea aparece "Configurar avisos"; también está dentro de la tarea (🔔 Configurar avisos). Eliges hasta 5 avisos (a la hora, 10 min, 30 min, 1 h, 3 h, 1 día, 2 días antes o un tiempo propio)
y, si quieres, un aviso diario a la hora que digas hasta la entrega. Se puede: **solo en Astia** (pantalla completa con la app abierta), **archivo .ics** (abre el Calendario del teléfono o Google Calendar con todas las alarmas, sin configurar nada)
o **crear en Google Calendar** (necesita el `CLIENT_ID` de arriba). Código: `src/lib/avisosTarea.ts`, `src/formularios/AvisosTarea.tsx`.
