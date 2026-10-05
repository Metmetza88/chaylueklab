-- Run this after setup-membership.sql, setup-trial.sql and setup-owner.sql.
-- Video credits are server-side. A job costs ceil(duration / 4) credits:
-- Free = 2 credits/month (one 8s Veo job), Plus = 12 credits/month.
-- Change the two constants below only through a reviewed migration.

create extension if not exists pgcrypto;

create table if not exists public.video_credit_accounts (
  line_user_id text not null,
  month_start date not null,
  plan_tier text not null check (plan_tier in ('free','plus','owner')),
  credit_limit integer not null check (credit_limit >= 0),
  used_credits integer not null default 0 check (used_credits >= 0),
  reserved_credits integer not null default 0 check (reserved_credits >= 0),
  updated_at timestamptz not null default now(),
  primary key (line_user_id, month_start)
);

create table if not exists public.video_jobs (
  id uuid primary key default gen_random_uuid(),
  line_user_id text not null,
  client_request_id text not null,
  model text not null check (model in ('veo','runway')),
  aspect_ratio text not null check (aspect_ratio in ('9:16','16:9')),
  duration_seconds integer not null check (duration_seconds in (4,6,8,10)),
  prompt text not null,
  status text not null default 'queued' check (status in ('queued','generating','completed','failed')),
  progress numeric(5,4) not null default 0 check (progress >= 0 and progress <= 1),
  provider_job_id text,
  provider_operation text,
  video_path text,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(line_user_id, client_request_id)
);
create index if not exists video_jobs_user_created_idx on public.video_jobs(line_user_id, created_at desc);
create index if not exists video_jobs_provider_idx on public.video_jobs(provider_job_id) where provider_job_id is not null;

create table if not exists public.video_credit_ledger (
  job_id uuid primary key references public.video_jobs(id) on delete cascade,
  line_user_id text not null,
  month_start date not null,
  amount integer not null check (amount > 0),
  state text not null check (state in ('reserved','charged','released')),
  reserved_at timestamptz not null default now(),
  charged_at timestamptz,
  released_at timestamptz,
  unique(job_id)
);
create index if not exists video_credit_ledger_user_month_idx on public.video_credit_ledger(line_user_id,month_start);

