-- Remember explicitly saved facts separately from the 30-day conversation transcript.
-- No cross-OA sharing: only this group's verified webhook can write memories.
create table if not exists public.line_assistant_memories (
  id uuid primary key default gen_random_uuid(),
  group_id text not null references public.line_assistant_groups(group_id) on delete cascade,
  sender_id text check (sender_id is null or sender_id ~ '^U[0-9a-fA-F]{32}$'),
  source_message_id text not null unique,
  content text not null check (char_length(btrim(content)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists line_assistant_memories_group_recent on public.line_assistant_memories(group_id,created_at desc);
alter table public.line_assistant_memories enable row level security;
revoke all on public.line_assistant_memories from public,anon,authenticated;
grant select,insert,delete on public.line_assistant_memories to service_role;
