-- Additive migration. Does not alter existing public products/profiles/orders or existing auth triggers.
begin;
create schema if not exists store_private;
revoke all on schema store_private from public;
grant usage on schema store_private to authenticated, service_role;
create table public.store_profiles (
 id uuid primary key references auth.users on delete cascade,
 is_admin boolean not null default false,
 vip_until timestamptz,
 created_at timestamptz not null default now()
);
create function store_private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.store_profiles where id=auth.uid() and is_admin)
$$;
revoke all on function store_private.is_admin() from public;
grant execute on function store_private.is_admin() to authenticated,service_role;
create table public.store_settings (
 id boolean primary key default true check(id),
 payment_mode text not null default 'disabled' check(payment_mode in('disabled','sandbox','live')),
 live_approved_at timestamptz,
 live_approved_by uuid references auth.users,
 sandbox_verified_at timestamptz,
 check(payment_mode<>'live' or (live_approved_at is not null and live_approved_by is not null and sandbox_verified_at is not null))
);
insert into public.store_settings(id) values(true);
create table public.store_products (
 id uuid primary key default gen_random_uuid(), slug text unique not null check(slug ~ '^[a-z0-9-]+$'),
 name text not null check(length(name) between 1 and 150), tagline text not null default '', description text not null default '',
 category text not null, price_cents integer not null check(price_cents between 0 and 100000000),
 status text not null default 'coming_soon' check(status in('coming_soon','ready','archived')),
 vip_free boolean not null default false, kind text not null default 'software' check(kind in('software','vip')),
 features jsonb not null default '[]', latest_release_id uuid,
 created_at timestamptz not null default now()
);
create table public.store_releases (
 id uuid primary key default gen_random_uuid(), product_id uuid not null references public.store_products,
 version text not null check(version ~ '^[0-9]+\.[0-9]+\.[0-9]+(-[a-z0-9.]+)?$'),
 storage_path text not null unique, sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
 changelog text not null, license text not null default 'หนึ่งโรงเรียน / ห้ามจำหน่ายต่อ',
 tested_at timestamptz, test_evidence text, created_at timestamptz not null default now(),
 unique(product_id,version), unique(product_id,id),
 check(tested_at is null or length(test_evidence)>10)
);
alter table public.store_products add constraint store_release_product_fk foreign key(id,latest_release_id) references public.store_releases(product_id,id);
create table public.store_coupons (
 code text primary key check(code ~ '^[A-Z0-9_-]{3,32}$'), percent integer not null check(percent between 1 and 100),
 max_uses integer not null check(max_uses>0), used_count integer not null default 0 check(used_count>=0 and used_count<=max_uses),
 expires_at timestamptz not null, active boolean not null default true
);
create table public.store_orders (
 id uuid primary key default gen_random_uuid(), order_no bigint generated always as identity unique,
 user_id uuid not null references auth.users,
 idempotency_key uuid not null, request_fingerprint text not null,
 subtotal_cents integer not null check(subtotal_cents>=0), discount_cents integer not null check(discount_cents>=0),
 total_cents integer not null check(total_cents>=0 and total_cents=subtotal_cents-discount_cents),
 coupon_code text references public.store_coupons,
 mode text not null check(mode in('sandbox','live')),
 status text not null default 'pending' check(status in('pending','verifying','paid','rejected','cancelled','refunded')), rejection_reason text,
 created_at timestamptz not null default now(), paid_at timestamptz,
 unique(user_id,idempotency_key)
);
create table public.store_order_items (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.store_orders on delete cascade,
 product_id uuid not null references public.store_products, product_name text not null,
 unit_price_cents integer not null check(unit_price_cents>=0), unique(order_id,product_id)
);
create table public.store_payments (
 id uuid primary key default gen_random_uuid(), order_id uuid not null unique references public.store_orders,
 event_id text not null unique, provider_ref text not null unique, body_hash text not null,
 amount_cents integer not null check(amount_cents>=0), currency text not null check(currency='THB'),
 mode text not null check(mode in('sandbox','live')), verified_by uuid references auth.users,
 created_at timestamptz not null default now()
);
create table public.store_slips (
 id uuid primary key default gen_random_uuid(), order_id uuid not null unique references public.store_orders,
 user_id uuid not null references auth.users, sha256 text not null unique, storage_path text not null unique,
 created_at timestamptz not null default now()
);
create table public.store_grants (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users,
 product_id uuid not null references public.store_products, order_id uuid not null references public.store_orders,
 revoked_at timestamptz, download_count integer not null default 0, last_downloaded_at timestamptz,
 unique(user_id,product_id,order_id)
);
create table public.store_support (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users,
 subject text not null check(length(subject) between 3 and 150), message text not null check(length(message) between 10 and 5000),
 status text not null default 'open' check(status in('open','in_progress','resolved')), reply text,
 created_at timestamptz not null default now()
);
create table public.store_audit (
 id bigint generated always as identity primary key, actor_id uuid references auth.users on delete set null,
 action text not null, target_id text, details jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.store_outbox (
 id uuid primary key default gen_random_uuid(), topic text not null, payload jsonb not null,
 created_at timestamptz not null default now(), delivered_at timestamptz, attempts integer not null default 0,
 next_attempt_at timestamptz not null default now(), locked_until timestamptz
);
create table store_private.rate_limits (key text primary key, count integer not null, reset_at timestamptz not null);
create function public.store_take_rate_limit(p_key text,p_limit integer,p_seconds integer) returns boolean language plpgsql set search_path='' as $$
declare n integer;
begin
 insert into store_private.rate_limits(key,count,reset_at) values(p_key,1,now()+make_interval(secs=>p_seconds))
 on conflict(key) do update set count=case when rate_limits.reset_at<=now() then 1 else rate_limits.count+1 end,
 reset_at=case when rate_limits.reset_at<=now() then now()+make_interval(secs=>p_seconds) else rate_limits.reset_at end returning count into n;
 return n<=p_limit;
end $$;
create function public.store_create_order(p_user uuid,p_ids uuid[],p_key uuid,p_coupon text,p_mode text) returns uuid
language plpgsql set search_path='' as $$
declare oid uuid; fp text; oldfp text; sub integer; disc integer:=0; c public.store_coupons; vip boolean; n integer;
begin
 if p_user is null or p_key is null or p_ids is null or cardinality(p_ids) not between 1 and 15 or array_position(p_ids,null) is not null then raise exception 'INVALID_CART'; end if;
 if (select count(distinct x) from unnest(p_ids)x)<>cardinality(p_ids) then raise exception 'DUPLICATE_PRODUCT'; end if;
 fp:=array_to_string(array(select unnest(p_ids) order by 1),',')||':'||coalesce(p_coupon,'')||':'||p_mode;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text||p_key::text,0));
 select id,request_fingerprint into oid,oldfp from public.store_orders where user_id=p_user and idempotency_key=p_key;
 if oid is not null then
  if fp<>oldfp then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
  return oid;
 end if;
 if p_mode not in('live','sandbox') or p_mode<>(select payment_mode from public.store_settings where id) then raise exception 'SALES_DISABLED'; end if;
 insert into public.store_profiles(id) values(p_user) on conflict do nothing;
 select coalesce(vip_until>now(),false) into vip from public.store_profiles where id=p_user;
 perform id from public.store_products where id=any(p_ids) order by id for share;
 select count(*),coalesce(sum(case when vip and p.vip_free then 0 else p.price_cents end),0) into n,sub
 from public.store_products p join public.store_releases r on r.id=p.latest_release_id and r.product_id=p.id
 where p.id=any(p_ids) and p.status='ready' and r.tested_at is not null;
 if n<>cardinality(p_ids) then raise exception 'PRODUCT_NOT_READY'; end if;
 if coalesce(p_coupon,'')<>'' then
  select * into c from public.store_coupons where code=p_coupon for update;
  if not found or not c.active or c.expires_at<=now() or c.used_count>=c.max_uses then raise exception 'INVALID_COUPON'; end if;
  disc:=floor(sub::numeric*c.percent/100);
  update public.store_coupons set used_count=used_count+1 where code=p_coupon;
 end if;
 insert into public.store_orders(user_id,idempotency_key,request_fingerprint,subtotal_cents,discount_cents,total_cents,coupon_code,mode)
 values(p_user,p_key,fp,sub,disc,sub-disc,nullif(p_coupon,''),p_mode) returning id into oid;
 insert into public.store_order_items(order_id,product_id,product_name,unit_price_cents)
 select oid,id,name,case when vip and vip_free then 0 else price_cents end from public.store_products where id=any(p_ids);
 if sub-disc=0 then
  update public.store_orders set status='paid',paid_at=now() where id=oid;
  insert into public.store_grants(user_id,product_id,order_id) select p_user,product_id,oid from public.store_order_items where order_id=oid;
 end if;
 insert into public.store_audit(actor_id,action,target_id) values(p_user,'order.created',oid::text);
 insert into public.store_outbox(topic,payload) values('order.created',jsonb_build_object('order_id',oid,'mode',p_mode));
 return oid;
