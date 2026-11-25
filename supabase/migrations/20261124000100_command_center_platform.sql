-- CHAYLUEKLAB AI Command Center platform (additive only).
-- Every object is new and prefixed cc_ so existing Life OS, billing, stock,
-- newsroom, video and retail tables are never altered or dropped.
-- Identity follows the existing model: LINE user id verified by Edge Functions.
-- Direct client access stays closed; only service_role (Edge Function) reads/writes.

create table if not exists public.cc_profiles (
  line_user_id text primary key,
  display_name text,
  email text,
  role text not null default 'customer' check (role in ('customer','staff','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cc_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{0,62}$'),
  name_th text not null,
  name_en text not null,
  sort_order int not null default 0
);

create table if not exists public.cc_products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{0,62}$'),
  category_id uuid references public.cc_categories(id) on delete set null,
  name_th text not null,
  name_en text not null,
  summary_th text,
  summary_en text,
  cover_url text check (cover_url is null or cover_url ~ '^(https://|\./|/)'),
  -- in_development: shown as under development, cannot be ordered or tried.
  status text not null default 'in_development' check (status in ('in_development','beta','available','archived')),
  price_cents bigint check (price_cents is null or price_cents >= 0),
  trial_url text check (trial_url is null or trial_url ~ '^https://'),
  download_path text,
  tested_at timestamptz,
  test_note text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  -- A product may only be sold or tried after a recorded test result.
  constraint cc_products_available_needs_test check (status not in ('beta','available') or tested_at is not null)
);

create table if not exists public.cc_services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{0,62}$'),
  name_th text not null,
  name_en text not null,
  summary_th text,
  summary_en text,
  price_cents bigint check (price_cents is null or price_cents >= 0),
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create sequence if not exists public.cc_quote_seq;
create sequence if not exists public.cc_order_seq;

create table if not exists public.cc_quotations (
  id uuid primary key default gen_random_uuid(),
  quote_no text not null unique,
  line_user_id text not null,
  customer_name text not null check (char_length(customer_name) between 1 and 160),
  customer_email text check (customer_email is null or char_length(customer_email) <= 200),
  customer_phone text check (customer_phone is null or char_length(customer_phone) <= 40),
  company text check (company is null or char_length(company) <= 200),
  note text check (note is null or char_length(note) <= 2000),
  status text not null default 'submitted' check (status in ('submitted','approved','rejected','expired')),
  subtotal_cents bigint not null check (subtotal_cents >= 0),
  discount_cents bigint not null default 0 check (discount_cents >= 0),
  -- Tax is decided by the owner per quotation; no VAT status is assumed.
  tax_rate_bp int not null default 0 check (tax_rate_bp between 0 and 3000),
  tax_cents bigint not null default 0 check (tax_cents >= 0),
  total_cents bigint not null check (total_cents >= 0),
  decided_by text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  constraint cc_quotations_discount_within_subtotal check (discount_cents <= subtotal_cents)
);
create index if not exists cc_quotations_user_idx on public.cc_quotations(line_user_id, created_at desc);

create table if not exists public.cc_quotation_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.cc_quotations(id) on delete cascade,
  kind text not null check (kind in ('product','service')),
  ref_id uuid not null,
  description text not null,
  quantity int not null check (quantity between 1 and 1000),
  unit_price_cents bigint not null check (unit_price_cents >= 0)
);
create index if not exists cc_quotation_items_quote_idx on public.cc_quotation_items(quotation_id);

create table if not exists public.cc_orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,
  line_user_id text not null,
  status text not null default 'pending_payment' check (status in ('pending_payment','payment_review','paid','cancelled')),
  total_cents bigint not null check (total_cents >= 0),
  created_at timestamptz not null default now()
);
create index if not exists cc_orders_user_idx on public.cc_orders(line_user_id, created_at desc);

create table if not exists public.cc_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.cc_orders(id) on delete cascade,
  product_id uuid not null references public.cc_products(id),
  description text not null,
  quantity int not null check (quantity between 1 and 100),
  unit_price_cents bigint not null check (unit_price_cents >= 0)
);
create index if not exists cc_order_items_order_idx on public.cc_order_items(order_id);

