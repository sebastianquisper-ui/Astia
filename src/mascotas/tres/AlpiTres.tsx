import { Canvas, useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import type { Animo } from '../../lib/avatar'

// Alpi en 3D de verdad: está armada con formas de Three.js (sin archivos de modelo), así que
// funciona sin internet. Cada parte es un grupo que se mueve aparte: cabeza, orejas, cola, cuello...

export interface PropsTres {
  /** 1 = cría, 2 = exploradora, 3 = legendaria. */
  etapa: number
  animo: Animo
  habla: boolean
  saltando: boolean
  /** Hacia dónde tocas, de -1 a 1 (null si no estás tocando). */
  inclina: { x: number; y: number } | null
}

const LANA = '#fff1dc'
const LANA_SOMBRA = '#f1d6b6'
const ROSA = '#f5a9b2'
const TINTA = '#3d2b40'
const MEJILLA = '#ffa9a3'

type Vec = [number, number, number]

function Bola({ p, s, color = LANA, rugosidad = 0.9 }: { p: Vec; s: Vec | number; color?: string; rugosidad?: number }) {
  return (
    <mesh position={p} scale={s}>
      <sphereGeometry args={[1, 28, 20]} />
      <meshStandardMaterial color={color} roughness={rugosidad} />
    </mesh>
  )
}

function Oreja({ lado, grupo }: { lado: -1 | 1; grupo: React.RefObject<THREE.Group | null> }) {
  return (
    <group ref={grupo} position={[lado * 0.32, 0.4, -0.02]} rotation={[0, 0, -lado * 0.5]}>
      <mesh position={[0, 0.2, 0]} scale={[0.62, 1, 0.45]}>
        <capsuleGeometry args={[0.15, 0.16, 6, 14]} />
        <meshStandardMaterial color={LANA} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.2, 0.05]} scale={[0.34, 0.8, 0.3]}>
        <capsuleGeometry args={[0.14, 0.12, 6, 14]} />
        <meshStandardMaterial color={ROSA} roughness={0.9} />
      </mesh>
    </group>
  )
}

function Flor({ p, s = 1, color = '#ff9bb8' }: { p: Vec; s?: number; color?: string }) {
  return (
    <group position={p} scale={s}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Bola key={i} p={[Math.sin((i / 5) * Math.PI * 2) * 0.065, Math.cos((i / 5) * Math.PI * 2) * 0.065, 0]} s={0.058} color={color} rugosidad={0.6} />
      ))}
      <Bola p={[0, 0, 0.02]} s={0.045} color="#ffd35a" rugosidad={0.6} />
    </group>
  )
}

