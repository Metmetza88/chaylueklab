-- Phase A additive migration. REVIEW against a live snapshot before applying.
-- Only education_2570 objects are created or changed. Existing ten tables/indexes are preserved.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
-- ตรวจโครงสร้างเดิมก่อนเพิ่ม FK และไม่คาดเดาตารางของฐานข้อมูลจริง
DO $$
declare t text;
begin
  foreach t in array array['schools','members','programs','catalog','exams','exam_questions','exam_attempts','certificates','quotes','quote_items'] loop
    if not exists(select 1 from pg_tables where schemaname='education_2570' and tablename=t and rowsecurity) then
      raise exception 'Required existing RLS table missing: %',t;
    end if;
  end loop;
  if not exists(select 1 from information_schema.columns where table_schema='education_2570' and table_name='schools' and column_name='id' and udt_name='uuid') then
    raise exception 'schools.id must be uuid; inspect live schema';
  end if;
end $$;

create index if not exists edu2570_members_school_user_idx on education_2570.members(school_id,user_id);

create table education_2570.platform_admins (
  user_id uuid primary key, created_at timestamptz not null default now()
);
alter table education_2570.platform_admins enable row level security;
revoke all on education_2570.platform_admins from anon,authenticated;
create policy own_admin_record on education_2570.platform_admins for select to authenticated using (user_id=(select auth.uid()));
grant select on education_2570.platform_admins to authenticated;
-- ตรวจสิทธิ์จากตารางที่ผู้ใช้แก้เองไม่ได้ และใช้ invoker เพื่อรักษา RLS
create function education_2570.is_platform_admin() returns boolean language sql stable security invoker set search_path='' as $$
  select auth.uid() is not null and exists(select 1 from education_2570.platform_admins where user_id=(select auth.uid()));
$$;
create function education_2570.is_school_member(school uuid) returns boolean language sql stable security invoker set search_path='' as $$
  select auth.uid() is not null and exists(select 1 from education_2570.members where school_id=school and user_id=(select auth.uid()));
$$;
create function education_2570.is_school_staff(school uuid) returns boolean language sql stable security invoker set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from education_2570.members where school_id=school and user_id=(select auth.uid()) and role in ('admin','teacher'));
$$;
create function education_2570.is_school_admin(school uuid) returns boolean language sql stable security invoker set search_path='' as $$
 select exists (select 1 from education_2570.members m where m.school_id=school and m.user_id=(select auth.uid()) and m.role='admin');
$$;
revoke all on function education_2570.is_school_admin(uuid) from public,anon,authenticated;
grant execute on function education_2570.is_school_admin(uuid) to authenticated;
revoke all on function education_2570.is_school_staff(uuid) from public,anon,authenticated;
grant execute on function education_2570.is_school_staff(uuid) to authenticated;
revoke all on function education_2570.is_platform_admin(), education_2570.is_school_member(uuid) from public,anon,authenticated;
grant execute on function education_2570.is_platform_admin(), education_2570.is_school_member(uuid) to authenticated;
create policy edu2570_platform_school_read on education_2570.schools for select to authenticated using (education_2570.is_platform_admin());