end $$;
create function public.store_confirm_payment(p_order uuid,p_event text,p_ref text,p_hash text,p_amount integer,p_mode text,p_actor uuid default null) returns uuid
language plpgsql set search_path='' as $$
declare o public.store_orders; prev public.store_payments;
begin
 select * into o from public.store_orders where id=p_order for update;
 if not found then raise exception 'ORDER_NOT_FOUND'; end if;
 if p_actor is not null and not exists(select 1 from public.store_profiles where id=p_actor and is_admin) then raise exception 'FORBIDDEN'; end if;
 if p_mode<>o.mode or p_mode<>(select payment_mode from public.store_settings where id) then raise exception 'MODE_MISMATCH'; end if;
 select * into prev from public.store_payments where event_id=p_event or provider_ref=p_ref or order_id=p_order;
 if found then
  if prev.order_id=p_order and prev.event_id=p_event and prev.provider_ref=p_ref and prev.body_hash=p_hash and prev.amount_cents=p_amount then return prev.id; end if;
  raise exception 'REPLAY_CONFLICT';
 end if;
 if o.status not in('pending','verifying') then raise exception 'INVALID_ORDER_STATE'; end if;
 if p_amount<>o.total_cents or p_amount<=0 then raise exception 'AMOUNT_MISMATCH'; end if;
 if length(p_ref) not between 6 and 150 or length(p_event) not between 6 and 150 or p_hash !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_REFERENCE'; end if;
 insert into public.store_payments(order_id,event_id,provider_ref,body_hash,amount_cents,currency,mode,verified_by)
 values(p_order,p_event,p_ref,p_hash,p_amount,'THB',p_mode,p_actor) returning * into prev;
 update public.store_orders set status='paid',paid_at=now() where id=p_order;
 insert into public.store_grants(user_id,product_id,order_id) select o.user_id,product_id,p_order from public.store_order_items where order_id=p_order;
 update public.store_profiles set vip_until=greatest(coalesce(vip_until,now()),now())+interval '1 year'
 where id=o.user_id and exists(select 1 from public.store_order_items i join public.store_products p on p.id=i.product_id where i.order_id=p_order and p.kind='vip');
 insert into public.store_audit(actor_id,action,target_id,details) values(p_actor,'payment.verified',p_order::text,jsonb_build_object('payment_id',prev.id,'mode',p_mode));
 insert into public.store_outbox(topic,payload) values('payment.verified',jsonb_build_object('order_id',p_order,'mode',p_mode));
 return prev.id;
