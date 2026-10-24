# Alpi para la app — generador en Blender.
#
# Parte del script original del paquete (alpi_blender_original.py: mismas proporciones, colores y
# materiales) y lo prepara para la app:
#   - Piezas agrupadas en nodos con nombre para animarlas desde Three.js
#     (Raiz, Cuerpo, Cabeza, BrazoL/R, PataL/R, OrejaL/R, OjoL/R, Libro, Tronco).
#   - Los 4 niveles en un solo archivo: los accesorios se llaman "Niv_<niveles>_<pieza>"
#     (por ejemplo Niv_234_mochila se ve en los niveles 2, 3 y 4).
#   - Las expresiones como piezas que se encienden y apagan (Ojos*, Cejas*, Boca*, Lagrimas, Lentes).
#
# Uso (sin abrir Blender):  python herramientas/alpi/construir.py
# O dentro de Blender: Scripting > Open > alpi_app.py > Run Script.
# Salida: src/assets/alpi/alpi.glb

import bpy
import bmesh
import math
import os
import sys
from mathutils import Vector

SALIDA = os.environ.get('ALPI_SALIDA') or os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'src', 'assets', 'alpi', 'alpi.glb')
GUARDAR_BLEND = os.environ.get('ALPI_BLEND')

bpy.ops.wm.read_factory_settings(use_empty=True)
escena = bpy.context.scene
coleccion = escena.collection


# ---------- materiales (los del paquete original) ----------
def material(nombre, color, rugosidad=0.72, metal=0.0):
    m = bpy.data.materials.new(nombre)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = rugosidad
    bsdf.inputs['Metallic'].default_value = metal
    m.diffuse_color = (*color, 1)
    return m


def srgb(hexa):
    # Colores escritos en hex (sRGB) pasados a lineal, como los guarda Blender.
    h = hexa.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


M = {
    'lana': material('lana', (0.94, 0.83, 0.72), 0.9),
    'lana_luz': material('lana_luz', (1.0, 0.91, 0.82), 0.9),
    'patas': material('patas', (0.49, 0.31, 0.22), 0.8),
    'rosa': material('mechon', (0.94, 0.43, 0.57), 0.55),
    'oreja': material('oreja', (0.88, 0.36, 0.45), 0.78),
    'mejilla': material('mejilla', (1.0, 0.40, 0.49), 0.85),
    'tinta': material('tinta', (0.105, 0.055, 0.075), 0.22),
    'brillo': material('brillo_ojo', (1.0, 0.97, 0.91), 0.12),
    'ceja': material('ceja', (0.32, 0.19, 0.13), 0.7),
    'coral': material('panuelo_coral', (0.91, 0.25, 0.36), 0.7),
    'rojo': material('panuelo_rojo', srgb('#d93d34'), 0.7),
    'menta': material('mochila_menta', (0.12, 0.55, 0.49), 0.6),
    'menta_luz': material('mochila_bolsillo', (0.28, 0.72, 0.62), 0.62),
    'azul_mochila': material('mochila_viaje', srgb('#3f7f86'), 0.62),
    'cuero': material('mochila_cuero', srgb('#8a5a3c'), 0.55),
    'cuero_luz': material('mochila_cuero_bolsillo', srgb('#a8714a'), 0.58),
    'salmon': material('correas', (0.91, 0.46, 0.36), 0.72),
    'manta_cafe': material('manta_cafe', srgb('#b98a5a'), 0.8),
    'oro': material('dorado', (0.95, 0.65, 0.24), 0.3, 0.35),
    'petalo': material('flor_rosa', (1.0, 0.39, 0.57), 0.55),
    'petalo_claro': material('flor_clara', srgb('#ffd1e0'), 0.55),
    'petalo_blanco': material('flor_blanca', srgb('#fff6ee'), 0.55),
    'petalo_lila': material('flor_lila', srgb('#c7a6ff'), 0.55),
    'petalo_naranja': material('flor_naranja', srgb('#ffa36b'), 0.55),
    'centro': material('flor_centro', (1.0, 0.73, 0.23), 0.45),
    'hoja': material('hoja', srgb('#5aa86a'), 0.6),
    'hoja_luz': material('hoja_clara', srgb('#7cc48a'), 0.6),
    'poncho': material('poncho', srgb('#7cc79a'), 0.75),
    'poncho_borde': material('poncho_borde', srgb('#4f9e6f'), 0.75),
    'capa': material('capa', srgb('#b48be0'), 0.6),
    'baston': material('baston', srgb('#7a4a2c'), 0.75),
    'libro': material('libro', srgb('#5b7fd6'), 0.65),
    'pagina': material('pagina', srgb('#fffaf0'), 0.9),
    'lagrima': material('lagrima', srgb('#7cc3ff'), 0.1),
    'boca': material('boca', srgb('#6e2f3c'), 0.5),
    'lengua': material('lengua', srgb('#ff8fa0'), 0.6),
    'tronco': material('tronco', srgb('#7a4a2c'), 0.9),
    'tronco_corte': material('tronco_corte', srgb('#d9b382'), 0.9),
}


