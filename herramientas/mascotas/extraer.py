"""Extrae los sprites de las mascotas desde la hoja y los deja listos para la app.

Uso (desde la raíz del proyecto):
    python3 -I herramientas/mascotas/extraer.py herramientas/mascotas/hoja-mascotas.webp

Qué hace con cada mascota:
  1. La recorta con su fondo pastel (así no hay bordes feos de un recorte automático).
  2. La completa a cuadrado extendiendo el fondo.
  3. La agranda 2 veces y la afila un poco.
  4. La guarda en src/mascotas/sprites/<mascota>-<etapa>.webp
  5. Escribe src/mascotas/fondos.ts con el color de fondo de cada sprite.

Si más adelante tienes las imágenes originales en mayor tamaño, cambia las cajas
(o reemplaza los .webp directamente, cuadrados de 512 px) y vuelve a correr esto.
"""
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cajas import CAJAS  # noqa: E402

ESCALA = 2
RECORTE = 3  # píxeles que se quitan del borde del recuadro (para no traer su contorno)
RAIZ = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
SALIDA = os.path.join(RAIZ, 'src', 'mascotas', 'sprites')


def a_cuadrado(im, fondo):
    """Completa la imagen a cuadrado rellenando con el color de fondo y suavizando la unión."""
    ancho, alto = im.size
    lado = max(ancho, alto)
    if lado == ancho and lado == alto:
        return im
    arriba, izq = (lado - alto) // 2, (lado - ancho) // 2
    lienzo = np.zeros((lado, lado, 3), np.float32)
    lienzo[:] = fondo
    lienzo[arriba:arriba + alto, izq:izq + ancho] = np.asarray(im).astype(np.float32)
    original = np.zeros((lado, lado), np.float32)
    original[arriba:arriba + alto, izq:izq + ancho] = 1
    # banda alrededor de la unión: ahí se mezcla con una versión borrosa para que no se note el borde
    suave = np.asarray(Image.fromarray((original * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(5))).astype(np.float32) / 255
    banda = np.clip(1 - np.abs(suave - 0.5) * 2, 0, 1)[..., None]
    borroso = np.asarray(Image.fromarray(lienzo.astype(np.uint8)).filter(ImageFilter.GaussianBlur(4))).astype(np.float32)
    return Image.fromarray((lienzo * (1 - banda) + borroso * banda).clip(0, 255).astype(np.uint8))


def color_de_fondo(im):
    """Color típico del borde del recuadro (para pintar el marco igual que la imagen)."""
    d = np.asarray(im).astype(np.float32)
    m = 5
    borde = np.concatenate([d[:m].reshape(-1, 3), d[-m:].reshape(-1, 3), d[:, :m].reshape(-1, 3), d[:, -m:].reshape(-1, 3)])
    r, g, b = (int(x) for x in np.median(borde, axis=0))
    return (r, g, b)


def main(ruta_hoja):
    hoja = Image.open(ruta_hoja).convert('RGB')
    os.makedirs(SALIDA, exist_ok=True)
    fondos = {}
    for mascota, cajas in CAJAS.items():
        for etapa, (x0, y0, x1, y1) in enumerate(cajas, start=1):
            im = hoja.crop((x0 + RECORTE, y0 + RECORTE, x1 - RECORTE, y1 - RECORTE))
            nombre = f'{mascota}-{etapa}'
            rgb = color_de_fondo(im)
            fondos[nombre] = '#%02x%02x%02x' % rgb
            im = a_cuadrado(im, rgb)
            im = im.resize((im.width * ESCALA, im.height * ESCALA), Image.LANCZOS)
            im = im.filter(ImageFilter.UnsharpMask(radius=1.4, percent=70, threshold=2))
            im.save(os.path.join(SALIDA, nombre + '.webp'), 'WEBP', quality=88, method=6)
    lineas = ['// Generado por herramientas/mascotas/extraer.py. No se edita a mano.', '// Color de fondo de cada sprite: sirve para pintar el marco igual que la imagen.', 'export const FONDOS: Record<string, string> = {']
    lineas += [f"  '{k}': '{v}'," for k, v in fondos.items()]
    lineas.append('}')
    with open(os.path.join(RAIZ, 'src', 'mascotas', 'fondos.ts'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(lineas) + '\n')
    print(len(fondos), 'sprites en', SALIDA)


if __name__ == '__main__':
    main(sys.argv[1])
