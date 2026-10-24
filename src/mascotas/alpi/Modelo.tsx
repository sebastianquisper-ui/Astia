import { useFrame } from '@react-three/fiber'
import { useRef, type ReactNode, type RefObject } from 'react'
import * as THREE from 'three'
import type { AnimacionAlpi, ExpresionAlpi, NivelAlpi } from './datos'

// Alpi en 3D, armada con formas de Three.js (sin archivos de modelo: funciona sin internet).
// La lana son muchas bolitas repartidas sobre la cabeza y el cuerpo; cada parte (cabeza, brazos,
// piernas) es un grupo que se mueve por separado según la animación.

export interface PropsModelo {
  nivel: NivelAlpi
  expresion: ExpresionAlpi
  animacion: AnimacionAlpi
  habla?: boolean
  /** Giro extra (al arrastrar) e inclinación hacia donde tocas, de -1 a 1. */
  giro?: number
  inclina?: { x: number; y: number } | null
}

type V3 = [number, number, number]

// Geometrías y materiales compartidos: cientos de bolitas, una sola geometría.
const ESFERA = new THREE.SphereGeometry(1, 22, 16)
const materiales = new Map<string, THREE.MeshStandardMaterial>()
function mat(color: string, rugosidad = 0.95, brillo = 0): THREE.MeshStandardMaterial {
  const clave = `${color}|${rugosidad}|${brillo}`
  let m = materiales.get(clave)
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: rugosidad, emissive: brillo ? color : '#000', emissiveIntensity: brillo })
    materiales.set(clave, m)
  }
  return m
}
const BASICO_BLANCO = new THREE.MeshBasicMaterial({ color: '#fff' })

const C = {
  lana: '#fbf1e4',
  lanaSombra: '#efdcc6',
  cara: '#fffaf2',
  rosa: '#f7a8a8',
  mejilla: '#ffa3a3',
  tinta: '#2f2026',
  cafe: '#8a5a3c',
  cafeClaro: '#c79a6b',
  dorado: '#e9b949',
  menta: '#8fcfb4',
  mechon: '#f6bfa8',
}

function Bola({ p, s, color = C.lana, rugosidad, brillo }: { p: V3; s: number | V3; color?: string; rugosidad?: number; brillo?: number }) {
  return <mesh geometry={ESFERA} material={mat(color, rugosidad, brillo)} position={p} scale={s} />
}

/** Puntos repartidos parejo sobre un elipsoide (espiral de Fibonacci). */
function puntosLana(n: number, r: V3): V3[] {
  const res: V3[] = []
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n
    const radio = Math.sqrt(1 - y * y)
    const th = i * 2.399963
    res.push([Math.cos(th) * radio * r[0], y * r[1], Math.sin(th) * radio * r[2]])
  }
  return res
}

/** Un copo de lana: un núcleo y bolitas alrededor que le dan volumen. */
function Lana({ c, r, n, bolita, saltar }: { c: V3; r: V3; n: number; bolita: number; saltar?: (p: V3) => boolean }) {
  const puntos = puntosLana(n, r).filter((p) => !saltar?.(p))
  return (
    <group position={c}>
      <Bola p={[0, 0, 0]} s={[r[0] * 0.97, r[1] * 0.97, r[2] * 0.97]} />
      {puntos.map((p, i) => (
        <Bola key={i} p={p} s={bolita * (0.85 + ((i * 37) % 10) / 33)} color={i % 3 === 0 ? C.lanaSombra : C.lana} />
      ))}
    </group>
  )
}

// La cara es un óvalo liso al frente de la cabeza. Todo lo de la cara se apoya sobre él.
const CARA = { c: [0, 0.42, 0.3] as V3, r: [0.39, 0.35, 0.27] as V3 }
function sobreCara(x: number, y: number, extra = 0): V3 {
  const k = 1 - (x / CARA.r[0]) ** 2 - ((y - CARA.c[1]) / CARA.r[1]) ** 2
  return [x, y, CARA.c[2] + CARA.r[2] * Math.sqrt(Math.max(0, k)) + extra]
}

