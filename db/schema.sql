-- ============================================================================
-- DenunciaPE — esquema PostgreSQL para Supabase
-- Generado desde el DBML propuesto, corregido para correr en Postgres:
--   * FKs `int` que apuntaban a PKs uuid  -> uuid
--   * `[pk, increment]` sobre uuid         -> uuid DEFAULT gen_random_uuid()
--   * denuncias.estado                     -> estado_id uuid (FK a estado)
--   * denuncias.consentimiento             -> consentimiento_id uuid
--   * testigos.correo (mail)               -> varchar
-- Pegar TODO en el SQL Editor de Supabase y presionar Run.
-- El acceso es vía backend (connection string / rol postgres), no por anon key,
-- por eso no se definen políticas RLS aquí.
-- ============================================================================

-- gen_random_uuid() viene incluido en Supabase (extensión pgcrypto).
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- LOOKUPS
-- ----------------------------------------------------------------------------
create table if not exists estado (
  id          uuid primary key default gen_random_uuid(),
  descripcion varchar not null unique
);

create table if not exists roles (
  id          uuid primary key default gen_random_uuid(),
  descripcion varchar not null unique
);

-- ----------------------------------------------------------------------------
-- IDENTIDADES
-- ----------------------------------------------------------------------------
create table if not exists servidor_publico (
  id                 uuid primary key default gen_random_uuid(),
  correo_electronico varchar not null unique,
  usuario            varchar not null unique,
  dni                varchar not null,
  primer_nombre      varchar,
  apellido_paterno   varchar,
  apellido_materno   varchar,
  telefono           varchar,
  contrasena_hash    varchar not null,
  role               uuid references roles(id),
  creado_en          timestamptz not null default now()
);

create table if not exists oficinas (
  id          uuid primary key default gen_random_uuid(),
  descripcion varchar not null,
  encargado   uuid references servidor_publico(id)
);

create table if not exists comisaria (
  id           uuid primary key default gen_random_uuid(),
  descripcion  varchar not null,
  departamento varchar,
  provincia    varchar,
  distrito     varchar,
  direccion    varchar,
  ubicacion    varchar,
  encargado    uuid references servidor_publico(id)
);

