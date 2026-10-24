# Alpi para la app — generador en Blender (versión 2, según "Alpi_referencias_separadas").
#
# La lana es como en las referencias: nubes suaves hechas con metaballs (esferas que se funden),
# no bolitas sueltas. La cara es lisa y queda enmarcada por la lana, con flequillo.
# Mantiene la estructura que usa la app:
#   - Nodos con nombre para animar: Raiz, Cuerpo, Cabeza, BrazoL/R, PataL/R, OrejaL/R, OjoL/R, Libro, Tronco.
#   - Accesorios por nivel: "Niv_<niveles>_<pieza>" (Niv_234_mochila se ve en los niveles 2, 3 y 4).
#   - Piezas de expresión: Ojos*, Cejas*, Boca*, Lagrimas, Lentes.
#
# Uso: python herramientas/alpi/construir.py   (exporta src/assets/alpi/alpi.glb)

import bpy
import math
import os
import random
from mathutils import Vector

random.seed(7)
SALIDA = os.environ.get('ALPI_SALIDA') or os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'src', 'assets', 'alpi', 'alpi.glb')
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
    'lana': material('lana', '#fbf3ea', 0.85, sheen=0.9),
    'cara': material('cara', '#fffaf4', 0.7, sheen=0.4),
    'pezuna': material('pezuna', '#8a5a3c', 0.6),
    'tinta': material('tinta', '#24161c', 0.15),
    'brillo': material('brillo_ojo', '#ffffff', 0.1),
    'ceja': material('ceja', '#6b4434', 0.6),
    'mejilla': material('mejilla', '#ff9aa6', 0.8),
    'oreja': material('oreja', '#f3a5ae', 0.8),
    'mechon': material('mechon', '#f5a39b', 0.6, sheen=0.5),
    'mechon_claro': material('mechon_claro', '#f8c0a8', 0.6, sheen=0.5),
    'boca': material('boca', '#6e2f3c', 0.5),
    'lengua': material('lengua', '#ff8fa0', 0.6),
    'lagrima': material('lagrima', '#7cc3ff', 0.1),
    'coral': material('panuelo_coral', '#ef6a4c', 0.75),
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
        raise RuntimeError(f'El rayo no tocó {obj.name}')
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


# ---------- esqueleto de nodos (lo que la app mueve) ----------
raiz = vacio('Raiz', (0, 0, 0))
cuerpo = vacio('Cuerpo', (0, 0, 0.4), raiz)
cabeza = vacio('Cabeza', (0, -0.05, 1.3), raiz)
pata = {l: vacio(f'Pata{l}', (x, -0.02, 0.5), raiz) for l, x in (('L', -0.27), ('R', 0.27))}
brazo = {l: vacio(f'Brazo{l}', (x, -0.08, 1.1), raiz) for l, x in (('L', -0.5), ('R', 0.5))}
oreja = {l: vacio(f'Oreja{l}', (x, -0.05, 2.3), cabeza) for l, x in (('L', -0.78), ('R', 0.78))}

# ---------- cuerpo de nube ----------
CENTRO_CUERPO = Vector((0, 0.04, 0.88))
bolas = [((0, 0.04, 0.75), 0.7), ((0, 0.04, 1.05), 0.7)]
for p in fibonacci(20, CENTRO_CUERPO, (0.56, 0.48, 0.48)):
    if p.z < 0.45:
        continue
    bolas.append((tuple(p), random.uniform(0.34, 0.42)))
lana_cuerpo = nube('CuerpoLana', bolas, cuerpo)
esfera('colita', (0, 0.55, 0.78), (0.17, 0.16, 0.16), M['lana'], cuerpo)

# patas cortas con pezuñas café
for l, x in (('L', -0.27), ('R', 0.27)):
    unir(f'pata{l}', [
        esfera(f'pata{l}_lana', (x, -0.02, 0.3), (0.2, 0.21, 0.22), M['lana'], pata[l]),
        esfera(f'pata{l}_pezuna', (x, -0.06, 0.1), (0.17, 0.19, 0.1), M['pezuna'], pata[l]),
    ])