create table education_2570.software_categories (
 id uuid primary key default gen_random_uuid(), slug text not null unique check (slug ~ '^[a-z][a-z0-9-]{0,59}$'),
 name text not null check (length(name) between 1 and 200), created_at timestamptz not null default now()
);
create table education_2570.software_modules (
 id uuid primary key default gen_random_uuid(), slug text not null unique check (slug ~ '^[a-z][a-z0-9-]{0,59}$'),
 category_slug text not null references education_2570.software_categories(slug), name text not null check(length(name) between 1 and 200),
 status text not null default 'unavailable' check(status in ('ready','trial','development','unavailable')),
 enabled boolean not null default false, published boolean not null default true,
 price_mode text not null default 'quotation' check(price_mode='quotation'), created_at timestamptz not null default now()
);
create index edu2570_modules_category_idx on education_2570.software_modules(category_slug);
create table education_2570.school_subscriptions (
 id uuid primary key default gen_random_uuid(), school_id uuid not null references education_2570.schools(id),
 status text not null default 'active' check(status in ('active','suspended','expired')),
 starts_at timestamptz not null default now(), expires_at timestamptz not null,
 created_at timestamptz not null default now(), unique(id,school_id), check(expires_at>starts_at)
);
create index edu2570_subscriptions_school_idx on education_2570.school_subscriptions(school_id,status);
create table education_2570.licenses (
 id uuid primary key default gen_random_uuid(), school_id uuid not null references education_2570.schools(id),
 subscription_id uuid not null, module_slug text not null references education_2570.software_modules(slug),
 status text not null default 'active' check(status in ('active','suspended','expired','revoked')),
 expires_at timestamptz not null, created_at timestamptz not null default now(), unique(id,school_id,module_slug),
 foreign key(subscription_id,school_id) references education_2570.school_subscriptions(id,school_id)
);
create index edu2570_licenses_school_idx on education_2570.licenses(school_id,module_slug);
create index edu2570_licenses_subscription_idx on education_2570.licenses(subscription_id,school_id);
create index edu2570_licenses_module_idx on education_2570.licenses(module_slug);
create table education_2570.school_module_entitlements (
 id uuid primary key default gen_random_uuid(), school_id uuid not null references education_2570.schools(id),
 module_slug text not null references education_2570.software_modules(slug), license_id uuid not null,
 status text not null default 'active' check(status in ('active','suspended','revoked')),
 starts_at timestamptz not null default now(), expires_at timestamptz not null, created_at timestamptz not null default now(),
 unique(school_id,module_slug), check(expires_at>starts_at),
 foreign key(license_id,school_id,module_slug) references education_2570.licenses(id,school_id,module_slug)
);
create index edu2570_entitlements_license_idx on education_2570.school_module_entitlements(license_id,school_id,module_slug);
create index edu2570_entitlements_module_idx on education_2570.school_module_entitlements(module_slug);
create table education_2570.customers (
 id uuid primary key default gen_random_uuid(), school_id uuid not null references education_2570.schools(id),
 user_id uuid not null, contact_name text not null check(length(contact_name) between 1 and 200),
 created_at timestamptz not null default now(), unique(school_id,user_id)
);
create index edu2570_customers_user_idx on education_2570.customers(user_id);
create table education_2570.quotation_requests (
 id uuid primary key default gen_random_uuid(), school_id uuid not null references education_2570.schools(id), created_by uuid not null,
 module_slugs text[] not null check(cardinality(module_slugs) between 1 and 17), note text not null default '' check(length(note)<=2000),
 status text not null default 'requested' check(status in ('requested','reviewing','responded','closed')),
 currency text not null default 'THB' check(currency='THB'), created_at timestamptz not null default now()
);
create index edu2570_quotation_school_recent_idx on education_2570.quotation_requests(school_id,created_at desc);
create index edu2570_quotation_author_idx on education_2570.quotation_requests(created_by);
create table education_2570.service_requests (
 id uuid primary key default gen_random_uuid(), school_id uuid not null references education_2570.schools(id), created_by uuid not null,
 subject text not null check(length(subject) between 1 and 200), description text not null check(length(description) between 1 and 4000),
 status text not null default 'open' check(status in ('open','in_progress','resolved')), created_at timestamptz not null default now()
);
create index edu2570_service_school_recent_idx on education_2570.service_requests(school_id,created_at desc);
create index edu2570_service_author_idx on education_2570.service_requests(created_by);
create table education_2570.audit_logs (
 id uuid primary key default gen_random_uuid(), school_id uuid references education_2570.schools(id), actor_id uuid,
 action text not null check(action in ('INSERT','UPDATE','DELETE')), table_name text not null, record_id uuid not null,
 created_at timestamptz not null default now()
);
create index edu2570_audit_school_recent_idx on education_2570.audit_logs(school_id,created_at desc);
create index edu2570_audit_actor_idx on education_2570.audit_logs(actor_id);
create table education_2570.notifications (
 id uuid primary key default gen_random_uuid(), school_id uuid not null references education_2570.schools(id), user_id uuid not null,
 message text not null check(length(message) between 1 and 500), read_at timestamptz, created_at timestamptz not null default now()
);
create index edu2570_notifications_user_recent_idx on education_2570.notifications(user_id,school_id,created_at desc);
create index edu2570_notifications_school_idx on education_2570.notifications(school_id);

