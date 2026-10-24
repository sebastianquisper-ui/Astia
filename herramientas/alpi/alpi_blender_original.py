# Alpi — generador de personaje para Blender
# Uso: Blender > Scripting > Open > alpi_blender.py > Run Script
# Genera una escena con Alpi bebé, accesorios, materiales, cámara e iluminación.
# Después guarda un .blend y exporta un .glb en la misma carpeta del .blend.
#
# Nota: es un modelo procedural inicial hecho con volúmenes suaves y piezas separadas.
# No sustituye todavía un esculpido profesional, retopología ni rig facial completo.

import bpy
import math
import os
from mathutils import Vector

# ---------- Limpiar escena ----------
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for datablocks in (bpy.data.collections,):
    pass
for material in list(bpy.data.materials):
    if material.users == 0:
        bpy.data.materials.remove(material)

scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 32
scene.render.resolution_x = 1100
scene.render.resolution_y = 1100
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.world.color = (0.8, 0.8, 0.8)

# ---------- Organización ----------
root_col = bpy.data.collections.new("ALPI | Mascota")
scene.collection.children.link(root_col)
body_col = bpy.data.collections.new("01 | Cuerpo y lana")
face_col = bpy.data.collections.new("02 | Cara y expresiones")
accessory_col = bpy.data.collections.new("03 | Mochila y accesorios")
stage_col = bpy.data.collections.new("04 | Escena y luces")
for col in (body_col, face_col, accessory_col, stage_col):
    root_col.children.link(col)

def move_to_collection(obj, collection):
    for col in list(obj.users_collection):
        col.objects.unlink(obj)
    collection.objects.link(obj)
    return obj

def make_mat(name, color, roughness=0.72, metallic=0.0, subsurface=0.0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    if "Metallic" in bsdf.inputs:
        bsdf.inputs["Metallic"].default_value = metallic
    if "Subsurface Weight" in bsdf.inputs:
        bsdf.inputs["Subsurface Weight"].default_value = subsurface
    return mat

wool = make_mat("Lana | crema cálida", (0.94, 0.83, 0.72), 0.88, 0, 0.035)
wool_light = make_mat("Lana | reflejos", (1.0, 0.91, 0.82), 0.88, 0, 0.025)
wool_shadow = make_mat("Patas | beige tostado", (0.49, 0.31, 0.22), 0.82)
pink = make_mat("Mechón | rosa pastel", (0.94, 0.43, 0.57), 0.5, 0, 0.025)
pink_light = make_mat("Interior orejas | rosa", (0.88, 0.36, 0.45), 0.78)
blush = make_mat("Mejillas | rosa", (1.0, 0.40, 0.49), 0.85)
dark = make_mat("Ojos y nariz | ciruela", (0.105, 0.055, 0.075), 0.22)
eye_glint = make_mat("Brillo de ojos", (1.0, 0.97, 0.91), 0.12)
scarf_mat = make_mat("Pañuelo | coral", (0.91, 0.25, 0.36), 0.7)
mint = make_mat("Mochila | menta", (0.12, 0.55, 0.49), 0.6)
mint_light = make_mat("Mochila | bolsillo", (0.28, 0.72, 0.62), 0.62)
strap_mat = make_mat("Correas | salmón", (0.91, 0.46, 0.36), 0.72)
gold = make_mat("Hebillas | dorado suave", (0.95, 0.65, 0.24), 0.32, 0.25)
flower_pink = make_mat("Flor | pétalos", (1.0, 0.39, 0.57), 0.55)
flower_yellow = make_mat("Flor | centro", (1.0, 0.73, 0.23), 0.45)
ground_mat = make_mat("Fondo | rosa crema", (1.0, 0.88, 0.85), 0.9)

def smooth(obj, mat=None, collection=body_col):
    if mat:
        obj.data.materials.append(mat)
    if obj.type == 'MESH':
        for poly in obj.data.polygons:
            poly.use_smooth = True
    move_to_collection(obj, collection)
    return obj

def uv_sphere(name, loc, scale, mat, collection=body_col, segments=32, rings=20):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    return smooth(obj, mat, collection)

def rounded_box(name, loc, scale, mat, bevel=0.12, collection=accessory_col):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bevel_mod = obj.modifiers.new("Bordes suaves", 'BEVEL')
    bevel_mod.width = bevel
    bevel_mod.segments = 4
    obj.modifiers.new("Normales suaves", 'WEIGHTED_NORMAL')
    return smooth(obj, mat, collection)

def cylinder_between(name, start, end, radius, mat, collection=accessory_col, vertices=20):
    a, b = Vector(start), Vector(end)
    direction = b - a
    mid = (a + b) / 2
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=direction.length, location=mid)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_mode = 'QUATERNION'
    obj.rotation_quaternion = direction.to_track_quat('Z', 'Y')
    bevel_mod = obj.modifiers.new("Bordes suaves", 'BEVEL')
    bevel_mod.width = min(radius * 0.35, 0.04)
    bevel_mod.segments = 3
    obj.modifiers.new("Normales suaves", 'WEIGHTED_NORMAL')
    return smooth(obj, mat, collection)

