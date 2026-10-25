# Astia v2

Asistente personal contra la procrastinación. App instalable (PWA) hecha con
Vite + React + TypeScript. Proyecto de Sebastián Quispe Roca (UNMSM).

## Estado

- **Fase 1 (base):** completa. App instalable, navegación, tema claro/oscuro, tamaño de letra.
- **Interfaz espacial:** completa. Cielo, avatar Astia, tarjeta de órbita.
- **Fase 2a (datos en el teléfono):** completa.
  Cursos, horario y tareas con alta, edición y borrado; áreas Universidad y Mi Órbita;
  importación del respaldo de la v1 (conserva los ids) y exportación v2;
  esquema SQL de la nube con seguridad por usuario, probado en un Postgres en memoria.
- **Modos Académico y Mi Órbita:** completo. Un interruptor global cambia Hoy, Semana, la pestaña del medio
  (Cursos o Hábitos), Pendientes y Más. Mi Órbita tiene apartados (Deporte, Salud, Mente, Hogar, Familia,
  Dinero, Trámites), hábitos con rachas y calendario, rutinas y entrenamientos con descansos, y pendientes
  simples (sin tipo, prioridad ni examen).
- **Métodos de estudio y sesión guiada:** completo. 10 métodos (Pomodoro, Feynman, recuperación activa,
  repetición espaciada, Cornell, práctica intercalada, SQ3R, mapa mental, tarjetas, resolver problemas por pasos)
  y "Solo 10 minutos". Astia sugiere uno por tarea (se puede cambiar en el formulario). Se usan desde
  Hoy → Empezar ya, desde Más → Enfoque y descanso, y el enfoque se suma al progreso del día.
- **Ritmo de experiencia:** cada cosa cumplida suma poco (tarea +5, examen +10, hábito +2, rutina +6, pendiente personal +4,
  1 por cada 10 min de enfoque). Una buena semana suma unos 160 XP y el costo de los niveles depende de cuánto dura tu
  ciclo: con buen ritmo llegas al nivel máximo a la mitad del ciclo (con 16 semanas: nivel 2 a los 130 XP, nivel 3 a los
  510 y nivel 4 a los 1280); con la mitad de ritmo, al final.
- **Alpi, tu compañera:** la única mascota (la otra opción es la estrella de siempre). Evoluciona en 4 niveles con
  el XP que ganas (se calcula de lo que haces; no se guarda) y pide equilibrio entre estudios y vida personal desde
  la etapa 3. Su modelo 3D es `src/mascotas/alpi/modelo/alpi-3d.html` (tal cual): la app lo carga en un iframe con la
  librería 3D adentro (three.js 0.149, sin internet) y le manda nivel, expresión (regaña si hay algo vencido, duerme de
  noche) y la ropa elegida. En Hoy aparece grande sobre su planeta. Se puede apagar el 3D en Ajustes ("Dibujada",
  gasta menos batería). **Vestidor:** con todo lo de hoy cumplido, se le puede quitar ropa o volver a un nivel anterior.
  **Expresiones:** Alpi te muestra cómo vas: orgullosa si cumpliste todo, feliz mientras avanzas, concentrada si aún no
  empiezas, regañona si algo venció, molesta si llevas 2 días o 2 pendientes de atraso, furiosa si son 4 o más; baila cuando
  cumples algo y duerme de noche. Con todo cumplido, tocando dos veces a Alpi en Hoy se abre una ruleta de emotes (para fijar su expresión a mano o volver a
  automática) y, tocando el centro, otra con sus movimientos (saludar, saltar, bailar, reír, explorar). Las miniaturas de
  Alpi (galería y evolución) son fotos de su modelo 3D de frente (`herramientas/alpi/fotos.mjs`).
- **Evidencia para cumplir:** ninguna tarea se marca hecha sin evidencia: una foto del trabajo (cámara o galería,
  guardada en el teléfono) o el enlace de la entrega. Reabrir una tarea descarta su evidencia.
- **Pantallas académicas:** completas. Semana (clases y entregas por día), Cursos con sus semanas del ciclo (tema y
  notas de cada una), Calendario del mes, Ciclo completo (carga de cada semana) y Progreso y rachas.
- **Cuidado de la vista (20-20-20):** cada 20 minutos con Astia abierta propone mirar algo lejano durante 20 segundos
  (se apaga en Ajustes). No manda notificaciones: eso llega con la nube. El título de una tarea se puede dictar por voz
  si el navegador lo permite; si no, queda el micrófono del teclado del iPhone.
