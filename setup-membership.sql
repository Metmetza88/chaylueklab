create table public.billing_customers (
  line_user_id text primary key,
  stripe_customer_id text unique,
  checkout_token uuid,
  checkout_lease_until timestamptz,
  checkout_session_id text,
  checkout_url text,
  checkout_expires_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.billing_subscriptions (
  stripe_subscription_id text primary key,
  line_user_id text not null references public.billing_customers(line_user_id),
  stripe_customer_id text not null,
  status text not null,
  paid boolean not null default false,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  last_event_created bigint not null,
  updated_at timestamptz not null default now()
);
create index billing_subscriptions_member_idx on public.billing_subscriptions(line_user_id);
create table public.billing_events (
  stripe_event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);
alter table public.billing_customers enable row level security;
alter table public.billing_subscriptions enable row level security;
alter table public.billing_events enable row level security;
-- LINE identity is verified by server functions. Direct client access stays closed.
revoke all on public.billing_customers, public.billing_subscriptions, public.billing_events from public, anon, authenticated;
grant all on public.billing_customers, public.billing_subscriptions, public.billing_events to service_role;
alter table public.line_files enable row level security;
alter table public.line_notes enable row level security;
alter table public.line_issues enable row level security;

create function public.billing_reserve_checkout(p_user text, p_token uuid)
returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare c public.billing_customers;
begin
  insert into public.billing_customers(line_user_id) values(p_user) on conflict do nothing;
  select * into c from public.billing_customers where line_user_id=p_user for update;
  if c.checkout_url is not null and c.checkout_expires_at > now()+interval '1 minute' then
    return jsonb_build_object('cached',true,'url',c.checkout_url);
  end if;
  if c.checkout_lease_until > now() then return jsonb_build_object('busy',true); end if;
  update public.billing_customers set checkout_token=p_token, checkout_lease_until=now()+interval '2 minutes' where line_user_id=p_user;
  return jsonb_build_object('acquired',true,'customer',c.stripe_customer_id);
end $$;
revoke all on function public.billing_reserve_checkout(text,uuid) from public,anon,authenticated;
grant execute on function public.billing_reserve_checkout(text,uuid) to service_role;

create function public.billing_apply_event(p_event_id text,p_event_type text,p_event_created bigint,p_subscription jsonb)
returns boolean language plpgsql security invoker set search_path=public,pg_temp as $$
declare expected_customer text;
begin
  select stripe_customer_id into expected_customer from public.billing_customers where line_user_id=p_subscription->>'line_user_id' for update;
  if expected_customer is null or expected_customer<>p_subscription->>'customer' then
    raise exception 'subscription_customer_mismatch';
  end if;
  insert into public.billing_events(stripe_event_id,event_type) values(p_event_id,p_event_type) on conflict do nothing;
  if not found then return false; end if;
  insert into public.billing_subscriptions(stripe_subscription_id,line_user_id,stripe_customer_id,status,paid,current_period_end,cancel_at_period_end,last_event_created)
  values(p_subscription->>'id',p_subscription->>'line_user_id',expected_customer,p_subscription->>'status',
    (p_subscription->>'paid')::boolean,(p_subscription->>'period_end')::timestamptz,
    (p_subscription->>'cancel_at_period_end')::boolean,p_event_created)
  on conflict(stripe_subscription_id) do update set
    status=excluded.status,paid=excluded.paid,current_period_end=excluded.current_period_end,
    cancel_at_period_end=excluded.cancel_at_period_end,last_event_created=excluded.last_event_created,updated_at=now()
  where public.billing_subscriptions.last_event_created<=excluded.last_event_created;
  update public.billing_customers set checkout_url=null,checkout_expires_at=null,checkout_lease_until=null,checkout_token=null
    where line_user_id=p_subscription->>'line_user_id';
  return true;
end $$;
revoke all on function public.billing_apply_event(text,text,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.billing_apply_event(text,text,bigint,jsonb) to service_role;
