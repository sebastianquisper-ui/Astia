# Genera src/assets/alpi/alpi.glb con Blender como módulo de Python (sin abrir Blender).
#
#   pip install bpy           (Blender 5.x para Python 3.13; pesa unos 400 MB)
#   python herramientas/alpi/construir.py
#
# Después lo comprime con glTF-Transform (meshopt): de ~3,8 MB a ~0,7 MB. Necesita Node (npx).
# Si se pasa --blend, también guarda el proyecto editable en herramientas/alpi/alpi.blend.
import os
import runpy
import subprocess
import sys

aqui = os.path.dirname(os.path.abspath(__file__))
if '--blend' in sys.argv:
    os.environ['ALPI_BLEND'] = os.path.join(aqui, 'alpi.blend')
salida = os.path.abspath(os.path.join(aqui, '..', '..', 'src', 'assets', 'alpi', 'alpi.glb'))
crudo = salida.replace('.glb', '.crudo.glb')
os.environ['ALPI_SALIDA'] = crudo
runpy.run_path(os.path.join(aqui, 'alpi_app.py'), run_name='__main__')
subprocess.run(['npx', '-y', '@gltf-transform/cli@4', 'optimize', crudo, salida, '--compress', 'meshopt', '--simplify', 'false',
                '--texture-compress', 'false', '--join', 'false', '--flatten', 'false', '--instance', 'false'], check=True)
os.remove(crudo)
print('Listo:', salida, round(os.path.getsize(salida) / 1024), 'KB')
