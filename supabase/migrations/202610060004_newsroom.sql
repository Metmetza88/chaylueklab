create table if not exists public.newsroom_stories (
 id uuid primary key default gen_random_uuid(), slug text unique not null, category text not null,
 title text not null, summary text, body text not null default '', sources jsonb not null default '[]',
 media jsonb, social_copy text, image_brief text, status text not null default 'pitched',
 verified boolean not null default false, owner_approved_at timestamptz, owner_approved_by text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), published_at timestamptz
);
create table if not exists public.newsroom_story_history (
 id uuid primary key default gen_random_uuid(), story_id uuid not null references public.newsroom_stories(id) on delete cascade,
 from_status text, to_status text not null, note text, actor text, created_at timestamptz not null default now()
);
create table if not exists public.newsroom_approvals (
 id uuid primary key default gen_random_uuid(), story_id uuid not null references public.newsroom_stories(id) on delete cascade,
 action text not null, actor text not null, created_at timestamptz not null default now(), unique(story_id, action)
);
create index if not exists newsroom_published_idx on public.newsroom_stories(status, owner_approved_at, published_at desc);
alter table public.newsroom_stories enable row level security;
alter table public.newsroom_story_history enable row level security;
alter table public.newsroom_approvals enable row level security;
do $$ begin
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='newsroom_stories' and policyname='newsroom_public_published') then
  create policy newsroom_public_published on public.newsroom_stories for select using (status='published' and owner_approved_at is not null and owner_approved_by is not null and verified=true);
 end if;
end $$;