-- ใช้นโยบายแยกผู้อ่านตาม tenant และผู้จัดการแพลตฟอร์มอย่างชัดเจน
DO $$
declare t text;
begin
 foreach t in array array['software_categories','software_modules','school_subscriptions','licenses','school_module_entitlements','customers','quotation_requests','service_requests','audit_logs','notifications'] loop
  execute format('alter table education_2570.%I enable row level security',t);
  execute format('revoke all on education_2570.%I from anon, authenticated',t);
 end loop;
 foreach t in array array['school_subscriptions','licenses','school_module_entitlements'] loop
  execute format('create policy tenant_read on education_2570.%I for select to authenticated using (education_2570.is_school_member(school_id) or education_2570.is_platform_admin())',t);
  execute format('grant select on education_2570.%I to authenticated',t);
 end loop;
 foreach t in array array['school_subscriptions','licenses','school_module_entitlements','customers'] loop
  execute format('create policy platform_insert on education_2570.%I for insert to authenticated with check (education_2570.is_platform_admin())',t);
  execute format('create policy platform_update on education_2570.%I for update to authenticated using (education_2570.is_platform_admin()) with check (education_2570.is_platform_admin())',t);
  execute format('grant insert,update on education_2570.%I to authenticated',t);
 end loop;
end $$;
grant select on education_2570.customers,education_2570.quotation_requests,education_2570.service_requests,education_2570.audit_logs to authenticated;
create policy contact_read on education_2570.customers for select to authenticated using (
 (user_id=(select auth.uid()) and education_2570.is_school_member(school_id)) or education_2570.is_platform_admin()
);
create policy quotation_read on education_2570.quotation_requests for select to authenticated using (
 (created_by=(select auth.uid()) and education_2570.is_school_staff(school_id)) or education_2570.is_school_admin(school_id) or education_2570.is_platform_admin()
);
create policy service_read on education_2570.service_requests for select to authenticated using (
 (created_by=(select auth.uid()) and education_2570.is_school_member(school_id)) or education_2570.is_school_admin(school_id) or education_2570.is_platform_admin()
);
create policy audit_read on education_2570.audit_logs for select to authenticated using (
 education_2570.is_school_admin(school_id) or education_2570.is_platform_admin()
);
grant usage on schema education_2570 to anon,authenticated;
grant select on education_2570.software_categories,education_2570.software_modules to anon,authenticated;
create policy public_categories on education_2570.software_categories for select to anon,authenticated using(true);
create policy published_modules on education_2570.software_modules for select to anon,authenticated using(published);
grant update(enabled) on education_2570.software_modules to authenticated;
create policy platform_module_update on education_2570.software_modules for update to authenticated using(education_2570.is_platform_admin()) with check(education_2570.is_platform_admin());
grant insert(school_id,created_by,module_slugs,note) on education_2570.quotation_requests to authenticated;
grant insert(school_id,created_by,subject,description) on education_2570.service_requests to authenticated;
create policy member_quote_request on education_2570.quotation_requests for insert to authenticated with check(education_2570.is_school_staff(school_id) and created_by=(select auth.uid()) and status='requested');
create policy member_service_request on education_2570.service_requests for insert to authenticated with check(education_2570.is_school_member(school_id) and created_by=(select auth.uid()) and status='open');
grant update(status) on education_2570.service_requests to authenticated;
create policy platform_service_update on education_2570.service_requests for update to authenticated using(education_2570.is_platform_admin()) with check(education_2570.is_platform_admin());
grant select,update(read_at) on education_2570.notifications to authenticated;
create policy own_notifications on education_2570.notifications for select to authenticated using(user_id=(select auth.uid()) and education_2570.is_school_member(school_id));
create policy read_own_notifications on education_2570.notifications for update to authenticated using(user_id=(select auth.uid()) and education_2570.is_school_member(school_id)) with check(user_id=(select auth.uid()) and education_2570.is_school_member(school_id));

