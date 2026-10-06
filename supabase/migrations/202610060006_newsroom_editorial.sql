-- Existing Newsroom only: server-controlled editorial work, revision checks and approvals.
-- This migration is additive. No LINE/Social publishing or AI generation occurs here.
alter table public.newsroom_stories add column if not exists revision integer not null default 1;
alter table public.newsroom_stories add column if not exists content_revision integer not null default 1;
alter table public.newsroom_stories add column if not exists factchecked_content_revision integer;
alter table public.newsroom_stories add column if not exists factchecked_at timestamptz;
alter table public.newsroom_stories add column if not exists factchecked_by text;
alter table public.newsroom_stories add column if not exists factcheck_note text;
alter table public.newsroom_stories add column if not exists owner_approved_revision integer;
alter table public.newsroom_stories add column if not exists reporter text not null default '';
alter table public.newsroom_stories add column if not exists assigned_to text not null default '';
alter table public.newsroom_stories add column if not exists created_by text;
alter table public.newsroom_stories add column if not exists create_request_id uuid;
alter table public.newsroom_stories add column if not exists create_payload jsonb;
alter table public.newsroom_approvals add column if not exists approved_revision integer;
create unique index if not exists newsroom_create_request_idx on public.newsroom_stories(create_request_id);

-- Legacy booleans/approvals lack evidence and revision binding. Return those articles to review.
update public.newsroom_stories set verified=false,factchecked_at=null,factchecked_by=null,
 owner_approved_at=null,owner_approved_by=null,owner_approved_revision=null,
 status=case when status in ('ready','published') then 'editing' else status end,
 published_at=case when status in ('ready','published') then null else published_at end,
 updated_at=clock_timestamp()
 where (verified and factchecked_content_revision is null)
  or (owner_approved_at is not null and owner_approved_revision is null);

-- Revoke old RPCs: their status-only checks cannot bind approval to the reviewed revision.
revoke all on function public.newsroom_approve(uuid,text) from public,anon,authenticated,service_role;
revoke all on function public.newsroom_transition(uuid,text,text,text,jsonb,text) from public,anon,authenticated,service_role;
revoke all on public.newsroom_stories,public.newsroom_story_history,public.newsroom_approvals from public,anon,authenticated,service_role;
grant select on public.newsroom_stories,public.newsroom_story_history,public.newsroom_approvals to service_role;

create or replace function public.newsroom_valid_sources(p_sources jsonb,p_allow_empty boolean default false)
returns boolean language plpgsql immutable set search_path=public as $$
declare v jsonb; u text; label text;
begin
 if jsonb_typeof(p_sources) is distinct from 'array' then return false; end if;
 if jsonb_array_length(p_sources)>10 or (not p_allow_empty and jsonb_array_length(p_sources)=0) then return false; end if;
 for v in select value from jsonb_array_elements(p_sources) loop
  if jsonb_typeof(v)='string' then u:=v#>>'{}';
  elsif jsonb_typeof(v)='object' then
   if exists(select 1 from jsonb_object_keys(v) k where k not in ('url','label')) then return false; end if;
   if jsonb_typeof(v->'url') is distinct from 'string' then return false; end if;
   if v ? 'label' and (jsonb_typeof(v->'label') is distinct from 'string' or length(v->>'label')>200) then return false; end if;
   u:=v->>'url';
  else return false; end if;
  if length(u)>2048 or u !~ '^https?://[^/?#@[:space:]]+([/?#][^[:space:]]*)?$' then return false; end if;
 end loop;
 return true;
end $$;