end $$;
create function public.store_register_slip(p_order uuid,p_user uuid,p_hash text,p_path text) returns uuid language plpgsql set search_path='' as $$
declare o public.store_orders; sid uuid;
begin
 select * into o from public.store_orders where id=p_order and user_id=p_user for update;
 if not found or o.status<>'pending' then raise exception 'INVALID_ORDER'; end if;
 if o.mode<>(select payment_mode from public.store_settings where id) then raise exception 'SALES_DISABLED'; end if;
 insert into public.store_slips(order_id,user_id,sha256,storage_path) values(p_order,p_user,p_hash,p_path) returning id into sid;
 update public.store_orders set status='verifying' where id=p_order;
 insert into public.store_audit(actor_id,action,target_id) values(p_user,'slip.submitted',p_order::text);
 return sid;
end $$;
create function public.store_record_download(p_user uuid,p_product uuid) returns void language plpgsql set search_path='' as $$
begin
 update public.store_grants set download_count=download_count+1,last_downloaded_at=now() where user_id=p_user and product_id=p_product and revoked_at is null;
 insert into public.store_audit(actor_id,action,target_id) values(p_user,'release.download',p_product::text);
end $$;
create function public.store_refund(p_actor uuid,p_order uuid) returns void language plpgsql set search_path='' as $$
begin
 if not exists(select 1 from public.store_profiles where id=p_actor and is_admin) then raise exception 'FORBIDDEN'; end if;
 update public.store_orders set status='refunded' where id=p_order and status='paid';
 if not found then raise exception 'INVALID_ORDER_STATE'; end if;
 update public.store_grants set revoked_at=now() where order_id=p_order;
 insert into public.store_audit(actor_id,action,target_id) values(p_actor,'order.refund-recorded',p_order::text);
