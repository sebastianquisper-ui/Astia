# Astia v2

Asistente personal contra la procrastinación. App instalable (PWA) hecha con
Vite + React + TypeScript. Proyecto de Sebastián Quispe Roca (UNMSM).

## Estado

**Fase 1 (base) completa:** app instalable, navegación inferior, tema claro/oscuro
automático, tamaño de letra, avisos de éxito/error y pruebas.
Las pantallas muestran su estado vacío: los datos llegan en la fase 2.

## Comandos

```bash
npm install        # instalar dependencias
npm run dev        # servidor de desarrollo
npm run build      # compilar para producción (revisa tipos primero)
npm test           # pruebas de la lógica (Vitest)
npx playwright test  # pruebas de flujos en navegador (necesita CHROMIUM_PATH si no hay navegador de Playwright)
npm run iconos     # regenera los iconos de la app
```

## Instalar en iPhone

1. Abrir la dirección de la app en **Safari**.
2. Compartir → **Añadir a pantalla de inicio**.
3. Abrir Astia desde el icono (las notificaciones push solo funcionan así).

## Estructura

```
src/lib/        lógica pura y probada (tema, rutas, saludo, guardado local)
src/ui/         piezas reutilizables (navegación, avisos, iconos)
src/ajustes/    ajustes de vista (tema, letra, nombre)
src/pantallas/  una pantalla por archivo
src/estilos/    colores (tokens.css) y estilos generales
e2e/            pruebas de flujos completos
```

## Seguridad

Ninguna clave secreta va en el frontend ni en el repositorio. Las claves públicas van
en `.env` (copiar de `.env.example`, que está en `.gitignore`); las secretas viven en el servidor.