function Arco({ p, radio, grosor = 0.016, abajo = false, giro = 0 }: { p: V3; radio: number; grosor?: number; abajo?: boolean; giro?: number }) {
  return (
    <mesh position={p} rotation={[0, 0, (abajo ? Math.PI : 0) + giro]} material={mat(C.tinta, 0.5)}>
      <torusGeometry args={[radio, grosor, 8, 18, Math.PI]} />
    </mesh>
  )
}

function Flor({ p, s = 1, color = '#ff9bb8', centro = '#ffd35a', rot = [0, 0, 0] }: { p: V3; s?: number; color?: string; centro?: string; rot?: V3 }) {
  return (
    <group position={p} scale={s} rotation={rot}>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2
        return <Bola key={i} p={[Math.sin(a) * 0.06, Math.cos(a) * 0.06, 0]} s={[0.05, 0.05, 0.025]} color={color} rugosidad={0.6} />
      })}
      <Bola p={[0, 0, 0.02]} s={0.032} color={centro} rugosidad={0.5} />
    </group>
  )
}

function Hoja({ p, rot, s = 1, color = '#69b878' }: { p: V3; rot: V3; s?: number; color?: string }) {
  return (
    <group position={p} rotation={rot} scale={s}>
      <Bola p={[0, 0.1, 0]} s={[0.05, 0.12, 0.02]} color={color} rugosidad={0.7} />
    </group>
  )
}

function Chispas({ cantidad, radio, alto, rapido, refGrupo }: { cantidad: number; radio: number; alto: number; rapido: boolean; refGrupo: RefObject<THREE.Group | null> }) {
  return (
    <group ref={refGrupo} position={[0, alto, 0]} userData={{ rapido }}>
      {Array.from({ length: cantidad }, (_, i) => {
        const a = (i / cantidad) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * radio, Math.sin(i * 1.7) * 0.35, Math.sin(a) * radio]} scale={0.055 + (i % 3) * 0.015} material={mat(C.dorado, 0.3, 0.9)}>
            <octahedronGeometry args={[1, 0]} />
          </mesh>
        )
      })}
    </group>
  )
}