end $$;
-- School product: staff roles are database membership, never client JWT user_metadata.
create table public.school_sites (
 id uuid primary key default gen_random_uuid(), slug text unique not null check(slug ~ '^[a-z0-9-]+$'),
 name text not null, description text not null default '', logo_path text, color text not null default '#7c6cf0' check(color ~ '^#[a-fA-F0-9]{6}$'),
 academic_year integer not null default 2570, contact text not null default '', published boolean not null default false,
 created_at timestamptz not null default now()
);
create table public.school_members (
 school_id uuid not null references public.school_sites on delete cascade, user_id uuid not null references auth.users on delete cascade,
 role text not null check(role in('owner','officer','editor','executive')), primary key(school_id,user_id)
);
create function store_private.school_role(p_school uuid) returns text language sql stable security definer set search_path='' as $$
 select role from public.school_members where school_id=p_school and user_id=auth.uid() and auth.uid() is not null
$$;
revoke all on function store_private.school_role(uuid) from public;
grant execute on function store_private.school_role(uuid) to authenticated,service_role;
create table public.school_posts (
 id uuid primary key default gen_random_uuid(), school_id uuid not null references public.school_sites on delete cascade,
 title text not null check(length(title) between 3 and 200), body text not null check(length(body) between 10 and 20000),
 published boolean not null default false, created_at timestamptz not null default now()
);
create table public.school_rounds (
 id uuid primary key default gen_random_uuid(), school_id uuid not null references public.school_sites on delete cascade,
 name text not null, grade_levels text[] not null, opens_at timestamptz not null, closes_at timestamptz not null,
 is_open boolean not null default false, results_published boolean not null default false, check(closes_at>opens_at), unique(school_id,id)
);
create sequence public.school_application_seq;
create table public.school_applications (
 id uuid primary key default gen_random_uuid(), school_id uuid not null references public.school_sites,
 round_id uuid not null, applicant_id uuid not null references auth.users,
 application_no text not null unique default ('MET-'||to_char(now(),'YYYY')||'-'||lpad(nextval('public.school_application_seq')::text,7,'0')),
 grade_level text not null, student_name text not null check(length(student_name) between 3 and 150),
 guardian_name text not null check(length(guardian_name) between 3 and 150), guardian_phone text not null check(guardian_phone ~ '^0[0-9]{8,9}$'),
 previous_school text not null default '', consent_at timestamptz not null, consent_version text not null default '2026-11-24',
 status text not null default 'submitted' check(status in('submitted','needs_documents','approved','rejected')),
 review_note text, reviewed_by uuid references auth.users, reviewed_at timestamptz, created_at timestamptz not null default now(),
 foreign key(school_id,round_id) references public.school_rounds(school_id,id),
 unique(round_id,applicant_id,student_name), unique(school_id,id)
);
create table public.school_documents (
 id uuid primary key default gen_random_uuid(), school_id uuid not null, application_id uuid not null,
 kind text not null check(kind in('identity','transcript','photo')), storage_path text not null unique,
 sha256 text not null, created_at timestamptz not null default now(),
 foreign key(school_id,application_id) references public.school_applications(school_id,id),unique(application_id,kind)
);
create function public.school_submit_application(p_user uuid,p_school uuid,p_round uuid,p_grade text,p_student text,p_guardian text,p_phone text,p_previous text) returns uuid
language plpgsql set search_path='' as $$
declare r public.school_rounds; aid uuid;
begin
 select * into r from public.school_rounds where id=p_round and school_id=p_school for share;
 if not found or not r.is_open or now()<r.opens_at or now()>=r.closes_at or not(p_grade=any(r.grade_levels)) then raise exception 'ROUND_CLOSED'; end if;
 if not exists(select 1 from public.school_sites where id=p_school and published) then raise exception 'SCHOOL_CLOSED'; end if;
 insert into public.school_applications(school_id,round_id,applicant_id,grade_level,student_name,guardian_name,guardian_phone,previous_school,consent_at)
 values(p_school,p_round,p_user,p_grade,p_student,p_guardian,p_phone,p_previous,now()) returning id into aid;
 insert into public.store_audit(actor_id,action,target_id) values(p_user,'application.submitted',aid::text);
 return aid;
