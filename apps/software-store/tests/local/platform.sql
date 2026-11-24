-- Only for the disposable PostgreSQL+GoTrue+PostgREST test stack.
-- Hosted Supabase already provides these functions and storage tables.
create or replace function auth.uid() returns uuid language sql stable as $$select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$;

grant usage on schema auth to anon,authenticated,service_role;
grant execute on function auth.uid() to anon,authenticated,service_role;
create schema storage;
create table storage.buckets(id text primary key,name text not null,public boolean default false,file_size_limit bigint,allowed_mime_types text[]);
-- Storage table fixture is not a running Storage API. Storage upload and signed-URL E2E must be run on Supabase staging.
