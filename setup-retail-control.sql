-- Private shared inventory. Only verified LINE staff reach it through retail-control.
create table if not exists public.retail_staff (
 line_user_id text primary key check (line_user_id ~ '^U[0-9a-f]{32}$'),
 display_name text not null check (length(display_name) between 1 and 100),
 active boolean not null default true,
 created_at timestamptz not null default now()
);
create table if not exists public.retail_products (
 id uuid primary key default gen_random_uuid(),
 sku text not null unique check (length(sku) between 1 and 80),
 name text not null check (length(name) between 1 and 160),
 variant text not null default '' check (length(variant)<=80),
 price_cents bigint not null default 0 check (price_cents between 0 and 100000000),
 quantity integer not null default 0 check (quantity between 0 and 100000000),
 low_threshold integer not null default 3 check (low_threshold between 0 and 100000),
 updated_at timestamptz not null default now()
);
create table if not exists public.retail_transactions (
 id uuid primary key default gen_random_uuid(),
 actor text not null,
 request_id uuid not null,
 product_id uuid not null references public.retail_products(id),
 kind text not null check (kind in ('sale','receive')),
 quantity integer not null check (quantity between 1 and 100000),
 price_cents bigint not null check (price_cents between 0 and 100000000),
 channel text not null check (channel in ('store','line','facebook','tiktok','shopee','website','other')),
 note text not null default '' check (length(note)<=500),
 stock_after integer not null,
 created_at timestamptz not null default now(),
 unique(actor,request_id)
);
create index if not exists retail_transactions_created_idx on public.retail_transactions(created_at desc);
create index if not exists retail_transactions_product_idx on public.retail_transactions(product_id);
alter table public.retail_staff enable row level security;
alter table public.retail_products enable row level security;
alter table public.retail_transactions enable row level security;
revoke all on public.retail_staff,public.retail_products,public.retail_transactions from anon,authenticated;
grant all on public.retail_staff,public.retail_products,public.retail_transactions to service_role;

create or replace function public.retail_transact(p_actor text,p_request_id uuid,p_product uuid,p_kind text,p_quantity integer,p_channel text,p_note text,p_price_cents bigint)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare product public.retail_products; prior public.retail_transactions; tx public.retail_transactions; next_stock integer;
begin
 if p_kind not in ('sale','receive') or p_kind is null or p_quantity is null or p_quantity not between 1 and 100000 or p_channel is null or p_channel not in ('store','line','facebook','tiktok','shopee','website','other') or p_actor is null or p_request_id is null or p_product is null or p_price_cents is null or p_price_cents not between 0 and 100000000 or length(coalesce(p_note,''))>500 then raise exception 'invalid_transaction'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_actor||p_request_id::text,0));
 select * into prior from public.retail_transactions where actor=p_actor and request_id=p_request_id;
 if found then
  if prior.product_id<>p_product or prior.kind<>p_kind or prior.quantity<>p_quantity or prior.channel<>p_channel or prior.price_cents<>p_price_cents or prior.note<>coalesce(p_note,'') then raise exception 'request_conflict'; end if;
  return jsonb_build_object('transaction',to_jsonb(prior),'replayed',true);
 end if;
 select * into product from public.retail_products where id=p_product for update;
 if not found then raise exception 'product_not_found'; end if;
 next_stock=product.quantity+case when p_kind='sale' then -p_quantity else p_quantity end;
 if next_stock<0 then raise exception 'insufficient_stock'; end if;
 if next_stock>100000000 then raise exception 'stock_limit'; end if;
 update public.retail_products set quantity=next_stock,updated_at=now() where id=p_product;
 insert into public.retail_transactions(actor,request_id,product_id,kind,quantity,price_cents,channel,note,stock_after)
 values(p_actor,p_request_id,p_product,p_kind,p_quantity,p_price_cents,p_channel,coalesce(p_note,''),next_stock) returning * into tx;
 return jsonb_build_object('transaction',to_jsonb(tx),'replayed',false);
end $$;

create or replace function public.retail_snapshot(p_day date)
returns jsonb language sql stable security invoker set search_path=public,pg_temp as $$
 with bounds as (select p_day::timestamp at time zone 'Asia/Bangkok' as start_at,(p_day+1)::timestamp at time zone 'Asia/Bangkok' as end_at),
 today as (select t.* from public.retail_transactions t,bounds b where t.created_at>=b.start_at and t.created_at<b.end_at),
 channels as (select channel,sum(quantity) as units,sum(quantity*price_cents) as revenue_cents from today where kind='sale' group by channel),
 recent as (select t.*,p.name,p.variant,p.sku from public.retail_transactions t join public.retail_products p on p.id=t.product_id order by t.created_at desc limit 50)
 select jsonb_build_object(
  'day',p_day,'updated_at',now(),
  'products',coalesce((select jsonb_agg(to_jsonb(p) order by p.name,p.variant) from public.retail_products p),'[]'::jsonb),
  'stats',jsonb_build_object('sold',coalesce((select sum(quantity) from today where kind='sale'),0),'received',coalesce((select sum(quantity) from today where kind='receive'),0),'revenue_cents',coalesce((select sum(quantity*price_cents) from today where kind='sale'),0),'remaining',coalesce((select sum(quantity) from public.retail_products),0),'low',(select count(*) from public.retail_products where quantity>0 and quantity<=low_threshold),'out',(select count(*) from public.retail_products where quantity=0)),
  'channels',coalesce((select jsonb_agg(to_jsonb(c)) from channels c),'[]'::jsonb),
  'recent',coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc) from recent r),'[]'::jsonb)
 );
$$;
revoke all on function public.retail_transact(text,uuid,uuid,text,integer,text,text,bigint),public.retail_snapshot(date) from public,anon,authenticated;
grant execute on function public.retail_transact(text,uuid,uuid,text,integer,text,text,bigint),public.retail_snapshot(date) to service_role;
-- No seed sales, balances, staff, or products: the store starts with real data only.