create or replace function public.newsroom_validate_fields(p_fields jsonb,p_create boolean default false)
returns void language plpgsql immutable set search_path=public as $$
declare k text; v jsonb; limit_chars integer;
begin
 if jsonb_typeof(p_fields) is distinct from 'object' or p_fields='{}'::jsonb then raise exception 'invalid_fields'; end if;
 for k,v in select key,value from jsonb_each(p_fields) loop
  limit_chars:=case k when 'title' then 300 when 'summary' then 1500 when 'body' then 50000 when 'social_copy' then 8000 when 'image_brief' then 8000 when 'reporter' then 200 when 'assigned_to' then 200 else null end;
  if limit_chars is not null then
   if jsonb_typeof(v) is distinct from 'string' or length(v#>>'{}')>limit_chars then raise exception 'invalid_text'; end if;
  elsif k='sources' then
   if not newsroom_valid_sources(v,true) then raise exception 'invalid_sources'; end if;
  elsif k='media' then
   if v <> 'null'::jsonb then
    if jsonb_typeof(v) is distinct from 'object' or exists(select 1 from jsonb_object_keys(v) x where x not in ('type','url','alt'))
     or coalesce(v->>'type','') not in ('image','video') or jsonb_typeof(v->'url') is distinct from 'string'
     or length(v->>'url')>2048 or (v->>'url') !~ '^https://[^/?#@[:space:]]+([/?#][^[:space:]]*)?$'
     or (v ? 'alt' and (jsonb_typeof(v->'alt') is distinct from 'string' or length(v->>'alt')>500)) then raise exception 'invalid_media'; end if;
   end if;
  elsif k='category' then
   if jsonb_typeof(v) is distinct from 'string' or (v#>>'{}') not in ('AI','Tech','LINE','Meta','TikTok') then raise exception 'invalid_category'; end if;
  elsif k='slug' and p_create then
   if jsonb_typeof(v) is distinct from 'string' or (v#>>'{}') !~ '^[a-z0-9][a-z0-9-]{0,99}$' then raise exception 'invalid_slug'; end if;
  else raise exception 'unsupported_field'; end if;
 end loop;
 if p_create and (coalesce(btrim(p_fields->>'title'),'')='' or not(p_fields ? 'slug') or not(p_fields ? 'category')) then raise exception 'create_fields_required'; end if;
end $$;

create or replace function public.newsroom_source_requirements(p_story public.newsroom_stories)
returns boolean language sql immutable set search_path=public as $$
 select coalesce(btrim(p_story.title),'')<>'' and coalesce(btrim(p_story.body),'')<>'' and newsroom_valid_sources(p_story.sources);
$$;
create or replace function public.newsroom_ready_requirements(p_story public.newsroom_stories)
returns boolean language sql immutable set search_path=public as $$
 select newsroom_source_requirements(p_story) and coalesce(btrim(p_story.social_copy),'')<>'' and coalesce(btrim(p_story.image_brief),'')<>''
  and p_story.verified and p_story.factchecked_content_revision=p_story.content_revision;
$$;

create or replace function public.newsroom_owner_action(p_action text,p_actor text,p_input jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare s public.newsroom_stories%rowtype; fields jsonb; prior_status text; next_status text; allowed text[];
 req uuid; expected integer; factual_changed boolean; result jsonb;
begin
 if coalesce(btrim(p_actor),'')='' or length(p_actor)>200 or jsonb_typeof(p_input) is distinct from 'object' then raise exception 'invalid_actor_or_request'; end if;
 if p_action='list' then
  if p_input ? 'status' and coalesce(p_input->>'status','') not in ('pitched','assigned','drafting','factcheck','editing','ready','published','killed') then raise exception 'invalid_status'; end if;
  select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) into result from
   (select * from public.newsroom_stories where not(p_input ? 'status') or status=p_input->>'status' order by updated_at desc,id limit 100) t;
  return jsonb_build_object('stories',result);
 end if;
 if p_action='create' then
  req:=(p_input->>'request_id')::uuid; if req is null then raise exception 'request_id_required'; end if;
  fields:=p_input->'fields'; perform newsroom_validate_fields(fields,true);
  -- Serialize duplicate create requests; changed payloads may never replace a prior article.
  perform pg_advisory_xact_lock(hashtextextended(req::text,0));
  select * into s from public.newsroom_stories where create_request_id=req;
  if found then
   if s.create_payload is distinct from fields or s.created_by is distinct from p_actor then raise exception 'request_conflict'; end if;
   return to_jsonb(s);
  end if;
  if exists(select 1 from public.newsroom_stories where slug=fields->>'slug') then raise exception 'duplicate_slug'; end if;
  insert into public.newsroom_stories(slug,category,title,summary,body,sources,social_copy,image_brief,reporter,assigned_to,media,created_by,create_request_id,create_payload)
   values(fields->>'slug',fields->>'category',btrim(fields->>'title'),coalesce(fields->>'summary',''),coalesce(fields->>'body',''),coalesce(fields->'sources','[]'::jsonb),
   coalesce(fields->>'social_copy',''),coalesce(fields->>'image_brief',''),coalesce(fields->>'reporter',''),coalesce(fields->>'assigned_to',''),nullif(fields->'media','null'::jsonb),p_actor,req,fields)
   returning * into s;
  insert into public.newsroom_story_history(story_id,to_status,note,actor) values(s.id,'pitched','Created',p_actor);
  return to_jsonb(s);
 end if;
 if p_action not in ('update','factcheck','transition','approve','publish') then raise exception 'unknown_action'; end if;
 if jsonb_typeof(p_input->'expected_revision') is distinct from 'number' or (p_input->>'expected_revision') !~ '^[1-9][0-9]*$' then raise exception 'expected_revision_required'; end if;
 expected:=(p_input->>'expected_revision')::integer;
 select * into s from public.newsroom_stories where id=(p_input->>'story_id')::uuid for update;
 if not found then raise exception 'story_not_found'; end if;
 if s.revision<>expected then raise exception 'revision_conflict'; end if;
 prior_status:=s.status;
 if p_input ? 'note' and (jsonb_typeof(p_input->'note') is distinct from 'string' or length(p_input->>'note')>5000) then raise exception 'invalid_note'; end if;

 if p_action='update' then
  if s.status in ('ready','published','killed') then raise exception 'ready_locked'; end if;
  fields:=p_input->'patch'; perform newsroom_validate_fields(fields,false);
  factual_changed:=(fields ? 'title' and fields->>'title' is distinct from s.title)
   or (fields ? 'summary' and fields->>'summary' is distinct from s.summary)
   or (fields ? 'body' and fields->>'body' is distinct from s.body)
   or (fields ? 'sources' and fields->'sources' is distinct from s.sources);
  update public.newsroom_stories set title=coalesce(fields->>'title',title),category=coalesce(fields->>'category',category),
   summary=coalesce(fields->>'summary',summary),body=coalesce(fields->>'body',body),sources=coalesce(fields->'sources',sources),
   social_copy=coalesce(fields->>'social_copy',social_copy),image_brief=coalesce(fields->>'image_brief',image_brief),
   reporter=coalesce(fields->>'reporter',reporter),assigned_to=coalesce(fields->>'assigned_to',assigned_to),
   media=case when fields ? 'media' then nullif(fields->'media','null'::jsonb) else media end,
   revision=revision+1,content_revision=content_revision+case when factual_changed then 1 else 0 end,
   verified=case when factual_changed then false else verified end,
   factchecked_content_revision=case when factual_changed then null else factchecked_content_revision end,
   factchecked_at=case when factual_changed then null else factchecked_at end,
   factchecked_by=case when factual_changed then null else factchecked_by end,
   factcheck_note=case when factual_changed then null else factcheck_note end,
   owner_approved_at=null,owner_approved_by=null,owner_approved_revision=null,updated_at=clock_timestamp()
   where id=s.id returning * into s;
 elsif p_action='factcheck' then
  if s.status<>'factcheck' then raise exception 'invalid_transition'; end if;
  if not newsroom_source_requirements(s) then raise exception 'source_requirements_missing'; end if;
  if coalesce(p_input->>'verdict','') not in ('verified','needs_revision') or length(btrim(coalesce(p_input->>'note','')))<10 then raise exception 'factcheck_evidence_required'; end if;
  update public.newsroom_stories set verified=p_input->>'verdict'='verified',
   status=case when p_input->>'verdict'='verified' then 'factcheck' else 'drafting' end,
   factchecked_content_revision=case when p_input->>'verdict'='verified' then content_revision else null end,
   factchecked_at=clock_timestamp(),factchecked_by=p_actor,factcheck_note=p_input->>'note',
   owner_approved_at=null,owner_approved_by=null,owner_approved_revision=null,revision=revision+1,updated_at=clock_timestamp()
   where id=s.id returning * into s;
 elsif p_action='transition' then
  next_status:=p_input->>'to_status';
  allowed:=case s.status when 'pitched' then array['assigned','killed'] when 'assigned' then array['drafting','killed'] when 'drafting' then array['factcheck','killed'] when 'factcheck' then array['editing','drafting','killed'] when 'editing' then array['ready','drafting','killed'] when 'ready' then array['editing','killed'] else array[]::text[] end;
  if next_status is null or not(next_status=any(allowed)) then raise exception 'invalid_transition'; end if;
  if next_status='assigned' and btrim(s.reporter)='' and btrim(s.assigned_to)='' then raise exception 'assignment_required'; end if;
  if next_status='factcheck' and not newsroom_source_requirements(s) then raise exception 'source_requirements_missing'; end if;
  if next_status='editing' and s.status='factcheck' and (not s.verified or s.factchecked_content_revision is distinct from s.content_revision) then raise exception 'factcheck_required'; end if;
  if next_status='ready' and not coalesce(newsroom_ready_requirements(s),false) then raise exception 'ready_requirements_missing'; end if;
  update public.newsroom_stories set status=next_status,revision=revision+1,owner_approved_at=null,owner_approved_by=null,owner_approved_revision=null,
   updated_at=clock_timestamp(),published_at=null where id=s.id returning * into s;
 elsif p_action='approve' then
  if s.status<>'ready' or not coalesce(newsroom_ready_requirements(s),false) then raise exception 'ready_requirements_missing'; end if;
  if s.owner_approved_revision=s.revision and s.owner_approved_by=p_actor then return to_jsonb(s); end if;
  insert into public.newsroom_approvals(story_id,action,actor,approved_revision) values(s.id,'owner_approved',p_actor,s.revision)
   on conflict(story_id,action) do update set actor=excluded.actor,approved_revision=excluded.approved_revision,created_at=clock_timestamp();
  update public.newsroom_stories set owner_approved_at=clock_timestamp(),owner_approved_by=p_actor,owner_approved_revision=revision,
   updated_at=clock_timestamp() where id=s.id returning * into s;
 elsif p_action='publish' then
  if s.status='published' and s.owner_approved_revision=s.revision and s.owner_approved_by=p_actor then return to_jsonb(s); end if;
  if s.status<>'ready' or not coalesce(newsroom_ready_requirements(s),false) or s.owner_approved_at is null
   or s.owner_approved_by is distinct from p_actor or s.owner_approved_revision is distinct from s.revision then raise exception 'owner_approval_required'; end if;
  -- Keep the editorial revision unchanged: only publication status/time is added to the approved content.
  update public.newsroom_stories set status='published',published_at=clock_timestamp(),updated_at=clock_timestamp() where id=s.id returning * into s;
 end if;
 insert into public.newsroom_story_history(story_id,from_status,to_status,note,actor)
  values(s.id,prior_status,s.status,coalesce(p_input->>'note',p_action),p_actor);
 return to_jsonb(s);
end $$;

revoke all on function public.newsroom_valid_sources(jsonb,boolean) from public,anon,authenticated;
revoke all on function public.newsroom_validate_fields(jsonb,boolean) from public,anon,authenticated;
revoke all on function public.newsroom_source_requirements(public.newsroom_stories) from public,anon,authenticated;
revoke all on function public.newsroom_ready_requirements(public.newsroom_stories) from public,anon,authenticated;
revoke all on function public.newsroom_owner_action(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.newsroom_owner_action(text,text,jsonb) to service_role;