def torus(name, loc, major_radius, minor_radius, mat, collection=accessory_col, rotation=(0,0,0)):
    bpy.ops.mesh.primitive_torus_add(major_segments=32, minor_segments=12, location=loc,
                                    major_radius=major_radius, minor_radius=minor_radius)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = rotation
    return smooth(obj, mat, collection)

# Front of character faces toward -Y; camera is at (4, -8, 4.1).
# Body: compact, fluffy pear shape
uv_sphere("Cuerpo | base", (0, 0, 1.02), (0.68, 0.54, 0.77), wool)
uv_sphere("Pecho | lana", (0, -0.28, 1.12), (0.47, 0.32, 0.52), wool_light)

# Puffs on body, arranged as overlapping wool tufts
for i, (x, z, sx, sz) in enumerate([
    (-0.48,1.30,.23,.22),(-.28,1.55,.23,.22),(0,1.60,.24,.22),(.28,1.55,.23,.22),(.49,1.31,.22,.23),
    (-.49,1.00,.22,.24),(.48,1.00,.22,.24),(-.35,.77,.22,.20),(0,.70,.25,.20),(.35,.77,.22,.20),
    (-.27,1.20,.20,.20),(.27,1.20,.20,.20)
]):
    uv_sphere(f"Lana cuerpo | {i+1:02}", (x, -0.22, z), (sx, .20, sz), wool_light if i % 3 else wool)

# Head: large, round, slightly forward
uv_sphere("Cabeza | forma principal", (0, -0.12, 2.08), (0.72, 0.61, 0.68), wool_light, face_col, 40, 28)
# Face wool tufts framing head
for i, (x,z,s) in enumerate([
    (-.52,2.16,.19),(-.44,2.47,.20),(-.20,2.61,.19),(.05,2.64,.18),(.30,2.55,.20),(.51,2.31,.18),
    (-.54,1.93,.18),(.53,1.93,.18),(-.35,1.78,.17),(.34,1.78,.17)
]):
    uv_sphere(f"Lana cabeza | {i+1:02}", (x,-.20,z), (s,.17,s), wool_light, face_col)

# Ears, with pink inner surfaces
for side, x in (("L",-0.54),("R",0.54)):
    ear = uv_sphere(f"Oreja {side}", (x, -0.04, 2.65), (.18,.17,.31), wool, face_col)
    ear.rotation_euler[1] = -0.20 if side == "L" else 0.20
    inner = uv_sphere(f"Interior oreja {side}", (x, -0.195, 2.66), (.085,.035,.19), pink_light, face_col)
    inner.rotation_euler[1] = -0.20 if side == "L" else 0.20

# Pink forelock: three curved fluffy tufts
uv_sphere("Mechón rosa | base", (-0.06,-0.51,2.66), (.25,.16,.19), pink, face_col)
lock1 = uv_sphere("Mechón rosa | izquierda", (-0.22,-0.52,2.58), (.20,.15,.13), pink, face_col)
lock1.rotation_euler[1] = -0.35
lock2 = uv_sphere("Mechón rosa | centro", (-0.02,-0.56,2.55), (.21,.14,.12), pink, face_col)
lock2.rotation_euler[1] = 0.1
lock3 = uv_sphere("Mechón rosa | punta", (0.14,-0.51,2.62), (.17,.13,.11), pink, face_col)
lock3.rotation_euler[1] = 0.5

