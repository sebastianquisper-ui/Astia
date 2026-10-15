import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'
import { aFilas, deFilas, type Filas } from '../src/datos/nube'
import { importarRespaldo } from '../src/datos/respaldo'

// Prueba el esquema SQL de verdad, con un Postgres completo en memoria.
// Se simula lo que Supabase pone de fábrica: el esquema `auth`, `auth.uid()` y el rol `authenticated`.

const ANA = '11111111-1111-1111-1111-111111111111'
const BETO = '22222222-2222-2222-2222-222222222222'
const CARLA = '33333333-3333-3333-3333-333333333333' // usuario limpio para la prueba de ida y vuelta

let db: PGlite

/** Ejecuta una consulta "como" ese usuario (con sus reglas de seguridad). */
async function como<T = Record<string, unknown>>(usuario: string, sql: string, params: unknown[] = []): Promise<T[]> {
  return db.transaction(async (tx) => {
    await tx.exec('set local role authenticated')
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [usuario])
    const r = await tx.query<T>(sql, params)
    return r.rows
  })
}

beforeAll(async () => {
  // Las fechas llegan como texto "AAAA-MM-DD", igual que desde la API de Supabase
  db = new PGlite({ parsers: { 1082: (v: string) => v } })
  await db.exec(`
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create role authenticated nologin;
    create role anon nologin;
  `)
  await db.exec(readFileSync(resolve(process.cwd(), 'supabase/migrations/20261015000000_esquema_inicial.sql'), 'utf8'))
  await db.exec(`insert into auth.users values ('${ANA}'), ('${BETO}'), ('${CARLA}')`)
})

describe('seguridad por usuario (RLS)', () => {
  it('todas las tablas tienen la seguridad activada', async () => {
    const r = await db.query<{ relname: string; relrowsecurity: boolean }>(
      `select relname, relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r' order by relname`,
    )
    expect(r.rows.length).toBeGreaterThanOrEqual(11)
    expect(r.rows.filter((x) => !x.relrowsecurity).map((x) => x.relname)).toEqual([])
  })

  it('cada usuario ve solo lo suyo', async () => {
    await como(ANA, `insert into public.cursos (id, nombre, actualizado_en) values ('c1', 'Cálculo de Ana', 10)`)
    expect(await como(ANA, 'select id from public.cursos')).toHaveLength(1)
    expect(await como(BETO, 'select id from public.cursos')).toHaveLength(0)
  })

  it('user_id se llena solo con el usuario que escribe', async () => {
    const r = await como<{ user_id: string }>(BETO, `insert into public.cursos (id, nombre, actualizado_en) values ('c1', 'Física de Beto', 10) returning user_id`)
    expect(r[0].user_id).toBe(BETO)
    // Mismo id "c1" en dos usuarios: no choca, la clave incluye al usuario
    expect(await como(ANA, `select nombre from public.cursos where id = 'c1'`)).toEqual([{ nombre: 'Cálculo de Ana' }])
  })

  it('nadie puede escribir filas a nombre de otro', async () => {
    await expect(como(BETO, `insert into public.cursos (user_id, id, nombre, actualizado_en) values ('${ANA}', 'robo', 'x', 1)`)).rejects.toThrow(/row-level security/)
  })

  it('nadie puede editar ni borrar lo de otro', async () => {
    const editadas = await como(BETO, `update public.cursos set nombre = 'hackeado' where user_id = '${ANA}' returning id`)
    expect(editadas).toHaveLength(0)
    const borradas = await como(BETO, `delete from public.cursos where user_id = '${ANA}' returning id`)
    expect(borradas).toHaveLength(0)
    expect(await como(ANA, `select nombre from public.cursos where id = 'c1'`)).toEqual([{ nombre: 'Cálculo de Ana' }])
  })

  it('no se puede cambiar el dueño de una fila', async () => {
    await expect(como(ANA, `update public.cursos set user_id = '${BETO}' where id = 'c1'`)).rejects.toThrow(/row-level security/)
  })

  it('sin iniciar sesión (rol anon) no se puede leer nada', async () => {
    await expect(db.transaction(async (tx) => {
      await tx.exec('set local role anon')
      await tx.query('select * from public.tareas')
    })).rejects.toThrow(/permission denied/)
  })
})

