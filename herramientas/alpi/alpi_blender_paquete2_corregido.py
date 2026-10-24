"""Alpi, stylized baby alpaca explorer.

Run with Blender 3.6+ in background or from the Text Editor:
    blender --background --python alpi_blender.py

The script builds a clean scene, saves alpi.blend beside this script, and renders
alpi_preview.png. It uses no external assets or add-ons.
"""
import bpy
import math
import random
from mathutils import Vector
from pathlib import Path


SEED = 24
random.seed(SEED)
OUT_DIR = Path(__file__).resolve().parent

# Palette sampled by eye from the supplied Alpi design board.
COLORS = {
    "wool": (0.93, 0.84, 0.72, 1),
    "wool_light": (1.00, 0.91, 0.80, 1),
    "wool_shadow": (0.73, 0.57, 0.46, 1),
    "pink": (0.92, 0.36, 0.49, 1),
    "pink_light": (1.00, 0.58, 0.64, 1),
    "coral": (0.94, 0.25, 0.18, 1),
    "teal": (0.055, 0.39, 0.40, 1),
    "teal_light": (0.10, 0.58, 0.56, 1),
    "teal_dark": (0.025, 0.19, 0.22, 1),
    "leather": (0.36, 0.19, 0.12, 1),
    "gold": (0.95, 0.61, 0.20, 1),
    "eye": (0.075, 0.035, 0.045, 1),
    "white": (1.0, 0.97, 0.88, 1),
    "leaf": (0.13, 0.43, 0.25, 1),
    "blush": (0.96, 0.37, 0.42, 1),
}


def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    # (no se borran materiales: los de M ya se crearon y aún no tienen usuarios)
    for datablocks in (bpy.data.curves, bpy.data.meshes):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)


def mat(name, color, roughness=0.48, metallic=0.0, subsurface=0.0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = color
    m.use_nodes = True
    p = m.node_tree.nodes.get("Principled BSDF")
    p.inputs["Base Color"].default_value = color
    p.inputs["Roughness"].default_value = roughness
    p.inputs["Metallic"].default_value = metallic
    if "Subsurface Weight" in p.inputs:
        p.inputs["Subsurface Weight"].default_value = subsurface
    return m


def wool_material(name, color):
    m = mat(name, color, 0.83, subsurface=0.055)
    nodes, links = m.node_tree.nodes, m.node_tree.links
    tex = nodes.new("ShaderNodeTexNoise")
    tex.inputs["Scale"].default_value = 34
    tex.inputs["Detail"].default_value = 2.4
    tex.inputs["Roughness"].default_value = 0.78
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.18
    bump.inputs["Distance"].default_value = 0.035
    links.new(tex.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], nodes.get("Principled BSDF").inputs["Normal"])
    return m


M = {
    key: mat(key.replace('_', ' ').title(), color, 0.3 if key in ("eye", "gold") else 0.48,
             metallic=0.42 if key == "gold" else 0.0)
    for key, color in COLORS.items()
}
M["wool"] = wool_material("Warm ivory fleece", COLORS["wool"])
M["wool_light"] = wool_material("Cream fleece highlights", COLORS["wool_light"])
M["wool_shadow"] = wool_material("Warm fleece shadow", COLORS["wool_shadow"])


def smooth(obj):
    if obj.type == 'MESH':
        for poly in obj.data.polygons:
            poly.use_smooth = True
    return obj


def uv(name, loc, scale, material, segments=32, rings=20, rot=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=loc)
    o = bpy.context.object
    o.name = name
    o.scale = scale
    if rot:
        o.rotation_euler = rot
    o.data.materials.append(M[material] if isinstance(material, str) else material)
    return smooth(o)