create table if not exists denunciante (
  id                  uuid primary key default gen_random_uuid(),
  correo_electronico  varchar not null unique,
  dni                 varchar not null unique,
  primer_nombre       varchar,
  apellido_paterno    varchar,
  apellido_materno    varchar,
  fecha_nacimiento    date,
  fecha_emision_dni   date,
  telefono            varchar,
  correo_verificado   boolean not null default false,
  telefono_verificado boolean not null default false,
  ha_denunciado_antes boolean not null default false,
  estado_identidad    varchar check (estado_identidad in ('verified','partial','pending_review')),
  contrasena_hash     varchar not null,
  creado_en           timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- CONSENTIMIENTOS (antes que denuncias, por la FK consentimiento_id)
-- ----------------------------------------------------------------------------
create table if not exists consentimientos (
  id            uuid primary key default gen_random_uuid(),
  usuario_id    uuid not null references denunciante(id) on delete cascade,
  tipo          varchar not null check (tipo in ('face_biometric','data_processing','truthfulness')),
  concedido     boolean not null default true,
  version_texto varchar,
  concedido_en  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- DENUNCIAS
-- ----------------------------------------------------------------------------
create table if not exists denuncias (
  id                   uuid primary key default gen_random_uuid(),
  codigo_seguimiento   varchar unique,
  usuario_id           uuid not null references denunciante(id) on delete cascade,
  tipo                 varchar check (tipo in ('robo','hurto')),
  estado_id            uuid references estado(id),
  hora                 timestamptz,
  departamento         varchar,
  provincia            varchar,
  distrito             varchar,
  referencia_ubicacion varchar,
  geo_latitud          numeric(10,7),
  geo_longitud         numeric(10,7),
  narrativa            text,
  observo_sospechosos  boolean,
  hubo_testigos        boolean,
  comisaria_id         uuid references comisaria(id),
  enviado_en           timestamptz,
  consentimiento_id    uuid references consentimientos(id),
  actualizado_en       timestamptz not null default now(),
  creado_en            timestamptz not null default now()
);

-- Migraciones idempotentes para proyectos donde `denuncias` ya existía.
alter table denuncias add column if not exists observo_sospechosos boolean;
alter table denuncias add column if not exists hubo_testigos boolean;

-- servidor_denuncia: ruteo de la denuncia por oficinas = su historial de movimiento
create table if not exists servidor_denuncia (
  id               uuid primary key default gen_random_uuid(),
  denuncia         uuid not null references denuncias(id) on delete cascade,
  servidor_publico uuid references servidor_publico(id),
  oficina          uuid not null references oficinas(id),
  fecha_ingreso    timestamptz not null default now(),
  fecha_salida     timestamptz,
  comentario       varchar
);

create table if not exists objetos_robados (
  id               uuid primary key default gen_random_uuid(),
  denuncia_id      uuid not null references denuncias(id) on delete cascade,
  nombre           varchar not null,
  marca_modelo     varchar,
  valor_aproximado numeric(12,2),
  descripcion      varchar
);

create table if not exists sospechosos (
  id                  uuid primary key default gen_random_uuid(),
  denuncia            uuid not null references denuncias(id) on delete cascade,
  descripcion_personal text,
  descripcion_huida    text
);

create table if not exists testigos (
  id             uuid primary key default gen_random_uuid(),
  denuncia       uuid not null references denuncias(id) on delete cascade,
  nombre         varchar not null,
  relacion       varchar check (relacion in ('familia directa','familia indirecta','amigo y/o conocido','extraño')),
  correo         varchar,
  telefono       varchar,
  fecha_registro timestamptz not null default now()
);

create table if not exists evidencias (
  id          uuid primary key default gen_random_uuid(),
  denuncia_id uuid not null references denuncias(id) on delete cascade,
  url_archivo varchar not null,
  tipo_archivo varchar,
  descripcion text,
  subido_en   timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- IDENTIDAD / BIOMETRÍA / NOTIFICACIONES
-- ----------------------------------------------------------------------------
create table if not exists capturas_faciales (
  id                 uuid primary key default gen_random_uuid(),
  usuario_id         uuid not null references denunciante(id) on delete cascade,
  tipo_captura       varchar not null check (tipo_captura in ('front','profile')),
  url_almacenamiento varchar not null,
  consentimiento_id  uuid references consentimientos(id),
  capturado_en       timestamptz not null default now()
);

create table if not exists verificaciones_identidad (
  id            uuid primary key default gen_random_uuid(),
  usuario_id    uuid not null references denunciante(id) on delete cascade,
  denuncia_id   uuid references denuncias(id) on delete set null,
  paso          varchar not null check (paso in ('basic','reniec','contact','face','risk','assisted')),
  resultado     varchar not null check (resultado in ('pass','fail','skipped')),
  numero_intento integer not null default 1,
  detalles      jsonb not null default '{}'::jsonb,
  creado_en     timestamptz not null default now()
);

create table if not exists notificaciones (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references denunciante(id) on delete cascade,
  denuncia_id uuid references denuncias(id) on delete cascade,
  canal       varchar not null check (canal in ('email','sms')),
  plantilla   varchar,
  estado      varchar not null check (estado in ('sent','failed','mocked')),
  enviado_en  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- INFRAESTRUCTURA DE AUTH (no es parte del ER; necesaria para sesiones y OTP)
-- ----------------------------------------------------------------------------
create table if not exists sessions (
  id                 uuid primary key default gen_random_uuid(),
  usuario_id         uuid not null,                 -- denunciante.id o servidor_publico.id (polimórfico)
  tipo_usuario       varchar not null check (tipo_usuario in ('denunciante','servidor_publico')),
  refresh_token_hash varchar not null,
  user_agent         varchar,
  ip                 varchar,
  expires_at         timestamptz not null,
  revoked_at         timestamptz,
  created_at         timestamptz not null default now()
);

create table if not exists otp_codes (
  id           uuid primary key default gen_random_uuid(),
  usuario_id   uuid not null,
  canal        varchar not null check (canal in ('email','sms')),
  code_hash    varchar not null,
  proposito    varchar not null check (proposito in ('email_verify','contact_verify')),
  intentos     integer not null default 0,
  expira_en    timestamptz not null,
  consumido_en timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists idx_sessions_usuario on sessions(usuario_id);
create index if not exists idx_otp_usuario      on otp_codes(usuario_id);

-- ----------------------------------------------------------------------------
-- ÍNDICES (FKs más consultadas)
-- ----------------------------------------------------------------------------
create index if not exists idx_denuncias_usuario        on denuncias(usuario_id);
create index if not exists idx_denuncias_estado         on denuncias(estado_id);
create index if not exists idx_denuncias_comisaria      on denuncias(comisaria_id);
create index if not exists idx_sd_denuncia              on servidor_denuncia(denuncia);
create index if not exists idx_objetos_denuncia         on objetos_robados(denuncia_id);
create index if not exists idx_sospechosos_denuncia     on sospechosos(denuncia);
create index if not exists idx_testigos_denuncia        on testigos(denuncia);
create index if not exists idx_evidencias_denuncia      on evidencias(denuncia_id);
create index if not exists idx_capturas_usuario         on capturas_faciales(usuario_id);
create index if not exists idx_verif_usuario            on verificaciones_identidad(usuario_id);
create index if not exists idx_notif_usuario            on notificaciones(usuario_id);

-- ----------------------------------------------------------------------------
-- SEED de catálogos (idempotente)
-- ----------------------------------------------------------------------------
insert into estado (descripcion) values
  ('Recibida'),
  ('Pendiente de verificación de identidad'),
  ('En revisión'),
  ('Asignada'),
  ('Información adicional requerida'),
  ('En investigación'),
  ('Resuelta'),
  ('Observada')
on conflict (descripcion) do nothing;

-- niveles de servidor_publico (la lógica de permisos usa estos nombres)
insert into roles (descripcion) values
  ('Super Administrador'),
  ('Encargado de Comisaría'),
  ('Policía'),
  ('Fiscal')
on conflict (descripcion) do nothing;

-- vincular un oficial a su comisaría (super_admin y fiscal quedan en null)
alter table servidor_publico add column if not exists comisaria_id uuid references comisaria(id);
create index if not exists idx_sp_comisaria on servidor_publico(comisaria_id);

-- comisaría + oficinas de ejemplo (para el ruteo y la consulta pública)
insert into comisaria (descripcion, departamento, provincia, distrito, direccion)
select 'Comisaría de Miraflores','Lima','Lima','Miraflores','Av. Larco 770'
where not exists (select 1 from comisaria where descripcion = 'Comisaría de Miraflores');

insert into oficinas (descripcion)
select 'Mesa de Partes'
where not exists (select 1 from oficinas where descripcion = 'Mesa de Partes');

insert into oficinas (descripcion)
select 'Sección de Investigación'
where not exists (select 1 from oficinas where descripcion = 'Sección de Investigación');
