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
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
  calendario: '<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4M8 14h2M14 14h2"/>',
  ciclo: '<path d="M4 6h16M4 12h10M4 18h13"/>',
  progreso: '<path d="M5 20V10M12 20V4M19 20v-7"/>',
  metas: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
  enfoque: '<path d="M13 3 5 13.5h6L10 21l8-10.5h-6z"/>',
  ajustes: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',
  mejora: '<path d="M4 5h16v11H9l-5 4z"/>',
  cerrar: '<path d="m6 6 12 12M18 6 6 18"/>',
  cambiar: '<path d="M7 7h12l-3-3M17 17H5l3 3"/>',
  buscar: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  opciones: '<circle cx="12" cy="5.5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="18.5" r="1.5"/>',
  ojo: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  ojoOff: '<path d="M3 3l18 18M10.6 5.7A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-3.2 3.9M6.7 7.2C4 9 2.5 12 2.5 12s3.5 6.5 9.5 6.5c1.4 0 2.7-.4 3.8-.9M9.9 9.9A3 3 0 0 0 14 14"/>',
  billete: '<rect x="2.5" y="6.5" width="19" height="11" rx="2.5"/><circle cx="12" cy="12" r="2.6"/><path d="M6 10v4M18 10v4"/>',
  mas2: '<path d="M12 5v14M5 12h14"/>',
  deporte: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>',
  salud: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.4A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  mente: '<path d="M3 5.5C5.5 4.5 9 4.5 12 6c3-1.5 6.5-1.5 9-.5V18c-2.5-1-6-1-9 .5-3-1.5-6.5-1.5-9-.5z"/><path d="M12 6v12.5"/>',
  hogar: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/>',
  familia: '<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19c.5-3.2 2.8-5 5.5-5s5 1.8 5.5 5"/><circle cx="17" cy="9.5" r="2.3"/><path d="M16 14.2c2.5-.2 4.5 1.2 5 4.3"/>',
  dinero: '<circle cx="12" cy="12" r="8.5"/><path d="M14.5 9.5c-.5-1-1.5-1.5-2.5-1.5-1.5 0-2.5.8-2.5 1.9 0 2.6 5 1.2 5 3.8 0 1.1-1.1 1.9-2.5 1.9-1.2 0-2.2-.6-2.7-1.6M12 6.5V8M12 16v1.5"/>',
  tramites: '<path d="M7 3.5h7l4 4v13H7z"/><path d="M14 3.5v4h4M9.5 12.5h5M9.5 16h5"/>',
  habitos: '<circle cx="12" cy="12" r="8.5"/><path d="m8.5 12.2 2.5 2.5 4.5-5"/>',
  rutinas: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="m3.5 6 1.2 1.2L7 5M3.5 12l1.2 1.2L7 11M3.5 18l1.2 1.2L7 17"/>',
  fuego: '<path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 .3 1.4 1 2 2 2 0-3-.5-5 1-8z"/>',
  subir: '<path d="M12 19V6m0 0-5 5m5-5 5 5"/>',
  bajar: '<path d="M12 5v13m0 0 5-5m-5 5-5-5"/>',
  play: '<path d="M8 5v14l11-7z"/>',
  mascota: '<circle cx="7" cy="9.5" r="1.8"/><circle cx="12" cy="6.5" r="1.8"/><circle cx="17" cy="9.5" r="1.8"/><path d="M12 11.5c-3 0-5.5 2.6-5.5 5 0 1.4 1.2 2.2 2.6 2.2 1 0 1.8-.5 2.9-.5s1.9.5 2.9.5c1.4 0 2.6-.8 2.6-2.2 0-2.4-2.5-5-5.5-5z"/>',
  candado: '<rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
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