# bracitos de lana con la pezuña asomando
for l, x in (('L', -0.6), ('R', 0.6)):
    s = -1 if l == 'L' else 1
    unir(f'brazo{l}', [
        esfera(f'brazo{l}_lana', (x, -0.1, 0.95), (0.15, 0.15, 0.24), M['lana'], brazo[l], rot=(0, -0.5 * s, 0)),
        esfera(f'brazo{l}_mano', (x * 1.16, -0.14, 0.76), (0.09, 0.09, 0.07), M['pezuna'], brazo[l]),
    ])

# ---------- cabeza: nube grande, cara lisa y flequillo ----------
CENTRO_CABEZA = Vector((0, 0.02, 1.98))
bolas = []
for dx in (-0.4, 0, 0.4):
    for dz in (-0.25, 0.15):
        bolas.append(((dx, CENTRO_CABEZA.y + 0.05, CENTRO_CABEZA.z + dz), 0.62))
for p in fibonacci(40, CENTRO_CABEZA, (0.88, 0.72, 0.74)):
    d = p - CENTRO_CABEZA
    if d.y < -0.2 and p.z < 2.2 and abs(p.x) < 0.6:
        continue  # la cara queda libre
    bolas.append((tuple(p), random.uniform(0.36, 0.46)))
for c in ((0, 0.45, 2.3), (0, 0.55, 1.95), (0, 0.3, 2.55)):
    bolas.append((c, 0.55))  # relleno atrás (sin huecos)
for x, z, r in ((-0.38, 2.3, 0.3), (-0.12, 2.36, 0.32), (0.16, 2.35, 0.31), (0.42, 2.28, 0.29)):
    bolas.append(((x, -0.5, z), r))  # flequillo
lana_cabeza = nube('CabezaLana', bolas, cabeza)

CARA_C = Vector((0, -0.36, 1.78))
CARA_R = (0.6, 0.34, 0.48)
esfera('cara', CARA_C, CARA_R, M['cara'], cabeza, 48, 32)


def sup(x, z, extra=0.0):
    """Punto sobre la cara lisa (el frente es -Y)."""
    k = 1 - (x / CARA_R[0]) ** 2 - ((z - CARA_C.z) / CARA_R[2]) ** 2
    return Vector((x, CARA_C.y - CARA_R[1] * math.sqrt(max(0.0, k)) - extra, z))


unir('CaraFija', [
    esfera('hocico', sup(0, 1.67, -0.05), (0.17, 0.08, 0.11), M['cara'], cabeza),
    esfera('nariz', sup(0, 1.725, 0.012), (0.055, 0.03, 0.04), M['tinta'], cabeza, 20, 12),
    esfera('mejillaL', sup(-0.43, 1.7, -0.012), (0.11, 0.03, 0.07), M['mejilla'], cabeza),
    esfera('mejillaR', sup(0.43, 1.7, -0.012), (0.11, 0.03, 0.07), M['mejilla'], cabeza),
])

# mechón rosado arriba, hacia adelante (apoyado sobre la lana)
TOPE, _ = golpe(lana_cabeza, (0, -3, 2.62), (0, 1, 0))
unir('Mechon', [
    mechon('mechon1', TOPE + Vector((-0.02, 0.06, 0.04)), (0.22, 0.14, 0.32), M['mechon'], cabeza, (1.0, -0.2, -0.15)),
    mechon('mechon2', TOPE + Vector((0.18, 0.1, 0.0)), (0.18, 0.13, 0.27), M['mechon_claro'], cabeza, (0.9, -0.45, -0.5)),
    mechon('mechon3', TOPE + Vector((-0.2, 0.12, -0.02)), (0.16, 0.12, 0.23), M['mechon'], cabeza, (0.8, 0.3, 0.4)),
])

# orejas hacia los lados
for l, x in (('L', -0.86), ('R', 0.86)):
    s = -1 if l == 'L' else 1
    unir(f'oreja{l}', [
        esfera(f'oreja{l}_lana', (x, -0.05, 2.42), (0.14, 0.1, 0.27), M['lana'], oreja[l], rot=(0, 1.0 * s, 0)),
        esfera(f'oreja{l}_dentro', (x, -0.14, 2.42), (0.07, 0.03, 0.17), M['oreja'], oreja[l], rot=(0, 1.0 * s, 0)),
    ])

# ---------- expresiones ----------
OX, OZ = 0.27, 1.86