# Eyes, highlights, brows, cheeks
for side, x in (("L",-0.255),("R",0.255)):
    uv_sphere(f"Ojo {side}", (x,-0.681,2.16), (.105,.055,.135), dark, face_col)
    uv_sphere(f"Brillo ojo {side}", (x-.028,-0.731,2.205), (.031,.018,.038), eye_glint, face_col, 20, 12)
    brow = uv_sphere(f"Cejita {side}", (x,-0.66,2.35), (.10,.035,.025), wool_shadow, face_col, 20, 12)
    brow.rotation_euler[1] = -0.12 if side == "L" else 0.12
    uv_sphere(f"Mejilla {side}", (x*1.72,-0.625,2.00), (.12,.035,.065), blush, face_col)
# Muzzle and nose
uv_sphere("Hocico", (0,-0.695,2.02), (.18,.10,.12), wool_light, face_col)
uv_sphere("Nariz", (0,-0.792,2.055), (.052,.026,.038), dark, face_col, 20, 12)
# Small smile curve using a beveled curve
curve = bpy.data.curves.new("Sonrisa | curva", 'CURVE')
curve.dimensions = '3D'
curve.resolution_u = 16
curve.bevel_depth = 0.012
curve.bevel_resolution = 3
spline = curve.splines.new('BEZIER')
spline.bezier_points.add(2)
for bp, co in zip(spline.bezier_points, [(-.07,-.788,1.985),(0,-.80,1.96),(.07,-.788,1.985)]):
    bp.co = co
    bp.handle_left_type = 'AUTO'
    bp.handle_right_type = 'AUTO'
smile = bpy.data.objects.new("Sonrisa", curve)
face_col.objects.link(smile)
smile.data.materials.append(dark)

# Arms and tiny hands
for side, x in (("L",-0.60),("R",0.60)):
    arm = uv_sphere(f"Brazo {side}", (x,-0.18,1.18), (.16,.18,.30), wool, body_col)
    arm.rotation_euler[1] = -0.38 if side == "L" else 0.38
    uv_sphere(f"Manita {side}", (x*1.12,-0.28,1.02), (.14,.13,.13), wool_light, body_col)
# Two short feet
for side, x in (("L",-0.31),("R",0.31)):
    uv_sphere(f"Patita {side}", (x,-0.03,.36), (.17,.21,.23), wool_shadow, body_col)
    uv_sphere(f"Dedos {side}", (x,-0.19,.35), (.14,.08,.07), wool_light, body_col)

# Tail
uv_sphere("Colita", (0.60,0.30,.82), (.16,.17,.16), wool_light, body_col)

# Scarf: soft band and front knot/tail
torus("Pañuelo | cuello", (0,-0.06,1.55), .43, .10, scarf_mat, accessory_col, (math.pi/2,0,0))
uv_sphere("Pañuelo | nudo", (0.10,-0.54,1.50), (.13,.08,.13), scarf_mat, accessory_col)
tail_scarf = uv_sphere("Pañuelo | punta", (0.25,-0.48,1.38), (.09,.055,.23), scarf_mat, accessory_col)
tail_scarf.rotation_euler[1] = -0.35

# Backpack behind character (positive Y)
rounded_box("Mochila | cuerpo", (0.43,0.48,1.13), (.49,.30,.67), mint, .12)
rounded_box("Mochila | bolsillo", (0.43,0.30,.98), (.36,.12,.27), mint_light, .07)
rounded_box("Mochila | tapa", (0.43,0.29,1.39), (.39,.12,.12), mint, .05)
# straps on visible sides
for x in (.25,.61):
    cylinder_between("Correa mochila", (x,.27,1.42), (x-.02,-.04,.91), .045, strap_mat)
# roll strapped to top
cylinder_between("Rollo de manta", (0.20,.48,1.56), (0.66,.48,1.56), .105, strap_mat, vertices=24)
for x in (.28,.58):
    torus("Banda del rollo", (x,.48,1.56), .108, .022, gold, rotation=(0,math.pi/2,0))
# little heart on backpack
uv_sphere("Corazón mochila | izquierda", (.40,.225,1.15), (.075,.035,.075), pink, accessory_col)
uv_sphere("Corazón mochila | derecha", (.47,.225,1.15), (.075,.035,.075), pink, accessory_col)

