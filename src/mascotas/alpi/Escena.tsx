import { Canvas } from '@react-three/fiber'
import { Modelo, type PropsModelo } from './Modelo'

/** El lienzo 3D de Alpi: fondo transparente, luces propias (nada se descarga de internet). */
export default function Escena(props: PropsModelo) {
  return (
    <Canvas className="tres" camera={{ position: [0, 1.25, 6.2], fov: 30 }} dpr={[1, 2]} gl={{ alpha: true, antialias: true }} onCreated={({ camera }) => camera.lookAt(0, 1.08, 0)}>
      <hemisphereLight args={['#fff8f0', '#f0cfc0', 1.5]} />
      <directionalLight position={[2.5, 5, 5]} intensity={2.2} />
      <directionalLight position={[-4, 2.5, -3]} intensity={0.9} color="#ffd1dc" />
      <directionalLight position={[0, 2, -5]} intensity={0.6} color="#fff0d0" />
      <Modelo {...props} />
    </Canvas>
  )
}