-- ผู้ใช้จัดการได้เฉพาะชื่อผู้ติดต่อของตนในโรงเรียนที่เป็นสมาชิก
revoke update on education_2570.customers from authenticated;
grant update(contact_name) on education_2570.customers to authenticated;
create policy own_customer_insert on education_2570.customers for insert to authenticated with check(user_id=(select auth.uid()) and education_2570.is_school_member(school_id));
create policy own_customer_update on education_2570.customers for update to authenticated using(user_id=(select auth.uid()) and education_2570.is_school_member(school_id)) with check(user_id=(select auth.uid()) and education_2570.is_school_member(school_id));
-- สร้าง subscription, license และ entitlement ใน transaction เดียวโดยตรวจสิทธิ์ส่วนกลาง
create function education_2570.provision_school_module(p_school_id uuid,p_module_slug text,p_expires_at timestamptz)
returns setof education_2570.school_module_entitlements language plpgsql security invoker set search_path='' as $$
declare sub uuid; lic uuid;
begin
 if auth.uid() is null or not education_2570.is_platform_admin() then raise exception 'Platform admin required' using errcode='42501'; end if;
 if p_expires_at<=now() or p_expires_at>now()+interval '5 years' then raise exception 'Invalid expiry'; end if;
 insert into education_2570.school_subscriptions(school_id,expires_at) values(p_school_id,p_expires_at) returning id into sub;
 insert into education_2570.licenses(school_id,subscription_id,module_slug,expires_at) values(p_school_id,sub,p_module_slug,p_expires_at) returning id into lic;
 return query insert into education_2570.school_module_entitlements(school_id,module_slug,license_id,expires_at) values(p_school_id,p_module_slug,lic,p_expires_at) returning *;
end $$;
revoke all on function education_2570.provision_school_module(uuid,text,timestamptz) from public,anon;
grant execute on function education_2570.provision_school_module(uuid,text,timestamptz) to authenticated;

-- ตัวตรวจ entitlement กลางสำหรับ module จริงในอนาคต โดยทดลองสาธิตไม่ถือเป็นสิทธิ์ใช้งานจริง
create function education_2570.can_use_module(school uuid, module text) returns boolean language sql stable security invoker set search_path='' as $$
 select education_2570.is_school_member(school) and exists (
  select 1 from education_2570.school_module_entitlements e
  join education_2570.licenses l on l.id=e.license_id and l.school_id=e.school_id and l.module_slug=e.module_slug
  join education_2570.school_subscriptions s on s.id=l.subscription_id and s.school_id=e.school_id
  join education_2570.software_modules m on m.slug=e.module_slug
  where e.school_id=school and e.module_slug=module and e.status='active' and e.starts_at<=now() and e.expires_at>now()
  and l.status='active' and l.expires_at>now() and s.status='active' and s.starts_at<=now() and s.expires_at>now()
  and m.enabled and m.status='ready'
 );
$$;
revoke all on function education_2570.can_use_module(uuid,text) from public,anon,authenticated;
grant execute on function education_2570.can_use_module(uuid,text) to authenticated;

-- เพิ่ม audit โดยไม่คัดลอกข้อมูลส่วนบุคคลลง log; trigger function ไม่เปิดให้ผู้ใช้เรียกโดยตรง
create function education_2570.record_platform_change() returns trigger language plpgsql security definer set search_path='' as $$
declare record jsonb; actor uuid;
begin
 actor:=auth.uid();
 record:=case when TG_OP='DELETE' then to_jsonb(OLD) else to_jsonb(NEW) end;
 insert into education_2570.audit_logs(school_id,actor_id,action,table_name,record_id)
 values((record->>'school_id')::uuid,actor,TG_OP,TG_TABLE_NAME,(record->>'id')::uuid);
 if TG_OP='INSERT' and TG_TABLE_NAME in ('quotation_requests','service_requests') and actor is not null then
  insert into education_2570.notifications(school_id,user_id,message) values((record->>'school_id')::uuid,actor,
  case when TG_TABLE_NAME='quotation_requests' then 'รับคำขอใบเสนอราคาแล้ว' else 'รับเรื่องแจ้งปัญหาแล้ว' end);
 end if;
 if TG_OP='DELETE' then return OLD; else return NEW; end if;