alter table public.video_credit_accounts enable row level security;
alter table public.video_jobs enable row level security;
alter table public.video_credit_ledger enable row level security;
revoke all on public.video_credit_accounts, public.video_jobs, public.video_credit_ledger from public, anon, authenticated;
grant all on public.video_credit_accounts, public.video_jobs, public.video_credit_ledger to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('video-generations','video-generations',false,52428800,array['video/mp4'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create or replace function public.video_create_job(
  p_user text, p_request_id text, p_model text, p_ratio text,
  p_duration integer, p_prompt text
) returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare
  v_month date := date_trunc('month',now() at time zone 'Asia/Bangkok')::date;
  v_cost integer := ceil(p_duration::numeric/4)::integer;
  v_tier text := 'free'; v_limit integer := 2;
  v_existing public.video_jobs; v_account public.video_credit_accounts; v_job public.video_jobs;
  v_owner boolean := false; v_paid boolean := false; v_grant boolean := false; v_trial boolean := false;
begin
  if p_user is null or length(trim(p_user))=0 then raise exception 'invalid_line_user'; end if;
  if p_request_id is null or length(trim(p_request_id))<8 or length(p_request_id)>120 then raise exception 'invalid_request_id'; end if;
  if p_model not in ('veo','runway') then raise exception 'unsupported_video_model'; end if;
  if p_ratio not in ('9:16','16:9') then raise exception 'invalid_aspect_ratio'; end if;
  if p_duration not in (4,6,8,10) then raise exception 'invalid_duration'; end if;
  if p_prompt is null or length(trim(p_prompt))<8 or length(p_prompt)>12000 then raise exception 'invalid_prompt'; end if;

  select * into v_existing from public.video_jobs where line_user_id=p_user and client_request_id=p_request_id;
  if found then
    return jsonb_build_object('replayed',true,'job_id',v_existing.id,'status',v_existing.status,'cost',coalesce((select amount from public.video_credit_ledger where job_id=v_existing.id),v_cost));
  end if;

  select exists(select 1 from public.app_owner where singleton=true and line_user_id=p_user) into v_owner;
  select exists(select 1 from public.member_access_overrides where line_user_id=p_user and mode='grant' and (expires_at is null or expires_at>now())) into v_grant;
  select exists(select 1 from public.billing_subscriptions where line_user_id=p_user and status='active' and paid and current_period_end>now()) into v_paid;
  select exists(select 1 from public.membership_trials where line_user_id=p_user and expires_at>now()) into v_trial;
  if v_owner then v_tier:='owner';v_limit:=100000;
  elsif v_grant or v_paid then v_tier:='plus';v_limit:=12;
  else v_tier:='free';v_limit:=2;
  end if;

  insert into public.video_credit_accounts(line_user_id,month_start,plan_tier,credit_limit)
  values(p_user,v_month,v_tier,v_limit)
  on conflict(line_user_id,month_start) do update set plan_tier=excluded.plan_tier,credit_limit=excluded.credit_limit,updated_at=now();
  select * into v_account from public.video_credit_accounts where line_user_id=p_user and month_start=v_month for update;
  if v_account.used_credits+v_account.reserved_credits+v_cost>v_account.credit_limit then raise exception 'video_quota_exceeded'; end if;

  insert into public.video_jobs(line_user_id,client_request_id,model,aspect_ratio,duration_seconds,prompt)
  values(p_user,p_request_id,p_model,p_ratio,p_duration,trim(p_prompt)) returning * into v_job;
  insert into public.video_credit_ledger(job_id,line_user_id,month_start,amount,state)
  values(v_job.id,p_user,v_month,v_cost,'reserved');
  update public.video_credit_accounts set reserved_credits=reserved_credits+v_cost,updated_at=now() where line_user_id=p_user and month_start=v_month;
  return jsonb_build_object('replayed',false,'job_id',v_job.id,'status','queued','cost',v_cost,'tier',v_tier,'credit_limit',v_account.credit_limit,'used_credits',v_account.used_credits,'reserved_credits',v_account.reserved_credits+v_cost);
exception when unique_violation then
  select * into v_existing from public.video_jobs where line_user_id=p_user and client_request_id=p_request_id;
  if found then return jsonb_build_object('replayed',true,'job_id',v_existing.id,'status',v_existing.status); end if;
  raise;
end $$;
revoke all on function public.video_create_job(text,text,text,text,integer,text) from public,anon,authenticated;
grant execute on function public.video_create_job(text,text,text,text,integer,text) to service_role;

create or replace function public.video_mark_provider_accepted(p_job uuid,p_provider text,p_provider_job_id text,p_operation text default null)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare j public.video_jobs; l public.video_credit_ledger; a public.video_credit_accounts;
begin
  select * into j from public.video_jobs where id=p_job for update;
  if not found then raise exception 'video_job_not_found'; end if;
  if j.status in ('generating','completed') then return jsonb_build_object('ok',true,'status',j.status,'job_id',j.id); end if;
  if j.status='failed' then raise exception 'video_job_failed'; end if;
  if p_provider_job_id is null or length(p_provider_job_id)<3 then raise exception 'invalid_provider_job'; end if;
  select * into l from public.video_credit_ledger where job_id=j.id for update;
  if l.state<>'reserved' then raise exception 'video_credit_not_reserved'; end if;
  select * into a from public.video_credit_accounts where line_user_id=l.line_user_id and month_start=l.month_start for update;
  update public.video_jobs set status='generating',provider_job_id=p_provider_job_id,provider_operation=p_operation,accepted_at=now(),updated_at=now() where id=j.id;
  update public.video_credit_ledger set state='charged',charged_at=now() where job_id=j.id;
  update public.video_credit_accounts set reserved_credits=greatest(0,reserved_credits-l.amount),used_credits=used_credits+l.amount,updated_at=now() where line_user_id=a.line_user_id and month_start=a.month_start;
  return jsonb_build_object('ok',true,'status','generating','job_id',j.id,'charged',l.amount);
end $$;
revoke all on function public.video_mark_provider_accepted(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.video_mark_provider_accepted(uuid,text,text,text) to service_role;

create or replace function public.video_release_credit(p_job uuid,p_code text,p_message text default null)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare j public.video_jobs; l public.video_credit_ledger;
begin
  select * into j from public.video_jobs where id=p_job for update;
  if not found then raise exception 'video_job_not_found'; end if;
  select * into l from public.video_credit_ledger where job_id=j.id for update;
  if l.state='reserved' then
    update public.video_credit_accounts set reserved_credits=greatest(0,reserved_credits-l.amount),updated_at=now() where line_user_id=l.line_user_id and month_start=l.month_start;
    update public.video_credit_ledger set state='released',released_at=now() where job_id=j.id;
  end if;
  update public.video_jobs set status='failed',error_code=left(p_code,120),error_message=left(coalesce(p_message,p_code),500),updated_at=now() where id=j.id and status<>'completed';
  return jsonb_build_object('ok',true,'status','failed');
end $$;
revoke all on function public.video_release_credit(uuid,text,text) from public,anon,authenticated;
grant execute on function public.video_release_credit(uuid,text,text) to service_role;

create or replace function public.video_update_progress(p_job uuid,p_progress numeric)
returns boolean language plpgsql security invoker set search_path=public,pg_temp as $$
begin
  update public.video_jobs set progress=greatest(0,least(1,p_progress)),updated_at=now() where id=p_job and status='generating';
  return found;
end $$;
revoke all on function public.video_update_progress(uuid,numeric) from public,anon,authenticated;
grant execute on function public.video_update_progress(uuid,numeric) to service_role;

create or replace function public.video_complete_job(p_job uuid,p_path text)
returns boolean language plpgsql security invoker set search_path=public,pg_temp as $$
begin
  update public.video_jobs set status='completed',progress=1,video_path=p_path,completed_at=now(),updated_at=now() where id=p_job and status='generating';
  return found;
end $$;
revoke all on function public.video_complete_job(uuid,text) from public,anon,authenticated;
grant execute on function public.video_complete_job(uuid,text) to service_role;
