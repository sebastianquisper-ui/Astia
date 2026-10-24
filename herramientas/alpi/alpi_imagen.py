# Alpi — modelo fiel a una sola imagen (la de la cantimplora y la ramita).
# Sin niveles ni expresiones: primero la forma exacta; las demás piezas se suman después.
# Reusa las utilidades de alpi_app.py (materiales, esferas, curvas, metaballs).
# Uso: python herramientas/alpi/alpi_imagen.py  → herramientas/alpi/salida/alpi_imagen.glb

#
# Uso: python herramientas/alpi/construir.py   (exporta src/assets/alpi/alpi.glb)

import bpy
import math
import os
import random
from mathutils import Vector

random.seed(7)
SALIDA = os.environ.get('ALPI_SALIDA') or os.path.join(os.path.dirname(os.path.abspath(__file__)), 'salida', 'alpi_imagen.glb')
GUARDAR_BLEND = os.environ.get('ALPI_BLEND')

bpy.ops.wm.read_factory_settings(use_empty=True)
coleccion = bpy.context.scene.collection


# ---------- materiales ----------
def srgb(hexa):
    h = hexa.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def material(nombre, hexa, rugosidad=0.7, metal=0.0, sheen=0.0):
    m = bpy.data.materials.new(nombre)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*srgb(hexa), 1)
    b.inputs['Roughness'].default_value = rugosidad
    b.inputs['Metallic'].default_value = metal
    if sheen:
        # brillo suave de tela/lana (se exporta como KHR_materials_sheen)
        b.inputs['Sheen Weight'].default_value = sheen
        b.inputs['Sheen Roughness'].default_value = 0.4
    m.diffuse_color = (*srgb(hexa), 1)
    return m