def ojo_abierto(nombre, x, padre):
    g = vacio(nombre, sup(x, OZ), padre)
    esfera(f'{nombre}_iris', sup(x, OZ, -0.01), (0.075, 0.04, 0.095), M['tinta'], g)
    esfera(f'{nombre}_brillo', sup(x - 0.025, OZ + 0.035, 0.03), (0.026, 0.012, 0.03), M['brillo'], g, 16, 10)
    esfera(f'{nombre}_brillo2', sup(x + 0.025, OZ - 0.04, 0.03), (0.011, 0.008, 0.013), M['brillo'], g, 12, 8)
    return g


def arco(nombre, x, z, ancho, alto, padre, grosor=0.016):
    # alto > 0: ∩ (feliz) ; alto < 0: ∪ (cerrado)
    return curva(nombre, [sup(x - ancho, z, 0.02), sup(x, z + alto, 0.025), sup(x + ancho, z, 0.02)], grosor, M['tinta'], padre)


ojos = vacio('OjosAbiertos', (0, -0.7, OZ), cabeza)
ojo_abierto('OjoL', -OX, ojos)
ojo_abierto('OjoR', OX, ojos)
felices = vacio('OjosFelices', (0, -0.7, OZ), cabeza)
arco('ojo_feliz_L', -OX, OZ - 0.02, 0.07, 0.07, felices)
arco('ojo_feliz_R', OX, OZ - 0.02, 0.07, 0.07, felices)
cerrados = vacio('OjosCerrados', (0, -0.7, OZ), cabeza)
arco('ojo_cerrado_L', -OX, OZ + 0.01, 0.07, -0.05, cerrados)
arco('ojo_cerrado_R', OX, OZ + 0.01, 0.07, -0.05, cerrados)
guino = vacio('OjosGuino', (0, -0.7, OZ), cabeza)
ojo_abierto('OjoGuinoL', -OX, guino)
arco('ojo_guino_R', OX, OZ - 0.02, 0.07, 0.07, guino)


def cejas(nombre, inclinacion_l, inclinacion_r, alto_l=2.03, alto_r=2.03):
    g = vacio(nombre, (0, -0.7, 2.03), cabeza)
    for x, alto, inc in ((-OX, alto_l, inclinacion_l), (OX, alto_r, inclinacion_r)):
        curva(f'{nombre}_{x:+.2f}', [sup(x - 0.065, alto - 0.015 + inc, 0.015), sup(x, alto + 0.02, 0.018), sup(x + 0.065, alto - 0.015 - inc, 0.015)], 0.013, M['ceja'], g)
    return g


cejas('CejasNormal', 0.0, 0.0)
cejas('CejasTriste', -0.03, 0.03)
cejas('CejasCuriosa', 0.0, 0.0, 2.03, 2.08)
cejas('CejasEnfoque', 0.035, -0.035, 2.0, 2.0)

# boca: ":3" (la de la referencia), triste, abierta y "o"
curva('BocaSonrisa', [sup(-0.09, 1.66, 0.02), sup(-0.045, 1.62, 0.025), sup(0, 1.66, 0.025), sup(0.045, 1.62, 0.025), sup(0.09, 1.66, 0.02)], 0.012, M['tinta'], cabeza)
curva('BocaTriste', [sup(-0.07, 1.61, 0.02), sup(0, 1.65, 0.025), sup(0.07, 1.61, 0.02)], 0.012, M['tinta'], cabeza)
abierta = vacio('BocaAbierta', sup(0, 1.63), cabeza)
esfera('boca_fondo', sup(0, 1.625, -0.012), (0.085, 0.04, 0.07), M['boca'], abierta)
esfera('boca_lengua', sup(0, 1.6, 0.012), (0.05, 0.022, 0.028), M['lengua'], abierta, 14, 9)
esfera('BocaO', sup(0, 1.62, -0.004), (0.035, 0.025, 0.045), M['boca'], cabeza)
lagrimas = vacio('Lagrimas', (0, -0.7, 1.78), cabeza)
for x in (-OX + 0.04, OX - 0.04):
    esfera(f'lagrima{x:+.2f}', sup(x, 1.77, 0.02), (0.025, 0.016, 0.038), M['lagrima'], lagrimas, 14, 9)