# ---------- utilidades ----------
def vacio(nombre, loc, padre=None):
    o = bpy.data.objects.new(nombre, None)
    o.location = loc
    coleccion.objects.link(o)
    bpy.context.view_layer.update()  # sin esto, el punto de giro queda en el origen
    if padre:
        poner_padre(o, padre)
    return o


def poner_padre(hijo, padre):
    mundo = hijo.matrix_world.copy()
    hijo.parent = padre
    hijo.matrix_world = mundo


def suave(o, mat):
    if mat:
        o.data.materials.append(mat)
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def esfera(nombre, loc, escala, mat, padre, seg=28, anillos=18, rot=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=anillos, location=loc)
    o = bpy.context.object
    o.name = nombre
    o.scale = escala
    if rot:
        o.rotation_euler = rot
    suave(o, mat)
    bpy.context.view_layer.update()
    poner_padre(o, padre)
    return o


def caja(nombre, loc, dim, mat, padre, bisel=0.08, rot=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object
    o.name = nombre
    o.dimensions = dim
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    m = o.modifiers.new('bisel', 'BEVEL')
    m.width = bisel
    m.segments = 3
    if rot:
        o.rotation_euler = rot
    suave(o, mat)
    bpy.context.view_layer.update()
    poner_padre(o, padre)
    return o


def cilindro(nombre, a, b, radio, mat, padre, vert=20, radio2=None):
    a, b = Vector(a), Vector(b)
    d = b - a
    if radio2 is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=vert, radius=radio, depth=d.length, location=(a + b) / 2)
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=vert, radius1=radio, radius2=radio2, depth=d.length, location=(a + b) / 2)
    o = bpy.context.object
    o.name = nombre
    o.rotation_mode = 'QUATERNION'
    o.rotation_quaternion = d.to_track_quat('Z', 'Y')
    suave(o, mat)
    bpy.context.view_layer.update()
    poner_padre(o, padre)
    return o


def toro(nombre, loc, r1, r2, mat, padre, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_segments=36, minor_segments=12, location=loc, major_radius=r1, minor_radius=r2)
    o = bpy.context.object
    o.name = nombre
    o.rotation_euler = rot
    suave(o, mat)
    bpy.context.view_layer.update()
    poner_padre(o, padre)
    return o


def curva(nombre, puntos, grosor, mat, padre):
    c = bpy.data.curves.new(nombre, 'CURVE')
    c.dimensions = '3D'
    c.resolution_u = 12
    c.bevel_depth = grosor
    c.bevel_resolution = 3
    c.use_fill_caps = True
    s = c.splines.new('BEZIER')
    s.bezier_points.add(len(puntos) - 1)
    for bp, co in zip(s.bezier_points, puntos):
        bp.co = co
        bp.handle_left_type = bp.handle_right_type = 'AUTO'
    o = bpy.data.objects.new(nombre, c)
    coleccion.objects.link(o)
    o.data.materials.append(mat)
    # A malla, para que el .glb lo lleve como cualquier otra pieza.
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.convert(target='MESH')
    o = bpy.context.object
    o.name = nombre
    poner_padre(o, padre)
    return o


def unir(nombre, objetos):
    """Junta varias mallas en una (menos piezas = más fluido en el teléfono)."""
    objetos = [o for o in objetos if o.type == 'MESH']
    if len(objetos) < 2:
        return objetos[0] if objetos else None
    bpy.ops.object.select_all(action='DESELECT')
    for o in objetos:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objetos[0]
    bpy.ops.object.join()
    o = bpy.context.object
    o.name = nombre
    return o


