import { useFrame, useLoader } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import urlModelo from '../../assets/alpi/alpi.glb?url'
import { PIEZAS_EXPRESION, seVeEnNivel, type AnimacionAlpi, type ExpresionAlpi, type NivelAlpi } from './datos'

// Alpi sale de un modelo hecho en Blender (herramientas/alpi/alpi_app.py → src/assets/alpi/alpi.glb).
// El archivo trae piezas con nombre: aquí se mueven (cabeza, brazos, patas, orejas, ojos) y se
// encienden o apagan (accesorios de cada nivel y las piezas de cada expresión).

export interface PropsModelo {
  nivel: NivelAlpi
  expresion: ExpresionAlpi
  animacion: AnimacionAlpi
  habla?: boolean
  /** Giro extra (al arrastrar) e inclinación hacia donde tocas, de -1 a 1. */
  giro?: number
  inclina?: { x: number; y: number } | null
}

const TODAS_LAS_PIEZAS = [...new Set(Object.values(PIEZAS_EXPRESION).flat())]

// El modelo mide 2,9 de alto; la cámara está pensada para unos 2,3.
const ESCALA = 0.8

const conMeshopt = (l: GLTFLoader) => {
  l.setMeshoptDecoder(MeshoptDecoder)
}

const DORADO = new THREE.MeshStandardMaterial({ color: '#e9b949', roughness: 0.3, emissive: '#e9b949', emissiveIntensity: 0.9 })
const OCTAEDRO = new THREE.OctahedronGeometry(1, 0)

