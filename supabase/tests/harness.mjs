// Test harness: runs the real migration files on PGlite (in-process Postgres)
// with minimal stubs of the Supabase platform (auth, storage, roles, PostGIS).
import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, '..', 'migrations');

const PLATFORM_STUBS = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
grant anon, authenticated, service_role to postgres;

create schema extensions;
grant usage on schema extensions to anon, authenticated, service_role;

-- ---- PostGIS stand-in: haversine on (lng, lat) pairs ----
create type extensions.geometry as (x float8, y float8);
create type extensions.geography as (lng float8, lat float8);
create function extensions.st_makepoint(float8, float8) returns extensions.geometry
  language sql immutable as $$ select row($1, $2)::extensions.geometry $$;
create function extensions.st_setsrid(extensions.geometry, int) returns extensions.geometry
  language sql immutable as $$ select $1 $$;
create function extensions.geom_to_geog(extensions.geometry) returns extensions.geography
  language sql immutable as $$ select row(($1).x, ($1).y)::extensions.geography $$;
create cast (extensions.geometry as extensions.geography)
  with function extensions.geom_to_geog(extensions.geometry);
create function extensions.st_distance(extensions.geography, extensions.geography) returns float8
  language sql immutable as $$
    select 2 * 6371008.8 * asin(sqrt(
      power(sin(radians(($2).lat - ($1).lat) / 2), 2)
      + cos(radians(($1).lat)) * cos(radians(($2).lat)) * power(sin(radians(($2).lng - ($1).lng) / 2), 2)
    ))
  $$;
create function extensions.st_dwithin(extensions.geography, extensions.geography, float8) returns boolean
  language sql immutable as $$ select extensions.st_distance($1, $2) <= $3 $$;

-- ---- auth ----
create schema auth;
grant usage on schema auth to anon, authenticated, service_role;
create table auth.users (
  id uuid primary key,
  phone text,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

-- ---- storage ----
create schema storage;
grant usage on schema storage to anon, authenticated, service_role;
create table storage.buckets (id text primary key, name text not null, public boolean default false);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text not null
);
alter table storage.objects enable row level security;
grant all on storage.objects to authenticated;
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
$$;

-- ---- realtime ----
create publication supabase_realtime;

-- ---- Supabase default privileges on public ----
grant usage on schema public to anon, authenticated, service_role;
-- like the live project ("secure by default"): no automatic table grants to API roles;
-- migrations must grant exactly what each role needs.
-- like the live project: functions are executable via PUBLIC only (no explicit role grants)
`;

function prepareMigration(sql) {
  // PostGIS is stubbed above; pg_trgm is real (PGlite contrib)
  return sql.replace(/create extension if not exists postgis[^;]*;/i, '');
}

export async function createDb() {
  const db = new PGlite({ extensions: { pg_trgm } });
  await db.exec(PLATFORM_STUBS);
  const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  for (const f of files) {
    try {
      await db.exec(prepareMigration(readFileSync(join(migrationsDir, f), 'utf8')));
    } catch (e) {
      throw new Error(`Migration ${f} failed: ${e.message}`);
    }
  }
  return db;
}

/** Run SQL as an authenticated user (or anon when uid is null), like PostgREST does. */
export async function as(db, uid, sql, params = []) {
  return db.transaction(async (tx) => {
    await tx.exec(`set local role ${uid ? 'authenticated' : 'anon'}`);
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [uid ?? '']);
    const res = await tx.query(sql, params);
    return res.rows;
  });
}

export async function createUser(db, { phone, role, fullName } = {}) {
  const id = randomUUID();
  await db.query(`insert into auth.users (id, phone, raw_user_meta_data) values ($1, $2, $3)`, [
    id,
    phone ?? `+7700${Math.floor(1000000 + Math.random() * 8999999)}`,
    JSON.stringify({ full_name: fullName ?? 'Test User' }),
  ]);
  if (role) await db.query(`update public.profiles set role = $2 where id = $1`, [id, role]);
  return id;
}

/** Expect a promise to reject with a message containing `fragment`. */
export async function rejects(promise, fragment) {
  try {
    await promise;
  } catch (e) {
    if (!String(e.message).includes(fragment)) {
      throw new Error(`Expected error containing "${fragment}", got: ${e.message}`);
    }
    return;
  }
  throw new Error(`Expected error containing "${fragment}", but it succeeded`);
}