M = {
    'lana': material('lana', '#f4e2cf', 0.85, sheen=0.9),
    'cara': material('cara', '#faeee2', 0.75, sheen=0.5),
    'pezuna': material('pezuna', '#6b4330', 0.55),
    'tinta': material('tinta', '#24161c', 0.15),
    'iris': material('iris', '#2b1a14', 0.12),
    'nariz': material('nariz', '#5a3a2e', 0.35),
    'botella': material('botella', '#f6f1ea', 0.35),
    'tapa': material('tapa', '#ef8a98', 0.45),
    'correa': material('correa', '#8a5a3c', 0.6),
    'brillo': material('brillo_ojo', '#ffffff', 0.1),
    'ceja': material('ceja', '#6b4434', 0.6),
    'mejilla': material('mejilla', '#ff9aa6', 0.8),
    'oreja': material('oreja', '#f3a5ae', 0.8),
    'mechon': material('mechon', '#f5a39b', 0.6, sheen=0.5),
    'mechon_claro': material('mechon_claro', '#f8c0a8', 0.6, sheen=0.5),
    'boca': material('boca', '#6e2f3c', 0.5),
    'lengua': material('lengua', '#ff8fa0', 0.6),
    'lagrima': material('lagrima', '#7cc3ff', 0.1),
    'coral': material('panuelo_coral', '#e2433a', 0.8),
    'rosado': material('panuelo_rosado', '#f4978e', 0.75),
    'rojo': material('panuelo_rojo', '#d93d34', 0.75),
    'verde_bufanda': material('bufanda_verde', '#7cbf6e', 0.75),
    'mochila': material('mochila', '#5a9aa8', 0.6),
    'mochila_claro': material('mochila_claro', '#7fbfc2', 0.6),
    'mochila_rosa': material('mochila_rosa', '#e88b97', 0.6),
    'cuero': material('cuero', '#8a5a3c', 0.55),
    'cuero_claro': material('cuero_claro', '#a8714a', 0.58),
    'manta_rosa': material('manta_rosa', '#e8958f', 0.8),
    'manta_cafe': material('manta_cafe', '#a87850', 0.8),
    'oro': material('dorado', '#e9b949', 0.3, 0.6),
    'vidrio': material('vidrio', '#9fe3ff', 0.05),
    'petalo': material('flor_rosa', '#ff8fb0', 0.55),
    'petalo_claro': material('flor_clara', '#ffc6d8', 0.55),
    'petalo_blanco': material('flor_blanca', '#fff6ee', 0.55),
    'petalo_lila': material('flor_lila', '#c7a6ff', 0.55),
    'petalo_naranja': material('flor_naranja', '#ffb36b', 0.55),
    'centro': material('flor_centro', '#ffd35a', 0.45),
    'hoja': material('hoja', '#4f9e5e', 0.6),
    'hoja_claro': material('hoja_claro', '#7cc48a', 0.6),
    'baston': material('baston', '#7a4a2c', 0.75),
    'libro': material('libro', '#5b7fd6', 0.65),
    'pagina': material('pagina', '#fffaf0', 0.9),
    'lentes': material('lentes', '#8a5a3c', 0.4),
    'tronco': material('tronco', '#7a4a2c', 0.9),
    'tronco_corte': material('tronco_corte', '#d9b382', 0.9),
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
        o.data.materials.clear()
        o.data.materials.append(mat)
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def activo(o):
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o


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
    activo(o)
    bpy.ops.object.convert(target='MESH')
    o = bpy.context.object
    o.name = nombre
    poner_padre(o, padre)
    return o


def nube(nombre, bolas, padre, res=0.035, umbral=0.6, mat=None):
    """Lana de nube: metaballs que se funden y luego se pasan a malla."""
    mb = bpy.data.metaballs.new(nombre)
    mb.resolution = res
    mb.render_resolution = res
    mb.threshold = umbral
    o = bpy.data.objects.new(nombre, mb)
    coleccion.objects.link(o)
    for c, r in bolas:
        el = mb.elements.new()
        el.co = c
        el.radius = r
    bpy.context.view_layer.update()
    activo(o)
    bpy.ops.object.convert(target='MESH')
    o = bpy.context.object
    o.name = nombre
    suave(o, mat or M['lana'])
    poner_padre(o, padre)
    return o


def mechon(nombre, loc, escala, mat, padre, rot):
    """Un mechón suave y lobulado que termina en punta (como el mechón rosado de la referencia)."""
    verts, caras = [], []
    n, anillos = 16, 8
    sx, sy, sz = escala
    for j in range(anillos + 1):
        t = j / anillos
        z = (t - 0.5) * 2.0 * sz
        base = math.sin(math.pi * (0.08 + 0.84 * t)) ** 0.55
        afinar = 1.0 - 0.9 * max(0.0, (t - 0.6) / 0.4)
        for i in range(n):
            a = 2 * math.pi * i / n
            lob = 1.0 + 0.1 * math.cos(5 * a)
            verts.append((sx * base * afinar * lob * math.cos(a), sy * base * afinar * lob * math.sin(a), z))
    for j in range(anillos):
        for i in range(n):
            a = j * n + i
            b = j * n + (i + 1) % n
            caras.append((a, b, b + n, a + n))
    caras.append(tuple(range(n - 1, -1, -1)))
    caras.append(tuple(anillos * n + i for i in range(n)))
    me = bpy.data.meshes.new(nombre)
    me.from_pydata(verts, [], caras)
    o = bpy.data.objects.new(nombre, me)
    coleccion.objects.link(o)
    o.location = loc
    o.rotation_euler = rot
    suave(o, mat)
    o.modifiers.new('suavizar', 'SUBSURF').levels = 1
    bpy.context.view_layer.update()
    poner_padre(o, padre)
    return o


def golpe(obj, origen, direccion):
    """Dónde choca un rayo con la superficie de una malla (para apoyar accesorios sobre la lana)."""
    mw = obj.matrix_world
    inv = mw.inverted()
    ok, loc, nor, _ = obj.ray_cast(inv @ Vector(origen), (inv.to_3x3() @ Vector(direccion)).normalized())
    if not ok:
        # pasó de largo (borde de la lana): se usa el punto más cercano a la línea del rayo
        centro = mw @ Vector(obj.bound_box[0]).lerp(Vector(obj.bound_box[6]), 0.5)
        d = Vector(direccion).normalized()
        return cercano(obj, Vector(origen) + d * (centro - Vector(origen)).dot(d))
    return mw @ loc, (mw.to_3x3() @ nor).normalized()


def cercano(obj, punto):
    """El punto de la superficie más cercano (y su normal)."""
    mw = obj.matrix_world
    ok, loc, nor, _ = obj.closest_point_on_mesh(mw.inverted() @ Vector(punto))
    return mw @ loc, (mw.to_3x3() @ nor).normalized()


def unir(nombre, objetos):
    objetos = [o for o in objetos if o and o.type == 'MESH']
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
    u = eje.cross(Vector((0, 0, 1)))
    if u.length < 0.1:
        u = eje.cross(Vector((1, 0, 0)))
    u.normalize()
    v = eje.cross(u).normalized()
    rot = eje.to_track_quat('Y', 'Z').to_euler()
    piezas = []
    for i in range(5):
        a = i * 2 * math.pi / 5
        p = Vector(centro) + (u * math.cos(a) + v * math.sin(a)) * 0.075 * s
        piezas.append(esfera(f'{nombre}_petalo{i}', p, (0.058 * s, 0.024 * s, 0.058 * s), M[petalo], g, 14, 9, rot))
    piezas.append(esfera(f'{nombre}_centro', Vector(centro) - eje * -0.015 * s, (0.036 * s, 0.024 * s, 0.036 * s), M['centro'], g, 12, 8, rot))
    unir(f'{nombre}_malla', piezas)
    return g


def hoja(nombre, base, rot, padre, s=1.0, mat='hoja'):
    return esfera(nombre, base, (0.05 * s, 0.02 * s, 0.12 * s), M[mat], padre, 14, 9, rot)




# ---------- textura de fieltro (solo se ve en los renders de Blender) ----------
def fieltro(m, fuerza=0.22, escala=180):
    n = m.node_tree.nodes
    ruido = n.new('ShaderNodeTexNoise')
    ruido.inputs['Scale'].default_value = escala
    ruido.inputs['Detail'].default_value = 6
    relieve = n.new('ShaderNodeBump')
    relieve.inputs['Strength'].default_value = fuerza
    relieve.inputs['Distance'].default_value = 0.01
    m.node_tree.links.new(ruido.outputs['Fac'], relieve.inputs['Height'])
    m.node_tree.links.new(relieve.outputs['Normal'], n['Principled BSDF'].inputs['Normal'])


M['lana'] = material('lana_fieltro', '#f5e3d0', 0.9, sheen=1.0)
M['cara'] = material('cara_fieltro', '#f8e9da', 0.85, sheen=0.8)
M['oreja_dentro'] = material('oreja_dentro', '#f49aa8', 0.8, sheen=0.5)
M['mejilla'] = material('mejilla_suave', '#f7a3ad', 0.9)
M['pezuna'] = material('pezuna_cafe', '#6a4330', 0.6, sheen=0.4)
M['ceja'] = material('ceja_cafe', '#4a2c22', 0.5)
M['nariz'] = material('nariz_cafe', '#5b3a2c', 0.35)
M['iris'] = material('iris_cafe', '#2a1712', 0.08)
M['panuelo'] = material('panuelo_rojo', '#ee5d4f', 0.85, sheen=0.6)
M['rama'] = material('rama', '#6e4a32', 0.75)
M['hoja'] = material('hoja_verde', '#5aa63f', 0.5)
M['botella'] = material('botella_blanca', '#f7f0e8', 0.35)
M['tapa'] = material('tapa_rosa', '#ee8293', 0.4)
M['correa'] = material('correa_cafe', '#7a4b33', 0.6)
for clave in ('lana', 'cara', 'pezuna', 'panuelo'):
    fieltro(M[clave], 0.25 if clave != 'pezuna' else 0.12)


def nube_definida(nombre, bolas, padre, res=0.028, umbral=0.75, mat=None):
    """Lana en mechones redondos: metaballs con poco fundido, para que se marque cada bola."""
    mb = bpy.data.metaballs.new(nombre)
    mb.resolution = res
    mb.render_resolution = res
    mb.threshold = umbral
    o = bpy.data.objects.new(nombre, mb)
    coleccion.objects.link(o)
    for c, r, rigidez in bolas:
        el = mb.elements.new()
        el.co = c
        el.radius = r
        el.stiffness = rigidez
    bpy.context.view_layer.update()
    activo(o)
    bpy.ops.object.convert(target='MESH')
    o = bpy.context.object
    o.name = nombre
    suave(o, mat or M['lana'])
    poner_padre(o, padre)
    return o


# ---------- nodos para animar después ----------
raiz = vacio('Raiz', (0, 0, 0))
cuerpo = vacio('Cuerpo', (0, 0, 0.35), raiz)
cabeza = vacio('Cabeza', (0, -0.05, 1.3), raiz)
pata = {l: vacio(f'Pata{l}', (x, 0, 0.5), raiz) for l, x in (('L', -0.19), ('R', 0.19))}
brazo = {l: vacio(f'Brazo{l}', (x, -0.05, 1.12), raiz) for l, x in (('L', -0.36), ('R', 0.36))}
oreja = {l: vacio(f'Oreja{l}', (x, 0.0, 2.35), cabeza) for l, x in (('L', -0.55), ('R', 0.55))}

# ---------- cuerpo: pera suave ----------
cuerpo_bolas = [((0, 0.02, 0.5), 0.6, 2.0), ((0, 0.02, 0.8), 0.58, 2.0), ((0, 0.02, 1.08), 0.5, 2.0), ((0, 0.02, 1.3), 0.4, 2.0)]
lana_cuerpo = nube_definida('CuerpoLana', cuerpo_bolas, cuerpo, umbral=0.6)
lana_cuerpo.scale = (1.1, 1.06, 1.0)
bpy.context.view_layer.update()
for l, x in (('L', -0.19), ('R', 0.19)):
    unir(f'pata{l}', [
        esfera(f'pata{l}_lana', (x, 0.0, 0.22), (0.16, 0.16, 0.14), M['lana'], pata[l]),
        esfera(f'pata{l}_pezuna', (x, -0.03, 0.08), (0.145, 0.16, 0.085), M['pezuna'], pata[l]),
    ])
esfera('colita', (0, 0.52, 0.55), (0.17, 0.16, 0.17), M['lana'], cuerpo, 32, 20)
# brazo derecho de Alpi (izquierda de la cámara): cuelga hacia adelante con la pezuña
unir('brazoL', [
    esfera('brazoL_lana', (-0.42, -0.12, 0.97), (0.14, 0.15, 0.24), M['lana'], brazo['L'], rot=(0.5, 0.35, 0)),
    esfera('brazoL_pezuna', (-0.47, -0.27, 0.8), (0.1, 0.1, 0.11), M['pezuna'], brazo['L'], rot=(0.5, 0, 0)),
])
# brazo izquierdo de Alpi: adelante, sosteniendo la ramita
unir('brazoR', [
    esfera('brazoR_lana', (0.43, -0.2, 0.98), (0.14, 0.15, 0.22), M['lana'], brazo['R'], rot=(0.9, -0.3, 0)),
    esfera('brazoR_mano', (0.48, -0.36, 0.86), (0.11, 0.11, 0.1), M['pezuna'], brazo['R']),
])

# ---------- cabeza: mechones grandes alrededor de una cara lisa ----------
HC = Vector((0, 0.06, 1.98))
bolas = [((0, 0.08, 1.92), 0.86, 2.0), ((0, 0.16, 2.18), 0.8, 2.0), ((0, 0.3, 1.85), 0.7, 2.0)]  # núcleo
# mechones redondos por todo alrededor (como en la vista de atrás), dejando libre la cara
for k, p in enumerate(fibonacci(40, HC, (0.74, 0.68, 0.68))):
    d = p - HC
    if d.y < -0.22 and p.z < 2.16 and abs(p.x) < 0.56:
        continue
    if p.z < 1.42:
        continue
    bolas.append((tuple(p), 0.28 + (k * 37 % 7) / 100, 2.6))
# flequillo: tres mechones sobre la frente
for x, z in ((-0.36, 2.22), (0.0, 2.28), (0.36, 2.22)):
    bolas.append(((x, -0.48, z), 0.26, 2.6))
lana_cabeza = nube_definida('CabezaLana', bolas, cabeza)

CARA_C = Vector((0, -0.2, 1.7))
CARA_R = (0.6, 0.42, 0.55)
esfera('cara', CARA_C, CARA_R, M['cara'], cabeza, 56, 36)


def sup(x, z, extra=0.0):
    k = 1 - (x / CARA_R[0]) ** 2 - ((z - CARA_C.z) / CARA_R[2]) ** 2
    return Vector((x, CARA_C.y - CARA_R[1] * math.sqrt(max(0.0, k)) - extra, z))


# hocico apenas abultado (como en la imagen) y nariz café
esfera('hocico', sup(0, 1.6, -0.08), (0.2, 0.1, 0.13), M['cara'], cabeza, 32, 20)
esfera('nariz', sup(0, 1.66, 0.03), (0.085, 0.045, 0.058), M['nariz'], cabeza, 24, 14)
for l, x in (('L', -0.4), ('R', 0.4)):
    esfera(f'mejilla{l}', sup(x, 1.6, -0.03), (0.12, 0.045, 0.11), M['mejilla'], cabeza, 24, 14)

# ojos grandes con brillo
OX, OZ = 0.24, 1.8
for l, x in (('L', -OX), ('R', OX)):
    g = vacio(f'Ojo{l}', sup(x, OZ), cabeza)
    esfera(f'ojo{l}_iris', sup(x, OZ, -0.025), (0.105, 0.055, 0.125), M['iris'], g, 32, 20)
    esfera(f'ojo{l}_brillo', sup(x + 0.035, OZ + 0.045, 0.03), (0.032, 0.012, 0.034), M['brillo'], g, 16, 10)
    esfera(f'ojo{l}_brillo2', sup(x - 0.03, OZ - 0.05, 0.03), (0.012, 0.008, 0.013), M['brillo'], g, 12, 8)
    # cejas finas, un poco preocupadas (la punta de adentro más alta)
    curva(f'ceja{l}', [sup(x - 0.07, 2.0 + (-0.012 if x < 0 else 0.022), 0.01), sup(x, 2.028, 0.012), sup(x + 0.07, 2.0 + (0.022 if x < 0 else -0.012), 0.01)], 0.016, M['ceja'], cabeza)

# boca "ω": una línea corta bajo la nariz y dos curvas que suben a los lados
curva('boca_centro', [sup(0, 1.625, 0.025), sup(0, 1.585, 0.028)], 0.013, M['nariz'], cabeza)
curva('boca_izq', [sup(0, 1.585, 0.028), sup(-0.06, 1.555, 0.026), sup(-0.12, 1.59, 0.02)], 0.014, M['nariz'], cabeza)
curva('boca_der', [sup(0, 1.585, 0.028), sup(0.06, 1.555, 0.026), sup(0.12, 1.59, 0.02)], 0.014, M['nariz'], cabeza)

# orejas grandes, triangulares, hacia arriba y afuera, con el interior rosado
for l, x in (('L', -0.6), ('R', 0.6)):
    s = -1 if l == 'L' else 1
    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=0.26, radius2=0.03, depth=0.5, location=(x * 1.2, -0.06, 2.56))
    o = bpy.context.object
    o.name = f'oreja{l}'
    o.scale = (1, 0.55, 1)
    o.rotation_euler = (0.12, s * 0.78, 0)
    o.modifiers.new('suave', 'SUBSURF').levels = 2
    suave(o, M['lana'])
    bpy.context.view_layer.update()
    poner_padre(o, oreja[l])
    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=0.17, radius2=0.01, depth=0.38, location=(x * 1.2 + s * 0.01, -0.17, 2.55))
    d = bpy.context.object
    d.name = f'oreja{l}_dentro'
    d.scale = (1, 0.3, 1)
    d.rotation_euler = (0.12, s * 0.78, 0)
    d.modifiers.new('suave', 'SUBSURF').levels = 2
    suave(d, M['oreja_dentro'])
    bpy.context.view_layer.update()
    poner_padre(d, oreja[l])

