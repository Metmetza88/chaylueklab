-- Disposable local test stack only, never run against hosted Supabase.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create role authenticator login password 'local-test-only' noinherit;
grant anon,authenticated,service_role to authenticator;
create role supabase_auth_admin login password 'local-test-only' createrole;
create schema auth authorization supabase_auth_admin;
grant all on database postgres to supabase_auth_admin;
grant all on schema public to postgres,service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant usage,select on sequences to service_role;