function Modelo({ etapa, animo, habla, saltando, inclina }: PropsTres) {
  const raiz = useRef<THREE.Group>(null)
  const cuerpo = useRef<THREE.Group>(null)
  const cuello = useRef<THREE.Group>(null)
  const cabeza = useRef<THREE.Group>(null)
  const orejaI = useRef<THREE.Group>(null)
  const orejaD = useRef<THREE.Group>(null)
  const cola = useRef<THREE.Group>(null)
  const ojoI = useRef<THREE.Group>(null)
  const ojoD = useRef<THREE.Group>(null)
  const boca = useRef<THREE.Mesh>(null)
  const salto = useRef(0)
  const viaje = useRef({ x: 0, y: 0 })

  const cria = etapa === 1
  const escala = cria ? 0.88 : 1
  const durmiendo = animo === 'durmiendo'
  const contenta = animo === 'contenta'
  const alerta = animo === 'alerta'

  useFrame((estado, dt) => {
    const t = estado.clock.elapsedTime
    const d = Math.min(dt, 0.05)
    const suave = (a: number, b: number, k = 8) => THREE.MathUtils.damp(a, b, k, d)
    if (saltando && salto.current <= 0) salto.current = 1
    if (salto.current > 0) salto.current = Math.max(0, salto.current - d / 0.56)
    const arco = Math.sin((1 - salto.current) * Math.PI) * (salto.current > 0 ? 1 : 0)

    const objetivo = inclina ?? { x: 0, y: 0 }
    viaje.current.x = suave(viaje.current.x, objetivo.x, 10)
    viaje.current.y = suave(viaje.current.y, objetivo.y, 10)

    const r = raiz.current
    if (r) {
      const hop = contenta ? Math.max(0, Math.sin(t * 2.6)) ** 6 * 0.12 : 0
      r.position.y = arco * 0.55 + hop
      r.rotation.y = viaje.current.x * 0.7 + Math.sin(t * 0.6) * 0.05
      r.rotation.x = viaje.current.y * 0.3
      r.rotation.z = alerta ? Math.sin(t * 40) * 0.025 : Math.sin(t * 1.2) * 0.012
    }
    const resp = Math.sin(t * (durmiendo ? 1.2 : 2.2)) * (durmiendo ? 0.02 : 0.014)
    if (cuerpo.current) cuerpo.current.scale.set(1 + resp, 1 - resp * 0.8 - arco * 0.08 + (salto.current > 0.85 ? -0.1 : 0), 1 + resp)
    if (cuello.current) cuello.current.rotation.x = suave(cuello.current.rotation.x, durmiendo ? 0.3 : alerta ? -0.12 : Math.sin(t * 1.1) * 0.03)
    if (cabeza.current) {
      cabeza.current.rotation.y = suave(cabeza.current.rotation.y, viaje.current.x * 0.5 + (durmiendo ? 0 : Math.sin(t * 0.8) * 0.1))
      cabeza.current.rotation.x = suave(cabeza.current.rotation.x, durmiendo ? 0.35 : viaje.current.y * 0.25 - (contenta ? 0.1 : 0))
      cabeza.current.rotation.z = suave(cabeza.current.rotation.z, contenta ? Math.sin(t * 5) * 0.08 : durmiendo ? 0.08 : 0)
    }
    const parpadeo = durmiendo ? 0 : (t % 4.6) > 4.46 ? 0.1 : 1
    for (const o of [ojoI.current, ojoD.current]) if (o) o.scale.y = suave(o.scale.y, parpadeo, 30)
    if (orejaI.current && orejaD.current) {
      const pico = (t % 6) > 5.7 ? Math.sin(t * 40) * 0.14 : 0
      const base = alerta ? 0.25 : durmiendo ? 0.85 : 0.5
      orejaI.current.rotation.z = suave(orejaI.current.rotation.z, -(-base) + pico + (contenta ? Math.sin(t * 6) * 0.1 : 0))
      orejaD.current.rotation.z = suave(orejaD.current.rotation.z, -base - pico - (contenta ? Math.sin(t * 6 + 1) * 0.1 : 0))
    }
    if (cola.current) cola.current.rotation.z = Math.sin(t * (contenta ? 9 : 2.4)) * (contenta ? 0.5 : 0.18)
    if (boca.current) boca.current.scale.y = habla ? 0.05 + Math.abs(Math.sin(t * 14)) * 0.07 : contenta ? 0.1 : 0.03
  })

  const ojo = (lado: -1 | 1, refOjo: React.RefObject<THREE.Group | null>) => {
    const x = lado * 0.2
    if (contenta || durmiendo) {
      return (
        <mesh key={lado} position={[x, 0.07, 0.4]} rotation={[0, 0, durmiendo ? Math.PI : 0]}>
          <torusGeometry args={[0.065, 0.017, 8, 18, Math.PI]} />
          <meshStandardMaterial color={TINTA} roughness={0.5} />
        </mesh>
      )
    }
    const g = alerta ? 1.2 : 1
    return (
      <group key={lado} ref={refOjo} position={[x, 0.07, 0.395]}>
        <mesh scale={[0.075 * g, 0.1 * g, 0.045]}>
          <sphereGeometry args={[1, 22, 16]} />
          <meshStandardMaterial color={TINTA} roughness={0.25} />
        </mesh>
        <mesh position={[-0.022, 0.035, 0.04]} scale={[0.026, 0.03, 0.015]}>
          <sphereGeometry args={[1, 12, 10]} />
          <meshBasicMaterial color="#fff" />
        </mesh>
        <mesh position={[0.02, -0.03, 0.04]} scale={[0.012, 0.014, 0.01]}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshBasicMaterial color="#fff" />
        </mesh>
      </group>
    )
  }

  return (
    <group ref={raiz} scale={escala} position={[0, 0, 0]}>
      {/* cola */}
      <group ref={cola} position={[0, 0.78, -0.52]}>
        <Bola p={[0, 0, 0]} s={0.16} color={LANA_SOMBRA} />
        <Bola p={[0, 0.08, -0.05]} s={0.11} />
      </group>

      {/* patas */}
      {[-0.27, 0.27].flatMap((x) => [0.28, -0.3].map((z) => (
        <group key={`${x}${z}`} position={[x, 0.36, z]}>
          <mesh position={[0, -0.02, 0]}>
            <capsuleGeometry args={[0.15, 0.1, 6, 12]} />
            <meshStandardMaterial color={LANA_SOMBRA} roughness={0.9} />
          </mesh>
          <Bola p={[0, -0.14, 0.04]} s={[0.17, 0.09, 0.2]} color="#b98474" />
        </group>
      )))}

      {/* mochila (etapa 2 y 3) */}
      {etapa >= 2 && (
        <group position={[0, 0.98, -0.5]}>
          <Bola p={[0, 0, 0]} s={[0.34, 0.38, 0.2]} color="#6fcab6" />
          <Bola p={[0, -0.08, 0.15]} s={[0.24, 0.17, 0.06]} color="#a1e4d4" />
          <Bola p={[0, 0.1, 0.12]} s={[0.3, 0.07, 0.07]} color="#58b4a0" />
        </group>
      )}

      {/* cuerpo lanudo */}
      <group ref={cuerpo} position={[0, 0.82, 0]}>
        <Bola p={[0, 0, 0]} s={[0.62, 0.52, 0.56]} />
        <Bola p={[-0.34, 0.16, 0.1]} s={[0.3, 0.3, 0.3]} />
        <Bola p={[0.34, 0.16, 0.1]} s={[0.3, 0.3, 0.3]} />
        <Bola p={[-0.3, -0.16, 0.22]} s={[0.28, 0.25, 0.26]} />
        <Bola p={[0.3, -0.16, 0.22]} s={[0.28, 0.25, 0.26]} />
        <Bola p={[0, -0.1, 0.42]} s={[0.3, 0.3, 0.12]} color="#ffe8d3" />
        <Bola p={[0, 0.3, -0.15]} s={[0.4, 0.28, 0.35]} />
      </group>

      {/* cuello + cabeza */}
      <group ref={cuello} position={[0, 1.04, 0.1]}>
        <mesh position={[0, 0.26, 0]}>
          <capsuleGeometry args={[0.26, 0.3, 8, 16]} />
          <meshStandardMaterial color={LANA} roughness={0.9} />
        </mesh>
        <Bola p={[-0.17, 0.3, 0.1]} s={0.2} />
        <Bola p={[0.17, 0.4, 0.1]} s={0.2} />
        <Bola p={[0, 0.2, 0.2]} s={0.2} />
        {etapa >= 2 && (
          <group position={[0, 0.12, 0.02]} rotation={[Math.PI / 2 - 0.1, 0, 0]}>
            <mesh>
              <torusGeometry args={[0.3, 0.085, 14, 36]} />
              <meshStandardMaterial color={etapa >= 3 ? '#e9b43a' : '#e0675a'} roughness={0.8} />
            </mesh>
            <mesh position={[0.2, 0.2, 0.14]} rotation={[0.2, 0, 0.15]}>
              <capsuleGeometry args={[0.065, 0.3, 6, 12]} />
              <meshStandardMaterial color={etapa >= 3 ? '#e9b43a' : '#e0675a'} roughness={0.8} />
            </mesh>
          </group>
        )}

        <group ref={cabeza} position={[0, 0.7, 0.04]} scale={cria ? 1.38 : 1.22}>
          <Bola p={[0, 0.06, 0]} s={[0.5, 0.46, 0.47]} />
          {/* mechón de la frente */}
          <Bola p={[-0.2, 0.46, 0.04]} s={[0.22, 0.2, 0.22]} />
          <Bola p={[0.02, 0.53, 0.05]} s={[0.25, 0.22, 0.24]} />
          <Bola p={[0.22, 0.45, 0.03]} s={[0.21, 0.19, 0.21]} />
          <Bola p={[0, 0.4, 0.2]} s={[0.2, 0.17, 0.18]} />
          <Oreja lado={-1} grupo={orejaI} />
          <Oreja lado={1} grupo={orejaD} />
          {/* hocico */}
          <Bola p={[0, -0.1, 0.34]} s={[0.26, 0.2, 0.2]} color="#fff7ea" />
          <Bola p={[0, -0.04, 0.5]} s={[0.055, 0.038, 0.03]} color="#a86a6c" rugosidad={0.5} />
          {ojo(-1, ojoI)}
          {ojo(1, ojoD)}
          {[-1, 1].map((l) => (
            <Bola key={l} p={[l * 0.34, -0.04, 0.3]} s={[0.1, 0.055, 0.03]} color={MEJILLA} />
          ))}
          {/* cejas firmes cuando está seria o alerta */}
          {(animo === 'seria' || alerta) &&
            [-1, 1].map((l) => (
              <mesh key={l} position={[l * 0.2, 0.25, 0.38]} rotation={[0, 0, l * (alerta ? 0.5 : 0.28)]}>
                <capsuleGeometry args={[0.014, 0.1, 4, 8]} />
                <meshStandardMaterial color={TINTA} />
              </mesh>
            ))}
          {/* boca */}
          <mesh ref={boca} position={[0, -0.2, 0.46]} scale={[0.07, 0.03, 0.025]}>
            <sphereGeometry args={[1, 16, 12]} />
            <meshStandardMaterial color="#7e3f50" roughness={0.7} />
          </mesh>
          {/* corona de flores (etapa 3) */}
          {etapa >= 3 && (
            <group position={[0, 0.5, 0.02]}>
              {[-0.34, -0.17, 0, 0.17, 0.34].map((x, i) => (
                <Flor key={i} p={[x, -Math.abs(x) * 0.25 + 0.04, 0.2 - Math.abs(x) * 0.12]} s={1.2 - Math.abs(x)} color={['#ff9bb8', '#fff', '#c7a6ff', '#fff', '#ff9bb8'][i]} />
              ))}
            </group>
          )}
        </group>
      </group>
    </group>
  )
}

/** Alpi dentro de un lienzo transparente que ocupa todo el espacio de su marco. */
export default function AlpiTres(props: PropsTres) {
  return (
    <Canvas
      className="tres"
      camera={{ position: [0, 1.4, 6.6], fov: 30 }}
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
      onCreated={({ camera }) => camera.lookAt(0, 1.32, 0)}
    >
      <hemisphereLight args={['#fff6ec', '#e8c9b4', 1.4]} />
      <directionalLight position={[3, 6, 5]} intensity={2.1} />
      <directionalLight position={[-4, 3, -2]} intensity={0.7} color="#ffd5dc" />
      <Modelo {...props} />
    </Canvas>
  )
}
