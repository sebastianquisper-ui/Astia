// Iconos de línea (los mismos de la v1, ahora en un solo lugar).
const TRAZOS = {
  hoy: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/>',
  semana: '<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  cursos: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3"/>',
  tareas: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="m8 12 3 3 5-6"/>',
  mas: '<circle cx="6" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18" cy="12" r="1.6"/>',
  izquierda: '<path d="m14 6-6 6 6 6"/>',
  derecha: '<path d="m10 6 6 6-6 6"/>',
  reloj: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>',
  calendario: '<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4M8 14h2M14 14h2"/>',
  ciclo: '<path d="M4 6h16M4 12h10M4 18h13"/>',
  progreso: '<path d="M5 20V10M12 20V4M19 20v-7"/>',
  metas: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
  enfoque: '<path d="M13 3 5 13.5h6L10 21l8-10.5h-6z"/>',
  ajustes: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',
  mejora: '<path d="M4 5h16v11H9l-5 4z"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  orbita: '<circle cx="12" cy="12" r="2.2"/><ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(-30 12 12)"/>',
} as const

export type NombreIcono = keyof typeof TRAZOS

export function Icono({ nombre, tam = 22 }: { nombre: NombreIcono; tam?: number }) {
  return (
    <svg
      width={tam}
      height={tam}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: TRAZOS[nombre] }}
    />
  )
}

export function Estrella({ tam = 22 }: { tam?: number }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.5 14.7 8.5 21.2 9.2 16.3 13.6 17.7 20 12 16.7 6.3 20 7.7 13.6 2.8 9.2 9.3 8.5z" />
    </svg>
  )
}
