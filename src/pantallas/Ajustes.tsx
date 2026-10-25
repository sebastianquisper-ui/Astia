import { useRef, useState } from 'react'
import { useAjustes } from '../ajustes/AjustesProvider'
import { useDatos } from '../datos/DatosProvider'
import { borrarTodoYReiniciar } from '../datos/reiniciar'
import { importarRespaldo, type Importacion } from '../datos/respaldo'
import { ETAPAS, MAX_SEMANAS, MIN_SEMANAS } from '../lib/etapa'
import { semanaDelCiclo } from '../lib/fechas'
import { usePeriodo } from '../ajustes/usePeriodo'
import { Hoja } from '../ui/Hoja'
import type { ModoTema, TamanoLetra } from '../lib/tema'
import { Icono } from '../ui/Icono'
import { useAviso } from '../ui/Aviso'
import { useCuenta } from '../cuenta/CuentaProvider'

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
  const { etapa, minuscula } = usePeriodo()
  const cuenta = useCuenta()
  const [semanas, setSemanas] = useState(String(perfil.semanasCiclo))
  const [borrando, setBorrando] = useState(false)
  const [vaciando, setVaciando] = useState(false)
  const vaciar = async () => {
    setVaciando(true)
    try {
      await borrarTodoYReiniciar(cuenta.sync ? () => cuenta.sync!.borrarTodo() : undefined)
    } catch {
      setVaciando(false)
      avisar('No pude borrar lo de tu cuenta (¿sin internet?). No se borró nada: inténtalo con conexión.', 'error', { duracion: 7000 })
    }
  }
  const [pendiente, setPendiente] = useState<Extract<Importacion, { ok: true }> | null>(null)
  const archivo = useRef<HTMLInputElement>(null)
  // En la vista previa web no se pueden descargar archivos: solo se ofrece "Copiar"
  const esVista = import.meta.env.VITE_VISTA === '1'
  const semanaActual = semanaDelCiclo(perfil.inicioCiclo, new Date())

  const guardarSemanas = () => {
    const n = Math.min(MAX_SEMANAS, Math.max(MIN_SEMANAS, parseInt(semanas, 10) || etapa.semanas))
    setSemanas(String(n))
    if (n !== perfil.semanasCiclo) {
      guardarPerfil({ semanasCiclo: n })
      avisar('Semanas guardadas.')
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
    if (limpio !== ajustes.nombre) {
      cambiar({ nombre: limpio })
      avisar(limpio ? 'Nombre guardado.' : 'Listo, ya no uso tu nombre.')
    }
  }

  return (
    <section className="pantalla">
      <button className="volver" onClick={alVolver}>
        <Icono nombre="izquierda" /> Más
      </button>
      <h1 className="titulo">Ajustes</h1>

      <div className="campo">
        <span className="etiqueta">Tu cuenta</span>
        {cuenta.local ? (
          <p className="nota">Vista previa: sin cuenta. Con la app publicada, aquí entras con tu cuenta de Google.</p>
        ) : (
          <>
            <p>{cuenta.usuario?.nombre} · {cuenta.usuario?.correo}</p>
            <button className="btn suave" style={{ marginTop: 8 }} onClick={() => void cuenta.salir()}>Cerrar sesión</button>
            <p className="nota">Una sola cuenta para tus estudios, Mi Órbita y Finanstia.</p>
          </>
        )}
      </div>

      <div className="campo">
        <label htmlFor="nombre">Tu nombre</label>
        <input
          id="nombre"
          type="text"
          placeholder="Opcional"
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
        <span className="etiqueta" id="et-3d">Alpi en 3D</span>
        <div className="seg" role="group" aria-labelledby="et-3d">
          <button aria-pressed={ajustes.alpi3d !== false} onClick={() => cambiar({ alpi3d: true })}>Sí</button>
          <button aria-pressed={ajustes.alpi3d === false} onClick={() => cambiar({ alpi3d: false })}>Dibujada</button>
        </div>
        <p className="nota">En 3D se mueve, reacciona y se transforma. Dibujada gasta menos batería.</p>
      </div>

      <div className="campo">
        <span className="etiqueta" id="et-vista">Descanso de la vista (20-20-20)</span>
        <div className="seg" role="group" aria-labelledby="et-vista">
          <button aria-pressed={ajustes.descansoVista !== false} onClick={() => cambiar({ descansoVista: true })}>Sí</button>
          <button aria-pressed={ajustes.descansoVista === false} onClick={() => cambiar({ descansoVista: false })}>No</button>
        </div>
        <p className="nota">Cada 20 minutos con Astia abierta te recuerda mirar algo a 6 metros durante 20 segundos. Cuida tus ojos al estudiar.</p>
      </div>

      <div className="campo">
        <span className="etiqueta" id="et-demo">Datos de ejemplo</span>
        <div className="seg" role="group" aria-labelledby="et-demo">
          <button aria-pressed={ajustes.datosEjemplo} onClick={() => cambiar({ datosEjemplo: true })}>Mostrar</button>
          <button aria-pressed={!ajustes.datosEjemplo} onClick={() => cambiar({ datosEjemplo: false })}>Ocultar</button>
        </div>
        <p className="nota">Cursos, clases y tareas inventados para ver cómo luce Astia. Tus datos reales se guardan en tu cuenta.</p>
      </div>

      <div className="campo">
        <span className="etiqueta" id="et-etapa">Mi etapa de estudios</span>
        <div className="seg" role="group" aria-labelledby="et-etapa">
          {ETAPAS.map((e) => (
            <button key={e.id} aria-pressed={etapa.id === e.id} onClick={() => cambiar({ etapa: e.id, periodo: undefined })}>{e.nombre}</button>
          ))}
        </div>
        <p className="nota">{etapa.ayuda}</p>
      </div>
      <div className="campo">
        <label htmlFor="aj-periodo">Cómo llamas a tu periodo</label>
        <input id="aj-periodo" type="text" value={ajustes.periodo ?? ''} placeholder={etapa.periodo} maxLength={20} onChange={(e) => cambiar({ periodo: e.target.value })} />
      </div>

      <div className="campo">
        <label htmlFor="aj-inicio">Inicio del {minuscula}</label>
        <input id="aj-inicio" type="date" value={perfil.inicioCiclo} onChange={(e) => guardarPerfil({ inicioCiclo: e.target.value })} />
        <p className="nota">
          {semanaActual === null
            ? `Con la fecha de inicio, Astia sabe en qué semana del ${minuscula} estás.`
            : semanaActual < 1
              ? `Tu ${minuscula} aún no empieza.`
              : semanaActual > perfil.semanasCiclo
                ? `Tu ${minuscula} ya terminó.`
                : `Hoy estás en la semana ${semanaActual} de ${perfil.semanasCiclo}.`}
        </p>
      </div>
      <div className="campo">
        <label htmlFor="aj-semanas">Semanas del {minuscula}</label>
        <input id="aj-semanas" type="number" inputMode="numeric" min={MIN_SEMANAS} max={MAX_SEMANAS} value={semanas} onChange={(e) => setSemanas(e.target.value)} onBlur={guardarSemanas} />
      </div>

      <div className="campo">
        <span className="etiqueta">Respaldo</span>
        <div className="acciones" style={{ marginTop: 0 }}>
          <button className="btn suave" onClick={() => archivo.current?.click()}>Importar</button>
          {!esVista && <button className="btn suave" onClick={descargar}>Descargar</button>}
          <button className="btn suave" onClick={copiar}>Copiar</button>
        </div>
        <input ref={archivo} id="archivo-respaldo" type="file" accept=".json,application/json" hidden onChange={elegirArchivo} aria-label="Archivo de respaldo" />
        <p className="nota">Importa el respaldo de Astia v1 (Ajustes → Descargar respaldo) o uno de esta versión. {esVista ? 'En esta vista previa no se pueden descargar archivos: usa "Copiar".' : 'Si tu navegador no descarga archivos, usa "Copiar".'}</p>
      </div>

      <div className="campo">
        <span className="etiqueta">Empezar de cero</span>
        <button className="btn suave" onClick={() => setBorrando(true)}>Borrar todos mis datos</button>
        <p className="nota">Borra cursos, clases, tareas, hábitos, rutinas, fotos de evidencia y ajustes de este teléfono. Astia queda como recién instalada. Tus finanzas en la nube no se tocan; el PIN de Finanstia sí se borra de este teléfono y lo creas de nuevo.</p>
      </div>

      <Hoja titulo="¿Borrar todo?" abierta={borrando} alCerrar={() => setBorrando(false)}>
        <p>
          Se borran tus cursos, tareas, hábitos, recordatorios y apuntes de este teléfono{cuenta.sync ? ' y también de tu cuenta' : ''}, y no se puede deshacer.
          Tus movimientos de Finanstia no se tocan. Si quieres conservar lo demás, descarga o copia un respaldo antes.
        </p>
        <div className="acciones">
          <button className="btn suave" onClick={() => setBorrando(false)}>Cancelar</button>
          <button className="btn" disabled={vaciando} onClick={() => void vaciar()}>{vaciando ? 'Borrando…' : 'Sí, borrar todo'}</button>
        </div>
      </Hoja>

      <Hoja titulo="Importar respaldo" abierta={pendiente !== null} alCerrar={() => setPendiente(null)}>
        {pendiente && (
          <div>
            <p>
              Respaldo de Astia v{pendiente.version}. Trae <b>{pendiente.resumen.cursos}</b> cursos, <b>{pendiente.resumen.clases}</b> clases,{' '}
              <b>{pendiente.resumen.tareasPendientes}</b> tareas pendientes y <b>{pendiente.resumen.tareasHechas}</b> hechas
              {pendiente.resumen.semanas ? <>, <b>{pendiente.resumen.semanas}</b> semanas con tema</> : null}
              {pendiente.resumen.habitos ? <>, <b>{pendiente.resumen.habitos}</b> hábitos</> : null}
              {pendiente.resumen.rutinas ? <> y <b>{pendiente.resumen.rutinas}</b> rutinas</> : null}.
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