lentes = vacio('Lentes', (0, -0.78, OZ), cabeza)
for x in (-OX, OX):
    toro(f'lente{x:+.2f}', sup(x, OZ, 0.05), 0.13, 0.015, M['lentes'], lentes, rot=(math.pi / 2, 0, 0))
curva('lentes_puente', [sup(-0.14, OZ + 0.02, 0.05), sup(0, OZ + 0.04, 0.06), sup(0.14, OZ + 0.02, 0.05)], 0.012, M['lentes'], lentes)


# ---------- accesorios por nivel ----------
PECHO, _ = golpe(lana_cuerpo, (0, -3, 1.1), (0, 1, 0))
# la banda del pañuelo rodea el cuello siguiendo la lana (bajo la barbilla)
BANDA = []
for x in (-0.5, -0.32, -0.12, 0.0, 0.12, 0.32, 0.5):
    p, nor = golpe(lana_cuerpo, (x, -3, 1.2 - abs(x) * 0.12), (0, 1, 0))
    BANDA.append(p + nor * 0.03)


def triangulo(nombre, centro, radio, mat, padre, ancho=1.25, inclinacion=0.3):
    bpy.ops.mesh.primitive_cone_add(vertices=3, radius1=radio, radius2=0.0, depth=0.05, location=centro)
    t = bpy.context.object
    t.name = nombre
    v = max(t.data.vertices, key=lambda v: -v.co.y)
    t.rotation_euler = (0, 0, -math.atan2(v.co.x, -v.co.y))
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    t.scale = (ancho, 1.0, 1)
    t.rotation_euler = (math.pi / 2 - inclinacion, 0, 0)
    m = t.modifiers.new('bisel', 'BEVEL')
    m.width = 0.03
    m.segments = 3
    suave(t, mat)
    bpy.context.view_layer.update()
    poner_padre(t, padre)
    return t


def panuelo(nombre, mat, padre, tamano=1.0):
    # una banda bajo la barbilla y el triángulo cayendo sobre el pecho
    g = vacio(nombre, PECHO, padre)
    curva(f'{nombre}_banda', BANDA, 0.075 * tamano, mat, g)
    triangulo(f'{nombre}_punta', PECHO + Vector((0, -0.05, -0.08)), 0.34 * tamano, mat, g, 1.45)
    return g


panuelo('Niv_1_panuelo', M['coral'], cuerpo)
p2 = panuelo('Niv_2_panuelo', M['rosado'], cuerpo, 1.15)
flor('panuelo2_flor', PECHO + Vector((0.16, -0.09, -0.02)), p2, 1.0, 'petalo_blanco')
panuelo('Niv_4_panuelo', M['rojo'], cuerpo)

# Nivel 3: bufanda verde con flores y puntitos dorados
b3 = vacio('Niv_3_bufanda', PECHO, cuerpo)
curva('bufanda_banda', BANDA, 0.12, M['verde_bufanda'], b3)
triangulo('bufanda_caida', PECHO + Vector((0.08, -0.06, -0.08)), 0.36, M['verde_bufanda'], b3, 1.1, 0.25)
flor('bufanda_flor1', PECHO + Vector((-0.28, -0.12, 0.1)), b3, 1.4, 'petalo')
flor('bufanda_flor2', PECHO + Vector((0.3, -0.12, 0.08)), b3, 1.2, 'petalo_claro')
for i, (x, z) in enumerate(((0.0, -0.05), (0.15, 0.02), (-0.12, 0.06))):
    esfera(f'bufanda_punto{i}', PECHO + Vector((x, -0.11, z)), (0.022, 0.012, 0.022), M['oro'], b3, 10, 8)

# Mochila: a la espalda, del lado derecho de Alpi (izquierda de la cámara)
def mochila(nombre, cuerpo_mat, bolsillo_mat, manta_mat, padre, grande=1.0):
    g = vacio(nombre, (-0.42, 0.45, 0.95), padre)
    caja(f'{nombre}_cuerpo', (-0.42, 0.47, 0.95), (0.6 * grande, 0.36, 0.72 * grande), cuerpo_mat, g, 0.15)
    caja(f'{nombre}_bolsillo', (-0.42, 0.67, 0.85), (0.42 * grande, 0.12, 0.3), bolsillo_mat, g, 0.08)
    caja(f'{nombre}_tapa', (-0.42, 0.65, 1.2), (0.48 * grande, 0.14, 0.16), cuerpo_mat, g, 0.06)
    for x in (-0.5, -0.1):
        cilindro(f'{nombre}_correa', (x, 0.32, 1.25), (x * 1.1, -0.1, 0.85), 0.04, bolsillo_mat, g)
    cilindro(f'{nombre}_manta', (-0.62, 0.55, 1.42), (0.02, 0.55, 1.42), 0.13, manta_mat, g, 24)
    for x in (-0.45, -0.15):
        toro(f'{nombre}_banda', (x, 0.55, 1.42), 0.133, 0.022, M['cuero'], g, rot=(0, math.pi / 2, 0))
    return g