# ---------- pañuelo de tela ----------
filas, cols = 8, 16
verts, caras = [], []
for r in range(filas + 1):
    t = r / filas
    for c in range(cols + 1):
        u = (c / cols - 0.5) * 2
        x = u * 0.78 * (1 - t)
        z = (1.4 - 0.16 * u * u) * (1 - t) + 0.76 * t
        p, nor = cercano(lana_cuerpo, (x, -0.6, z))
        verts.append(tuple(p + nor * 0.03))
for r in range(filas):
    for c in range(cols):
        a = r * (cols + 1) + c
        caras.append((a, a + 1, a + cols + 2, a + cols + 1))
me = bpy.data.meshes.new('panuelo')
me.from_pydata(verts, [], caras)
pan = bpy.data.objects.new('panuelo', me)
coleccion.objects.link(pan)
pan.modifiers.new('grosor', 'SOLIDIFY').thickness = 0.035
pan.modifiers.new('suave', 'SUBSURF').levels = 2
suave(pan, M['panuelo'])
bpy.context.view_layer.update()
poner_padre(pan, cuerpo)
# la banda que rodea el cuello (se asoma a los lados)
cuello = toro('panuelo_cuello', (0, 0.06, 1.34), 0.4, 0.07, M['panuelo'], cuerpo)
cuello.scale = (1, 1, 0.6)
# nudo y puntas del pañuelo atrás
esfera('panuelo_nudo', (0, 0.46, 1.3), (0.08, 0.06, 0.07), M['panuelo'], cuerpo)
for sx in (-1, 1):
    esfera('panuelo_lazo', (sx * 0.12, 0.47, 1.31), (0.11, 0.05, 0.06), M['panuelo'], cuerpo, rot=(0, sx * 0.35, 0))
    esfera('panuelo_punta', (sx * 0.06, 0.47, 1.18), (0.05, 0.04, 0.1), M['panuelo'], cuerpo, rot=(0, sx * 0.4, 0))