def fibonacci(n, centro, radios):
    pts = []
    for i in range(n):
        y = 1 - 2 * (i + 0.5) / n
        r = math.sqrt(max(0.0, 1 - y * y))
        th = i * 2.399963
        pts.append(Vector((centro[0] + math.cos(th) * r * radios[0], centro[1] + math.sin(th) * r * radios[1], centro[2] + y * radios[2])))
    return pts


def flor(nombre, centro, padre, s=1.0, petalo='petalo', mirar=(0, -1, 0)):
    g = vacio(nombre, centro, padre)
    eje = Vector(mirar).normalized()
    # dos ejes perpendiculares a la dirección de la flor, para repartir pétalos alrededor
    u = eje.cross(Vector((0, 0, 1)))
    if u.length < 0.1:
        u = eje.cross(Vector((1, 0, 0)))
    u.normalize()
    v = eje.cross(u).normalized()
    rot = eje.to_track_quat('Y', 'Z').to_euler()
    for i in range(5):
        a = i * 2 * math.pi / 5
        p = Vector(centro) + (u * math.cos(a) + v * math.sin(a)) * 0.085 * s
        esfera(f'{nombre}_petalo{i}', p, (0.06 * s, 0.026 * s, 0.06 * s), M[petalo], g, 16, 10, rot)
    esfera(f'{nombre}_centro', Vector(centro) + eje * 0.02 * s, (0.045 * s, 0.03 * s, 0.045 * s), M['centro'], g, 16, 10, rot)
    return g


def hoja(nombre, base, ang, padre, s=1.0, mat='hoja', eje='y'):
    # Hoja: elipsoide aplanado que sale desde "base" con un ángulo
    o = esfera(nombre, base, (0.05 * s, 0.022 * s, 0.13 * s), M[mat], padre, 16, 10)
    o.rotation_euler = (0, ang, 0) if eje == 'y' else (ang, 0, 0)
    return o


# ---------- esqueleto de nodos (lo que la app mueve) ----------
raiz = vacio('Raiz', (0, 0, 0))
cuerpo = vacio('Cuerpo', (0, 0, 0.42), raiz)
cabeza = vacio('Cabeza', (0, -0.1, 1.62), raiz)
pata = {l: vacio(f'Pata{l}', (x, -0.03, 0.62), raiz) for l, x in (('L', -0.31), ('R', 0.31))}
brazo = {l: vacio(f'Brazo{l}', (x, -0.16, 1.36), raiz) for l, x in (('L', -0.56), ('R', 0.56))}
oreja = {l: vacio(f'Oreja{l}', (x, -0.02, 2.48), cabeza) for l, x in (('L', -0.47), ('R', 0.47))}

# ---------- cuerpo y lana ----------
base_cuerpo = esfera('cuerpo_base', (0, 0, 0.98), (0.62, 0.52, 0.66), M['lana'], cuerpo, 40, 26)
pecho = esfera('pecho', (0, -0.28, 1.1), (0.47, 0.32, 0.52), M['lana_luz'], cuerpo)
mechones = []
for i, p in enumerate(fibonacci(70, (0, 0, 0.98), (0.6, 0.5, 0.64))):
    # sin mechones abajo (patas) ni delante del cuello (pañuelo)
    if p.z < 0.45 or (p.y < -0.25 and p.z > 1.3):
        continue
    s = 0.11 + (i * 37 % 10) / 220
    mechones.append(esfera(f'lana_cuerpo{i}', p, (s, s * 0.9, s), M['lana_luz'] if i % 3 else M['lana'], cuerpo, 18, 12))
unir('CuerpoLana', [base_cuerpo, pecho] + mechones)
esfera('colita', (0, 0.6, 0.82), (0.16, 0.17, 0.16), M['lana_luz'], cuerpo)

# ---------- patas y brazos ----------
for l, x in (('L', -0.31), ('R', 0.31)):
    unir(f'pata{l}', [
        esfera(f'pata{l}_lana', (x, -0.03, 0.5), (0.18, 0.19, 0.2), M['lana'], pata[l]),
        esfera(f'pata{l}_pezuna', (x, -0.06, 0.3), (0.17, 0.21, 0.14), M['patas'], pata[l]),
    ])
for l, x in (('L', -0.68), ('R', 0.68)):
    s = -1 if l == 'L' else 1
    b = esfera(f'brazo{l}_lana', (x, -0.2, 1.14), (0.15, 0.16, 0.27), M['lana_luz'], brazo[l], rot=(0, s * 0.38, 0))
    m = esfera(f'brazo{l}_mano', (x * 1.08, -0.26, 0.92), (0.11, 0.11, 0.09), M['patas'], brazo[l])
    unir(f'brazo{l}', [b, m])