end $$;
create function public.school_review_application(p_actor uuid,p_school uuid,p_application uuid,p_status text,p_note text) returns void
language plpgsql set search_path='' as $$
begin
 if not exists(select 1 from public.school_members where school_id=p_school and user_id=p_actor and role in('owner','officer')) then raise exception 'FORBIDDEN'; end if;
 if p_status not in('needs_documents','approved','rejected') or length(p_note) not between 3 and 2000 then raise exception 'INVALID_REVIEW'; end if;
 update public.school_applications set status=p_status,review_note=p_note,reviewed_by=p_actor,reviewed_at=now() where id=p_application and school_id=p_school;
 if not found then raise exception 'APPLICATION_NOT_FOUND'; end if;
 insert into public.store_audit(actor_id,action,target_id,details) values(p_actor,'application.reviewed',p_application::text,jsonb_build_object('status',p_status,'school_id',p_school));
end $$;
-- All exposed tables: RLS; client roles are read-only. All mutations go through verified server actions.
do $$ declare t text; begin
 foreach t in array array['store_profiles','store_settings','store_products','store_releases','store_coupons','store_orders','store_order_items','store_payments','store_slips','store_grants','store_support','store_audit','store_outbox','school_sites','school_members','school_posts','school_rounds','school_applications','school_documents'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;
revoke all on store_private.rate_limits from public,anon,authenticated;
grant all on store_private.rate_limits to service_role;
grant usage, select on sequence public.school_application_seq,public.store_orders_order_no_seq,public.store_audit_id_seq to service_role;
grant select on public.store_products,public.school_sites,public.school_posts,public.school_rounds to anon,authenticated;
grant select on public.store_profiles,public.store_orders,public.store_order_items,public.store_payments,public.store_grants,public.store_support,public.school_members,public.school_applications,public.school_documents to authenticated;
create policy store_catalog on public.store_products for select to anon,authenticated using(status<>'archived');
create policy store_profile_own on public.store_profiles for select to authenticated using(id=(select auth.uid()));
create policy store_orders_own on public.store_orders for select to authenticated using(user_id=(select auth.uid()));
create policy store_items_own on public.store_order_items for select to authenticated using(exists(select 1 from public.store_orders where id=order_id and user_id=(select auth.uid())));
create policy store_payments_own on public.store_payments for select to authenticated using(exists(select 1 from public.store_orders where id=order_id and user_id=(select auth.uid())));
create policy store_grants_own on public.store_grants for select to authenticated using(user_id=(select auth.uid()));
create policy store_support_own on public.store_support for select to authenticated using(user_id=(select auth.uid()));
create policy school_public on public.school_sites for select to anon,authenticated using(published or store_private.school_role(id) is not null);
-- anon needs helper execute for public policy, helper returns null without uid.
grant usage on schema store_private to anon;
grant execute on function store_private.school_role(uuid) to anon;
create policy school_members_own on public.school_members for select to authenticated using(user_id=(select auth.uid()));
create policy school_news on public.school_posts for select to anon,authenticated using((published and exists(select 1 from public.school_sites s where s.id=school_id and s.published)) or store_private.school_role(school_id) in('owner','editor','executive'));
create policy school_round_public on public.school_rounds for select to anon,authenticated using(exists(select 1 from public.school_sites s where s.id=school_id and s.published) or store_private.school_role(school_id) is not null);
create policy school_application_own on public.school_applications for select to authenticated using(applicant_id=(select auth.uid()) or store_private.school_role(school_id) in('owner','officer','executive'));
create policy school_document_own on public.school_documents for select to authenticated using(exists(select 1 from public.school_applications a where a.id=application_id and (a.applicant_id=(select auth.uid()) or store_private.school_role(a.school_id) in('owner','officer'))));
-- Remove default PUBLIC EXECUTE from every new privileged RPC. Invoker uses service_role, never SECURITY DEFINER.
do $$ declare f record; begin
 for f in select p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and (p.proname like 'store_%' or p.proname in('school_submit_application','school_review_application')) loop
 execute format('revoke all on function %s from public,anon,authenticated',f.sig);
 execute format('grant execute on function %s to service_role',f.sig);
 end loop;
end $$;
create index store_orders_user_idx on public.store_orders(user_id,created_at desc);
create index store_items_product_idx on public.store_order_items(product_id);
create index store_grants_user_idx on public.store_grants(user_id,product_id) where revoked_at is null;
create index store_support_user_idx on public.store_support(user_id);
create index school_members_user_idx on public.school_members(user_id,school_id);
create index school_posts_site_idx on public.school_posts(school_id,created_at desc);
create index school_round_site_idx on public.school_rounds(school_id);
create index school_applications_site_idx on public.school_applications(school_id,created_at desc);
create index school_applications_user_idx on public.school_applications(applicant_id);
create index school_documents_application_idx on public.school_documents(application_id);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('store-releases','store-releases',false,52428800,array['application/zip']),
 ('store-slips','store-slips',false,5242880,array['image/png','image/jpeg']),
 ('school-documents','school-documents',false,5242880,array['image/png','image/jpeg']),
 ('school-branding','school-branding',false,2097152,array['image/png'])
on conflict(id) do nothing;
-- No storage.objects policies added: only the server may read/write these private buckets.

create function public.store_dashboard() returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object(
 'today_cents',coalesce(sum(total_cents) filter(where mode='live' and status='paid' and (paid_at at time zone 'Asia/Bangkok')::date=(now() at time zone 'Asia/Bangkok')::date),0),
 'month_cents',coalesce(sum(total_cents) filter(where mode='live' and status='paid' and date_trunc('month',paid_at at time zone 'Asia/Bangkok')=date_trunc('month',now() at time zone 'Asia/Bangkok')),0),
 'total_cents',coalesce(sum(total_cents) filter(where mode='live' and status='paid'),0),
 'pending',count(*) filter(where status='verifying')) from public.store_orders
$$;
create function public.school_provision(p_actor uuid,p_owner uuid,p_slug text,p_name text) returns uuid language plpgsql set search_path='' as $$
declare sid uuid;
begin
 if p_actor is not null and not exists(select 1 from public.store_profiles where id=p_actor and is_admin) then raise exception 'FORBIDDEN'; end if;
 insert into public.school_sites(slug,name) values(p_slug,p_name) returning id into sid;
 insert into public.school_members(school_id,user_id,role) values(sid,p_owner,'owner');
 insert into public.store_audit(actor_id,action,target_id) values(p_actor,'school.created',sid::text);
 return sid;
end $$;
revoke all on function public.store_dashboard(),public.school_provision(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.store_dashboard(),public.school_provision(uuid,uuid,text,text) to service_role;

create function public.school_dashboard(p_actor uuid,p_school uuid) returns jsonb language plpgsql stable set search_path='' as $$
begin
 if not exists(select 1 from public.school_members where school_id=p_school and user_id=p_actor and role in('owner','officer','executive')) then raise exception 'FORBIDDEN'; end if;
 return (select jsonb_build_object('total',count(*),'submitted',count(*) filter(where status in('submitted','needs_documents')),'approved',count(*) filter(where status='approved'),'rejected',count(*) filter(where status='rejected')) from public.school_applications where school_id=p_school);
end $$;
revoke all on function public.school_dashboard(uuid,uuid) from public,anon,authenticated;
grant execute on function public.school_dashboard(uuid,uuid) to service_role;

create unique index store_daily_summary_unique on public.store_outbox((payload->>'date')) where topic='revenue.daily';
create function public.store_queue_daily_summary() returns void language plpgsql set search_path='' as $$
declare day date := (now() at time zone 'Asia/Bangkok')::date-1;
begin
 insert into public.store_outbox(topic,payload)
 select 'revenue.daily',jsonb_build_object('date',day,'currency','THB','amount_cents',coalesce(sum(total_cents),0),'paid_orders',count(*))
 from public.store_orders where mode='live' and status='paid' and (paid_at at time zone 'Asia/Bangkok')::date=day
 on conflict do nothing;
end $$;
create function public.store_claim_events(p_limit integer) returns setof public.store_outbox language sql set search_path='' as $$
 update public.store_outbox set attempts=attempts+1,locked_until=now()+interval '2 minutes'
 where id in(select id from public.store_outbox where delivered_at is null and next_attempt_at<=now() and (locked_until is null or locked_until<now()) order by created_at limit least(greatest(p_limit,1),5) for update skip locked) returning *
$$;
revoke all on function public.store_queue_daily_summary(),public.store_claim_events(integer) from public,anon,authenticated;
grant execute on function public.store_queue_daily_summary(),public.store_claim_events(integer) to service_role;

-- Restrictive policy fences these buckets even if legacy storage has permissive global policies.
create policy store_bucket_client_deny on storage.objects as restrictive for all to anon,authenticated
 using(bucket_id not in('store-releases','store-slips','school-documents','school-branding'))
 with check(bucket_id not in('store-releases','store-slips','school-documents','school-branding'));
do $$ begin
 if exists(select 1 from storage.buckets where id in('store-releases','store-slips','school-documents','school-branding') and public) then
 raise exception 'STORE_BUCKET_MUST_BE_PRIVATE'; end if;
end $$;
create function public.store_reject_order(p_actor uuid,p_order uuid,p_reason text) returns void language plpgsql set search_path='' as $$
begin
 if not exists(select 1 from public.store_profiles where id=p_actor and is_admin) then raise exception 'FORBIDDEN'; end if;
 if length(p_reason) not between 3 and 2000 then raise exception 'INVALID_REASON'; end if;
 update public.store_orders set status='rejected',rejection_reason=p_reason where id=p_order and status in('pending','verifying');
 if not found then raise exception 'INVALID_ORDER_STATE'; end if;
 insert into public.store_audit(actor_id,action,target_id) values(p_actor,'payment.rejected',p_order::text);
end $$;
create function public.school_register_document(p_user uuid,p_application uuid,p_kind text,p_path text,p_hash text) returns text language plpgsql set search_path='' as $$
declare a public.school_applications; oldpath text;
begin
 select * into a from public.school_applications where id=p_application and applicant_id=p_user for update;
 if not found or a.status not in('submitted','needs_documents') then raise exception 'FORBIDDEN'; end if;
 select storage_path into oldpath from public.school_documents where application_id=a.id and kind=p_kind;
 insert into public.school_documents(school_id,application_id,kind,storage_path,sha256) values(a.school_id,a.id,p_kind,p_path,p_hash)
 on conflict(application_id,kind) do update set storage_path=excluded.storage_path,sha256=excluded.sha256,created_at=now();
 insert into public.store_audit(actor_id,action,target_id,details) values(p_user,'application.document-uploaded',a.id::text,jsonb_build_object('kind',p_kind));
 return oldpath;
end $$;
revoke all on function public.store_reject_order(uuid,uuid,text),public.school_register_document(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.store_reject_order(uuid,uuid,text),public.school_register_document(uuid,uuid,text,text,text) to service_role;

create function public.store_create_support(p_user uuid,p_subject text,p_message text) returns uuid language plpgsql set search_path='' as $$
declare tid uuid;
begin
 insert into public.store_support(user_id,subject,message) values(p_user,p_subject,p_message) returning id into tid;
 insert into public.store_audit(actor_id,action,target_id) values(p_user,'support.created',tid::text);
 insert into public.store_outbox(topic,payload) values('support.created',jsonb_build_object('ticket_id',tid));
 return tid;
end $$;
create function public.store_register_release(p_actor uuid,p_product uuid,p_version text,p_path text,p_sha text,p_changelog text) returns uuid language plpgsql set search_path='' as $$
declare rid uuid;
begin
 if not exists(select 1 from public.store_profiles where id=p_actor and is_admin) then raise exception 'FORBIDDEN'; end if;
 perform id from public.store_products where id=p_product for update;
 if not found then raise exception 'PRODUCT_NOT_FOUND'; end if;
 insert into public.store_releases(product_id,version,storage_path,sha256,changelog) values(p_product,p_version,p_path,p_sha,p_changelog) returning id into rid;
 -- Keep the last tested version active until the owner attests the replacement.
 insert into public.store_audit(actor_id,action,target_id,details) values(p_actor,'release.uploaded',rid::text,jsonb_build_object('sha256',p_sha));
 insert into public.store_outbox(topic,payload) values('release.uploaded',jsonb_build_object('product_id',p_product,'version',p_version));
 return rid;
end $$;
create function public.store_attest_release(p_actor uuid,p_release uuid,p_sha text,p_evidence text) returns void language plpgsql set search_path='' as $$
declare pid uuid;
begin
 if not exists(select 1 from public.store_profiles where id=p_actor and is_admin) then raise exception 'FORBIDDEN'; end if;
 if length(p_evidence) not between 30 and 2000 then raise exception 'INVALID_EVIDENCE'; end if;
 update public.store_releases set tested_at=now(),test_evidence=p_evidence where id=p_release and sha256=p_sha returning product_id into pid;
 if not found then raise exception 'RELEASE_HASH_MISMATCH'; end if;
 update public.store_products set latest_release_id=p_release where id=pid;
 insert into public.store_audit(actor_id,action,target_id,details) values(p_actor,'release.test-attested',p_release::text,jsonb_build_object('sha256',p_sha,'evidence',p_evidence));
 insert into public.store_outbox(topic,payload) values('release.available',jsonb_build_object('product_id',pid,'release_id',p_release));
end $$;
revoke all on function public.store_create_support(uuid,text,text),public.store_register_release(uuid,uuid,text,text,text,text),public.store_attest_release(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.store_create_support(uuid,text,text),public.store_register_release(uuid,uuid,text,text,text,text),public.store_attest_release(uuid,uuid,text,text) to service_role;
commit;