end $$;
revoke all on function education_2570.record_platform_change() from public,anon,authenticated;
DO $$
declare t text;
begin
 foreach t in array array['software_modules','school_subscriptions','licenses','school_module_entitlements','customers','quotation_requests','service_requests'] loop
  execute format('create trigger platform_audit after insert or update or delete on education_2570.%I for each row execute function education_2570.record_platform_change()',t);
 end loop;
end $$;
-- ป้องกัน module slug ปลอม แม้เรียก Data API โดยตรง
create function education_2570.validate_quotation_modules() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if exists(select 1 from unnest(NEW.module_slugs) s where not exists(select 1 from education_2570.software_modules m where m.slug=s and m.published)) then
  raise exception 'Unknown module';
 end if;
 return NEW;
end $$;
revoke all on function education_2570.validate_quotation_modules() from public,anon,authenticated;
create trigger validate_modules before insert on education_2570.quotation_requests for each row execute function education_2570.validate_quotation_modules();
insert into education_2570.software_categories(slug,name) values('management','งานบริหารโรงเรียน');
insert into education_2570.software_categories(slug,name) values('students','งานทะเบียนนักเรียน');
insert into education_2570.software_categories(slug,name) values('personnel','งานบุคลากร');
insert into education_2570.software_categories(slug,name) values('academic','งานวิชาการ');
insert into education_2570.software_categories(slug,name) values('finance','งานการเงิน');
insert into education_2570.software_categories(slug,name) values('assets','งานพัสดุและครุภัณฑ์');
insert into education_2570.software_categories(slug,name) values('procurement','งานจัดซื้อจัดจ้าง');
insert into education_2570.software_categories(slug,name) values('documents','งานสารบรรณ');
insert into education_2570.software_categories(slug,name) values('care','งานดูแลนักเรียน');
insert into education_2570.software_categories(slug,name) values('nutrition','งานโภชนาการ');
insert into education_2570.software_categories(slug,name) values('library','งานห้องสมุด');
insert into education_2570.software_categories(slug,name) values('facilities','งานอาคารสถานที่');
insert into education_2570.software_categories(slug,name) values('activities','งานกิจกรรม');
insert into education_2570.software_categories(slug,name) values('ai','AI School Assistant');
insert into education_2570.software_modules(slug,category_slug,name,status) values('management','management','งานบริหารโรงเรียน','unavailable');
insert into education_2570.software_modules(slug,category_slug,name,status) values('students','students','งานทะเบียนนักเรียน','unavailable');
insert into education_2570.software_modules(slug,category_slug,name,status) values('personnel','personnel','งานบุคลากร','unavailable');
insert into education_2570.software_modules(slug,category_slug,name,status) values('academic','academic','งานวิชาการ','unavailable');
insert into education_2570.software_modules(slug,category_slug,name,status) values('finance','finance','งานการเงิน','unavailable');
insert into education_2570.software_modules(slug,category_slug,name,status) values('assets','assets','งานพัสดุและครุภัณฑ์','unavailable');
insert into education_2570.software_modules(slug,category_slug,name,status) values('procurement','procurement','งานจัดซื้อจัดจ้าง','unavailable');
insert into education_2570.software_modules(slug,category_slug,name,status) values('documents','documents','งานสารบรรณ','unavailable');
insert into education_2570.software_modules(slug,category_slug,name,status) values('care','care','งานดูแลนักเรียน','unavailable');
insert into education_2570.software_modules(slug,category_slug,name,status) values('nutrition','nutrition','งานโภชนาการ','unavailable');
insert into education_2570.software_modules(slug,category_slug,name,status) values('library','library','งานห้องสมุด','unavailable');
insert into education_2570.software_modules(slug,category_slug,name,status) values('facilities','facilities','งานอาคารสถานที่','unavailable');
insert into education_2570.software_modules(slug,category_slug,name,status) values('activities','activities','งานกิจกรรม','unavailable');
insert into education_2570.software_modules(slug,category_slug,name,status) values('ai','ai','AI School Assistant','unavailable');
insert into education_2570.software_modules(slug,category_slug,name,status) values('exam-studio','academic','Exam Studio','trial');
insert into education_2570.software_modules(slug,category_slug,name,status) values('smart-exam','academic','Smart Exam','trial');
insert into education_2570.software_modules(slug,category_slug,name,status) values('smart-certificate','activities','Smart Certificate','trial');
commit;