def bevel_cube(name, loc, scale, material, bevel=0.12, rot=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object
    o.name = name
    o.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if rot:
        o.rotation_euler = rot
    o.data.materials.append(M[material] if isinstance(material, str) else material)
    mod = o.modifiers.new("Soft rounded edges", 'BEVEL')
    mod.width = bevel
    mod.segments = 4
    o.modifiers.new("Weighted corner normals", 'WEIGHTED_NORMAL')
    return o


def tube(name, points, radius, material, cyclic=False, resolution=3):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.resolution_u = 16
    curve.bevel_depth = radius
    curve.bevel_resolution = resolution
    spline = curve.splines.new('BEZIER')
    spline.bezier_points.add(len(points) - 1)
    for bp, co in zip(spline.bezier_points, points):
        bp.co = co
        bp.handle_left_type = 'AUTO'
        bp.handle_right_type = 'AUTO'
    spline.use_cyclic_u = cyclic
    ob = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(ob)
    ob.data.materials.append(M[material] if isinstance(material, str) else material)
    return ob


def tuft(name, loc, scale, material="wool", rot=None, lobes=5, taper=0.82):
    """Short sculptural fleece lock: softly lobed loft with a tucked base and tip."""
    verts, faces = [], []
    n, rings = 16, 8
    sx, sy, sz = scale
    for j in range(rings + 1):
        t = j / rings
        z = (t - 0.5) * 2.0 * sz
        base = math.sin(math.pi * (0.08 + 0.84 * t)) ** 0.55
        taper_factor = (1.0 - taper * max(0.0, (t - 0.62) / 0.38))
        rad = base * taper_factor
        for i in range(n):
            a = 2 * math.pi * i / n
            scallop = 1.0 + 0.12 * math.cos(lobes * a + t * 0.45)
            verts.append((sx * rad * scallop * math.cos(a), sy * rad * scallop * math.sin(a), z))
    for j in range(rings):
        for i in range(n):
            a = j * n + i
            b = j * n + (i + 1) % n
            faces.append((a, b, b + n, a + n))
    faces.append(tuple(range(n - 1, -1, -1)))
    faces.append(tuple(rings * n + i for i in range(n)))
    mesh = bpy.data.meshes.new(name + " mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.materials.append(M[material] if isinstance(material, str) else material)
    mesh.update()
    ob = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(ob)
    ob.location = loc
    if rot:
        ob.rotation_euler = rot
    smooth(ob)
    sub = ob.modifiers.new("Fleece lock smoothing", 'SUBSURF')
    sub.levels = 2
    return ob


def ellipsoid_between(name, a, b, width, material, depth=None):
    a, b = Vector(a), Vector(b)
    delta = b - a
    ob = uv(name, (a + b) / 2, (width, depth or width, delta.length / 2 + width * 0.3), material)
    ob.rotation_euler[1] = math.atan2(delta.x, delta.z)
    return ob


def fleece_shell():
    # Dense little locks follow the surface of the continuous head/body forms.
    # The base forms stay readable; locks break the outline into soft alpaca wool.
    for label, center, radii, count, seed_offset in [
        ("body", Vector((0, 0.0, 1.28)), (0.75, 0.57, 0.91), 142, 3),
        ("head", Vector((0, -0.02, 2.75)), (0.91, 0.68, 0.76), 156, 9),
    ]:
        for i in range(count):
            zdir = random.uniform(-0.90, 0.96)
            ang = random.uniform(0, 2 * math.pi)
            radial = math.sqrt(max(0.0, 1 - zdir * zdir))
            nx, ny, nz = radial * math.cos(ang), radial * math.sin(ang), zdir
            # Leave the eye/muzzle band largely unobstructed on the face.
            if label == "head" and ny < -0.65 and 0.30 < nz < 0.68:
                continue
            if label == "body" and ny < -0.78 and 0.1 < nz < 0.55:
                continue
            surf = Vector((center.x + nx * radii[0], center.y + ny * radii[1], center.z + nz * radii[2]))
            normal = Vector((nx / radii[0], ny / radii[1], nz / radii[2])).normalized()
            size = random.uniform(0.12, 0.205) if label == "head" else random.uniform(0.13, 0.205)
            material = "wool_light" if random.random() < 0.22 else "wool"
            # Orient the long axis gently along gravity, with a little natural variation.
            tilt = random.uniform(-0.32, 0.32)
            tuft(label.title() + " fleece curl", surf + normal * 0.025,
                 (size * random.uniform(0.9, 1.18), size * 0.72, size * random.uniform(0.72, 1.02)),
                 material, (tilt, ang * 0.16, ang), lobes=random.choice((4, 5, 6)))


def scarf():
    # Neck wrap is a broad curved band, with a separate softly triangular chest knot.
    tube("Coral neck wrap", [(-0.57, -0.40, 2.04), (-0.45, -0.58, 2.14),
         (0, -0.63, 2.16), (0.45, -0.58, 2.14), (0.57, -0.40, 2.04)], 0.13, "coral")
    uv("Scarf soft front fold", (0, -0.68, 2.02), (0.42, 0.12, 0.18), "coral")
    # Tapered scarf end modeled as a rounded low-poly pennant.
    verts = [(-0.26,-0.68,2.03),(0.26,-0.68,2.03),(0.18,-0.73,1.76),
             (0.0,-0.75,1.66),(-0.18,-0.73,1.76),(-0.26,-0.57,2.03),(0.26,-0.57,2.03)]
    faces = [(0,1,2,3,4),(0,5,6,1),(1,6,2),(4,3,2),(0,4,3,2,1)]
    me = bpy.data.meshes.new("Scarf end mesh")
    me.from_pydata(verts, [], faces); me.materials.append(M["coral"]); me.update()
    ob = bpy.data.objects.new("Scarf draped end", me); bpy.context.collection.objects.link(ob)
    mod = ob.modifiers.new("Soft scarf edges", 'BEVEL'); mod.width=0.06; mod.segments=3
    ob.modifiers.new("Scarf normals", 'WEIGHTED_NORMAL')
    tube("Scarf stitch", [(-0.17,-0.77,1.91),(0,-0.78,1.88),(0.17,-0.77,1.91)], 0.012, "gold")


def backpack():
    # Backpack sits behind the shoulder line, biased to camera-left for a readable silhouette.
    pack = bevel_cube("Explorer backpack body", (-0.54, 0.61, 1.48), (0.74, 0.48, 0.94), "teal", 0.20,
                      rot=(0, -0.10, -0.10))
    bevel_cube("Pack front pocket", (-0.50, 0.32, 1.37), (0.52, 0.16, 0.43), "teal_light", 0.12,
               rot=(0, -0.06, -0.06))
    # Front pocket piping and flap.
    tube("Pocket piping", [(-0.76,0.22,1.20),(-0.76,0.22,1.51),(-0.50,0.21,1.57),(-0.25,0.22,1.50),(-0.25,0.22,1.20)], 0.018, "white", True)
    bevel_cube("Pocket flap", (-0.50,0.205,1.57), (0.40,0.06,0.12), "teal", 0.045)
    uv("Heart badge", (-0.50,0.164,1.37), (0.09,0.035,0.075), "pink")
    # Rolled blanket on top with end caps and straps.
    uv("Rolled blanket", (-0.53,0.64,2.05), (0.49,0.18,0.16), "leather", rot=(0, math.pi/2, 0))
    for x in (-0.70, -0.36):
        tube("Blanket strap", [(x,0.43,1.95),(x,0.42,2.05),(x,0.43,2.14)], 0.025, "gold")
    # Shoulder harness arcs visible across the front sides.
    tube("Left shoulder strap", [(-0.73,0.30,1.84),(-0.78,-0.05,2.03),(-0.69,-0.41,2.20)], 0.065, "teal_dark")
    tube("Right shoulder strap", [(0.48,0.30,1.82),(0.62,-0.03,2.04),(0.69,-0.39,2.20)], 0.060, "teal_dark")
    for x in (-0.73, 0.62):
        bevel_cube("Harness brass adjuster", (x,-0.14,2.03), (0.12,0.05,0.15), "gold", 0.025)
    # Side water flask and stitched side loops.
    bevel_cube("Side canteen", (-0.94,0.52,1.30), (0.16,0.22,0.42), "teal_light", 0.07)
    uv("Canteen cap", (-0.94,0.52,1.54), (0.09,0.09,0.07), "gold")
    tube("Pack grab loop", [(-0.76,0.78,1.98),(-0.62,0.84,2.18),(-0.37,0.79,2.10)], 0.035, "leather")
    # Flower attached to the outer pack shoulder as a signature charm.
    flower((-0.93,0.24,1.85), facing=(0,-1,0), scale=0.78, name="Pack flower charm")


def flower(center, facing=(0,-1,0), scale=1.0, name="Flower"):
    c = Vector(center)
    # Five pillowy petals around a golden center, all tucked together as one small bloom.
    for i in range(5):
        a = 2 * math.pi * i / 5
        pos = c + Vector((math.cos(a)*0.105*scale, 0, math.sin(a)*0.105*scale))
        uv(name + " petal", pos, (0.095*scale,0.045*scale,0.065*scale), "pink_light",
           rot=(0, -a, 0))
    uv(name + " golden heart", c + Vector((0,-0.035*scale,0)), (0.052*scale,0.035*scale,0.052*scale), "gold")
    # two tiny leaves
    for sign in (-1,1):
        uv(name + " leaf", c + Vector((sign*0.17*scale,0.015*scale,-0.06*scale)),
           (0.10*scale,0.035*scale,0.035*scale), "leaf", rot=(0,sign*0.4,sign*0.45))


def face():
    # Eye placement on the forward-facing (-Y) surface of the head.
    for side in (-1, 1):
        x = 0.34 * side
        uv("Eye socket", (x,-0.635,2.76), (0.205,0.105,0.245), "wool_shadow")
        uv("Glossy dark eye", (x,-0.716,2.77), (0.137,0.082,0.175), "eye")
        uv("Eye catchlight", (x-0.041,-0.785,2.835), (0.044,0.025,0.051), "white", 20, 12)
        uv("Small eye glint", (x+0.043,-0.789,2.72), (0.018,0.012,0.022), "white", 16, 10)
        uv("Rosy cheek", (0.56*side,-0.605,2.46), (0.17,0.045,0.09), "blush")
        # soft arched eyebrow
        tube("Expressive brow", [(x-0.13,-0.676,3.02),(x,-0.71,3.08),(x+0.13,-0.676,3.02)], 0.026, "leather")
    uv("Muzzle", (0,-0.696,2.43), (0.28,0.14,0.19), "wool_light")
    uv("Tiny heart nose", (0,-0.829,2.48), (0.075,0.045,0.055), "eye")
    tube("Smile", [(0,-0.827,2.43),(0,-0.845,2.37),(0.085,-0.815,2.36)], 0.018, "leather")
    tube("Smile other side", [(0,-0.827,2.43),(0,-0.845,2.37),(-0.085,-0.815,2.36)], 0.018, "leather")
    # Small upright ears with warm inset.
    for side in (-1, 1):
        x = 0.69 * side
        ear = uv("Alpaca ear", (x,-0.02,3.39), (0.20,0.17,0.38), "wool", rot=(0, 0.20*side, -0.20*side))
        uv("Ear pink inner", (x*1.02,-0.17,3.41), (0.095,0.035,0.24), "pink_light", rot=(0,0.20*side,-0.20*side))
    # Pink forelock: three curving tapered locks, not round baubles.
    tuft("Pink forelock center", (-0.02,-0.645,3.37), (0.21,0.12,0.32), "pink", (0.25,-0.30,-0.12), taper=0.93)
    tuft("Pink forelock sweep", (0.17,-0.625,3.30), (0.19,0.12,0.27), "pink_light", (0.30,-0.36,-0.36), taper=0.90)
    tuft("Pink forelock curl", (-0.19,-0.60,3.31), (0.16,0.12,0.22), "pink", (0.20,0.25,0.32), taper=0.92)
    flower((0.76,-0.11,3.19), facing=(0,-1,0), scale=0.78, name="Alpi hair flower")


def character():
    # Upright chibi silhouette: long soft torso, oversized head, short sturdy legs.
    uv("Pear-shaped torso", (0,0,1.28), (0.71,0.55,0.91), "wool")
    uv("Oversized rounded head", (0,-0.02,2.75), (0.88,0.66,0.75), "wool_light", 48, 32)
    # small feet and arms are integrated visually into the fleece body
    for side in (-1,1):
        uv("Little foot", (0.32*side,-0.06,0.29), (0.24,0.30,0.20), "wool_shadow")
        uv("Soft hoof", (0.32*side,-0.25,0.22), (0.17,0.19,0.10), "leather")
        uv("Stubby arm", (0.67*side,-0.05,1.48), (0.23,0.25,0.47), "wool", rot=(0,0,0.30*side))
        uv("Tiny paw", (0.72*side,-0.24,1.24), (0.18,0.17,0.16), "wool_light")
    # Small tail peeking beside the pack.
    uv("Cotton tail", (0.70,0.40,1.02), (0.19,0.19,0.20), "wool_light")
    fleece_shell()
    face()
    scarf()
    backpack()


def studio():
    # seamless warm pink studio floor/background and broad softboxes
    ground = mat("Backdrop warm blush", (0.78,0.48,0.48,1), 0.72)
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0,0,-0.02))
    plane = bpy.context.object; plane.name="Matte studio floor"; plane.data.materials.append(ground)
    world = bpy.data.worlds.new("Warm rose studio") if not bpy.data.worlds else bpy.data.worlds[0]
    bpy.context.scene.world = world
    world.use_nodes=True
    world.node_tree.nodes["Background"].inputs["Color"].default_value=(0.56,0.40,0.40,1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value=0.35

    def area(name, loc, power, size, color, target=(0,0,1.8)):
        bpy.ops.object.light_add(type='AREA', location=loc)
        o=bpy.context.object; o.name=name; o.data.energy=power; o.data.shape='DISK'; o.data.size=size
        o.data.color=color
        o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
    area("Key softbox", (-4,-5,7), 650, 4.5, (1.0,0.78,0.67))
    area("Cool fill", (4,-3,4.5), 420, 4.0, (0.68,0.83,1.0))
    area("Warm rim", (1,3,5.5), 850, 3.0, (1.0,0.68,0.46))
    bpy.ops.object.camera_add(location=(3.8,-8.8,3.7))
    cam=bpy.context.object; cam.name="Alpi portrait camera"
    target=Vector((0,0,1.85))
    cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.type='ORTHO'; cam.data.ortho_scale=5.25; bpy.context.scene.camera=cam
    cam.data.lens=55


def main():
    clear_scene()
    character()
    studio()
    scene=bpy.context.scene
    scene.render.engine='CYCLES'
    scene.cycles.samples=24
    scene.cycles.use_denoising=True
    scene.render.resolution_x=500
    scene.render.resolution_y=600
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG'
    scene.render.film_transparent=False
    scene.view_settings.view_transform='AgX'
    scene.render.filepath=str(OUT_DIR / "alpi_preview.png")
    # Organize model and studio separately for easy app integration/export.
    model_col=bpy.data.collections.new("ALPI | Character")
    studio_col=bpy.data.collections.new("STUDIO | Render setup")
    scene.collection.children.link(model_col); scene.collection.children.link(studio_col)
    for obj in list(scene.objects):
        target_col = studio_col if obj.type in {'LIGHT','CAMERA'} or obj.name=="Matte studio floor" else model_col
        for col in list(obj.users_collection): col.objects.unlink(obj)
        target_col.objects.link(obj)
    # Save before rendering so a render failure still leaves a native scene.
    blend_path=OUT_DIR / "alpi.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    bpy.ops.render.render(write_still=True)
    print("Created:", blend_path)
    print("Rendered:", scene.render.filepath)


if __name__ == "__main__":
    main()
