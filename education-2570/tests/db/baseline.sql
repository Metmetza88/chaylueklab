-- LOCAL TEST FIXTURE ONLY. These definitions are assumptions, NOT a live Supabase export.
create role anon nologin;
create role authenticated nologin;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth to anon,authenticated;
grant execute on function auth.uid() to anon,authenticated;
create table public.education_test_sentinel(id int primary key, value text);
insert into public.education_test_sentinel values(1,'preserve outside schema');
create schema education_2570;
create table education_2570.schools(id uuid primary key, name text not null);
create table education_2570.members(id uuid primary key default gen_random_uuid(),school_id uuid references education_2570.schools(id),user_id uuid,role text);
create table education_2570.programs(id uuid primary key,name text,description text);
create table education_2570.catalog(id uuid primary key,program_id uuid references education_2570.programs(id),price numeric,published boolean);
create table education_2570.exams(id uuid primary key,school_id uuid references education_2570.schools(id));
create table education_2570.exam_questions(id uuid primary key,exam_id uuid references education_2570.exams(id));
create table education_2570.exam_attempts(id uuid primary key,exam_id uuid references education_2570.exams(id),user_id uuid);
create table education_2570.certificates(id uuid primary key,school_id uuid references education_2570.schools(id),user_id uuid);
create table education_2570.quotes(id uuid primary key,school_id uuid references education_2570.schools(id),created_by uuid,status text,created_at timestamptz default now());
create table education_2570.quote_items(id uuid primary key,quote_id uuid references education_2570.quotes(id),program_id uuid references education_2570.programs(id),quantity int,unit_price numeric);
DO $$ declare t text; begin
 for t in select tablename from pg_tables where schemaname='education_2570' loop
 execute format('alter table education_2570.%I enable row level security',t);
 end loop;
end $$;
grant usage on schema education_2570 to authenticated;
grant select on all tables in schema education_2570 to authenticated;
create policy own_memberships on education_2570.members for select to authenticated using(user_id=auth.uid());
create policy own_school on education_2570.schools for select to authenticated using(exists(select 1 from education_2570.members m where m.school_id=schools.id and m.user_id=auth.uid()));
insert into education_2570.schools values('10000000-0000-4000-8000-000000000001','โรงเรียนทดสอบ A'),('10000000-0000-4000-8000-000000000002','โรงเรียนทดสอบ B');
insert into education_2570.members(school_id,user_id,role) values
('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','admin'),
('10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','teacher');
-- จำลอง project ที่มี default grants กว้าง เพื่อยืนยันว่า migration ลดสิทธิ์อย่างชัดเจน
alter default privileges in schema education_2570 grant all on tables to anon,authenticated;
alter default privileges in schema education_2570 grant execute on functions to anon,authenticated;
