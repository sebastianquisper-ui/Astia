import type { Animo } from '../lib/avatar'
import { Avatar } from '../ui/Avatar'
import { MascotaVista } from './MascotaVista'
import { useMascota } from './useMascota'

/** El avatar de Astia en pantalla: tu mascota elegida (en su etapa actual) o la estrella de siempre. */
export function AvatarMascota({ animo, habla = false, tam = 112 }: { animo: Animo; habla?: boolean; tam?: number }) {
  const { mascota, estado } = useMascota()
  if (!mascota || !estado) return <Avatar animo={animo} habla={habla} tam={tam} />
  return <MascotaVista mascota={mascota.id} etapa={estado.indice + 1} animo={animo} habla={habla} tam={tam} nivel={estado.indice + 1} />
}
