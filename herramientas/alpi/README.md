# ALPI — paquete inicial para Blender + Claude Code

Este paquete contiene una referencia visual sin modificar y un script que construye una primera versión procedural de Alpi en Blender.

## Archivos

- `REFERENCIA_ALPI_SIN_CAMBIOS.jpeg`: imagen original proporcionada por la usuaria; se incluye sin editar.
- `alpi_blender.py`: script que genera una escena de Alpi con volúmenes redondeados, lana por mechones, cara, pañuelo, mochila, flor, luces y cámara.
- `README.md`: instrucciones para generar el modelo.
- `CLAUDE_CODE_BRIEF.md`: instrucciones para pasar el paquete a Claude Code e integrarlo en una app.

## Generar el modelo

1. Instala Blender (versión LTS reciente recomendada).
2. Abre Blender → espacio de trabajo **Scripting**.
3. Pulsa **Open** y selecciona `alpi_blender.py`.
4. Pulsa **Run Script**.
5. El script intenta guardar `Alpi_Bebe.blend` y `Alpi_Bebe.glb` en la carpeta donde está el script.
6. Si no se genera el `.glb`, abre `Alpi_Bebe.blend` y usa `File > Export > glTF 2.0`.

## Limitación importante

No se ha podido ejecutar Blender en este entorno, así que el `.blend` y el `.glb` no están incluidos como resultados ya renderizados. El script es el generador que debe ejecutarse en Blender para producirlos. El modelo generado es un prototipo procedural, no una escultura final de alta fidelidad ni un personaje con rig completo.

Para que coincida mucho más con la referencia, el trabajo posterior debe refinar el esculpido de la lana, el rostro, las proporciones, el shading y los accesorios; después añadir rig corporal, expresiones faciales y clips de animación.