create table if not exists public.cc_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.cc_orders(id) on delete cascade,
  method text not null check (method in ('promptpay','bank_transfer','gateway')),
  amount_cents bigint not null check (amount_cents > 0),
  slip_path text,
  -- Nothing is "verified" without an administrator reviewing the evidence.
  status text not null default 'submitted' check (status in ('submitted','verified','rejected')),
  submitted_at timestamptz not null default now(),
  reviewed_by text,
  reviewed_at timestamptz,
  review_note text,
  constraint cc_payments_verified_needs_review check (status <> 'verified' or (slip_path is not null and reviewed_by is not null and reviewed_at is not null))
);
create index if not exists cc_payments_order_idx on public.cc_payments(order_id);
create unique index if not exists cc_payments_one_open_per_order on public.cc_payments(order_id) where status in ('submitted','verified');

create table if not exists public.cc_licenses (
  id uuid primary key default gen_random_uuid(),
  line_user_id text not null,
  product_id uuid not null references public.cc_products(id),
  order_id uuid references public.cc_orders(id),
  license_key text not null unique,
  status text not null default 'active' check (status in ('active','revoked','expired')),
  issued_at timestamptz not null default now(),
  expires_at timestamptz
);
create index if not exists cc_licenses_user_idx on public.cc_licenses(line_user_id);

create table if not exists public.cc_ai_agents (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  description text check (description is null or char_length(description) <= 1000),
  status text not null default 'stopped' check (status in ('stopped','running','paused')),
  permissions text[] not null default '{}' check (permissions <@ array['read','draft','data_write','finance','notify']),
  requires_approval boolean not null default true,
  created_by text not null,
  created_at timestamptz not null default now(),
  -- An agent that can change data or touch money must always wait for approval.
  constraint cc_agents_sensitive_needs_approval check (requires_approval or not (permissions && array['data_write','finance']))
);

create table if not exists public.cc_workflows (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references public.cc_ai_agents(id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  definition jsonb not null default '{}'::jsonb,
  schedule text check (schedule is null or char_length(schedule) <= 80),
  enabled boolean not null default false,
  created_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.cc_automation_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid references public.cc_workflows(id) on delete set null,
  agent_id uuid references public.cc_ai_agents(id) on delete set null,
  status text not null check (status in ('queued','running','succeeded','failed','cancelled')),
  cost_cents bigint not null default 0 check (cost_cents >= 0),
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists public.cc_transactions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('income','expense','api_cost')),
  source text not null check (source in ('product','service','membership','other')),
  amount_cents bigint not null check (amount_cents > 0),
  occurred_at timestamptz not null default now(),
  order_id uuid references public.cc_orders(id),
  note text check (note is null or char_length(note) <= 500),
  created_by text not null,
  created_at timestamptz not null default now()
);
create index if not exists cc_transactions_time_idx on public.cc_transactions(occurred_at);
-- One income entry per verified order prevents double counting.
create unique index if not exists cc_transactions_one_income_per_order on public.cc_transactions(order_id) where kind='income' and order_id is not null;

