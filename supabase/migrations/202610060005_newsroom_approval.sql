-- Atomic transitions keep approval tied to the content the owner reviewed.
create or replace function public.newsroom_approve(p_story_id uuid,p_actor text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare s newsroom_stories%rowtype;
begin
 select * into s from newsroom_stories where id=p_story_id for update;
 if not found or s.status <> 'ready' or not s.verified or nullif(p_actor,'') is null then raise exception 'Verified ready story required'; end if;
 insert into newsroom_approvals(story_id,action,actor) values(s.id,'owner_approved',p_actor)
 on conflict(story_id,action) do update set actor=excluded.actor,created_at=now();
 update newsroom_stories set owner_approved_at=now(),owner_approved_by=p_actor where id=s.id returning * into s;
 return to_jsonb(s);
end $$;
create or replace function public.newsroom_transition(p_story_id uuid,p_actor text,p_expected_status text,p_to_status text,p_patch jsonb,p_note text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare s newsroom_stories%rowtype; allowed text[];
begin
 select * into s from newsroom_stories where id=p_story_id for update;
 if not found or s.status <> p_expected_status then raise exception 'Story changed; reload'; end if;
 allowed := case s.status when 'pitched' then array['assigned','killed'] when 'assigned' then array['drafting','killed'] when 'drafting' then array['factcheck','killed'] when 'factcheck' then array['editing','drafting','killed'] when 'editing' then array['ready','drafting','killed'] when 'ready' then array['published','editing','killed'] else array[]::text[] end;
 if not(p_to_status=any(allowed)) then raise exception 'Invalid transition'; end if;
 if p_to_status='published' and (s.owner_approved_at is null or s.owner_approved_by is null or not s.verified or p_patch <> '{}'::jsonb) then raise exception 'Owner approval required'; end if;
 if exists(select 1 from jsonb_object_keys(p_patch) k where k not in ('title','summary','body','sources','social_copy','image_brief','verified')) then raise exception 'Unsupported field'; end if;
 update newsroom_stories set
 title=coalesce(p_patch->>'title',title),summary=coalesce(p_patch->>'summary',summary),body=coalesce(p_patch->>'body',body),
 sources=coalesce(p_patch->'sources',sources),social_copy=coalesce(p_patch->>'social_copy',social_copy),image_brief=coalesce(p_patch->>'image_brief',image_brief),
 verified=coalesce((p_patch->>'verified')::boolean,verified),status=p_to_status,updated_at=now(),
 owner_approved_at=case when p_to_status='published' then owner_approved_at else null end,
 owner_approved_by=case when p_to_status='published' then owner_approved_by else null end,
 published_at=case when p_to_status='published' then now() else null end
 where id=s.id returning * into s;
 insert into newsroom_story_history(story_id,from_status,to_status,note,actor) values(s.id,p_expected_status,p_to_status,p_note,p_actor);
 return to_jsonb(s);
end $$;
revoke all on function public.newsroom_approve(uuid,text) from public,anon,authenticated;
revoke all on function public.newsroom_transition(uuid,text,text,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.newsroom_approve(uuid,text) to service_role;
grant execute on function public.newsroom_transition(uuid,text,text,text,jsonb,text) to service_role;