m1 = mochila('Niv_1_mochila', M['mochila'], M['mochila_claro'], M['manta_rosa'], cuerpo)
esfera('m1_corazon', (-0.42, 0.75, 0.88), (0.06, 0.02, 0.05), M['mochila_rosa'], m1, 14, 9)
m23 = mochila('Niv_23_mochila', M['mochila'], M['mochila_claro'], M['manta_cafe'], cuerpo, 1.1)
m4 = mochila('Niv_4_mochila', M['cuero'], M['cuero_claro'], M['manta_cafe'], cuerpo, 1.15)
for x in (-0.42, -0.18):
    esfera('m4_hebilla', (x, 0.8, 1.17), (0.035, 0.018, 0.035), M['oro'], m4, 10, 8)
cilindro('m4_catalejo', (-0.7, 0.4, 0.9), (-0.66, 0.5, 1.6), 0.075, M['oro'], m4, 20, 0.06)
esfera('m4_lente', (-0.66, 0.5, 1.61), (0.06, 0.06, 0.02), M['vidrio'], m4, 14, 9)

# Nivel 2: hojas que asoman de la mochila; nivel 3: flores en la mochila
pl = vacio('Niv_2_plantas', (-0.5, 0.5, 1.5), cuerpo)
for i, (ang, dx) in enumerate(((-0.7, -0.05), (-0.2, 0.05), (0.4, 0.0), (0.9, 0.08))):
    hoja(f'planta{i}', (-0.62 + dx, 0.5, 1.62), (0, ang, 0), pl, 1.6, 'hoja_claro' if i % 2 else 'hoja')
fm = vacio('Niv_3_flores_mochila', (-0.4, 0.6, 1.3), cuerpo)
flor('fm1', (-0.55, 0.38, 1.5), fm, 1.5, 'petalo', (-0.5, -1, 0.3))
flor('fm2', (-0.68, 0.45, 0.85), fm, 1.3, 'petalo', (-0.8, -0.6, 0))
hoja('fm_hoja', (-0.7, 0.4, 1.58), (0, -0.8, 0), fm, 1.3)

# Ramito en la mano izquierda de Alpi (derecha de la cámara): nivel 2 naranja, nivel 3 rosado
r2 = vacio('Niv_2_ramo', (0.72, -0.2, 0.8), brazo['R'])
for i, (dx, dz) in enumerate(((0.0, 0.08), (0.08, 0.0), (-0.06, -0.02))):
    flor(f'ramo2_{i}', (0.74 + dx, -0.3, 0.86 + dz), r2, 1.0, 'petalo_naranja' if i != 1 else 'centro')
r3 = vacio('Niv_3_ramo', (0.72, -0.2, 0.8), brazo['R'])
for i, (dx, dz) in enumerate(((0.0, 0.1), (0.1, 0.0), (-0.07, -0.03))):
    flor(f'ramo3_{i}', (0.74 + dx, -0.3, 0.86 + dz), r3, 1.2, 'petalo')

# Nivel 3: corona de flores silvestres
co = vacio('Niv_3_corona', (0, 0, 2.5), cabeza)
colores = ['petalo', 'petalo_claro', 'petalo_blanco', 'petalo_naranja', 'petalo_lila']
CENTRO_CORONA = Vector((0, 0.02, 2.2))
for i in range(16):
    a = i / 16 * 2 * math.pi
    dirr = Vector((math.sin(a), -math.cos(a), 0.75)).normalized()
    p, nor = golpe(lana_cabeza, CENTRO_CORONA + dirr * 3, -dirr)
    flor(f'corona{i}', p + nor * 0.03, co, 1.6 if i % 2 == 0 else 1.25, colores[i % len(colores)], nor)
    if i % 2:
        hoja(f'corona_hoja{i}', p + nor * 0.02 + Vector((0, 0, -0.06)), (0.3, a, 0.8), co, 1.2)