/** Cara según la expresión. Los ojos abiertos parpadean (se escalan en Y desde useFrame). */
function Cara({ expresion, ojos, boca, lagrimas, habla }: { expresion: ExpresionAlpi; ojos: RefObject<(THREE.Group | null)[]>; boca: RefObject<THREE.Group | null>; lagrimas: RefObject<THREE.Group | null>; habla: boolean }) {
  const yOjo = 0.46
  const ojo = (lado: -1 | 1) => {
    const x = lado * 0.145
    const p = sobreCara(x, yOjo, 0.005)
    const cerrado = expresion === 'dormida' || (expresion === 'guino' && lado === 1)
    if (expresion === 'feliz') return <Arco key={lado} p={p} radio={0.055} grosor={0.017} />
    if (cerrado) return <Arco key={lado} p={sobreCara(x, yOjo + 0.02, 0.005)} radio={0.055} grosor={0.016} abajo={expresion === 'dormida'} />
    const g = expresion === 'emocionada' ? 1.25 : expresion === 'sorprendida' ? 1.15 : 1
    const alto = expresion === 'concentrada' ? 0.72 : expresion === 'triste' ? 0.9 : 1
    return (
      <group key={lado} ref={(el) => { ojos.current[lado === -1 ? 0 : 1] = el }} position={p}>
        <group scale={[g, g * alto, 1]}>
          <Bola p={[0, 0, 0]} s={[0.066, 0.082, 0.04]} color={C.tinta} rugosidad={0.15} />
          <mesh geometry={ESFERA} material={BASICO_BLANCO} position={[-0.022, 0.028, 0.035]} scale={[0.024, 0.028, 0.012]} />
          <mesh geometry={ESFERA} material={BASICO_BLANCO} position={[0.02, -0.03, 0.035]} scale={[0.011, 0.012, 0.008]} />
          {expresion === 'emocionada' && <mesh geometry={ESFERA} material={BASICO_BLANCO} position={[0.025, 0.03, 0.036]} scale={[0.009, 0.009, 0.006]} />}
        </group>
      </group>
    )
  }

  // Cejas: solo en las expresiones que las necesitan.
  const cejas =
    expresion === 'curiosa' ? [[-1, 0.22], [1, -0.05]] : expresion === 'triste' ? [[-1, -0.4], [1, 0.4]] : expresion === 'concentrada' ? [[-1, 0.25], [1, -0.25]] : expresion === 'sorprendida' ? [[-1, 0], [1, 0]] : []
  const yCeja = expresion === 'sorprendida' || expresion === 'curiosa' ? 0.585 : 0.565

  const yBoca = 0.305
  let dibujoBoca: ReactNode
  if (habla || expresion === 'emocionada' || expresion === 'feliz') {
    dibujoBoca = (
      <group>
        <Bola p={[0, 0, 0]} s={[0.06, 0.045, 0.02]} color="#6e2f3c" rugosidad={0.6} />
        <Bola p={[0, -0.022, 0.008]} s={[0.032, 0.018, 0.014]} color="#ff8fa0" rugosidad={0.6} />
      </group>
    )
  } else if (expresion === 'sorprendida') {
    dibujoBoca = <Bola p={[0, -0.01, 0]} s={[0.03, 0.04, 0.018]} color="#6e2f3c" rugosidad={0.6} />
  } else if (expresion === 'triste') {
    dibujoBoca = <Arco p={[0, -0.03, 0]} radio={0.035} grosor={0.011} />
  } else if (expresion === 'dormida' || expresion === 'concentrada') {
    dibujoBoca = <Arco p={[0, 0.005, 0]} radio={0.025} grosor={0.011} abajo />
  } else {
    // sonrisita de alpaca ":3"
    dibujoBoca = (
      <group>
        <Arco p={[-0.03, 0.005, 0]} radio={0.03} grosor={0.011} abajo />
        <Arco p={[0.03, 0.005, 0]} radio={0.03} grosor={0.011} abajo />
      </group>
    )
  }

  return (
    <group>
      <Bola p={CARA.c} s={CARA.r} color={C.cara} rugosidad={0.8} />
      {ojo(-1)}
      {ojo(1)}
      {cejas.map(([lado, ang]) => (
        // la cápsula viene vertical: se acuesta y se inclina
        <mesh key={lado} position={sobreCara(lado * 0.15, yCeja, 0.004)} rotation={[0, 0, Math.PI / 2 + ang]} material={mat('#9a6b55', 0.8)}>
          <capsuleGeometry args={[0.011, 0.06, 4, 8]} />
        </mesh>
      ))}
      {[-1, 1].map((l) => (
        <Bola key={l} p={sobreCara(l * 0.25, 0.37, -0.012)} s={[0.065, 0.04, 0.02]} color={C.mejilla} rugosidad={0.9} />
      ))}
      <Bola p={sobreCara(0, 0.365, 0.005)} s={[0.04, 0.026, 0.022]} color="#5a3a36" rugosidad={0.4} />
      <group ref={boca} position={sobreCara(0, yBoca, 0.004)}>
        {dibujoBoca}
      </group>
      {expresion === 'triste' && (
        <group ref={lagrimas}>
          {[-1, 1].map((l) => (
            <Bola key={l} p={sobreCara(l * 0.16, 0.39, 0.015)} s={[0.018, 0.026, 0.014]} color="#7cc3ff" rugosidad={0.1} />
          ))}
        </group>
      )}
      {expresion === 'concentrada' && (
        <group>
          {[-1, 1].map((l) => (
            <mesh key={l} position={sobreCara(l * 0.145, yOjo, 0.03)} material={mat(C.cafe, 0.4)}>
              <torusGeometry args={[0.085, 0.012, 8, 28]} />
            </mesh>
          ))}
          <mesh position={sobreCara(0, yOjo + 0.01, 0.03)} rotation={[0, 0, Math.PI / 2]} material={mat(C.cafe, 0.4)}>
            <cylinderGeometry args={[0.009, 0.009, 0.07, 8]} />
          </mesh>
        </group>
      )}
    </group>
  )
}

