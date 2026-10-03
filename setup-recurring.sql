-- Recurring reminders run through the existing dispatcher; no public cron endpoint.
-- Asia/Bangkok schedules produce at most one catch-up and consume reminder quota.
create table public.recurring_reminder_rules (
  id uuid primary key default gen_random_uuid(),
  line_user_id text not null check (line_user_id ~ '^U[0-9a-fA-F]{32}$'),
  target_id text not null check (target_id = line_user_id),
  title text not null check (length(btrim(title)) between 1 and 300),
  cadence text not null check (cadence in ('daily','weekly','monthly')),
  time_local text not null check (time_local ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  weekday integer check (weekday between 1 and 7),
  month_day integer check (month_day between 1 and 31),
  next_due_at timestamptz not null,
  status text not null default 'active' check (status in ('active','paused','suspended')),
  error text,
  create_request_id uuid,
  last_generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((cadence='daily' and weekday is null and month_day is null)
    or (cadence='weekly' and weekday is not null and month_day is null)
    or (cadence='monthly' and weekday is null and month_day is not null)),
  unique(line_user_id,create_request_id)
);
create index recurring_rules_owner on public.recurring_reminder_rules (line_user_id,status,next_due_at);
create index recurring_rules_due on public.recurring_reminder_rules (next_due_at) where status='active';
alter table public.recurring_reminder_rules enable row level security;
revoke all on public.recurring_reminder_rules from public,anon,authenticated;
grant select,insert,update,delete on public.recurring_reminder_rules to service_role;

alter table public.line_reminders add column recurring_rule_id uuid references public.recurring_reminder_rules(id) on delete set null;
alter table public.line_reminders add column recurring_occurrence_at timestamptz;
create unique index recurring_reminder_occurrence on public.line_reminders (recurring_rule_id,recurring_occurrence_at) where recurring_rule_id is not null;

create function public.recurring_has_premium(p_user text)
returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.app_owner where singleton=true and line_user_id=p_user)
 or (not exists(select 1 from public.member_access_overrides o where o.line_user_id=p_user and o.mode='block' and (o.expires_at is null or o.expires_at>now()))
 and (exists(select 1 from public.member_access_overrides o where o.line_user_id=p_user and o.mode='grant' and (o.expires_at is null or o.expires_at>now()))
 or exists(select 1 from public.billing_subscriptions s where s.line_user_id=p_user and s.status='active' and s.paid and s.current_period_end>now())
 or exists(select 1 from public.membership_trials t where t.line_user_id=p_user and t.expires_at>now())));
$$;

create function public.recurring_next_due(p_cadence text,p_time_local text,p_weekday integer,p_month_day integer,p_after timestamptz)
returns timestamptz language plpgsql stable security invoker set search_path='' as $$
declare local_after timestamp := p_after at time zone 'Asia/Bangkok'; day_local date := local_after::date; candidate timestamp; month_start date; final_day integer;
begin
 if p_after is null or p_time_local is null or p_time_local !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'invalid_schedule'; end if;
 if p_cadence='daily' then
  candidate:=day_local+p_time_local::time;
  if candidate<=local_after then candidate:=candidate+interval '1 day'; end if;
 elsif p_cadence='weekly' then
  if p_weekday is null or p_weekday not between 1 and 7 then raise exception 'invalid_schedule'; end if;
  candidate:=day_local+((p_weekday-extract(isodow from day_local)::integer+7)%7)+p_time_local::time;
  if candidate<=local_after then candidate:=candidate+interval '7 days'; end if;
 elsif p_cadence='monthly' then
  if p_month_day is null or p_month_day not between 1 and 31 then raise exception 'invalid_schedule'; end if;
  month_start:=date_trunc('month',local_after)::date;
  final_day:=extract(day from (month_start+interval '1 month - 1 day'))::integer;
  candidate:=month_start+(least(p_month_day,final_day)-1)+p_time_local::time;
  if candidate<=local_after then
   month_start:=(month_start+interval '1 month')::date;
   final_day:=extract(day from (month_start+interval '1 month - 1 day'))::integer;
   candidate:=month_start+(least(p_month_day,final_day)-1)+p_time_local::time;
  end if;
 else raise exception 'invalid_schedule';
 end if;
 return candidate at time zone 'Asia/Bangkok';
end;
$$;

