# Brief para Claude Code — integrar a Alpi sin cambiar el diseño de referencia

Actúa como desarrollador 3D y de integración de personajes para una app de metas académicas y personales.

## Archivos de referencia
- `REFERENCIA_ALPI_SIN_CAMBIOS.jpeg` es la referencia visual principal. No la edites ni la reemplaces.
- `alpi_blender.py` es un generador procedural inicial.
- Ejecuta el script en Blender para producir `Alpi_Bebe.blend` y `Alpi_Bebe.glb` si Blender está instalado en el entorno.

## Objetivo visual
Crear a Alpi como una alpaca chibi de pie sobre dos patas, con:
- cabeza grande y cuerpo pequeño redondeado;
- lana crema muy voluminosa, como pequeños mechones blandos;
- ojos oscuros grandes y brillantes, cejas pequeñas y mejillas rosadas;
- mechón rosa pastel;
- pañuelo coral;
- mochila de exploración verde menta con rollo de manta;
- pequeña flor como accesorio;
- acabado de juguete 3D suave, iluminación cálida y materiales mate/satinados.
Mantener la identidad de la imagen de referencia. No rediseñar paleta, accesorios ni proporciones sin pedir confirmación.

## Tareas
1. Inspecciona la estructura y el contenido del paquete.
2. Si Blender está disponible, ejecuta `alpi_blender.py` y valida que se creen `.blend` y `.glb`. Si algo falla, corrige el script y documenta el cambio.
3. Revisa el `.glb` en un visor compatible; confirma orientación, escala, materiales y que no haya suelo/cámara/luz exportados como parte del personaje.
4. No afirmes que hay rig o animaciones si todavía no están implementados.
5. Si el proyecto de la app está presente, identifica su stack antes de elegir integración. Para React/web, considera Three.js o React Three Fiber y `useGLTF`/`useAnimations`. Para Flutter o React Native, confirma primero el soporte 3D existente y no asumas que el GLB se puede mostrar directamente sin un visor compatible.
6. Si no hay proyecto de app, entrega instrucciones de integración y un componente de ejemplo apropiado al stack confirmado.
7. Deja el modelo como un recurso reemplazable y separa las animaciones de la lógica de metas.

## Animaciones deseadas para una siguiente fase
- `idle`: respiración sutil, parpadeo y balanceo suave.
- `walk`: pasos cortos, brazos y mochila con rebote.
- `jump`: pequeño salto.
- `celebrate`: brazos arriba, orejas/movimiento corporal y partículas opcionales.
- `study`: mirada al libro y pequeños movimientos de cabeza.
- `sleep`: ojos cerrados y respiración lenta.
- `wave`: saludo.
Las expresiones deseadas son `happy`, `excited`, `curious`, `sleepy`, `focused`, `surprised`, `sad` y `wink`. Implementarlas con rig facial/shape keys o una solución equivalente, no solo cambiando el texto de UI.

## Evoluciones
La referencia tiene cuatro niveles:
1. Bebé: pañuelo coral y mochila pequeña.
2. Exploradora: equipo de exploración más visible.
3. Guardiana de los valles: corona/corona floral y detalles botánicos.
4. Alpaca legendaria: accesorios ornamentales, medallón y efectos mágicos sutiles.
Crear variantes consistentes a partir del mismo diseño base. No sustituirlas por especies diferentes.

## Restricciones y entregables
- Conserva `REFERENCIA_ALPI_SIN_CAMBIOS.jpeg` intacta.
- Entrega los archivos editables y documenta qué se generó realmente.
- Prioriza un modelo GLB optimizado para móvil cuando el acabado lo permita.
- No inventes pruebas: informa de errores, dependencias y pasos pendientes.