/** Pañuelo triangular al cuello. */
function Panuelo({ color }: { color: string }) {
  return (
    <group position={[0, 1.02, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} material={mat(color, 0.85)}>
        <torusGeometry args={[0.38, 0.06, 10, 32]} />
      </mesh>
      <mesh position={[0, -0.14, 0.44]} rotation={[0.3, 0, Math.PI]} scale={[1, 1, 0.35]} material={mat(color, 0.85)}>
        <coneGeometry args={[0.24, 0.3, 3]} />
      </mesh>
    </group>
  )
}

/** Mochila a la espalda, con su colchoneta enrollada encima. */
function Mochila({ nivel }: { nivel: NivelAlpi }) {
  const cuerpo = nivel === 4 ? '#8a5a3c' : nivel === 1 ? '#6aa8b8' : '#5f9e94'
  const bolsillo = nivel === 4 ? '#a8714a' : '#8fcfb4'
  const rollo = nivel === 1 ? '#e07a6a' : '#b98a5a'
  return (
    <group position={[0.05, 0.84, -0.5]} rotation={[0.08, 0, 0]} scale={1.15}>
      <Bola p={[0, 0, 0]} s={[0.36, 0.38, 0.2]} color={cuerpo} rugosidad={0.8} />
      <Bola p={[0, -0.1, -0.15]} s={[0.24, 0.17, 0.07]} color={bolsillo} rugosidad={0.8} />
      <Bola p={[0, 0.12, -0.14]} s={[0.3, 0.12, 0.07]} color={cuerpo} rugosidad={0.8} />
      <Bola p={[0, 0.06, -0.21]} s={0.03} color={nivel === 4 ? C.dorado : '#3f6f6a'} rugosidad={0.3} />
      <mesh position={[0, 0.42, 0]} rotation={[0, 0, Math.PI / 2]} material={mat(rollo, 0.85)}>
        <cylinderGeometry args={[0.12, 0.12, 0.74, 20]} />
      </mesh>
      {[-1, 1].map((l) => (
        <mesh key={l} position={[l * 0.24, 0.42, 0]} rotation={[0, 0, Math.PI / 2]} material={mat(C.cafe, 0.7)}>
          <torusGeometry args={[0.125, 0.012, 6, 20]} />
        </mesh>
      ))}
      {nivel === 2 && (
        <group position={[0.18, 0.5, 0.05]}>
          {[-0.5, 0, 0.5, 0.9].map((a, i) => (
            <group key={i} rotation={[0, 0, a - 0.2]}>
              <Bola p={[0, 0.14, 0]} s={[0.05, 0.13, 0.02]} color={i % 2 ? '#5aa86a' : '#7cc48a'} rugosidad={0.7} />
            </group>
          ))}
          <Flor p={[-0.32, 0.05, 0.05]} s={0.9} color="#ffa36b" />
        </group>
      )}
      {nivel >= 3 && (
        <>
          <Flor p={[-0.2, 0.18, -0.2]} s={1.1} color="#ff9bb8" />
          <Flor p={[0.22, -0.05, -0.2]} s={0.9} color="#ffc1d6" />
        </>
      )}
      {nivel === 4 && (
        // catalejo dorado al costado
        <mesh position={[0.36, 0.1, 0]} rotation={[0.2, 0, 0.15]} material={mat(C.dorado, 0.3, 0.15)}>
          <cylinderGeometry args={[0.045, 0.06, 0.42, 16]} />
        </mesh>
      )}
    </group>
  )
}

export function Modelo({ nivel, expresion, animacion, habla = false, giro = 0, inclina = null }: PropsModelo) {
  const raiz = useRef<THREE.Group>(null)
  const cuerpo = useRef<THREE.Group>(null)
  const cabeza = useRef<THREE.Group>(null)
  const brazoI = useRef<THREE.Group>(null)
  const brazoD = useRef<THREE.Group>(null)
  const piernaI = useRef<THREE.Group>(null)
  const piernaD = useRef<THREE.Group>(null)
  const orejaI = useRef<THREE.Group>(null)
  const orejaD = useRef<THREE.Group>(null)
  const ojos = useRef<(THREE.Group | null)[]>([null, null])
  const boca = useRef<THREE.Group>(null)
  const lagrimas = useRef<THREE.Group>(null)
  const libro = useRef<THREE.Group>(null)
  const pagina = useRef<THREE.Mesh>(null)
  const chispas = useRef<THREE.Group>(null)
  const sombra = useRef<THREE.Mesh>(null)
  const viaje = useRef({ x: 0, y: 0 })
  // Cuándo empezó la animación actual (para que el salto arranque desde el piso).
  const inicio = useRef<{ animacion: AnimacionAlpi; t0: number | null }>({ animacion, t0: null })

  const conLibro = animacion === 'estudiando'
  const conTronco = animacion === 'descansando'
  const conBaston = nivel === 1 && (animacion === 'reposo' || animacion === 'caminar')

  useFrame((estado, dt) => {
    const t = estado.clock.elapsedTime
    if (inicio.current.animacion !== animacion || inicio.current.t0 === null) inicio.current = { animacion, t0: t }
    const local = t - inicio.current.t0!
    const d = Math.min(dt, 0.05)
    const hacia = (actual: number, meta: number, k = 9) => THREE.MathUtils.damp(actual, meta, k, d)
    const obj = inclina ?? { x: 0, y: 0 }
    viaje.current.x = hacia(viaje.current.x, obj.x, 10)
    viaje.current.y = hacia(viaje.current.y, obj.y, 10)

    // Valores por defecto (reposo) y luego cada animación cambia lo suyo.
    let y = Math.sin(t * 2) * 0.012
    let rotX = 0
    let rotZ = Math.sin(t * 1.1) * 0.015
    let aplasta = Math.sin(t * 2.2) * 0.012
    let cabX = Math.sin(t * 1.3) * 0.03
    let cabZ = 0
    let bI = { x: 0, z: -0.35 + Math.sin(t * 1.8) * 0.04 }
    let bD = { x: 0, z: 0.35 - Math.sin(t * 1.8) * 0.04 }
    let pI = 0
    let pD = 0

    switch (animacion) {
      case 'caminar': {
        const paso = Math.sin(t * 6)
        pI = paso * 0.5
        pD = -paso * 0.5
        bI = { x: -paso * 0.45, z: -0.3 }
        bD = { x: paso * 0.45, z: 0.3 }
        y = Math.abs(Math.cos(t * 6)) * 0.06
        rotZ = paso * 0.05
        cabZ = -paso * 0.04
        break
      }
      case 'saltar': {
        const f = (local % 0.9) / 0.9
        const aire = f > 0.25 && f < 0.85 ? Math.sin(((f - 0.25) / 0.6) * Math.PI) : 0
        y = aire * 0.55
        aplasta = f < 0.25 ? -Math.sin((f / 0.25) * Math.PI) * 0.12 : f > 0.85 ? -Math.sin(((f - 0.85) / 0.15) * Math.PI) * 0.1 : aire * 0.05
        pI = pD = -aire * 0.5
        bI = { x: 0, z: -0.35 - aire * 1.4 }
        bD = { x: 0, z: 0.35 + aire * 1.4 }
        break
      }
      case 'celebrar': {
        const ola = Math.sin(t * 9)
        y = Math.abs(Math.sin(t * 4.5)) * 0.22
        bI = { x: 0, z: -2.5 - ola * 0.3 }
        bD = { x: 0, z: 2.5 - ola * 0.3 }
        cabZ = Math.sin(t * 4.5) * 0.12
        rotZ = Math.sin(t * 4.5) * 0.06
        pI = Math.max(0, Math.sin(t * 4.5)) * 0.3
        pD = Math.max(0, -Math.sin(t * 4.5)) * 0.3
        break
      }
      case 'estudiando':
        bI = { x: -1.15, z: 0.25 }
        bD = { x: -1.15, z: -0.25 }
        cabX = 0.22 + Math.sin(t * 0.8) * 0.03
        cabZ = Math.sin(t * 0.5) * 0.05
        break
      case 'descansando':
        y = 0.16
        rotX = 0.12
        aplasta = Math.sin(t * 1.1) * 0.02
        pI = pD = -1.35
        bI = { x: -0.7, z: 0.2 }
        bD = { x: -0.7, z: -0.2 }
        cabX = 0.32
        cabZ = 0.22
        break
      case 'saludar':
        bI = { x: -0.35, z: -2.15 + Math.sin(t * 8) * 0.4 }
        cabZ = 0.1
        y = Math.sin(t * 2.4) * 0.02
        break
    }

    // La expresión también mueve la cabeza.
    if (expresion === 'curiosa') cabZ += 0.16
    if (expresion === 'triste') cabX += 0.14
    if (expresion === 'sorprendida') cabX -= 0.1
    if (expresion === 'emocionada' && animacion === 'reposo') y += Math.max(0, Math.sin(t * 5)) ** 4 * 0.12

    const r = raiz.current
    if (r) {
      r.position.y = hacia(r.position.y, y, 18)
      r.rotation.x = hacia(r.rotation.x, rotX + viaje.current.y * 0.25, 10)
      r.rotation.y = hacia(r.rotation.y, -0.42 + giro + viaje.current.x * 0.75, 10)
      r.rotation.z = hacia(r.rotation.z, rotZ, 10)
    }
    if (cuerpo.current) cuerpo.current.scale.set(1 - aplasta * 0.6, 1 + aplasta, 1 - aplasta * 0.6)
    if (cabeza.current) {
      cabeza.current.rotation.x = hacia(cabeza.current.rotation.x, cabX)
      cabeza.current.rotation.z = hacia(cabeza.current.rotation.z, cabZ)
      cabeza.current.rotation.y = hacia(cabeza.current.rotation.y, viaje.current.x * 0.35)
    }
    const brazos: [RefObject<THREE.Group | null>, { x: number; z: number }][] = [[brazoI, bI], [brazoD, bD]]
    for (const [b, v] of brazos) {
      if (!b.current) continue
      b.current.rotation.x = hacia(b.current.rotation.x, v.x, 12)
      b.current.rotation.z = hacia(b.current.rotation.z, v.z, 12)
    }
    if (piernaI.current) piernaI.current.rotation.x = hacia(piernaI.current.rotation.x, pI, 14)
    if (piernaD.current) piernaD.current.rotation.x = hacia(piernaD.current.rotation.x, pD, 14)

    // Orejas: un movimiento de vez en cuando; caídas si duerme o está triste, paradas si se sorprende.
    const caida = expresion === 'dormida' || expresion === 'triste' ? 0.45 : expresion === 'sorprendida' || expresion === 'emocionada' ? -0.2 : 0
    const tic = t % 5 > 4.7 ? Math.sin(t * 40) * 0.2 : 0
    if (orejaI.current) orejaI.current.rotation.z = hacia(orejaI.current.rotation.z, 0.95 + caida + tic, 12)
    if (orejaD.current) orejaD.current.rotation.z = hacia(orejaD.current.rotation.z, -0.95 - caida - tic, 12)

    // Parpadeo
    const abre = t % 4.2 > 4.06 ? 0.1 : 1
    for (const o of ojos.current) if (o) o.scale.y = hacia(o.scale.y, abre, 30)
    if (boca.current) {
      const s = habla ? 0.55 + Math.abs(Math.sin(t * 13)) * 0.9 : 1
      boca.current.scale.y = hacia(boca.current.scale.y, s, 25)
    }
    if (lagrimas.current) {
      const f = (t % 1.6) / 1.6
      lagrimas.current.position.y = -f * 0.12
      lagrimas.current.scale.setScalar(f < 0.85 ? 1 : 1 - (f - 0.85) / 0.15)
    }
    if (pagina.current) pagina.current.rotation.y = t % 4 > 3.3 ? -((t % 4) - 3.3) / 0.7 * Math.PI : 0
    if (chispas.current) {
      const rapido = animacion === 'celebrar'
      chispas.current.rotation.y = t * (rapido ? 1.6 : 0.5)
      chispas.current.position.y = rapido ? 1.1 + Math.sin(t * 3) * 0.15 : 1.25
      chispas.current.children.forEach((c, i) => c.rotation.set(t * 2 + i, t * 3, 0))
    }
    if (sombra.current) {
      const s = 1 - Math.min(0.5, (raiz.current?.position.y ?? 0) * 0.8)
      sombra.current.scale.set(s, s, s)
    }
  })

  const panuelo = nivel === 2 ? '#f08a7a' : '#e8553f'

  return (
    <group>
      {/* sombra suave en el piso */}
      <mesh ref={sombra} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <circleGeometry args={[0.6, 32]} />
        <meshBasicMaterial color="#5a3a4a" transparent opacity={0.16} depthWrite={false} />
      </mesh>

      {conTronco && (
        <group position={[0, 0.17, 0.05]}>
          <mesh rotation={[0, 0, Math.PI / 2]} material={mat(C.cafe, 0.95)}>
            <cylinderGeometry args={[0.19, 0.2, 1.3, 20]} />
          </mesh>
          {[-1, 1].map((l) => (
            <mesh key={l} position={[l * 0.651, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mat('#d9b382', 0.9)}>
              <cylinderGeometry args={[0.17, 0.17, 0.01, 20]} />
            </mesh>
          ))}
          <Hoja p={[0.4, 0.17, 0.08]} rot={[0, 0, -0.6]} />
        </group>
      )}

      <group ref={raiz}>
        {/* capa (nivel 4): media campana detrás del cuerpo */}
        {nivel === 4 && (
          <group position={[0, 0.58, -0.02]}>
            <mesh material={mat('#b48be0', 0.7)}>
              <cylinderGeometry args={[0.36, 0.66, 0.92, 32, 1, true, Math.PI / 2 + 0.35, Math.PI * 2 - 0.7 - Math.PI]} />
            </mesh>
            <mesh position={[0, -0.44, 0]} material={mat(C.dorado, 0.35, 0.2)}>
              <cylinderGeometry args={[0.665, 0.67, 0.05, 32, 1, true, Math.PI / 2 + 0.35, Math.PI * 2 - 0.7 - Math.PI]} />
            </mesh>
          </group>
        )}

        <Mochila nivel={nivel} />

        {/* piernas */}
        {([[-1, piernaI], [1, piernaD]] as const).map(([l, ref]) => (
          <group key={l} ref={ref} position={[l * 0.2, 0.38, 0.02]}>
            <Bola p={[0, -0.13, 0]} s={[0.15, 0.17, 0.15]} color={C.lanaSombra} />
            <Bola p={[0, -0.3, 0.03]} s={[0.13, 0.08, 0.16]} color={C.cafe} rugosidad={0.6} />
          </group>
        ))}

        {/* cuerpo lanudo */}
        <group ref={cuerpo} position={[0, 0.7, 0]}>
          <Lana c={[0, 0, 0]} r={[0.47, 0.42, 0.42]} n={80} bolita={0.1} />
        </group>

        {nivel >= 3 && (
          // poncho verde (nivel 3) o capa corta dorada encima (nivel 4 lleva pañuelo rojo)
          nivel === 3 ? (
            <group position={[0, 0.9, 0]}>
              <mesh material={mat('#7cc79a', 0.8)}>
                <cylinderGeometry args={[0.36, 0.58, 0.34, 32, 1, true]} />
              </mesh>
              <mesh position={[0, -0.17, 0]} material={mat('#5fae7f', 0.8)}>
                <cylinderGeometry args={[0.585, 0.6, 0.04, 32, 1, true]} />
              </mesh>
              <Flor p={[0.22, -0.02, 0.48]} s={1} color="#ff9bb8" rot={[-0.4, 0.4, 0]} />
              <Flor p={[-0.25, -0.06, 0.46]} s={0.8} color="#ffd1e0" rot={[-0.4, -0.4, 0]} />
            </group>
          ) : null
        )}
        {nivel !== 3 && <Panuelo color={panuelo} />}
        {nivel === 4 && (
          // medalla dorada (brújula)
          <group position={[0, 0.78, 0.45]}>
            <mesh rotation={[Math.PI / 2 - 0.25, 0, 0]} material={mat(C.dorado, 0.3, 0.25)}>
              <cylinderGeometry args={[0.09, 0.09, 0.025, 24]} />
            </mesh>
            <mesh position={[0, 0.005, 0.014]} rotation={[Math.PI / 2 - 0.25, 0, 0]} material={mat('#fff4d0', 0.4)}>
              <cylinderGeometry args={[0.065, 0.065, 0.02, 24]} />
            </mesh>
          </group>
        )}

        {/* brazos */}
        {([[-1, brazoI], [1, brazoD]] as const).map(([l, ref]) => (
          <group key={l} ref={ref} position={[l * 0.44, 0.92, 0.1]} rotation={[0, 0, l * 0.35]}>
            <Bola p={[0, -0.16, 0]} s={[0.115, 0.19, 0.115]} />
            <Bola p={[0, -0.33, 0.02]} s={0.08} color={C.cafe} rugosidad={0.6} />
            {l === 1 && conBaston && (
              <group position={[0, -0.33, 0.06]} rotation={[0, 0, -0.35]}>
                <mesh position={[0, -0.08, 0]} material={mat(C.cafe, 0.8)}>
                  <cylinderGeometry args={[0.022, 0.026, 1.1, 10]} />
                </mesh>
                <Bola p={[0, 0.48, 0]} s={0.04} color={C.cafeClaro} rugosidad={0.6} />
              </group>
            )}
          </group>
        ))}

        {conLibro && (
          <group ref={libro} position={[0, 0.72, 0.52]} rotation={[-0.75, 0, 0]}>
            {[-1, 1].map((l) => (
              <group key={l} rotation={[0, l * 0.3, 0]}>
                <mesh position={[l * 0.14, 0, 0]} material={mat('#5b7fd6', 0.7)}>
                  <boxGeometry args={[0.28, 0.36, 0.02]} />
                </mesh>
                <mesh position={[l * 0.135, 0, 0.015]} material={mat('#fffaf0', 0.9)}>
                  <boxGeometry args={[0.25, 0.33, 0.015]} />
                </mesh>
              </group>
            ))}
            <mesh ref={pagina} position={[0, 0, 0.03]} material={mat('#fff4e2', 0.9)}>
              <boxGeometry args={[0.005, 0.32, 0.005]} />
            </mesh>
          </group>
        )}

        {/* cabeza */}
        <group ref={cabeza} position={[0, 1.0, 0.02]}>
          <Lana c={[0, 0.55, 0]} r={[0.56, 0.5, 0.48]} n={110} bolita={0.115} saltar={([x, y, z]) => z > 0.1 && y < 0.16 && Math.abs(x) < 0.42} />
          {/* mechón rosado */}
          <Bola p={[-0.06, 1.0, 0.14]} s={0.1} color={C.mechon} />
          <Bola p={[0.05, 1.04, 0.1]} s={0.11} color={C.mechon} />
          <Bola p={[0, 0.98, 0.22]} s={0.08} color={C.mechon} />
          {([[-1, orejaI], [1, orejaD]] as const).map(([l, ref]) => (
            <group key={l} ref={ref} position={[l * 0.42, 0.85, 0.02]} rotation={[0, 0, -l * 0.95]}>
              <Bola p={[0, 0.12, 0]} s={[0.075, 0.14, 0.05]} />
              <Bola p={[0, 0.12, 0.03]} s={[0.04, 0.1, 0.03]} color={C.rosa} />
            </group>
          ))}
          <Cara expresion={expresion} ojos={ojos} boca={boca} lagrimas={lagrimas} habla={habla} />
          {nivel >= 3 && (
            <group position={[0, 0.98, 0]} rotation={[-0.2, 0, 0]}>
              {Array.from({ length: nivel === 3 ? 11 : 4 }, (_, i) => {
                // nivel 3: corona completa; nivel 4: un ramito al costado
                const a = nivel === 3 ? (i / 11) * Math.PI * 2 : -0.5 + i * 0.32
                const rx = 0.42
                const pos: V3 = [Math.sin(a) * rx, Math.cos(a * 2) * 0.03, Math.cos(a) * rx * 0.9]
                const colores = ['#ff9bb8', '#ffd1e0', '#fff', '#ffb38a', '#c7a6ff']
                return (
                  <group key={i}>
                    <Flor p={pos} s={nivel === 3 ? 1.15 : 1.25} color={colores[i % colores.length]} rot={[-0.5, a, 0]} />
                    {i % 2 === 0 && <Hoja p={[pos[0] * 1.05, pos[1] - 0.04, pos[2] * 1.05]} rot={[-0.6, a, 0.9]} s={0.8} />}
                  </group>
                )
              })}
            </group>
          )}
        </group>
      </group>

      {(nivel === 4 || animacion === 'celebrar') && <Chispas cantidad={nivel === 4 ? 7 : 6} radio={0.95} alto={1.25} rapido={animacion === 'celebrar'} refGrupo={chispas} />}
    </group>
  )
}
