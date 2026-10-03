create table if not exists public.membership_trials (
 line_user_id text primary key check (line_user_id ~ '^U[0-9a-fA-F]{32}$'),
 started_at timestamptz not null default now(),
 expires_at timestamptz not null default (now() + interval '7 days'),
 check (expires_at = started_at + interval '7 days')
);
alter table public.membership_trials enable row level security;
revoke all on public.membership_trials from public, anon, authenticated;
grant select,insert on public.membership_trials to service_role;
create or replace function public.membership_start_trial(p_user text)
returns table(started_at timestamptz, expires_at timestamptz)
language plpgsql security invoker set search_path = '' as $$
begin
 insert into public.membership_trials(line_user_id) values(p_user) on conflict (line_user_id) do nothing;
 return query select t.started_at,t.expires_at from public.membership_trials t where t.line_user_id=p_user;
end;
$$;
revoke all on function public.membership_start_trial(text) from public,anon,authenticated;
grant execute on function public.membership_start_trial(text) to service_role;