- **Tu etapa de estudios:** la primera vez Astia pregunta si estás en colegio, preuniversitario o universidad y arma el
  periodo a tu medida (nombre, de 4 a 52 semanas, fecha de inicio). Todo se cambia en Ajustes, y en "Ciclo completo" se
  marcan las semanas de exámenes o sin clases (feriados, vacaciones) como lo dicte tu institución.
- **Empezar de cero:** Astia abre sin datos de ejemplo. Ajustes → "Borrar todos mis datos" la deja como recién instalada.
- **Finanstia (tu plata):** el tercer modo de Astia, junto a Académico y Mi Órbita. Trae todo lo de "Mis Finanzas": dos billeteras
  (Digital y Efectivo), gastos, ingresos y transferencias, presupuestos con avisos al 70 % y al 100 %, metas de ahorro, comparación de
  periodos y gráficos. Se abre con un **PIN propio** (4 a 6 números; solo se guarda una huella, en el teléfono) además de la cuenta de
  Google, y se cierra al salir del modo o tras 2 minutos en segundo plano. Su fondo son billetes de soles estilizados en vez de estrellas.
  Tiene **su propio Alpi** con su propia experiencia (anotar, ahorrar y cumplir suman; gastar no): con el dinero en verde juega con
  billetes y en rojo pide plata. Usa los mismos datos de Firestore que Mis Finanzas.
  Su Alpi también tiene **ruleta de emotes y movimientos** (doble toque) y **vestidor** (quitar y poner ropa, bajar de nivel), separados del Alpi
  de estudios; se abren mientras tu plata no esté en rojo. Puedes **dictar** un movimiento ("gasté 15 soles en almuerzo", "pasé 50 de digital a
  efectivo", "aporté 100 a mi laptop"): Astia lo entiende, te lo muestra y guarda al confirmar (`docs/DICTADO.md`).
- **Sonidos (Más → Sonidos):** cada momento (evolución, tarea o hábito cumplido, fin de enfoque o descanso, pausa de vista, meta de ahorro)
  tiene un sonido predeterminado, sintetizado en el teléfono (sin archivos). El de la evolución suena por defecto al tocar "¡Evolucionar!".
  Puedes cambiarlo por otro de la biblioteca, ponerlo en silencio o **subir el tuyo** (mp3, m4a, wav u ogg; hasta 30 s y 2.5 MB; se guarda
  solo en el teléfono, en IndexedDB). En el iPhone el audio se activa con el primer toque en la app.
  **Música de fondo** en toda la app (activada por defecto, empieza con tu primer toque): una musiquita alegre que la app compone sola, o tus
  propias pistas (hasta 5, 12 MB y 10 min cada una, guardadas solo en el teléfono). Se silencia desde el botón ♪ de la cabecera.
  También puedes activar que **Alpi lea los avisos en voz alta** (voz del iPhone, gratis; solo con la app abierta; apagado por defecto).
- **Una sola cuenta (Firebase):** Astia pide iniciar sesión con Google antes de mostrar nada. Detalles y pasos en `docs/FIREBASE.md`.
  Los datos de estudios y Mi Órbita todavía están en el teléfono; pasarlos a la nube es el siguiente paso (`docs/SUPABASE.md` quedó
  como referencia del plan anterior, ya no se usa).

## Comandos

```bash
npm install        # instalar dependencias
npm run dev        # servidor de desarrollo
npm run build      # compilar para producción (revisa tipos primero)
npm test           # pruebas de la lógica y del esquema SQL (Vitest)
npm run vista      # genera la vista previa en un solo archivo (dist-vista/)
npx playwright test  # pruebas de flujos en navegador (necesita CHROMIUM_PATH si no hay navegador de Playwright)
npm run iconos     # regenera los iconos de la app
```

## Instalar en iPhone

1. Abrir la dirección de la app en **Safari**.
2. Compartir → **Añadir a pantalla de inicio**.
3. Abrir Astia desde el icono (las notificaciones push solo funcionan así).

## Estructura

```
src/dominio/    tipos de los datos (curso, clase, tarea...)
src/datos/      guardado, importación, respaldo y traducción a la nube
src/formularios/ formularios de tarea, curso y clase
src/lib/        lógica pura y probada (fechas, urgencia, clase actual, avatar...)
supabase/       esquema SQL de la nube y su prueba
docs/           guías (Supabase)
src/ui/         piezas reutilizables (navegación, avisos, iconos)
src/ajustes/    ajustes de vista (tema, letra, nombre)
src/pantallas/  una pantalla por archivo
src/estilos/    colores (tokens.css) y estilos generales
e2e/            pruebas de flujos completos
```

## Seguridad

Ninguna clave secreta va en el frontend ni en el repositorio. Las claves públicas van
en `.env` (copiar de `.env.example`, que está en `.gitignore`); las secretas viven en el servidor.
