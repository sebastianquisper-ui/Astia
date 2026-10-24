-- Astia v2: esquema inicial.
-- Cada tabla guarda lo de UN usuario (user_id) y nadie más puede verlo (RLS).
-- Los ids son texto creado en el teléfono (así se puede crear sin internet y los ids de la v1 se conservan).
-- `actualizado_en` y `borrado_en` son milisegundos desde 1970: el servidor ignora cualquier
-- escritura más vieja que la que ya tiene guardada (error 2 de la v1: versiones viejas pisando datos nuevos).

-- ---------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------

create table public.perfiles (
  user_id        uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  nombre         text,
  inicio_ciclo   date,
  semanas_ciclo  int  not null default 16 check (semanas_ciclo between 4 and 24),
  enfoque_min    int  not null default 25 check (enfoque_min between 5 and 90),
  descanso_min   int  not null default 5  check (descanso_min between 1 and 30),
  preferencias   jsonb not null default '{}'::jsonb,
  actualizado_en bigint not null default 0
);

create table public.cursos (
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id             text not null,
  nombre         text not null,
  color          text not null default '#7C8CFF',
  actualizado_en bigint not null,
  borrado_en     bigint,
  primary key (user_id, id)
);

create table public.clases (
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id             text not null,
  curso_id       text not null,
  dia            smallint not null check (dia between 0 and 6),   -- 0 = lunes
  inicio         text not null check (inicio ~ '^[0-2][0-9]:[0-5][0-9]$'),
  fin            text not null check (fin ~ '^[0-2][0-9]:[0-5][0-9]$'),
  aula           text not null default '',
  gcal_event_id  text,                                              -- fase de Google Calendar
  actualizado_en bigint not null,
  borrado_en     bigint,
  primary key (user_id, id)
);

create table public.tareas (
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id             text not null,
  titulo         text not null,
  area           text not null default 'universidad' check (area in ('universidad', 'personal')),
  curso_id       text,
  categoria      text,
  tipo           text not null default 'tarea' check (tipo in ('tarea', 'estudio', 'examen')),
  fecha          date not null,
  hora           text check (hora ~ '^[0-2][0-9]:[0-5][0-9]$'),
  prioridad      text not null default 'media' check (prioridad in ('alta', 'media', 'baja')),
  pide_evidencia boolean not null default false,
  metodo         text,
  pasos          jsonb not null default '[]'::jsonb,
  estado         text not null default 'pendiente' check (estado in ('pendiente', 'hecha')),
  hecha_en       timestamptz,
  evidencia      jsonb,                                             -- foto (solo en el teléfono) y/o enlace
  gcal_event_id  text,                                              -- fase de Google Calendar
  actualizado_en bigint not null,
  borrado_en     bigint,
  primary key (user_id, id)
);

create table public.semanas (
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id             text not null,
  curso_id       text not null,
  semana         int  not null check (semana between 1 and 24),
  tema           text not null default '',
  notas          text not null default '',
  actualizado_en bigint not null,
  borrado_en     bigint,
  primary key (user_id, id)
);

-- Mi Órbita: hábitos con su tracker (`registro` = fechas "AAAA-MM-DD" cumplidas)
create table public.habitos (
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id             text not null,
  nombre         text not null,
  categoria      text not null default 'Otro',                      -- apartado: Deporte, Salud, Mente...
  color          text not null default '#4FD1A5',
  frecuencia     jsonb not null default '{"tipo":"diaria"}'::jsonb
                 check (frecuencia ->> 'tipo' in ('diaria', 'dias', 'semanal')),
  minimo         text,                                              -- versión mínima para días sin ganas
  registro       text[] not null default '{}',
  actualizado_en bigint not null,
  borrado_en     bigint,
  primary key (user_id, id)
);

-- Mi Órbita: rutinas (de la mañana, de la noche, entrenamientos...) con sus pasos en orden
create table public.rutinas (
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id             text not null,
  nombre         text not null,
  categoria      text not null default 'Otro',
  momento        text not null default 'libre' check (momento in ('manana', 'tarde', 'noche', 'libre')),
  dias           smallint[] not null default '{}',                  -- 0 = lunes; vacío = cuando quieras
  pasos          jsonb not null default '[]'::jsonb,
  registro       text[] not null default '{}',                      -- fechas completadas
  actualizado_en bigint not null,
  borrado_en     bigint,
  primary key (user_id, id)
);

create table public.mejoras (
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id             text not null,
  texto          text not null,
  creada_en      bigint not null,
  hecha          boolean not null default false,
  actualizado_en bigint not null,
  borrado_en     bigint,
  primary key (user_id, id)
);

create table public.progreso_diario (
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id             text not null,                                     -- = la fecha
  fecha          date not null,
  hechas         int  not null default 0 check (hechas >= 0),
  enfoque        int  not null default 0 check (enfoque >= 0),      -- minutos
  descanso       int  not null default 0 check (descanso >= 0),     -- minutos
  pomodoros      int  not null default 0 check (pomodoros >= 0),
  actualizado_en bigint not null,
  borrado_en     bigint,
  primary key (user_id, id)
);

create table public.planes_dia (
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id             text not null,                                     -- = la fecha
  fecha          date not null,
  tarea_ids      text[] not null default '{}' check (cardinality(tarea_ids) <= 3),
  actualizado_en bigint not null,
  borrado_en     bigint,
  primary key (user_id, id)
);

-- Avisos push (se usan en la fase de notificaciones)
create table public.suscripciones_push (
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id             text not null,
  endpoint       text not null,
  p256dh         text not null,
  auth           text not null,
  agente         text,
  creada_en      timestamptz not null default now(),
  actualizado_en bigint not null default 0,
  primary key (user_id, id),
  unique (user_id, endpoint)
);

-- Registro de errores de la app (pantalla, acción y mensaje): nada de fallos silenciosos
create table public.diagnosticos (
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id             bigint generated always as identity,
  creado_en      timestamptz not null default now(),
  pantalla       text,
  accion         text,
  mensaje        text not null,
  extra          text,
  primary key (user_id, id)
);

-- ---------------------------------------------------------------
-- El servidor ignora escrituras más viejas que lo que ya guardó
-- ---------------------------------------------------------------

create function public.ignorar_versiones_viejas() returns trigger
language plpgsql as $$
begin
  if new.actualizado_en < old.actualizado_en then
    return null; -- se descarta la actualización, el registro queda como estaba
  end if;
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['perfiles', 'cursos', 'clases', 'tareas', 'semanas', 'habitos', 'rutinas', 'mejoras', 'progreso_diario', 'planes_dia', 'suscripciones_push']
  loop
    execute format(
      'create trigger ignorar_versiones_viejas before update on public.%I for each row execute function public.ignorar_versiones_viejas()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------
-- Índices para lo que más se consulta
-- ---------------------------------------------------------------

create index tareas_por_fecha on public.tareas (user_id, fecha) where borrado_en is null;
create index tareas_por_cambio on public.tareas (user_id, actualizado_en);
create index clases_por_dia on public.clases (user_id, dia) where borrado_en is null;
create index cursos_por_cambio on public.cursos (user_id, actualizado_en);

-- ---------------------------------------------------------------
-- Seguridad: cada usuario ve y toca SOLO lo suyo
-- ---------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['perfiles', 'cursos', 'clases', 'tareas', 'semanas', 'habitos', 'rutinas', 'mejoras', 'progreso_diario', 'planes_dia', 'suscripciones_push', 'diagnosticos']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "cada usuario ve solo lo suyo" on public.%I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