# ---------- cabeza ----------
centro_cabeza = Vector((0, -0.12, 2.08))
R_CABEZA = (0.72, 0.61, 0.68)
base_cabeza = esfera('cabeza_base', centro_cabeza, R_CABEZA, M['lana_luz'], cabeza, 44, 30)
lana_cabeza = []
for i, p in enumerate(fibonacci(110, centro_cabeza, (0.7, 0.59, 0.66))):
    # deja libre la cara (adelante y al centro)
    if p.y < -0.28 and p.z < 2.44 and abs(p.x) < 0.58:
        continue
    s = 0.12 + (i * 53 % 10) / 200
    lana_cabeza.append(esfera(f'lana_cabeza{i}', p, (s, s, s * 0.95), M['lana_luz'] if i % 4 else M['lana'], cabeza, 18, 12))
unir('CabezaLana', [base_cabeza] + lana_cabeza)

# mechón rosado (del original)
unir('Mechon', [
    esfera('mechon_base', (-0.06, -0.55, 2.66), (0.25, 0.16, 0.19), M['rosa'], cabeza),
    esfera('mechon_izq', (-0.22, -0.56, 2.58), (0.2, 0.15, 0.13), M['rosa'], cabeza, rot=(0, -0.35, 0)),
    esfera('mechon_centro', (-0.02, -0.6, 2.55), (0.21, 0.14, 0.12), M['rosa'], cabeza, rot=(0, 0.1, 0)),
    esfera('mechon_punta', (0.14, -0.55, 2.62), (0.17, 0.13, 0.11), M['rosa'], cabeza, rot=(0, 0.5, 0)),
])

# orejas: más chicas y hacia los lados, como en la referencia
for l, x in (('L', -0.56), ('R', 0.56)):
    s = -1 if l == 'L' else 1
    unir(f'oreja{l}', [
        esfera(f'oreja{l}_lana', (x, -0.02, 2.62), (0.14, 0.12, 0.24), M['lana'], oreja[l], rot=(0, s * 0.75, 0)),
        esfera(f'oreja{l}_dentro', (x - s * 0.01, -0.13, 2.62), (0.07, 0.03, 0.15), M['oreja'], oreja[l], rot=(0, s * 0.75, 0)),
    ])


def sup(x, z, extra=0.0):
    """Punto sobre la superficie de la cara (frente = -Y)."""
    k = 1 - (x / R_CABEZA[0]) ** 2 - ((z - centro_cabeza.z) / R_CABEZA[2]) ** 2
    return Vector((x, centro_cabeza.y - R_CABEZA[1] * math.sqrt(max(0.0, k)) - extra, z))


# cara fija: hocico, nariz y mejillas
unir('CaraFija', [
    esfera('hocico', sup(0, 2.0, -0.07), (0.19, 0.1, 0.12), M['lana_luz'], cabeza),
    esfera('nariz', sup(0, 2.045, 0.03), (0.055, 0.026, 0.038), M['tinta'], cabeza, 20, 12),
    esfera('mejillaL', sup(-0.44, 2.0, -0.02), (0.12, 0.035, 0.065), M['mejilla'], cabeza, rot=(0, 0, 0.45)),
    esfera('mejillaR', sup(0.44, 2.0, -0.02), (0.12, 0.035, 0.065), M['mejilla'], cabeza, rot=(0, 0, -0.45)),
])

# ---------- expresiones: piezas que la app enciende o apaga ----------
YO, ZO = 0.255, 2.17  # posición de los ojos


def ojo_abierto(nombre, x, padre):
    g = vacio(nombre, sup(x, ZO, 0.0), padre)
    esfera(f'{nombre}_iris', sup(x, ZO, 0.0), (0.105, 0.055, 0.135), M['tinta'], g)
    esfera(f'{nombre}_brillo', sup(x - 0.03, ZO + 0.045, 0.05), (0.032, 0.018, 0.038), M['brillo'], g, 18, 10)
    esfera(f'{nombre}_brillo2', sup(x + 0.035, ZO - 0.05, 0.05), (0.014, 0.01, 0.016), M['brillo'], g, 14, 8)
    return g


