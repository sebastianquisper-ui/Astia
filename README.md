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
- **Mascotas que evolucionan:** completo. 8 mascotas (Axolín, Taro, Nube, Mochi, Drako, Stella, Hooty, Alpi) con sus
  etapas. Están dibujadas por piezas en vectores (`src/mascotas/rig/`): cuerpo, cara (ojos que parpadean, cejas,
  boca que habla), orejas, cola, alas y branquias que se mueven solas, y accesorios por etapa (sombreros, lentes,
  bufandas, corona...). Al tocarlas se inclinan con perspectiva, las capas se separan en profundidad y saltan con
  chispas; su ánimo (seria, alerta, contenta, durmiendo) cambia la cara y el movimiento. Evolucionan con el XP que
  ganas (se calcula de lo que haces; no se guarda) y piden equilibrio entre estudios y vida personal desde la etapa 3.
  **Alpi es 3D de verdad** (`src/mascotas/alpi/`): 4 niveles (Alpaca bebé, Exploradora, Guardiana de los valles,
  Alpaca legendaria), 8 expresiones (feliz, emocionada, curiosa, dormida, concentrada, sorprendida, triste, guiño) y
  7 animaciones (reposo, caminar, saltar, celebrar, estudiando, descansando, saludar). Está hecha con formas de
  Three.js, sin imágenes ni archivos de modelo: `datos.ts` define niveles, expresiones y animaciones; `Modelo.tsx` el
  cuerpo, la cara y los accesorios por nivel; `EstudioAlpi.tsx` es la pantalla para probarla (Más → Mi mascota →
  Alpi → Probar a Alpi en 3D). Se descarga solo al usarla y tiene la versión vectorial de respaldo sin WebGL.
  Las otras 7 usan profundidad simulada con capas. Los dibujos originales de la hoja siguen en
  `herramientas/mascotas/` y `src/mascotas/sprites/` por si se quiere volver a ellos.
- **Fase 2b (login con Google y nube):** pendiente de las claves de Supabase. Guía en `docs/SUPABASE.md`.

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
