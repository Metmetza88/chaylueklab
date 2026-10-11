-- LINE group assistant: opt-in per group, isolated from existing personal LINE functions.
create table if not exists public.line_assistant_groups (
  group_id text primary key check (group_id ~ '^C[0-9a-fA-F]{32}$'),
  enabled boolean not null default false,
  activated_by text not null check (activated_by ~ '^U[0-9a-fA-F]{32}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.line_assistant_messages (
  message_id text primary key check (char_length(message_id) between 1 and 120),
  group_id text not null references public.line_assistant_groups(group_id) on delete cascade,
  sender_id text check (sender_id is null or sender_id ~ '^U[0-9a-fA-F]{32}$'),
  content text not null check (char_length(content) between 1 and 2000),
  is_note boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists line_assistant_messages_recent on public.line_assistant_messages(group_id,created_at desc);
create table if not exists public.line_assistant_tasks (
  id uuid primary key default gen_random_uuid(),
  group_id text not null references public.line_assistant_groups(group_id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 300),
  created_by text check (created_by is null or created_by ~ '^U[0-9a-fA-F]{32}$'),
  source_message_id text unique,
  due_at timestamptz,
  status text not null default 'open' check (status in ('open','done')),
  notified_at timestamptz,
  notify_attempts int not null default 0 check (notify_attempts between 0 and 5),
  notify_claimed_until timestamptz,
  notify_error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists line_assistant_tasks_group on public.line_assistant_tasks(group_id,status,created_at desc);
create index if not exists line_assistant_tasks_due on public.line_assistant_tasks(due_at)
  where status='open' and due_at is not null and notified_at is null;
alter table public.line_assistant_groups enable row level security;
alter table public.line_assistant_messages enable row level security;
alter table public.line_assistant_tasks enable row level security;
revoke all on public.line_assistant_groups,public.line_assistant_messages,public.line_assistant_tasks from public,anon,authenticated;
grant select,insert,update,delete on public.line_assistant_groups,public.line_assistant_messages,public.line_assistant_tasks to service_role;

-- Lease rows before sending LINE pushes. A crash may generate a retry; no silent loss.
create or replace function public.line_assistant_claim_due(p_limit integer default 20)
returns setof public.line_assistant_tasks
language plpgsql security invoker set search_path='' as $$
begin
  return query
  with picked as (
    select t.id from public.line_assistant_tasks t
    join public.line_assistant_groups g on g.group_id=t.group_id
    where g.enabled and t.status='open' and t.due_at<=now() and t.notified_at is null
      and t.notify_attempts<5
      and (t.notify_claimed_until is null or t.notify_claimed_until<now())
    order by t.due_at, t.id
    limit greatest(1,least(coalesce(p_limit,20),50))
    for update of t skip locked
  )
  update public.line_assistant_tasks t
  set notify_attempts=t.notify_attempts+1,notify_claimed_until=now()+interval '2 minutes'
  from picked where t.id=picked.id returning t.*;
end;
$$;
revoke all on function public.line_assistant_claim_due(integer) from public,anon,authenticated;
grant execute on function public.line_assistant_claim_due(integer) to service_role;
