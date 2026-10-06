-- LINE identity and is_app_owner are verified by the stock Edge Function.
-- Browsers have no table/RPC privileges. No inventory or users are seeded.
begin;

create table public.stock_shops (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{0,63}$'),
  name text not null check (length(name) between 1 and 120),
  default_threshold integer not null default 3 check (default_threshold between 0 and 1000000),
  created_at timestamptz not null default now()
);
create table public.stock_shop_members (
  shop_id uuid not null references public.stock_shops(id),
  line_user_id text not null check (line_user_id ~ '^U[a-f0-9]{32}$'),
  display_name text not null check (length(display_name) between 1 and 200),
  role text not null check (role in ('OWNER','STAFF')),
  status text not null check (status in ('PENDING','ACTIVE','REVOKED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (shop_id,line_user_id),
  check (role <> 'OWNER' or status = 'ACTIVE')
);
create unique index stock_one_owner_per_shop on public.stock_shop_members(shop_id) where role='OWNER';
create index stock_shop_members_status_idx on public.stock_shop_members(shop_id,status);
create table public.stock_products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.stock_shops(id),
  name text not null check (length(name) between 1 and 200),
  name_key text generated always as (lower(name)) stored,
  created_at timestamptz not null default now(),
  unique (shop_id,name_key),
  unique (id,shop_id)
);
create table public.stock_variants (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.stock_shops(id),
  product_id uuid not null,
  sku text not null check (length(sku) between 1 and 100),
  color text not null default '' check (length(color) <= 100),
  size text not null default '' check (length(size) <= 50),
  stock_quantity integer not null default 0 check (stock_quantity between 0 and 1000000000),
  low_stock_threshold integer not null default 3 check (low_stock_threshold between 0 and 1000000),
  revision bigint not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (product_id,shop_id) references public.stock_products(id,shop_id),
  unique (id,shop_id)
);
create unique index stock_variants_sku_idx on public.stock_variants(shop_id,lower(sku));
create index stock_variants_product_idx on public.stock_variants(shop_id,product_id);
create table public.stock_transactions (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.stock_shops(id),
  variant_id uuid not null,
  request_id uuid not null,
  type text not null check (type in ('IN','OUT','ADJUST')),
  quantity integer not null check (quantity between 1 and 1000000000),
  before_quantity integer not null check (before_quantity >= 0),
  after_quantity integer not null check (after_quantity >= 0),
  revision bigint not null check (revision > 0),
  sales_channel text check (sales_channel in ('STORE','LINE','FACEBOOK','TIKTOK','SHOPEE','OTHER')),
  product_name text not null,
  sku text not null,
  color text not null,
  size text not null,
  line_user_id text not null,
  display_name text not null,
  order_reference text check (order_reference is null or length(order_reference)<=100),
  customer_name text check (customer_name is null or length(customer_name)<=100),
  note text not null default '' check (length(note) <= 2000),
  created_at timestamptz not null default now(),
  foreign key (variant_id,shop_id) references public.stock_variants(id,shop_id),
  foreign key (shop_id,line_user_id) references public.stock_shop_members(shop_id,line_user_id),
  unique (shop_id,line_user_id,request_id),
  check ((type='OUT' and sales_channel is not null) or (type<>'OUT' and sales_channel is null)),
  check ((type='IN' and after_quantity::bigint-before_quantity::bigint=quantity)
    or (type='OUT' and before_quantity::bigint-after_quantity::bigint=quantity)
    or (type='ADJUST' and abs(after_quantity::bigint-before_quantity::bigint)=quantity))
);
create index stock_transactions_history_idx on public.stock_transactions(shop_id,created_at desc,id);
create index stock_transactions_channel_idx on public.stock_transactions(shop_id,sales_channel,created_at desc) where type='OUT';
create index stock_transactions_variant_idx on public.stock_transactions(shop_id,variant_id,created_at desc);
create table public.stock_requests (
  shop_id uuid not null references public.stock_shops(id),
  line_user_id text not null,
  request_id uuid not null,
  action text not null check (action in ('transaction','product_create','member_update')),
  payload_hash text not null check (payload_hash ~ '^[a-f0-9]{64}$'),
  result jsonb not null check (jsonb_typeof(result)='object'),
  created_at timestamptz not null default now(),
  primary key (shop_id,line_user_id,request_id),
  foreign key (shop_id,line_user_id) references public.stock_shop_members(shop_id,line_user_id)
);

alter table public.stock_shops enable row level security;
alter table public.stock_shop_members enable row level security;
alter table public.stock_products enable row level security;
alter table public.stock_variants enable row level security;
alter table public.stock_transactions enable row level security;
alter table public.stock_requests enable row level security;
-- Remove Supabase default table grants, including service-role write grants.
revoke all on public.stock_shops,public.stock_shop_members,public.stock_products,public.stock_variants,public.stock_transactions,public.stock_requests from public,anon,authenticated,service_role;
grant select on public.stock_shops,public.stock_shop_members,public.stock_products,public.stock_variants,public.stock_transactions,public.stock_requests to service_role;

create function public.stock_action(p_action text,p_actor jsonb,p_input jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  actor_id text; actor_name text; app_owner boolean; shop_slug text;
  shop public.stock_shops; member public.stock_shop_members; target_member public.stock_shop_members;
  variant public.stock_variants; product public.stock_products; txn public.stock_transactions;
  prior public.stock_requests; v_request_id uuid; payload_hash text; result jsonb;
  allowed_fields text[]; field text; kind text; channel text; note text; order_reference text; customer_name text;
  qty integer; target_qty integer; threshold integer; expected_revision bigint;
  product_name text; input_sku text; color text; size text; days integer;
  variant_data jsonb; user_data jsonb; summary jsonb; start_today timestamptz;
begin
  -- SECURITY DEFINER changes current_user. Check the actual invoker's role.
  if current_setting('role',true) is distinct from 'service_role' and session_user<>'service_role' then
    raise exception using errcode='42501',message='service_role_required';
  end if;
  if p_action is null or p_action not in ('snapshot','join','members','member_update','product_create','transaction','history','request_status')
    or jsonb_typeof(p_actor) is distinct from 'object' or jsonb_typeof(p_input) is distinct from 'object' then
    raise exception using errcode='P0001',message='validation_failed';
  end if;
  if jsonb_typeof(p_actor->'line_user_id') is distinct from 'string' or jsonb_typeof(p_actor->'display_name') is distinct from 'string'
    or jsonb_typeof(p_actor->'is_app_owner') is distinct from 'boolean' then
    raise exception using errcode='P0001',message='validation_failed';
  end if;
  actor_id:=btrim(p_actor->>'line_user_id'); actor_name:=btrim(p_actor->>'display_name'); app_owner:=(p_actor->>'is_app_owner')::boolean;
  if actor_id !~ '^U[a-f0-9]{32}$' or length(actor_name) not between 1 and 200
    or actor_id ~ '[[:cntrl:]]' or actor_name ~ '[[:cntrl:]]' then raise exception using errcode='P0001',message='validation_failed'; end if;
  allowed_fields:=case p_action
    when 'snapshot' then array['shop_slug'] when 'join' then array['shop_slug'] when 'members' then array['shop_slug']
    when 'history' then array['shop_slug','days','sales_channel']
    when 'request_status' then array['shop_slug','request_id']
    when 'member_update' then array['shop_slug','request_id','member_line_user_id','status','role']
    when 'product_create' then array['shop_slug','request_id','name','sku','color','size','threshold','initial_quantity']
    when 'transaction' then array['shop_slug','request_id','variant_id','type','quantity','stock_quantity','expected_revision','sales_channel','order_reference','customer_name','note'] end;
  if exists(select 1 from jsonb_object_keys(p_input) k where not (k=any(allowed_fields))) then raise exception using errcode='P0001',message='validation_failed'; end if;
  if p_input ? 'shop_slug' and jsonb_typeof(p_input->'shop_slug') is distinct from 'string' then raise exception using errcode='P0001',message='validation_failed'; end if;
  shop_slug:=coalesce(p_input->>'shop_slug','main');
  if shop_slug !~ '^[a-z0-9][a-z0-9-]{0,63}$' then raise exception using errcode='P0001',message='validation_failed'; end if;
  if shop_slug='main' and app_owner then
    perform pg_advisory_xact_lock(hashtextextended('stock-bootstrap:main',0));
    insert into public.stock_shops(slug,name) values('main','ร้านหลัก') on conflict(slug) do nothing;
    select * into shop from public.stock_shops s where s.slug=shop_slug;
    if not exists(select 1 from public.stock_shop_members m where m.shop_id=shop.id and m.role='OWNER') then
      insert into public.stock_shop_members(shop_id,line_user_id,display_name,role,status) values(shop.id,actor_id,actor_name,'OWNER','ACTIVE')
      on conflict(shop_id,line_user_id) do update set role='OWNER',status='ACTIVE',display_name=excluded.display_name,updated_at=now();
    end if;
  end if;
  select * into shop from public.stock_shops s where s.slug=shop_slug;
  if not found then
    if shop_slug='main' and p_action='snapshot' then
      return jsonb_build_object('shop',null,'user',jsonb_build_object('line_user_id',actor_id,'display_name',actor_name,'role','NONE','status','NONE'),
        'variants','[]'::jsonb,'summary',jsonb_build_object('sold_today',0,'total_stock',0,'total_variants',0,'low_stock_count',0,'out_of_stock_count',0,
        'channels','[]'::jsonb));
    end if;
    raise exception using errcode='P0001',message='shop_not_found';
  end if;
  if p_action='join' then
    insert into public.stock_shop_members(shop_id,line_user_id,display_name,role,status) values(shop.id,actor_id,actor_name,'STAFF','PENDING') on conflict do nothing;
  end if;
  -- A concurrent revoke waits until authorized work finishes; no stale role window.
  select * into member from public.stock_shop_members m where m.shop_id=shop.id and m.line_user_id=actor_id for share;
  user_data:=jsonb_build_object('line_user_id',actor_id,'display_name',actor_name,
    'role',case when member.status='ACTIVE' then member.role when member.status='PENDING' then 'PENDING' else 'NONE' end,
    'status',coalesce(member.status,'NONE'));
  if p_action='join' then return jsonb_build_object('shop',to_jsonb(shop),'user',user_data); end if;
  start_today:=date_trunc('day',now() at time zone 'Asia/Bangkok') at time zone 'Asia/Bangkok';
  if p_action='snapshot' then
    summary:=jsonb_build_object('sold_today',0,'total_stock',0,'total_variants',0,'low_stock_count',0,'out_of_stock_count',0,
      'channels','[]'::jsonb);
    variant_data:='[]'::jsonb;
    if member.status='ACTIVE' then
      select coalesce(jsonb_agg(to_jsonb(v)||jsonb_build_object('name',p.name,'product_name',p.name) order by p.name,v.color,v.size,v.sku),'[]'::jsonb)
        into variant_data from public.stock_variants v join public.stock_products p on p.id=v.product_id and p.shop_id=v.shop_id where v.shop_id=shop.id;
      select jsonb_build_object('sold_today',(select coalesce(sum(t.quantity),0) from public.stock_transactions t where t.shop_id=shop.id and t.type='OUT' and t.created_at>=start_today),
        'total_stock',coalesce(sum(v.stock_quantity),0),'total_variants',count(*),'low_stock_count',count(*) filter(where v.stock_quantity>0 and v.stock_quantity<=v.low_stock_threshold),
        'out_of_stock_count',count(*) filter(where v.stock_quantity=0),'channels',(select jsonb_agg(jsonb_build_object('sales_channel',c.channel,'quantity',coalesce(t.qty,0)) order by c.position)
          from unnest(array['STORE','LINE','FACEBOOK','TIKTOK','SHOPEE','OTHER']) with ordinality c(channel,position)
          left join (select sales_channel,sum(quantity) qty from public.stock_transactions where shop_id=shop.id and type='OUT' and created_at>=start_today group by sales_channel) t on t.sales_channel=c.channel))
        into summary from public.stock_variants v where v.shop_id=shop.id;
    end if;
    return jsonb_build_object('shop',to_jsonb(shop),'user',user_data,'variants',variant_data,'summary',summary);
  end if;
  if member.status is distinct from 'ACTIVE' then raise exception using errcode='P0001',message='permission_denied'; end if;
  if p_action in ('members','member_update','product_create') and member.role<>'OWNER' then raise exception using errcode='P0001',message='permission_denied'; end if;
  if p_action='members' then
    return jsonb_build_object('members',(select coalesce(jsonb_agg(to_jsonb(m) order by m.created_at,m.line_user_id),'[]'::jsonb) from public.stock_shop_members m where m.shop_id=shop.id));
  end if;
  if p_action='history' then
    if p_input ? 'days' and (jsonb_typeof(p_input->'days') is distinct from 'number' or (p_input->>'days') not in ('1','7','30')) then raise exception using errcode='P0001',message='validation_failed'; end if;
    days:=coalesce((p_input->>'days')::integer,1);
    if p_input ? 'sales_channel' and (jsonb_typeof(p_input->'sales_channel') is distinct from 'string' or p_input->>'sales_channel' not in ('STORE','LINE','FACEBOOK','TIKTOK','SHOPEE','OTHER')) then raise exception using errcode='P0001',message='validation_failed'; end if;
    channel:=p_input->>'sales_channel';
    -- Read at most 501 matching rows so a capped history is explicitly labelled.
    with bounded as materialized (
      select to_jsonb(t) payload,t.created_at,t.id from public.stock_transactions t
      where t.shop_id=shop.id and t.created_at>=start_today-(days-1)*interval '1 day' and (channel is null or t.sales_channel=channel)
      order by t.created_at desc,t.id limit 501
    ), limited as (
      select * from bounded order by created_at desc,id limit 500
    ) select jsonb_build_object('transactions',(select coalesce(jsonb_agg(payload order by created_at desc,id),'[]'::jsonb) from limited),
      'truncated',(select count(*)>500 from bounded)) into result;
    return result;
  end if;
  if jsonb_typeof(p_input->'request_id') is distinct from 'string' or p_input->>'request_id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then raise exception using errcode='P0001',message='validation_failed'; end if;
  v_request_id:=(p_input->>'request_id')::uuid;
  if p_action='request_status' then
    select * into prior from public.stock_requests r where r.shop_id=shop.id and r.line_user_id=actor_id and r.request_id=v_request_id;
    if found then return jsonb_build_object('found',true,'result',prior.result); end if;
    return jsonb_build_object('found',false);
  end if;
  -- JSONB has stable key order. The action is part of the idempotency payload.
  payload_hash:=encode(sha256(convert_to(jsonb_build_object('action',p_action,'input',p_input)::text,'UTF8')),'hex');
  perform pg_advisory_xact_lock(hashtextextended('stock-request:'||shop.id::text||':'||actor_id||':'||v_request_id::text,0));
  select * into prior from public.stock_requests r where r.shop_id=shop.id and r.line_user_id=actor_id and r.request_id=v_request_id;
  if found then
    if prior.payload_hash<>payload_hash then raise exception using errcode='P0001',message='request_id_conflict'; end if;
    return prior.result||jsonb_build_object('replayed',true);
  end if;
  if p_action='member_update' then
    if jsonb_typeof(p_input->'member_line_user_id') is distinct from 'string' or p_input->>'member_line_user_id' !~ '^U[a-f0-9]{32}$'
      or jsonb_typeof(p_input->'status') is distinct from 'string' or p_input->>'status' not in ('ACTIVE','REVOKED')
      or (p_input ? 'role' and (jsonb_typeof(p_input->'role') is distinct from 'string' or p_input->>'role'<>'STAFF')) then raise exception using errcode='P0001',message='validation_failed'; end if;
    select * into target_member from public.stock_shop_members m where m.shop_id=shop.id and m.line_user_id=p_input->>'member_line_user_id' for update;
    if not found then raise exception using errcode='P0001',message='member_not_found'; end if;
    if target_member.role='OWNER' then raise exception using errcode='P0001',message='permission_denied'; end if;
    update public.stock_shop_members m set status=p_input->>'status',updated_at=now() where m.shop_id=shop.id and m.line_user_id=target_member.line_user_id returning * into target_member;
    result:=jsonb_build_object('user',to_jsonb(target_member),'replayed',false);
  elsif p_action='product_create' then
    if jsonb_typeof(p_input->'name') is distinct from 'string' or jsonb_typeof(p_input->'sku') is distinct from 'string'
      or jsonb_typeof(p_input->'color') is distinct from 'string' or jsonb_typeof(p_input->'size') is distinct from 'string' then raise exception using errcode='P0001',message='validation_failed'; end if;
    product_name:=btrim(p_input->>'name'); input_sku:=btrim(p_input->>'sku'); color:=btrim(coalesce(p_input->>'color','')); size:=btrim(coalesce(p_input->>'size',''));
    if length(product_name) not between 1 and 200 or length(input_sku) not between 1 and 100 or length(color) not between 1 and 100 or length(size) not between 1 and 50
      or product_name ~ '[[:cntrl:]]' or input_sku ~ '[[:cntrl:]]' or color ~ '[[:cntrl:]]' or size ~ '[[:cntrl:]]' then raise exception using errcode='P0001',message='validation_failed'; end if;
    foreach field in array array['threshold','initial_quantity'] loop
      if p_input ? field and (jsonb_typeof(p_input->field) is distinct from 'number' or (p_input->>field) !~ '^[0-9]{1,10}$'
        or (p_input->>field)::numeric>case when field='threshold' then 1000000 else 1000000000 end) then raise exception using errcode='P0001',message='validation_failed'; end if;
    end loop;
    threshold:=coalesce((p_input->>'threshold')::integer,shop.default_threshold); qty:=coalesce((p_input->>'initial_quantity')::integer,0);
    perform pg_advisory_xact_lock(hashtextextended('stock-sku:'||shop.id::text||':'||lower(input_sku),0));
    if exists(select 1 from public.stock_variants v where v.shop_id=shop.id and lower(v.sku)=lower(input_sku)) then raise exception using errcode='P0001',message='duplicate_sku'; end if;
    insert into public.stock_products(shop_id,name) values(shop.id,product_name) on conflict(shop_id,name_key) do update set name=public.stock_products.name returning * into product;
    insert into public.stock_variants(shop_id,product_id,sku,color,size,stock_quantity,low_stock_threshold) values(shop.id,product.id,input_sku,color,size,qty,threshold) returning * into variant;
    if qty>0 then
      insert into public.stock_transactions(shop_id,variant_id,request_id,type,quantity,before_quantity,after_quantity,revision,product_name,sku,color,size,line_user_id,display_name,note)
        values(shop.id,variant.id,v_request_id,'IN',qty,0,qty,variant.revision,product.name,variant.sku,variant.color,variant.size,actor_id,actor_name,'ยอดตั้งต้น') returning * into txn;
    end if;
    result:=jsonb_build_object('variant',to_jsonb(variant)||jsonb_build_object('name',product.name,'product_name',product.name),
      'transaction',case when qty>0 then to_jsonb(txn) else null end,'replayed',false);
  elsif p_action='transaction' then
    if jsonb_typeof(p_input->'variant_id') is distinct from 'string' or p_input->>'variant_id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or jsonb_typeof(p_input->'type') is distinct from 'string' or p_input->>'type' not in ('IN','OUT','ADJUST') then raise exception using errcode='P0001',message='validation_failed'; end if;
    kind:=p_input->>'type';
    if kind='ADJUST' and member.role<>'OWNER' then raise exception using errcode='P0001',message='permission_denied'; end if;
    if p_input ? 'note' and jsonb_typeof(p_input->'note') is distinct from 'string' then raise exception using errcode='P0001',message='validation_failed'; end if;
    note:=btrim(coalesce(p_input->>'note','')); if length(note)>2000 or regexp_replace(note,E'[\n\r\t]','','g') ~ '[[:cntrl:]]' then raise exception using errcode='P0001',message='validation_failed'; end if;
    foreach field in array array['order_reference','customer_name'] loop
      if p_input ? field and (jsonb_typeof(p_input->field) is distinct from 'string' or length(btrim(p_input->>field))>100
        or regexp_replace(p_input->>field,E'[\n\r\t]','','g') ~ '[[:cntrl:]]') then raise exception using errcode='P0001',message='validation_failed'; end if;
    end loop;
    order_reference:=nullif(btrim(p_input->>'order_reference'),''); customer_name:=nullif(btrim(p_input->>'customer_name'),'');
    if kind='OUT' then
      if jsonb_typeof(p_input->'sales_channel') is distinct from 'string' or p_input->>'sales_channel' not in ('STORE','LINE','FACEBOOK','TIKTOK','SHOPEE','OTHER') then raise exception using errcode='P0001',message='validation_failed'; end if;
      channel:=p_input->>'sales_channel';
    elsif p_input ? 'sales_channel' then raise exception using errcode='P0001',message='validation_failed'; end if;
    if kind='ADJUST' then
      if p_input ? 'quantity' or jsonb_typeof(p_input->'stock_quantity') is distinct from 'number' or (p_input->>'stock_quantity') !~ '^[0-9]{1,10}$' or (p_input->>'stock_quantity')::numeric>1000000000
        or jsonb_typeof(p_input->'expected_revision') is distinct from 'number' or (p_input->>'expected_revision') !~ '^[1-9][0-9]{0,14}$' then raise exception using errcode='P0001',message='validation_failed'; end if;
      target_qty:=(p_input->>'stock_quantity')::integer; expected_revision:=(p_input->>'expected_revision')::bigint;
    else
      if p_input ? 'stock_quantity' or p_input ? 'expected_revision' or jsonb_typeof(p_input->'quantity') is distinct from 'number'
        or (p_input->>'quantity') !~ '^[1-9][0-9]{0,9}$' or (p_input->>'quantity')::numeric>1000000000 then raise exception using errcode='P0001',message='validation_failed'; end if;
      qty:=(p_input->>'quantity')::integer;
    end if;
    select * into variant from public.stock_variants v where v.id=(p_input->>'variant_id')::uuid and v.shop_id=shop.id for update;
    if not found then raise exception using errcode='P0001',message='variant_not_found'; end if;
    select * into product from public.stock_products p where p.id=variant.product_id and p.shop_id=shop.id;
    if kind='ADJUST' then
      if variant.revision<>expected_revision then raise exception using errcode='P0001',message='revision_conflict'; end if;
      qty:=abs(target_qty-variant.stock_quantity); if qty=0 then raise exception using errcode='P0001',message='no_change'; end if;
    elsif kind='OUT' then
      if variant.stock_quantity<qty then raise exception using errcode='P0001',message='insufficient_stock'; end if;
      target_qty:=variant.stock_quantity-qty;
    else
      if variant.stock_quantity::bigint+qty>1000000000 then raise exception using errcode='P0001',message='validation_failed'; end if;
      target_qty:=variant.stock_quantity+qty;
    end if;
    insert into public.stock_transactions(shop_id,variant_id,request_id,type,quantity,before_quantity,after_quantity,revision,sales_channel,product_name,sku,color,size,line_user_id,display_name,order_reference,customer_name,note)
      values(shop.id,variant.id,v_request_id,kind,qty,variant.stock_quantity,target_qty,variant.revision+1,channel,product.name,variant.sku,variant.color,variant.size,actor_id,actor_name,order_reference,customer_name,note) returning * into txn;
    update public.stock_variants v set stock_quantity=target_qty,revision=v.revision+1,updated_at=now() where v.id=variant.id and v.shop_id=shop.id returning * into variant;
    result:=jsonb_build_object('transaction',to_jsonb(txn),'variant',to_jsonb(variant)||jsonb_build_object('name',product.name,'product_name',product.name),'replayed',false);
  else raise exception using errcode='P0001',message='validation_failed';
  end if;
  insert into public.stock_requests(shop_id,line_user_id,request_id,action,payload_hash,result) values(shop.id,actor_id,v_request_id,p_action,payload_hash,result);
  return result;
end $$;
revoke all on function public.stock_action(text,jsonb,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.stock_action(text,jsonb,jsonb) to service_role;

-- Only inventory variants are published; no membership or actor history is streamed.
do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(
    select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='stock_variants') then
    alter publication supabase_realtime add table public.stock_variants;
  end if;
end $$;
commit;