create table if not exists public.cc_notifications (
  id uuid primary key default gen_random_uuid(),
  line_user_id text not null,
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists cc_notifications_user_idx on public.cc_notifications(line_user_id, created_at desc);

create table if not exists public.cc_support_tickets (
  id uuid primary key default gen_random_uuid(),
  line_user_id text,
  name text not null check (char_length(name) between 1 and 120),
  contact text not null check (char_length(contact) between 3 and 200),
  message text not null check (char_length(message) between 1 and 3000),
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.cc_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id text not null,
  action text not null,
  resource text not null,
  record_id text,
  detail jsonb,
  created_at timestamptz not null default now()
);
create index if not exists cc_audit_logs_time_idx on public.cc_audit_logs(created_at desc);

-- Row Level Security: enabled everywhere, closed to browser roles.
do $$
declare t text;
begin
  foreach t in array array['cc_profiles','cc_categories','cc_products','cc_services','cc_quotations','cc_quotation_items','cc_orders','cc_order_items','cc_payments','cc_licenses','cc_ai_agents','cc_workflows','cc_automation_runs','cc_transactions','cc_notifications','cc_support_tickets','cc_audit_logs']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;
revoke all on sequence public.cc_quote_seq, public.cc_order_seq from public, anon, authenticated;
grant usage, select on sequence public.cc_quote_seq, public.cc_order_seq to service_role;

-- Prices are always read from the catalog inside one transaction; the client never supplies a price.
create or replace function public.cc_create_quotation(p_user text, p_customer jsonb, p_items jsonb)
returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  q public.cc_quotations;
  item jsonb; qty int; itype text; rid uuid; nm text; price bigint;
  subtotal bigint := 0; n int := 0;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 30 then raise exception 'invalid_items'; end if;
  insert into public.cc_quotations(quote_no, line_user_id, customer_name, customer_email, customer_phone, company, note, subtotal_cents, total_cents)
  values ('QF-' || to_char(now() at time zone 'Asia/Bangkok','YYYYMM') || '-' || lpad(nextval('public.cc_quote_seq')::text, 5, '0'),
          p_user, p_customer->>'name', nullif(p_customer->>'email',''), nullif(p_customer->>'phone',''), nullif(p_customer->>'company',''), nullif(p_customer->>'note',''), 0, 0)
  returning * into q;
  for item in select * from jsonb_array_elements(p_items) loop
    itype := item->>'kind'; rid := (item->>'id')::uuid; qty := (item->>'quantity')::int;
    if qty is null or qty < 1 or qty > 1000 then raise exception 'invalid_quantity'; end if;
    if itype = 'product' then
      select name_th, price_cents into nm, price from public.cc_products where id = rid and is_published and status in ('beta','available');
    elsif itype = 'service' then
      select name_th, price_cents into nm, price from public.cc_services where id = rid and is_published;
    else raise exception 'invalid_items'; end if;
    if nm is null then raise exception 'item_not_found'; end if;
    if price is null then raise exception 'price_not_set'; end if;
    insert into public.cc_quotation_items(quotation_id, kind, ref_id, description, quantity, unit_price_cents) values (q.id, itype, rid, nm, qty, price);
    subtotal := subtotal + price * qty; n := n + 1; nm := null; price := null;
  end loop;
  update public.cc_quotations set subtotal_cents = subtotal, total_cents = subtotal where id = q.id returning * into q;
  return jsonb_build_object('id', q.id, 'quote_no', q.quote_no, 'total_cents', q.total_cents, 'items', n);
end $$;

create or replace function public.cc_create_order(p_user text, p_items jsonb)
returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  o public.cc_orders; item jsonb; qty int; rid uuid; nm text; price bigint; total bigint := 0;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 20 then raise exception 'invalid_items'; end if;
  insert into public.cc_orders(order_no, line_user_id, total_cents)
  values ('OD-' || to_char(now() at time zone 'Asia/Bangkok','YYYYMM') || '-' || lpad(nextval('public.cc_order_seq')::text, 5, '0'), p_user, 0)
  returning * into o;
  for item in select * from jsonb_array_elements(p_items) loop
    rid := (item->>'id')::uuid; qty := (item->>'quantity')::int;
    if qty is null or qty < 1 or qty > 100 then raise exception 'invalid_quantity'; end if;
    select name_th, price_cents into nm, price from public.cc_products where id = rid and is_published and status = 'available';
    if nm is null then raise exception 'item_not_found'; end if;
    if price is null or price = 0 then raise exception 'price_not_set'; end if;
    insert into public.cc_order_items(order_id, product_id, description, quantity, unit_price_cents) values (o.id, rid, nm, qty, price);
    total := total + price * qty; nm := null; price := null;
  end loop;
  update public.cc_orders set total_cents = total where id = o.id returning * into o;
  return jsonb_build_object('id', o.id, 'order_no', o.order_no, 'total_cents', o.total_cents);
end $$;

-- Reviewing a payment is the only path to "paid": it needs a stored slip and an administrator.
create or replace function public.cc_review_payment(p_admin text, p_payment uuid, p_approve boolean, p_note text)
returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare pay public.cc_payments; o public.cc_orders; it record;
begin
  select * into pay from public.cc_payments where id = p_payment for update;
  if not found then raise exception 'payment_not_found'; end if;
  if pay.status <> 'submitted' then raise exception 'payment_already_reviewed'; end if;
  select * into o from public.cc_orders where id = pay.order_id for update;
  if not p_approve then
    update public.cc_payments set status='rejected', reviewed_by=p_admin, reviewed_at=now(), review_note=left(p_note,500) where id = p_payment;
    update public.cc_orders set status='pending_payment' where id = o.id;
    insert into public.cc_notifications(line_user_id,title,body) values (o.line_user_id,'การชำระเงินไม่ผ่านการตรวจสอบ',left(coalesce(p_note,''),500));
  else
    if pay.slip_path is null then raise exception 'slip_required'; end if;
    if pay.amount_cents <> o.total_cents then raise exception 'amount_mismatch'; end if;
    update public.cc_payments set status='verified', reviewed_by=p_admin, reviewed_at=now(), review_note=left(p_note,500) where id = p_payment;
    update public.cc_orders set status='paid' where id = o.id;
    for it in select product_id from public.cc_order_items where order_id = o.id loop
      insert into public.cc_licenses(line_user_id, product_id, order_id, license_key)
      values (o.line_user_id, it.product_id, o.id, replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''));
    end loop;
    insert into public.cc_transactions(kind, source, amount_cents, order_id, note, created_by) values ('income','product', o.total_cents, o.id, o.order_no, p_admin);
    insert into public.cc_notifications(line_user_id,title,body) values (o.line_user_id,'ยืนยันการชำระเงินแล้ว','คำสั่งซื้อ '||o.order_no||' ได้รับสิทธิ์ใช้งานแล้ว');
  end if;
  insert into public.cc_audit_logs(actor_id, action, resource, record_id, detail)
  values (p_admin, case when p_approve then 'payment_verified' else 'payment_rejected' end, 'cc_payments', p_payment::text, jsonb_build_object('order', o.order_no));
  return jsonb_build_object('ok', true, 'order_no', o.order_no, 'approved', p_approve);
