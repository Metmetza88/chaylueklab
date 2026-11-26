begin;
-- RLS scopes rows. Column grants keep unpublished review results out of the Data API.
revoke select on public.school_applications from public, anon, authenticated;
grant select (
  id, school_id, round_id, applicant_id, application_no, grade_level,
  student_name, guardian_name, guardian_phone, previous_school,
  consent_at, consent_version, created_at
) on public.school_applications to authenticated;

-- The server passes the authenticated applicant's ID and never exposes this RPC to clients.
create function public.school_list_applicant_applications(p_school uuid, p_applicant uuid)
returns table (
  id uuid,
  application_no text,
  student_name text,
  grade_level text,
  round_name text,
  status text,
  review_note text,
  school_documents jsonb
)
language sql stable security invoker set search_path = '' as $$
  select a.id, a.application_no, a.student_name, a.grade_level, r.name,
    case
      when a.status in ('approved', 'rejected') and not r.results_published
        then 'awaiting_publication'
      else a.status
    end,
    case
      when a.status in ('approved', 'rejected') and not r.results_published
        then null
      else a.review_note
    end,
    coalesce((
      select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('id', d.id, 'kind', d.kind) order by d.kind)
      from public.school_documents d
      where d.school_id = a.school_id and d.application_id = a.id
    ), '[]'::jsonb)
  from public.school_applications a
  join public.school_rounds r on r.id = a.round_id and r.school_id = a.school_id
  where a.school_id = p_school and a.applicant_id = p_applicant
  order by a.created_at desc, a.id desc;
$$;

revoke all on function public.school_list_applicant_applications(uuid, uuid) from public, anon, authenticated;
grant execute on function public.school_list_applicant_applications(uuid, uuid) to service_role;

create index school_applications_queue_idx
  on public.school_applications(school_id, created_at desc, id desc);
commit;