def arco_ojo(nombre, x, arriba, padre):
    # arriba=True: ojo feliz (∩); False: ojo cerrado (∪)
    dz = 0.06 if arriba else -0.05
    return curva(nombre, [sup(x - 0.09, ZO - 0.01, 0.03), sup(x, ZO + dz, 0.035), sup(x + 0.09, ZO - 0.01, 0.03)], 0.02, M['tinta'], padre)


ojos_abiertos = vacio('OjosAbiertos', (0, -0.7, ZO), cabeza)
ojo_abierto('OjoL', -YO, ojos_abiertos)
ojo_abierto('OjoR', YO, ojos_abiertos)
ojos_felices = vacio('OjosFelices', (0, -0.7, ZO), cabeza)
arco_ojo('ojo_feliz_L', -YO, True, ojos_felices)
arco_ojo('ojo_feliz_R', YO, True, ojos_felices)
ojos_cerrados = vacio('OjosCerrados', (0, -0.7, ZO), cabeza)
arco_ojo('ojo_cerrado_L', -YO, False, ojos_cerrados)
arco_ojo('ojo_cerrado_R', YO, False, ojos_cerrados)
ojos_guino = vacio('OjosGuino', (0, -0.7, ZO), cabeza)
ojo_abierto('OjoGuinoL', -YO, ojos_guino)
arco_ojo('ojo_guino_R', YO, True, ojos_guino)


def cejas(nombre, ang_l, ang_r, alto_l=2.36, alto_r=2.36):
    g = vacio(nombre, (0, -0.7, 2.36), cabeza)
    esfera(f'{nombre}_L', sup(-YO, alto_l, 0.0), (0.1, 0.035, 0.026), M['ceja'], g, 18, 10, rot=(0, ang_l, 0))
    esfera(f'{nombre}_R', sup(YO, alto_r, 0.0), (0.1, 0.035, 0.026), M['ceja'], g, 18, 10, rot=(0, ang_r, 0))
    return g


cejas('CejasNormal', -0.12, 0.12)
cejas('CejasTriste', 0.35, -0.35, 2.37, 2.37)
cejas('CejasCuriosa', -0.12, -0.25, 2.36, 2.42)
cejas('CejasEnfoque', -0.35, 0.35, 2.34, 2.34)

curva('BocaSonrisa', [sup(-0.075, 1.955, 0.03), sup(0, 1.925, 0.035), sup(0.075, 1.955, 0.03)], 0.013, M['tinta'], cabeza)
curva('BocaTriste', [sup(-0.07, 1.915, 0.03), sup(0, 1.95, 0.035), sup(0.07, 1.915, 0.03)], 0.013, M['tinta'], cabeza)
boca_abierta = vacio('BocaAbierta', sup(0, 1.93, 0.0), cabeza)
esfera('boca_abierta_fondo', sup(0, 1.93, -0.005), (0.08, 0.03, 0.06), M['boca'], boca_abierta)
esfera('boca_abierta_lengua', sup(0, 1.905, 0.012), (0.045, 0.02, 0.025), M['lengua'], boca_abierta, 16, 10)
esfera('BocaO', sup(0, 1.92, -0.005), (0.042, 0.03, 0.052), M['boca'], cabeza)
lagrimas = vacio('Lagrimas', (0, -0.7, 2.0), cabeza)
for l, x in (('L', -YO), ('R', YO)):
    esfera(f'lagrima{l}', sup(x + (0.04 if x < 0 else -0.04), 2.04, 0.04), (0.03, 0.02, 0.045), M['lagrima'], lagrimas, 16, 10)
lentes = vacio('Lentes', (0, -0.78, ZO), cabeza)
for l, x in (('L', -YO), ('R', YO)):
    toro(f'lente{l}', sup(x, ZO, 0.08), 0.145, 0.018, M['patas'], lentes, rot=(math.pi / 2, 0, 0))
cilindro('lentes_puente', sup(-0.11, ZO + 0.02, 0.1), sup(0.11, ZO + 0.02, 0.1), 0.014, M['patas'], lentes, 8)