export function Modelo({ nivel, expresion, animacion, habla = false, giro = 0, inclina = null }: PropsModelo) {
  const gltf = useLoader(GLTFLoader, urlModelo, conMeshopt)
  // Cada Alpi en pantalla tiene su propia copia (comparten geometría y materiales).
  const escena = useMemo(() => gltf.scene.clone(true), [gltf])
  const n = useMemo(() => {
    const todos = new Map<string, THREE.Object3D>()
    escena.traverse((o) => {
      if (o.name && !todos.has(o.name)) todos.set(o.name, o)
    })
    const de = (nombre: string) => todos.get(nombre) ?? null
    return {
      todos,
      raiz: de('Raiz'),
      cuerpo: de('Cuerpo'),
      cabeza: de('Cabeza'),
      brazoL: de('BrazoL'),
      brazoR: de('BrazoR'),
      pataL: de('PataL'),
      pataR: de('PataR'),
      orejaL: de('OrejaL'),
      orejaR: de('OrejaR'),
      ojos: [de('OjoL'), de('OjoR'), de('OjoGuinoL')],
      boca: de('BocaAbierta'),
      lagrimas: de('Lagrimas'),
      lagrimasY: de('Lagrimas')?.position.y ?? 0,
      libro: de('Libro'),
      tronco: de('Tronco'),
      baston: de('Niv_1_baston'),
    }
  }, [escena])

  const chispas = useRef<THREE.Group>(null)
  const sombra = useRef<THREE.Mesh>(null)
  const viaje = useRef({ x: 0, y: 0 })
  const inicio = useRef<{ animacion: AnimacionAlpi; t0: number | null }>({ animacion, t0: null })

  // Qué se ve: accesorios del nivel, piezas de la expresión, libro, tronco y bastón.
  const hablando = habla && expresion !== 'dormida'
  useLayoutEffect(() => {
    for (const [nombre, o] of n.todos) if (nombre.startsWith('Niv_')) o.visible = seVeEnNivel(nombre, nivel)
    const visibles = new Set(PIEZAS_EXPRESION[expresion])
    if (hablando) {
      for (const b of ['BocaSonrisa', 'BocaTriste', 'BocaO']) visibles.delete(b)
      visibles.add('BocaAbierta')
    }
    for (const p of TODAS_LAS_PIEZAS) {
      const o = n.todos.get(p)
      if (o) o.visible = visibles.has(p)
    }
    if (n.libro) n.libro.visible = animacion === 'estudiando'
    if (n.tronco) n.tronco.visible = animacion === 'descansando'
    if (n.baston) n.baston.visible = nivel === 1 && (animacion === 'reposo' || animacion === 'caminar')
  }, [n, nivel, expresion, animacion, hablando])

  useFrame((estado, dt) => {
    const t = estado.clock.elapsedTime
    const d = Math.min(dt, 0.05)
    if (inicio.current.animacion !== animacion || inicio.current.t0 === null) inicio.current = { animacion, t0: t }
    const local = t - inicio.current.t0!
    const hacia = (actual: number, meta: number, k = 9) => THREE.MathUtils.damp(actual, meta, k, d)
    const obj = inclina ?? { x: 0, y: 0 }
    viaje.current.x = hacia(viaje.current.x, obj.x, 10)
    viaje.current.y = hacia(viaje.current.y, obj.y, 10)

    // Pose de reposo; cada animación cambia lo suyo. Los brazos del modelo ya cuelgan un poco
    // abiertos, así que 0 es "brazo abajo". En three.js la altura es Y y el frente es +Z.
    let y = Math.sin(t * 2) * 0.012
    let rotX = 0
    let rotZ = Math.sin(t * 1.1) * 0.015
    let aplasta = Math.sin(t * 2.2) * 0.012
    let cabX = Math.sin(t * 1.3) * 0.03
    let cabZ = 0
    let bL = { x: 0, z: Math.sin(t * 1.8) * 0.04 }
    let bR = { x: 0, z: -Math.sin(t * 1.8) * 0.04 }
    let pL = 0
    let pR = 0

    switch (animacion) {
      case 'caminar': {
        const paso = Math.sin(t * 6)
        pL = paso * 0.45
        pR = -paso * 0.45
        bL = { x: -paso * 0.45, z: 0.05 }
        bR = { x: paso * 0.45, z: -0.05 }
        y = Math.abs(Math.cos(t * 6)) * 0.07
        rotZ = paso * 0.05
        cabZ = -paso * 0.04
        break
      }
      case 'saltar': {
        const f = (local % 0.9) / 0.9
        const aire = f > 0.25 && f < 0.85 ? Math.sin(((f - 0.25) / 0.6) * Math.PI) : 0
        y = aire * 0.6
        aplasta = f < 0.25 ? -Math.sin((f / 0.25) * Math.PI) * 0.12 : f > 0.85 ? -Math.sin(((f - 0.85) / 0.15) * Math.PI) * 0.1 : aire * 0.05
        pL = pR = -aire * 0.45
        bL = { x: 0, z: -aire * 1.4 }
        bR = { x: 0, z: aire * 1.4 }
        break
      }
      case 'celebrar': {
        const ola = Math.sin(t * 9)
        y = Math.abs(Math.sin(t * 4.5)) * 0.24
        bL = { x: 0, z: -2.2 - ola * 0.3 }
        bR = { x: 0, z: 2.2 - ola * 0.3 }
        cabZ = Math.sin(t * 4.5) * 0.12
        rotZ = Math.sin(t * 4.5) * 0.06
        pL = Math.max(0, Math.sin(t * 4.5)) * 0.3
        pR = Math.max(0, -Math.sin(t * 4.5)) * 0.3
        break
      }
      case 'estudiando':
        bL = { x: -1.1, z: 0.45 }
        bR = { x: -1.1, z: -0.45 }
        cabX = 0.2 + Math.sin(t * 0.8) * 0.03
        cabZ = Math.sin(t * 0.5) * 0.05
        break
      case 'descansando':
        y = 0.22
        rotX = 0.1
        aplasta = Math.sin(t * 1.1) * 0.02
        pL = pR = -1.3
        bL = { x: -0.6, z: 0.35 }
        bR = { x: -0.6, z: -0.35 }
        cabX = 0.3
        cabZ = 0.2
        break
      case 'saludar':
        bL = { x: -0.3, z: -2.0 + Math.sin(t * 8) * 0.4 }
        cabZ = 0.1
        y = Math.sin(t * 2.4) * 0.02
        break
    }

    if (expresion === 'curiosa') cabZ += 0.16
    if (expresion === 'triste') cabX += 0.14
    if (expresion === 'sorprendida') cabX -= 0.1
    if (expresion === 'emocionada' && animacion === 'reposo') y += Math.max(0, Math.sin(t * 5)) ** 4 * 0.12

    const r = n.raiz
    if (r) {
      r.position.y = hacia(r.position.y, y, 18)
      r.rotation.x = hacia(r.rotation.x, rotX + viaje.current.y * 0.25, 10)
      r.rotation.y = hacia(r.rotation.y, -0.42 + giro + viaje.current.x * 0.75, 10)
      r.rotation.z = hacia(r.rotation.z, rotZ, 10)
      if (n.tronco) n.tronco.rotation.y = r.rotation.y
    }
    n.cuerpo?.scale.set(1 - aplasta * 0.6, 1 + aplasta, 1 - aplasta * 0.6)
    if (n.cabeza) {
      n.cabeza.rotation.x = hacia(n.cabeza.rotation.x, cabX)
      n.cabeza.rotation.z = hacia(n.cabeza.rotation.z, cabZ)
      n.cabeza.rotation.y = hacia(n.cabeza.rotation.y, viaje.current.x * 0.35)
    }
    for (const [b, v] of [[n.brazoL, bL], [n.brazoR, bR]] as const) {
      if (!b) continue
      b.rotation.x = hacia(b.rotation.x, v.x, 12)
      b.rotation.z = hacia(b.rotation.z, v.z, 12)
    }
    if (n.pataL) n.pataL.rotation.x = hacia(n.pataL.rotation.x, pL, 14)
    if (n.pataR) n.pataR.rotation.x = hacia(n.pataR.rotation.x, pR, 14)

    // Orejas: caídas si duerme o está triste, paradas si se sorprende, y un tic de vez en cuando.
    const caida = expresion === 'dormida' || expresion === 'triste' ? 0.4 : expresion === 'sorprendida' || expresion === 'emocionada' ? -0.2 : 0
    const tic = t % 5 > 4.7 ? Math.sin(t * 40) * 0.18 : 0
    if (n.orejaL) n.orejaL.rotation.z = hacia(n.orejaL.rotation.z, caida + tic, 12)
    if (n.orejaR) n.orejaR.rotation.z = hacia(n.orejaR.rotation.z, -caida - tic, 12)

    // Parpadeo; los ojos se agrandan al emocionarse o sorprenderse.
    const g = expresion === 'emocionada' ? 1.18 : expresion === 'sorprendida' ? 1.12 : 1
    const abre = t % 4.2 > 4.06 ? 0.1 : 1
    for (const o of n.ojos) {
      if (!o) continue
      o.scale.x = o.scale.z = g
      o.scale.y = hacia(o.scale.y, abre * g, 30)
    }
    if (n.boca) n.boca.scale.y = hacia(n.boca.scale.y, hablando ? 0.5 + Math.abs(Math.sin(t * 13)) * 0.9 : 1, 25)
    if (n.lagrimas) {
      const f = (t % 1.6) / 1.6
      n.lagrimas.position.y = n.lagrimasY - f * 0.12
      n.lagrimas.scale.setScalar(f < 0.85 ? 1 : Math.max(0.01, 1 - (f - 0.85) / 0.15))
    }
    if (chispas.current) {
      const rapido = animacion === 'celebrar'
      chispas.current.rotation.y = t * (rapido ? 1.6 : 0.5)
      chispas.current.position.y = rapido ? 1.1 + Math.sin(t * 3) * 0.15 : 1.3
      chispas.current.children.forEach((c, i) => c.rotation.set(t * 2 + i, t * 3, 0))
    }
    if (sombra.current) {
      const s = 1 - Math.min(0.5, Math.max(0, (r?.position.y ?? 0) - (animacion === 'descansando' ? 0.22 : 0)) * 0.8)
      sombra.current.scale.set(s, s, s)
    }
  })

  return (
    <group>
      <mesh ref={sombra} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <circleGeometry args={[0.62, 32]} />
        <meshBasicMaterial color="#5a3a4a" transparent opacity={0.16} depthWrite={false} />
      </mesh>
      <group scale={ESCALA}>
        <primitive object={escena} />
      </group>
      {(nivel === 4 || animacion === 'celebrar') && (
        <group ref={chispas} position={[0, 1.3, 0]}>
          {Array.from({ length: 7 }, (_, i) => {
            const a = (i / 7) * Math.PI * 2
            return <mesh key={i} geometry={OCTAEDRO} material={DORADO} position={[Math.cos(a) * 0.95, Math.sin(i * 1.7) * 0.35, Math.sin(a) * 0.95]} scale={0.05 + (i % 3) * 0.015} />
          })}
        </group>
      )}
    </group>
  )
}
