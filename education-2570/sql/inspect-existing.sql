-- READ ONLY: run with the authorized Primary account before migration.
-- No student/customer records are selected.
select table_name,column_name,udt_name,is_nullable,column_default from information_schema.columns where table_schema='education_2570' order by table_name,ordinal_position;
select tablename,rowsecurity from pg_tables where schemaname='education_2570' order by tablename;
select indexname,indexdef from pg_indexes where schemaname='education_2570' order by indexname;
select tablename,policyname,roles,cmd,qual,with_check from pg_policies where schemaname='education_2570' order by tablename,policyname;
select c.conname,c.conrelid::regclass,pg_get_constraintdef(c.oid) from pg_constraint c join pg_namespace n on n.oid=c.connamespace where n.nspname='education_2570' order by c.conrelid,c.conname;
select grantee,table_name,privilege_type from information_schema.role_table_grants where table_schema='education_2570' order by table_name,grantee,privilege_type;