# ---------- accesorios por nivel ----------
def panuelo(nombre, mat, padre):
    g = vacio(nombre, (0, -0.06, 1.55), padre)
    toro(f'{nombre}_cuello', (0, -0.08, 1.56), 0.5, 0.11, mat, g, rot=(math.pi / 2, 0, 0))
    # el triángulo del pañuelo, cayendo sobre el pecho
    bpy.ops.mesh.primitive_cone_add(vertices=3, radius1=0.3, radius2=0.0, depth=0.06, location=(0, -0.6, 1.36))
    t = bpy.context.object
    t.name = f'{nombre}_punta'
    # gira el triángulo para que una punta quede hacia abajo y luego lo para frente a la cámara
    v = max(t.data.vertices, key=lambda v: -v.co.y)
    t.rotation_euler = (0, 0, -math.atan2(v.co.x, -v.co.y))
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    t.scale = (1, 1.2, 1)
    t.rotation_euler = (math.pi / 2 - 0.25, 0, 0)
    m = t.modifiers.new('bisel', 'BEVEL')
    m.width = 0.03
    m.segments = 3
    suave(t, mat)
    bpy.context.view_layer.update()
    poner_padre(t, g)
    return g


panuelo('Niv_1_panuelo', M['coral'], cuerpo)
p2 = panuelo('Niv_2_panuelo', M['coral'], cuerpo)
for i, (x, z) in enumerate(((-0.08, 1.38), (0.08, 1.3), (0.02, 1.22))):
    esfera(f'panuelo2_punto{i}', (x, -0.62, z), (0.022, 0.012, 0.022), M['oro'], p2, 12, 8)
panuelo('Niv_4_panuelo', M['rojo'], cuerpo)

# Mochila pequeña (nivel 1): la del original
m1 = vacio('Niv_1_mochila', (0.43, 0.48, 1.13), cuerpo)
caja('m1_cuerpo', (0.43, 0.48, 1.13), (0.49, 0.3, 0.67), M['menta'], m1, 0.12)
caja('m1_bolsillo', (0.43, 0.64, 0.98), (0.36, 0.12, 0.27), M['menta_luz'], m1, 0.07)
caja('m1_tapa', (0.43, 0.64, 1.39), (0.39, 0.12, 0.12), M['menta'], m1, 0.05)
for x in (0.25, 0.61):
    cilindro('m1_correa', (x, 0.27, 1.42), (x - 0.02, -0.04, 0.91), 0.045, M['salmon'], m1)
cilindro('m1_manta', (0.2, 0.48, 1.56), (0.66, 0.48, 1.56), 0.105, M['salmon'], m1, 24)
for x in (0.28, 0.58):
    toro('m1_banda', (x, 0.48, 1.56), 0.108, 0.022, M['oro'], m1, rot=(0, math.pi / 2, 0))

# Mochila de viaje (niveles 2 y 3): más grande, con manta café
m2 = vacio('Niv_23_mochila', (0.3, 0.52, 1.13), cuerpo)
caja('m2_cuerpo', (0.3, 0.55, 1.12), (0.62, 0.36, 0.78), M['azul_mochila'], m2, 0.14)
caja('m2_bolsillo', (0.3, 0.75, 0.98), (0.44, 0.12, 0.32), M['menta_luz'], m2, 0.08)
caja('m2_tapa', (0.3, 0.74, 1.42), (0.5, 0.14, 0.16), M['azul_mochila'], m2, 0.06)
esfera('m2_hebilla', (0.3, 0.82, 1.38), (0.045, 0.02, 0.045), M['oro'], m2, 12, 8)
for x in (0.08, 0.52):
    cilindro('m2_correa', (x, 0.3, 1.46), (x - 0.02, -0.04, 0.91), 0.05, M['salmon'], m2)
cilindro('m2_manta', (-0.05, 0.55, 1.64), (0.65, 0.55, 1.64), 0.13, M['manta_cafe'], m2, 24)
for x in (0.08, 0.52):
    toro('m2_banda', (x, 0.55, 1.64), 0.133, 0.024, M['patas'], m2, rot=(0, math.pi / 2, 0))

# Plantas que asoman de la mochila (nivel 2) y flores (nivel 3)
pl = vacio('Niv_2_plantas', (0.55, 0.55, 1.75), cuerpo)
for i, ang in enumerate((-0.9, -0.4, 0.1, 0.6, 1.0)):
    hoja(f'planta{i}', (0.55 + math.sin(ang) * 0.12, 0.55 + (i % 2) * 0.06, 1.82 + math.cos(ang) * 0.06), ang, pl, 1.4, 'hoja_luz' if i % 2 else 'hoja')