# ---------- cantimplora a la espalda (lado derecho de Alpi) ----------
bot = vacio('Cantimplora', (-0.42, 0.3, 0.98), cuerpo)
caja('botella', (-0.42, 0.3, 0.95), (0.3, 0.26, 0.56), M['botella'], bot, 0.12)
cilindro('botella_cuello', (-0.42, 0.3, 1.22), (-0.42, 0.3, 1.28), 0.09, M['botella'], bot, 24)
cilindro('botella_tapa', (-0.42, 0.3, 1.28), (-0.42, 0.3, 1.4), 0.11, M['tapa'], bot, 28)
toro('botella_asa', (-0.42, 0.18, 1.44), 0.075, 0.022, M['tapa'], bot, rot=(math.pi / 2, 0, math.pi / 2))
for z in (0.78, 1.1):
    toro('botella_correa', (-0.42, 0.3, z), 0.175, 0.022, M['correa'], bot)
cilindro('botella_tira', (-0.58, 0.3, 0.78), (-0.58, 0.3, 1.1), 0.02, M['correa'], bot, 8)
flor('botella_flor', (-0.58, 0.24, 0.94), bot, 1.15, 'petalo_blanco', (-1, -0.4, 0))

bot.scale = (1.25, 1.25, 1.25)
bpy.context.view_layer.update()

# ---------- ramita con hoja en la mano izquierda ----------
cilindro('ramita', (0.46, -0.4, 0.5), (0.6, -0.42, 1.36), 0.03, M['rama'], brazo['R'], 10)
cilindro('ramita_brote', (0.56, -0.41, 1.12), (0.68, -0.42, 1.24), 0.02, M['rama'], brazo['R'], 8)
hoja('ramita_hoja', (0.76, -0.43, 1.28), (0.25, 1.15, 0), brazo['R'], 1.4, 'hoja')

# la cabeza grande de la imagen (un poco más de la mitad de la altura)
cabeza.scale = (1.18, 1.18, 1.18)
cabeza.location.z += 0.22
bpy.context.view_layer.update()

# ---------- exportar ----------
os.makedirs(os.path.dirname(os.path.abspath(SALIDA)), exist_ok=True)
if GUARDAR_BLEND:
    bpy.ops.wm.save_as_mainfile(filepath=GUARDAR_BLEND)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=os.path.abspath(SALIDA), export_format='GLB', export_apply=True, use_selection=True,
                          export_yup=True, export_animations=False, export_cameras=False, export_lights=False, export_texcoords=False)
print('Alpi exportada a', os.path.abspath(SALIDA))
