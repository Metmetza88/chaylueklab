-- Disposable local stack only. Never execute against a hosted Supabase project.
create role supabase_storage_admin login password 'local-test-only' noinherit createrole;
grant anon,authenticated,service_role to supabase_storage_admin;
grant all on database postgres to supabase_storage_admin;
grant all on schema public to supabase_storage_admin;
grant usage on schema auth to supabase_storage_admin;
create schema storage authorization supabase_storage_admin;
alter role supabase_storage_admin set search_path=storage,public;