# Flower clip near left side of forelock
flower_center = (-0.43,-0.47,2.54)
uv_sphere("Flor | centro", flower_center, (.055,.035,.055), flower_yellow, accessory_col)
for i in range(5):
    a = i * 2*math.pi/5
    uv_sphere(f"Flor | pétalo {i+1}", (flower_center[0]+math.cos(a)*.09, flower_center[1], flower_center[2]+math.sin(a)*.09),
              (.065,.028,.065), flower_pink, accessory_col, 20, 12)

# Simple named control empty for later rigging/animation
control = bpy.data.objects.new("CTRL_Alpi_Root", None)
root_col.objects.link(control)
control.empty_display_type = 'CIRCLE'
control.empty_display_size = 0.8
control.location = (0,0,0)
control["purpose"] = "Control raíz de Alpi; punto de partida para rigging posterior."

# Ground
bpy.ops.mesh.primitive_plane_add(size=200, location=(0,0,0.05))
ground = bpy.context.object
ground.name = "Suelo | render"
ground.data.materials.append(ground_mat)
move_to_collection(ground, stage_col)

# Camera and studio lights
bpy.ops.object.camera_add(location=(3.8,-7.6,3.5))
camera = bpy.context.object
camera.name = "Camera | Alpi"
target = Vector((0,0,1.45))
camera.rotation_euler = (target - camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type = 'ORTHO'
camera.data.ortho_scale = 4.45
scene.camera = camera
move_to_collection(camera, stage_col)

def area_light(name, loc, power, size, color):
    bpy.ops.object.light_add(type='AREA', location=loc)
    light = bpy.context.object
    light.name = name
    light.data.energy = power
    light.data.shape = 'DISK'
    light.data.size = size
    light.data.color = color
    light.rotation_euler = (Vector((0,0,1.3))-light.location).to_track_quat('-Z','Y').to_euler()
    move_to_collection(light, stage_col)
    return light

area_light("Luz principal | softbox", (0,-4.5,6), 500, 4.0, (1.0,0.82,0.78))
area_light("Luz relleno", (-4,-2,3.2), 260, 3.0, (0.75,0.86,1.0))
area_light("Luz de contorno", (2.5,3.2,4.8), 420, 3.0, (1.0,0.72,0.55))

# Camera/viewport settings
scene.render.image_settings.color_mode = 'RGBA'
scene.view_settings.view_transform = 'AgX'
scene.render.filepath = os.path.join(os.path.expanduser("~"), "alpi_preview.png")
scene.camera.data.lens = 50

# Select main control, set a useful viewport view
bpy.ops.object.select_all(action='DESELECT')
control.select_set(True)
bpy.context.view_layer.objects.active = control

# Save project next to this script; export GLB as a portable preview asset.
try:
    script_dir = os.path.dirname(os.path.abspath(__file__))
except NameError:
    script_dir = os.path.expanduser("~")
blend_path = os.path.join(script_dir, "Alpi_Bebe.blend")
glb_path = os.path.join(script_dir, "Alpi_Bebe.glb")
bpy.ops.wm.save_as_mainfile(filepath=blend_path)
try:
    # Exportar solo las piezas del personaje, excluyendo suelo, cámara y luces.
    bpy.ops.object.select_all(action='DESELECT')
    character_objects = []
    for obj in bpy.data.objects:
        if obj.type in {'MESH', 'CURVE'} and obj.name not in {"Suelo | render"}:
            # Excluir geometría de escenario por colección; conservar cuerpo/cara/accesorios.
            if any(col in obj.users_collection for col in (body_col, face_col, accessory_col)):
                obj.select_set(True)
                character_objects.append(obj)
    if character_objects:
        bpy.context.view_layer.objects.active = character_objects[0]
        bpy.ops.export_scene.gltf(filepath=glb_path, export_format='GLB',
                                  export_apply=True, use_selection=True)
        print("Alpi exportado a:", glb_path)
    else:
        print("No se encontraron piezas del personaje para exportar.")
except Exception as exc:
    print("No se pudo exportar GLB automáticamente:", exc)
print("Proyecto Blender guardado en:", blend_path)