describe('el servidor ignora versiones viejas (error 2 de la v1)', () => {
  const insertar = `insert into public.tareas (id, titulo, fecha, actualizado_en) values ('t1', $1, '2026-10-20', $2)
    on conflict (user_id, id) do update set titulo = excluded.titulo, actualizado_en = excluded.actualizado_en`

  it('una escritura más vieja no pisa a una más nueva', async () => {
    await como(ANA, insertar, ['Versión nueva', 200])
    await como(ANA, insertar, ['Versión VIEJA', 100])
    expect(await como(ANA, `select titulo, actualizado_en from public.tareas where id = 't1'`)).toEqual([{ titulo: 'Versión nueva', actualizado_en: 200 }])
  })
  it('una escritura más nueva sí actualiza', async () => {
    await como(ANA, insertar, ['Versión más nueva', 300])
    expect(await como(ANA, `select titulo from public.tareas where id = 't1'`)).toEqual([{ titulo: 'Versión más nueva' }])
  })
  it('un borrado (lápida) viejo no revive ni borra una edición nueva', async () => {
    await como(ANA, `update public.tareas set borrado_en = 150, actualizado_en = 150 where id = 't1'`)
    expect(await como(ANA, `select borrado_en from public.tareas where id = 't1'`)).toEqual([{ borrado_en: null }])
  })
  it('un borrado más nuevo se guarda y la fila queda como lápida', async () => {
    await como(ANA, `update public.tareas set borrado_en = 400, actualizado_en = 400 where id = 't1'`)
    expect(await como(ANA, `select borrado_en from public.tareas where id = 't1'`)).toEqual([{ borrado_en: 400 }])
  })
})

describe('validaciones de la base de datos', () => {
  it('rechaza valores imposibles', async () => {
    await expect(como(ANA, `insert into public.clases (id, curso_id, dia, inicio, fin, actualizado_en) values ('x','c1',9,'08:00','10:00',1)`)).rejects.toThrow(/check/)
    await expect(como(ANA, `insert into public.clases (id, curso_id, dia, inicio, fin, actualizado_en) values ('x','c1',1,'8am','10:00',1)`)).rejects.toThrow(/check/)
    await expect(como(ANA, `insert into public.tareas (id, titulo, area, fecha, actualizado_en) values ('x','t','otra','2026-10-20',1)`)).rejects.toThrow(/check/)
    await expect(como(ANA, `insert into public.planes_dia (id, fecha, tarea_ids, actualizado_en) values ('2026-10-20','2026-10-20','{a,b,c,d}',1)`)).rejects.toThrow(/check/)
    await expect(como(ANA, `insert into public.perfiles (semanas_ciclo) values (99)`)).rejects.toThrow(/check/)
  })
})

describe('los datos de la app caben en las tablas y vuelven iguales', () => {
  it('el respaldo completo de la v1 hace ida y vuelta por la base de datos', async () => {
    const respaldo = JSON.parse(readFileSync(resolve(process.cwd(), 'e2e/fixtures/respaldo-v1.json'), 'utf8'))
    const imp = importarRespaldo(respaldo, 1_760_000_000_000)
    if (!imp.ok) throw new Error(imp.error)
    const original = imp.datos
    const filas = aFilas(original)

    // Insertar cada tabla tal como la mandaría la app
    for (const tabla of Object.keys(filas) as (keyof Filas)[]) {
      if (!filas[tabla].length) continue
      // Igual que la API de Supabase: se insertan solo las columnas que vienen en los datos
      const columnas = Object.keys({ ...filas[tabla][0], user_id: 1 }).join(', ')
      await como(
        CARLA,
        `insert into public.${tabla} (${columnas}) select ${columnas} from jsonb_populate_recordset(null::public.${tabla}, $1::jsonb)`,
        [JSON.stringify(filas[tabla].map((f) => ({ ...f, user_id: CARLA })))],
      )
    }

    // Leerlas de vuelta como las recibiría la app
    const leidas: Partial<Filas> = {}
    for (const tabla of Object.keys(filas) as (keyof Filas)[]) {
      leidas[tabla] = await como(CARLA, `select * from public.${tabla} ${tabla === 'perfiles' ? '' : 'order by id'}`)
    }
    const vuelta = deFilas(leidas)

    const porId = <T extends { id: string }>(l: T[]) => [...l].sort((a, b) => a.id.localeCompare(b.id))
    expect(porId(vuelta.cursos)).toEqual(porId(original.cursos))
    expect(porId(vuelta.clases)).toEqual(porId(original.clases))
    expect(porId(vuelta.tareas)).toEqual(porId(original.tareas))
    expect(porId(vuelta.semanas)).toEqual(porId(original.semanas))
    expect(porId(vuelta.metas)).toEqual(porId(original.metas))
    expect(porId(vuelta.mejoras)).toEqual(porId(original.mejoras))
    expect(porId(vuelta.progreso)).toEqual(porId(original.progreso))
    expect(porId(vuelta.planes)).toEqual(porId(original.planes))
    expect(vuelta.perfil).toEqual(original.perfil)
  })
})