create function public.recurring_manage_rule(p_user text,p_action text,p_id uuid default null,p_title text default null,p_cadence text default null,p_time_local text default null,p_weekday integer default null,p_month_day integer default null,p_request_id uuid default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare rule public.recurring_reminder_rules; owner boolean; active_count integer; result jsonb;
begin
 if p_user is null or p_user !~ '^U[0-9a-fA-F]{32}$' then raise exception 'invalid_user'; end if;
 if p_action='list' then
  select coalesce(jsonb_agg(to_jsonb(r) order by r.next_due_at),'[]'::jsonb) into result
  from (select id,title,cadence,time_local,weekday,month_day,next_due_at,status,error,last_generated_at,created_at from public.recurring_reminder_rules where line_user_id=p_user and target_id=p_user order by next_due_at limit 500) r;
  return jsonb_build_object('ok',true,'rules',result);
 end if;
 if p_action not in ('create','pause','resume','delete') then raise exception 'invalid_action'; end if;
 -- All create/resume mutations for an account share this transaction lock.
 perform pg_advisory_xact_lock(hashtextextended('recurring:'||p_user,0));
 if p_action in ('create','resume') then
  if not public.recurring_has_premium(p_user) then raise exception 'premium_required'; end if;
  select exists(select 1 from public.app_owner where singleton=true and line_user_id=p_user) into owner;
 end if;
 if p_action='create' then
  if p_title is null or length(btrim(p_title)) not between 1 and 300 then raise exception 'invalid_title'; end if;
  if p_cadence is null or p_cadence not in ('daily','weekly','monthly') then raise exception 'invalid_schedule'; end if;
  if (p_cadence='daily' and (p_weekday is not null or p_month_day is not null)) or (p_cadence='weekly' and (p_weekday is null or p_weekday not between 1 and 7 or p_month_day is not null)) or (p_cadence='monthly' and (p_month_day is null or p_month_day not between 1 and 31 or p_weekday is not null)) then raise exception 'invalid_schedule'; end if;
  if p_request_id is not null then
   select * into rule from public.recurring_reminder_rules where line_user_id=p_user and target_id=p_user and create_request_id=p_request_id;
   if found then
    if rule.title<>btrim(p_title) or rule.cadence<>p_cadence or rule.time_local is distinct from p_time_local or rule.weekday is distinct from p_weekday or rule.month_day is distinct from p_month_day then raise exception 'request_conflict'; end if;
    return jsonb_build_object('ok',true,'rule',to_jsonb(rule)-'line_user_id'-'target_id','already',true);
   end if;
  end if;
  select count(*) into active_count from public.recurring_reminder_rules where line_user_id=p_user and status='active';
  if not owner and active_count>=10 then raise exception 'recurring_limit_reached'; end if;
  insert into public.recurring_reminder_rules(line_user_id,target_id,title,cadence,time_local,weekday,month_day,next_due_at,create_request_id)
  values(p_user,p_user,btrim(p_title),p_cadence,p_time_local,p_weekday,p_month_day,public.recurring_next_due(p_cadence,p_time_local,p_weekday,p_month_day,now()),p_request_id) returning * into rule;
 else
  select * into rule from public.recurring_reminder_rules where id=p_id and line_user_id=p_user and target_id=p_user for update;
  if not found then raise exception 'rule_not_found'; end if;
  if p_action='resume' then
   if rule.status<>'active' then
    select count(*) into active_count from public.recurring_reminder_rules where line_user_id=p_user and status='active';
    if not owner and active_count>=10 then raise exception 'recurring_limit_reached'; end if;
    update public.recurring_reminder_rules set status='active',error=null,next_due_at=public.recurring_next_due(cadence,time_local,weekday,month_day,now()),updated_at=now() where id=rule.id returning * into rule;
   end if;
  elsif p_action='pause' then
   update public.recurring_reminder_rules set status='paused',error=null,updated_at=now() where id=rule.id returning * into rule;
   update public.line_reminders set status='cancelled',error='recurring_paused' where recurring_rule_id=rule.id and status='pending';
  elsif p_action='delete' then
   update public.line_reminders set status='cancelled',error='recurring_deleted' where recurring_rule_id=rule.id and status='pending';
   delete from public.recurring_reminder_rules where id=rule.id;
   return jsonb_build_object('ok',true,'deleted',true,'id',rule.id);
  end if;
 end if;
 return jsonb_build_object('ok',true,'rule',to_jsonb(rule)-'line_user_id'-'target_id');
end;
$$;

create function public.recurring_generate_due(p_limit integer default 50)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare rule public.recurring_reminder_rules; generated integer:=0; existing integer:=0; suspended integer:=0; after_due timestamptz; reason text;
begin
 for rule in select * from public.recurring_reminder_rules where status='active' and next_due_at<=now() order by next_due_at limit greatest(1,least(coalesce(p_limit,50),250)) for update skip locked loop
  if not public.recurring_has_premium(rule.line_user_id) then
   update public.recurring_reminder_rules set status='suspended',error='สิทธิ์ Plus หรือทดลองใช้ฟรีสิ้นสุดแล้ว เปิดสิทธิ์แล้วกดเริ่มอีกครั้ง',updated_at=now() where id=rule.id;
   suspended:=suspended+1;
   continue;
  end if;
  begin
   after_due:=public.recurring_next_due(rule.cadence,rule.time_local,rule.weekday,rule.month_day,greatest(rule.next_due_at,now()));
   -- Checking under the rule lock avoids consuming quota on a duplicate insert.
   if exists(select 1 from public.line_reminders where recurring_rule_id=rule.id and recurring_occurrence_at=rule.next_due_at) then
    existing:=existing+1;
   else
    insert into public.line_reminders(line_user_id,target_id,title,remind_at,status,source,recurring_rule_id,recurring_occurrence_at)
    values(rule.line_user_id,rule.target_id,rule.title,rule.next_due_at,'pending','recurring',rule.id,rule.next_due_at);
    generated:=generated+1;
   end if;
   update public.recurring_reminder_rules set next_due_at=after_due,last_generated_at=now(),error=null,updated_at=now() where id=rule.id;
  exception when others then
   reason:=left(sqlerrm,500);
   update public.recurring_reminder_rules set status='suspended',error='พักการเตือนประจำ: '||reason,updated_at=now() where id=rule.id;
   suspended:=suspended+1;
  end;
 end loop;
 return jsonb_build_object('ok',true,'generated',generated,'alreadyGenerated',existing,'suspended',suspended);
end;
$$;

revoke all on function public.recurring_has_premium(text) from public,anon,authenticated;
revoke all on function public.recurring_next_due(text,text,integer,integer,timestamptz) from public,anon,authenticated;
revoke all on function public.recurring_manage_rule(text,text,uuid,text,text,text,integer,integer,uuid) from public,anon,authenticated;
revoke all on function public.recurring_generate_due(integer) from public,anon,authenticated;
grant execute on function public.recurring_has_premium(text),public.recurring_next_due(text,text,integer,integer,timestamptz),public.recurring_manage_rule(text,text,uuid,text,text,text,integer,integer,uuid),public.recurring_generate_due(integer) to service_role;