end $$;

-- Income is computed only from cc_transactions (real recorded entries).
create or replace function public.cc_income_summary(p_from date, p_to date, p_grain text)
returns jsonb language sql stable security invoker set search_path = public, pg_temp as $$
  with t as (
    select date_trunc(case when p_grain in ('day','month','year') then p_grain else 'month' end, occurred_at at time zone 'Asia/Bangkok')::date as period,
           kind, source, amount_cents
    from public.cc_transactions
    where (occurred_at at time zone 'Asia/Bangkok')::date between p_from and p_to
  ), by_period as (
    select period,
      coalesce(sum(amount_cents) filter (where kind='income'),0) as income,
      coalesce(sum(amount_cents) filter (where kind='expense'),0) as expense,
      coalesce(sum(amount_cents) filter (where kind='api_cost'),0) as api_cost
    from t group by period order by period
  ), by_source as (
    select source, coalesce(sum(amount_cents),0) as income from t where kind='income' group by source
  )
  select jsonb_build_object(
    'periods', coalesce((select jsonb_agg(jsonb_build_object('period',period,'income',income,'expense',expense,'api_cost',api_cost,'net',income-expense-api_cost)) from by_period),'[]'::jsonb),
    'by_source', coalesce((select jsonb_agg(jsonb_build_object('source',source,'income',income)) from by_source),'[]'::jsonb),
    'totals', jsonb_build_object(
      'income', coalesce((select sum(amount_cents) from t where kind='income'),0),
      'expense', coalesce((select sum(amount_cents) from t where kind='expense'),0),
      'api_cost', coalesce((select sum(amount_cents) from t where kind='api_cost'),0))
  );
$$;

do $$
declare f text;
begin
  foreach f in array array['cc_create_quotation(text,jsonb,jsonb)','cc_create_order(text,jsonb)','cc_review_payment(text,uuid,boolean,text)','cc_income_summary(date,date,text)']
  loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;

-- Private storage for payment slips and licensed downloads (skipped where the storage schema is absent).
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='storage' and table_name='buckets') then
    insert into storage.buckets(id, name, public) values ('cc-slips','cc-slips',false), ('cc-downloads','cc-downloads',false) on conflict (id) do nothing;
  end if;
end $$;

-- Seed: existing programs are listed as in development. No price, review, sales figure or
-- feature claim is invented; the owner completes details and test results in the admin page.
insert into public.cc_categories(slug,name_th,name_en,sort_order) values
  ('ai-tools','เครื่องมือ AI','AI tools',1),
  ('business','ธุรกิจและเอกสาร','Business & documents',2)
on conflict (slug) do nothing;

insert into public.cc_products(slug,name_th,name_en,status) values
  ('quoteflow-ai','QuoteFlow AI','QuoteFlow AI','in_development'),
  ('smokewatch-ai','SmokeWatch AI','SmokeWatch AI','in_development'),
  ('ai-exam-generator','AI Exam Generator','AI Exam Generator','in_development'),
  ('ai-embroidery-studio','AI Embroidery Studio','AI Embroidery Studio','in_development'),
  ('spectral-scanner','Spectral Scanner','Spectral Scanner','in_development'),
  ('ai-creator-commerce-hub','AI Creator & Commerce Hub','AI Creator & Commerce Hub','in_development')
on conflict (slug) do nothing;