flor('planta_flor', (0.72, 0.4, 1.52), pl, 1.0, 'petalo_naranja', (0.6, -0.8, 0))
fm = vacio('Niv_3_flores_mochila', (0.4, 0.6, 1.3), cuerpo)
flor('fm_1', (0.62, 0.5, 1.72), fm, 1.3, 'petalo', (0.4, -0.6, 0.6))
flor('fm_2', (0.72, 0.42, 1.2), fm, 1.1, 'petalo_claro', (0.8, -0.5, 0))
hoja('fm_hoja1', (0.55, 0.5, 1.82), -0.5, fm, 1.2)
hoja('fm_hoja2', (0.75, 0.45, 1.3), 0.6, fm, 1.1, 'hoja_luz')

# Poncho verde (nivel 3)
po = vacio('Niv_3_poncho', (0, -0.05, 1.42), cuerpo)
bpy.ops.mesh.primitive_cone_add(vertices=40, radius1=0.72, radius2=0.42, depth=0.5, location=(0, -0.05, 1.3), end_fill_type='NOTHING')
cono = bpy.context.object
cono.name = 'poncho_tela'
m = cono.modifiers.new('grosor', 'SOLIDIFY')
m.thickness = 0.03
suave(cono, M['poncho'])
bpy.context.view_layer.update()
poner_padre(cono, po)
toro('poncho_borde', (0, -0.05, 1.05), 0.72, 0.035, M['poncho_borde'], po)
flor('poncho_flor1', (0.3, -0.66, 1.2), po, 1.2, 'petalo', (0.3, -1, 0.3))
flor('poncho_flor2', (-0.34, -0.64, 1.16), po, 1.0, 'petalo_blanco', (-0.3, -1, 0.3))
hoja('poncho_hoja', (0.12, -0.7, 1.16), 0.9, po, 1.1)

# Corona de flores (nivel 3)
co = vacio('Niv_3_corona', (0, -0.12, 2.68), cabeza)
colores = ['petalo', 'petalo_claro', 'petalo_blanco', 'petalo_naranja', 'petalo_lila']
for i in range(12):
    a = i / 12 * 2 * math.pi
    p = Vector((math.sin(a) * 0.58, -0.12 - math.cos(a) * 0.5, 2.62 + math.cos(a) * 0.08))
    mirar = Vector((math.sin(a), -math.cos(a), 0.9))
    flor(f'corona_flor{i}', p, co, 1.25 if i % 2 == 0 else 1.0, colores[i % len(colores)], mirar)
    if i % 2:
        hoja(f'corona_hoja{i}', p + Vector((0, 0, -0.04)), a, co, 1.0)

# Ramito al costado de la cabeza (niveles 1, 2 y 4): la flor del original
fl = vacio('Niv_124_flor', (-0.43, -0.47, 2.54), cabeza)
flor('flor_cabeza', (-0.46, -0.5, 2.54), fl, 1.0, 'petalo', (-0.3, -1, 0.2))
fl4 = vacio('Niv_4_ramito', (-0.5, -0.4, 2.6), cabeza)
flor('ramito1', (-0.58, -0.3, 2.72), fl4, 1.2, 'petalo_claro', (-0.6, -0.8, 0.4))
flor('ramito2', (-0.66, -0.12, 2.6), fl4, 1.0, 'petalo_lila', (-1, -0.4, 0.3))
hoja('ramito_hoja', (-0.66, -0.36, 2.5), -1.0, fl4, 1.2)

# Nivel 4: capa, medalla y mochila de cuero con catalejo
ca = vacio('Niv_4_capa', (0, 0.1, 1.0), cuerpo)
bpy.ops.mesh.primitive_cone_add(vertices=48, radius1=0.98, radius2=0.46, depth=1.05, location=(0, 0.05, 1.0), end_fill_type='NOTHING')
capa = bpy.context.object
capa.name = 'capa_tela'
bm = bmesh.new()
bm.from_mesh(capa.data)
# solo la mitad de atrás (+Y) y un poco de los costados
borrar = [f for f in bm.faces if f.calc_center_median().y < -0.12]
bmesh.ops.delete(bm, geom=borrar, context='FACES')
bm.to_mesh(capa.data)
bm.free()
m = capa.modifiers.new('grosor', 'SOLIDIFY')
m.thickness = 0.03
suave(capa, M['capa'])
bpy.context.view_layer.update()
poner_padre(capa, ca)
bpy.ops.mesh.primitive_torus_add(major_segments=48, minor_segments=8, location=(0, 0.05, 0.48), major_radius=0.98, minor_radius=0.03)
borde = bpy.context.object
borde.name = 'capa_borde'
bm = bmesh.new()
bm.from_mesh(borde.data)
bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.y < -0.15], context='VERTS')
bm.to_mesh(borde.data)
bm.free()
suave(borde, M['oro'])
bpy.context.view_layer.update()
poner_padre(borde, ca)

