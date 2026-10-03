create table public.app_owner (
  singleton boolean primary key default true check(singleton),
  line_user_id text unique,
  claim_hash text,
  claim_expires_at timestamptz,
  claimed_at timestamptz
);
create table public.member_access_overrides (
  line_user_id text primary key,
  mode text not null check(mode in ('grant','block')),
  expires_at timestamptz,
  updated_by text not null,
  updated_at timestamptz not null default now()
);
create table public.admin_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id text not null,
  action text not null,
  resource text not null,
  record_id text,
  created_at timestamptz not null default now()
);
alter table public.app_owner enable row level security;
alter table public.member_access_overrides enable row level security;
alter table public.admin_audit enable row level security;
revoke all on public.app_owner,public.member_access_overrides,public.admin_audit from public,anon,authenticated;
grant all on public.app_owner,public.member_access_overrides,public.admin_audit to service_role;

create function public.claim_app_owner(p_user text,p_hash text)
returns boolean language plpgsql security invoker set search_path=public,pg_temp as $$
declare owner public.app_owner;
begin
  select * into owner from public.app_owner where singleton=true for update;
  if owner.line_user_id is not null then return owner.line_user_id=p_user; end if;
  if owner.claim_hash is null or owner.claim_hash<>p_hash or owner.claim_expires_at<now() then return false; end if;
  update public.app_owner set line_user_id=p_user,claim_hash=null,claim_expires_at=null,claimed_at=now() where singleton=true;
  return true;
end $$;
revoke all on function public.claim_app_owner(text,text) from public,anon,authenticated;
grant execute on function public.claim_app_owner(text,text) to service_role;

create function public.admin_member_list()
returns jsonb language sql security invoker set search_path=public,pg_temp as $$
 with users as (
  select line_user_id from public.line_reminders union select line_user_id from public.line_tasks
  union select line_user_id from public.line_finances union select line_user_id from public.line_files
  union select line_user_id from public.line_notes union select line_user_id from public.billing_customers
  union select line_user_id from public.member_access_overrides
 ), rows as (
  select u.line_user_id,
   (select requester_name from public.line_reminders r where r.line_user_id=u.line_user_id and requester_name is not null order by created_at desc limit 1) as display_name,
   (select count(*) from public.line_reminders r where r.line_user_id=u.line_user_id) as reminders,
   (select count(*) from public.line_tasks t where t.line_user_id=u.line_user_id) as tasks,
   (select count(*) from public.line_files f where f.line_user_id=u.line_user_id) as files,
   (select status from public.billing_subscriptions b where b.line_user_id=u.line_user_id order by current_period_end desc nulls last limit 1) as subscription_status,
   (select current_period_end from public.billing_subscriptions b where b.line_user_id=u.line_user_id order by current_period_end desc nulls last limit 1) as period_end,
   (select mode from public.member_access_overrides o where o.line_user_id=u.line_user_id) as access_override
  from users u where u.line_user_id is not null order by u.line_user_id limit 500
 ) select coalesce(jsonb_agg(rows),'[]'::jsonb) from rows;
$$;
revoke all on function public.admin_member_list() from public,anon,authenticated;
grant execute on function public.admin_member_list() to service_role;
