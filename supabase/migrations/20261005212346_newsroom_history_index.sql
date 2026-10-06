-- Support story audit-history reads without scanning the whole history table.
create index if not exists newsroom_story_history_story_idx
  on public.newsroom_story_history (story_id, created_at desc);
