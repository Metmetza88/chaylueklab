-- CHAYLUEKLAB AI Chat quota (new objects only; no existing billing tables modified).
-- Apply only after review. No chat messages or raw prompts are saved in this table.
create table if not exists public.ai_chat_daily_usage (
  line_user_id text not null,
  usage_day date not null,
  requests integer not null default 0 check (requests >= 0),
  primary key (line_user_id, usage_day)
);
alter table public.ai_chat_daily_usage enable row level security;
revoke all on table public.ai_chat_daily_usage from public, anon, authenticated;
-- No anon/authenticated policies: only privileged Edge Functions can query it.

create or replace function public.ai_chat_consume_quota(
  p_user_id text,
  p_daily_limit integer default 12
) returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
  v_day date := (now() at time zone 'Asia/Bangkok')::date;
begin
  if p_user_id is null or length(p_user_id) = 0 or length(p_user_id) > 256
     or p_daily_limit is null or p_daily_limit < 1 or p_daily_limit > 20 then
    raise exception 'Invalid quota arguments';
  end if;

  insert into public.ai_chat_daily_usage as usage (line_user_id, usage_day, requests)
  values (p_user_id, v_day, 1)
  on conflict (line_user_id, usage_day)
    do update set requests = usage.requests + 1
    where usage.requests < p_daily_limit
  returning requests into v_count;

  return coalesce(v_count, 0);
end;
$$;
revoke all on function public.ai_chat_consume_quota(text,integer) from public,anon,authenticated;
grant execute on function public.ai_chat_consume_quota(text,integer) to service_role;
