import { useRef, useState } from 'react'
import { useAjustes } from '../ajustes/AjustesProvider'
import { useDatos } from '../datos/DatosProvider'
import { importarRespaldo, type Importacion } from '../datos/respaldo'
import { semanaDelCiclo } from '../lib/fechas'
import { Hoja } from '../ui/Hoja'
import type { ModoTema, TamanoLetra } from '../lib/tema'
import { Icono } from '../ui/Icono'
import { useAviso } from '../ui/Aviso'

const TEMAS: { id: ModoTema; texto: string }[] = [
  { id: 'hora', texto: 'Automático' },
  { id: 'claro', texto: 'Claro' },
  { id: 'oscuro', texto: 'Oscuro' },
]
const LETRAS: { id: TamanoLetra; texto: string }[] = [
  { id: 'normal', texto: 'Normal' },
  { id: 'grande', texto: 'Grande' },
  { id: 'muy-grande', texto: 'Muy grande' },
]

export function Ajustes({ alVolver }: { alVolver: () => void }) {
  const { ajustes, cambiar } = useAjustes()
  const avisar = useAviso()
  const { perfil, guardarPerfil, importar, exportar, enEjemplo } = useDatos()
  const [nombre, setNombre] = useState(ajustes.nombre)
  const [semanas, setSemanas] = useState(String(perfil.semanasCiclo))
  const [pendiente, setPendiente] = useState<Extract<Importacion, { ok: true }> | null>(null)
  const archivo = useRef<HTMLInputElement>(null)
  const semanaActual = semanaDelCiclo(perfil.inicioCiclo, new Date())

  const guardarSemanas = () => {
    const n = Math.min(24, Math.max(4, parseInt(semanas, 10) || 16))
    setSemanas(String(n))
    if (n !== perfil.semanasCiclo) {
      guardarPerfil({ semanasCiclo: n })
      avisar('Semanas del ciclo guardadas.')
    }
  }

  const elegirArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = '' // permite elegir el mismo archivo otra vez
    if (!f) return
    try {
      const resultado = importarRespaldo(JSON.parse(await f.text()), Date.now())
      if (!resultado.ok) return avisar(resultado.error, 'error')
      setPendiente(resultado)
    } catch {
      avisar('Ese archivo no es un respaldo de Astia.', 'error')
    }
  }

  const confirmarImportacion = () => {
    if (!pendiente) return
    importar(pendiente)
    setNombre(pendiente.ajustes.nombre ?? ajustes.nombre)
    setSemanas(String(pendiente.datos.perfil.semanasCiclo))
    setPendiente(null)
    avisar('Datos importados. Ya puedes usar Astia con lo tuyo.')
  }

  const descargar = () => {
    if (enEjemplo) return avisar('Estás viendo datos de ejemplo: aún no hay nada tuyo que exportar.', 'error')
    try {
      const url = URL.createObjectURL(new Blob([exportar()], { type: 'application/json' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `astia-respaldo-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      avisar('Respaldo descargado. Revisa tus descargas.')
    } catch {
      avisar('No se pudo descargar el respaldo. Prueba con "Copiar".', 'error')
    }
  }

  const copiar = async () => {
    if (enEjemplo) return avisar('Estás viendo datos de ejemplo: aún no hay nada tuyo que exportar.', 'error')
    try {
      await navigator.clipboard.writeText(exportar())
      avisar('Respaldo copiado. Pégalo en una nota o un correo para guardarlo.')
    } catch {
      avisar('No se pudo copiar. Prueba con "Descargar".', 'error')
    }
  }

  const guardarNombre = () => {
    const limpio = nombre.trim()
    if (!limpio) {
      avisar('El nombre no puede estar vacío.', 'error')
      setNombre(ajustes.nombre)
      return
    }
    if (limpio !== ajustes.nombre) {
      cambiar({ nombre: limpio })
      avisar('Nombre guardado.')
    }
  }

  return (
    <section className="pantalla">
      <button className="volver" onClick={alVolver}>
        <Icono nombre="izquierda" /> Más
      </button>
      <h1 className="titulo">Ajustes</h1>

      <div className="campo">
        <label htmlFor="nombre">Tu nombre</label>
        <input
          id="nombre"
          type="text"
          value={nombre}
          autoComplete="given-name"
          onChange={(e) => setNombre(e.target.value)}
          onBlur={guardarNombre}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
      </div>

      <div className="campo">
        <span className="etiqueta" id="et-tema">Tema</span>
        <div className="seg" role="group" aria-labelledby="et-tema">
          {TEMAS.map((t) => (
            <button key={t.id} aria-pressed={ajustes.modoTema === t.id} onClick={() => cambiar({ modoTema: t.id })}>
              {t.texto}
            </button>
          ))}
        </div>
        <p className="nota">Automático: claro de día (6:30 a 18:30) y oscuro de noche.</p>
      </div>

      <div className="campo">
        <span className="etiqueta" id="et-letra">Tamaño de letra</span>
        <div className="seg" role="group" aria-labelledby="et-letra">
          {LETRAS.map((l) => (
            <button key={l.id} aria-pressed={ajustes.tamanoLetra === l.id} onClick={() => cambiar({ tamanoLetra: l.id })}>
              {l.texto}
            </button>
          ))}
        </div>
      </div>

      <div className="campo">
        <span className="etiqueta" id="et-demo">Datos de ejemplo</span>
        <div className="seg" role="group" aria-labelledby="et-demo">
          <button aria-pressed={ajustes.datosEjemplo} onClick={() => cambiar({ datosEjemplo: true })}>Mostrar</button>
          <button aria-pressed={!ajustes.datosEjemplo} onClick={() => cambiar({ datosEjemplo: false })}>Ocultar</button>
        </div>
        <p className="nota">Cursos, clases y tareas inventados para ver cómo luce Astia. Tus datos reales llegan con la base de datos.</p>
      </div>

      <div className="campo">
        <label htmlFor="aj-inicio">Inicio del ciclo</label>
        <input id="aj-inicio" type="date" value={perfil.inicioCiclo} onChange={(e) => guardarPerfil({ inicioCiclo: e.target.value })} />
        <p className="nota">
          {semanaActual === null
            ? 'Con la fecha de inicio, Astia sabe en qué semana del ciclo estás.'
            : semanaActual < 1
              ? 'Tu ciclo aún no empieza.'
              : semanaActual > perfil.semanasCiclo
                ? 'Tu ciclo ya terminó.'
                : `Hoy estás en la semana ${semanaActual} de ${perfil.semanasCiclo}.`}
        </p>
      </div>
      <div className="campo">
        <label htmlFor="aj-semanas">Semanas del ciclo</label>
        <input id="aj-semanas" type="number" inputMode="numeric" min={4} max={24} value={semanas} onChange={(e) => setSemanas(e.target.value)} onBlur={guardarSemanas} />
      </div>

      <div className="campo">
        <span className="etiqueta">Respaldo</span>
        <div className="acciones" style={{ marginTop: 0 }}>
          <button className="btn suave" onClick={() => archivo.current?.click()}>Importar</button>
          <button className="btn suave" onClick={descargar}>Descargar</button>
          <button className="btn suave" onClick={copiar}>Copiar</button>
        </div>
        <input ref={archivo} id="archivo-respaldo" type="file" accept=".json,application/json" hidden onChange={elegirArchivo} aria-label="Archivo de respaldo" />
        <p className="nota">Importa el respaldo de Astia v1 (Ajustes → Descargar respaldo) o uno de esta versión. Si tu navegador no descarga archivos, usa "Copiar".</p>
      </div>

      <Hoja titulo="Importar respaldo" abierta={pendiente !== null} alCerrar={() => setPendiente(null)}>
        {pendiente && (
          <div>
            <p>
              Respaldo de Astia v{pendiente.version}. Trae <b>{pendiente.resumen.cursos}</b> cursos, <b>{pendiente.resumen.clases}</b> clases,{' '}
              <b>{pendiente.resumen.tareasPendientes}</b> tareas pendientes y <b>{pendiente.resumen.tareasHechas}</b> hechas
              {pendiente.resumen.semanas ? <>, <b>{pendiente.resumen.semanas}</b> semanas con tema</> : null}
              {pendiente.resumen.metas ? <>, <b>{pendiente.resumen.metas}</b> metas</> : null}.
            </p>
            {pendiente.avisos.length > 0 && (
              <ul className="avisos-importar">
                {pendiente.avisos.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            )}
            <p className="nota">Esto reemplaza lo que tienes ahora en Astia (los datos de ejemplo se ocultan).</p>
            <div className="acciones">
              <button className="btn suave" onClick={() => setPendiente(null)}>Cancelar</button>
              <button className="btn" onClick={confirmarImportacion}>Reemplazar mis datos</button>
            </div>
          </div>
        )}
      </Hoja>
    </section>
  )
}