me = vacio('Niv_4_medalla', (0, -0.6, 1.28), cuerpo)
cilindro('medalla_cadena', (-0.18, -0.52, 1.52), (0, -0.66, 1.28), 0.012, M['oro'], me, 8)
cilindro('medalla_cadena2', (0.18, -0.52, 1.52), (0, -0.66, 1.28), 0.012, M['oro'], me, 8)
cilindro('medalla_disco', (0, -0.62, 1.2), (0, -0.68, 1.2), 0.11, M['oro'], me, 28)
cilindro('medalla_cara', (0, -0.66, 1.2), (0, -0.69, 1.2), 0.08, M['pagina'], me, 28)
cilindro('medalla_aguja', (0, -0.695, 1.15), (0, -0.695, 1.25), 0.01, M['coral'], me, 6)

m4 = vacio('Niv_4_mochila', (0.3, 0.55, 1.13), cuerpo)
caja('m4_cuerpo', (0.3, 0.55, 1.12), (0.64, 0.38, 0.8), M['cuero'], m4, 0.14)
caja('m4_bolsillo', (0.3, 0.76, 0.98), (0.46, 0.12, 0.32), M['cuero_luz'], m4, 0.08)
caja('m4_tapa', (0.3, 0.75, 1.43), (0.52, 0.14, 0.16), M['cuero'], m4, 0.06)
for x in (0.14, 0.46):
    esfera('m4_hebilla', (x, 0.83, 1.38), (0.04, 0.02, 0.04), M['oro'], m4, 12, 8)
for x in (0.08, 0.52):
    cilindro('m4_correa', (x, 0.3, 1.46), (x - 0.02, -0.04, 0.91), 0.05, M['cuero_luz'], m4)
cilindro('m4_catalejo', (0.7, 0.4, 1.05), (0.82, 0.62, 1.62), 0.07, M['oro'], m4, 20, 0.055)
cilindro('m4_manta', (-0.05, 0.55, 1.66), (0.65, 0.55, 1.66), 0.13, M['manta_cafe'], m4, 24)

# Bastón de caminante (nivel 1): va en la mano derecha
bs = vacio('Niv_1_baston', (0.68, -0.3, 0.95), brazo['R'])
cilindro('baston_palo', (0.7, -0.3, 0.12), (0.66, -0.3, 1.5), 0.032, M['baston'], bs, 12)
esfera('baston_pomo', (0.66, -0.3, 1.52), (0.05, 0.05, 0.05), M['manta_cafe'], bs, 14, 10)

# ---------- objetos de las animaciones ----------
libro = vacio('Libro', (0, -0.82, 1.12), raiz)
for l, s in (('L', -1), ('R', 1)):
    tapa = caja(f'libro_tapa{l}', (s * 0.17, -0.82, 1.12), (0.34, 0.02, 0.44), M['libro'], libro, 0.01, rot=(0, 0, s * 0.35))
    caja(f'libro_hojas{l}', (s * 0.16, -0.835, 1.12), (0.3, 0.02, 0.4), M['pagina'], libro, 0.008, rot=(0, 0, s * 0.35))

tronco = vacio('Tronco', (0, 0, 0), None)
cilindro('tronco_cuerpo', (-0.85, -0.05, 0.25), (0.85, -0.05, 0.25), 0.25, M['tronco'], tronco, 24)
for x in (-0.86, 0.86):
    cilindro('tronco_corte', (x - 0.01, -0.05, 0.25), (x + 0.01, -0.05, 0.25), 0.22, M['tronco_corte'], tronco, 24)
hoja('tronco_hoja', (0.4, -0.2, 0.52), 0.6, tronco, 1.3)

# ---------- exportar ----------
os.makedirs(os.path.dirname(os.path.abspath(SALIDA)), exist_ok=True)
if GUARDAR_BLEND:
    bpy.ops.wm.save_as_mainfile(filepath=GUARDAR_BLEND)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(
    filepath=os.path.abspath(SALIDA),
    export_format='GLB',
    export_apply=True,
    use_selection=True,
    export_yup=True,
    export_extras=False,
    export_animations=False,
    export_cameras=False,
    export_lights=False,
)
print('Alpi exportada a', os.path.abspath(SALIDA))