# Nivel 4: ramito al costado de la cabeza, medalla con brújula y cadena dorada
r4 = vacio('Niv_4_ramito', (-0.55, -0.4, 2.45), cabeza)
for i, (d, pet, tam) in enumerate((((-0.55, -0.75, 0.55), 'petalo', 1.6), ((-0.8, -0.5, 0.45), 'petalo_lila', 1.4), ((-0.35, -0.8, 0.7), 'centro', 1.0))):
    dirr = Vector(d).normalized()
    p, nor = golpe(lana_cabeza, Vector((0, 0.02, 2.0)) + dirr * 3, -dirr)
    flor(f'ramito{i}', p + nor * 0.03, r4, tam, pet, nor)
p, nor = golpe(lana_cabeza, Vector((0, 0.02, 2.0)) + Vector((-0.85, -0.5, 0.3)).normalized() * 3, -Vector((-0.85, -0.5, 0.3)).normalized())
hoja('ramito_hoja', p + nor * 0.02, (0.3, 0, 0.9), r4, 1.4)
MED, _ = golpe(lana_cuerpo, (0.24, -3, 0.85), (0, 1, 0))
me = vacio('Niv_4_medalla', MED, cuerpo)
curva('medalla_cadena', [PECHO + Vector((-0.3, -0.06, 0.08)), PECHO + Vector((0.0, -0.12, -0.1)), MED + Vector((0, -0.02, 0.12))], 0.012, M['oro'], me)
cilindro('medalla_disco', MED + Vector((0, -0.01, 0)), MED + Vector((0, -0.06, 0)), 0.12, M['oro'], me, 28)
cilindro('medalla_cara', MED + Vector((0, -0.05, 0)), MED + Vector((0, -0.075, 0)), 0.09, M['pagina'], me, 28)
curva('medalla_aguja', [MED + Vector((0, -0.08, -0.06)), MED + Vector((0, -0.082, 0.06))], 0.01, M['rojo'], me)
BRO, _ = golpe(lana_cuerpo, (-0.35, -3, 0.95), (0, 1, 0))
esfera('broche_estrella', BRO + Vector((0, -0.02, 0)), (0.06, 0.025, 0.06), M['oro'], cuerpo, 10, 8)
bpy.data.objects['broche_estrella'].name = 'Niv_4_broche'

# Bastón de caminante (nivel 1), en la mano izquierda de Alpi
bs = vacio('Niv_1_baston', (0.7, -0.2, 0.75), brazo['R'])
cilindro('baston_palo', (0.74, -0.2, 0.08), (0.7, -0.2, 1.25), 0.03, M['baston'], bs, 12)
esfera('baston_nudo', (0.7, -0.2, 1.28), (0.045, 0.045, 0.05), M['baston'], bs, 12, 8)

# ---------- objetos de las animaciones ----------
libro = vacio('Libro', (0, -0.72, 0.95), raiz)
for l, s in (('L', -1), ('R', 1)):
    caja(f'libro_tapa{l}', (s * 0.16, -0.72, 0.95), (0.32, 0.02, 0.4), M['libro'], libro, 0.01, rot=(0, 0, s * 0.35))
    caja(f'libro_hojas{l}', (s * 0.15, -0.735, 0.95), (0.28, 0.02, 0.36), M['pagina'], libro, 0.008, rot=(0, 0, s * 0.35))

tronco = vacio('Tronco', (0, 0, 0), None)
cilindro('tronco_cuerpo', (-0.85, -0.05, 0.22), (0.85, -0.05, 0.22), 0.22, M['tronco'], tronco, 24)
for x in (-0.86, 0.86):
    cilindro('tronco_corte', (x - 0.01, -0.05, 0.22), (x + 0.01, -0.05, 0.22), 0.19, M['tronco_corte'], tronco, 24)
hoja('tronco_hoja', (0.4, -0.2, 0.46), (0.3, 0.6, 0), tronco, 1.3)

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
    export_texcoords=False,
)
print('Alpi exportada a', os.path.abspath(SALIDA))
