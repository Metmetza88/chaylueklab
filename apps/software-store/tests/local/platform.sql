-- Only for the disposable PostgreSQL+GoTrue+PostgREST test stack.
-- Hosted Supabase already provides these functions and storage tables.
create or replace function auth.uid() returns uuid language sql stable as $$select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$;

grant usage on schema auth to anon,authenticated,service_role;
grant execute on function auth.uid() to anon,authenticated,service_role;
create or replace function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
create or replace function auth.role() returns text language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claim.role',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role')$$;
grant execute on function auth.jwt(),auth.role() to anon,authenticated,service_role;
