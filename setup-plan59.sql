create table public.member_monthly_usage (
 line_user_id text not null,
 month_start date not null,
 resource text not null check(resource in ('tasks','reminders','finance','notes','files')),
 used bigint not null default 0 check(used>=0),
 primary key(line_user_id,month_start,resource)
);
alter table public.member_monthly_usage enable row level security;
revoke all on public.member_monthly_usage from public,anon,authenticated;
grant select,insert,update on public.member_monthly_usage to service_role;
create function public.enforce_member_quota()
returns trigger language plpgsql security invoker set search_path='' as $$
declare u text:=new.line_user_id; kind text:=tg_argv[0]; premium boolean:=false; owner boolean:=false; mode text; cap bigint; cost bigint:=1; consumed bigint; period date:=date_trunc('month',now() at time zone 'Asia/Bangkok')::date;
begin
 if u is null or u='' then raise exception 'ไม่พบบัญชี LINE สำหรับบันทึกข้อมูล'; end if;
 select exists(select 1 from public.app_owner where singleton=true and line_user_id=u) into owner;
 if owner then return new; end if;
 select o.mode into mode from public.member_access_overrides o where o.line_user_id=u and (o.expires_at is null or o.expires_at>now());
 if mode='block' then raise exception 'บัญชีถูกระงับสิทธิ์ กรุณาติดต่อผู้ดูแล'; end if;
 premium:=mode='grant';
 premium:=coalesce(premium,false) or exists(select 1 from public.billing_subscriptions s where s.line_user_id=u and s.status='active' and s.paid and s.current_period_end>now()) or exists(select 1 from public.membership_trials t where t.line_user_id=u and t.expires_at>now());
 cap:=case kind when 'tasks' then case when premium then 200 else 10 end when 'reminders' then case when premium then 30 else 3 end when 'finance' then case when premium then 500 else 30 end when 'notes' then case when premium then 200 else 10 end when 'files' then case when premium then 104857600 else 5242880 end else 0 end;
 if kind='files' then cost:=coalesce((to_jsonb(new)->>'size_bytes')::bigint,0); if cost<=0 then raise exception 'ไฟล์ต้องมีขนาดมากกว่า 0'; end if; if cost>(case when premium then 10485760 else 1048576 end) then raise exception 'ไฟล์ใหญ่เกินสิทธิ์: ฟรีไฟล์ละ 1 MB / Plus ไฟล์ละ 10 MB'; end if; end if;
 insert into public.member_monthly_usage(line_user_id,month_start,resource,used) values(u,period,kind,cost)
 on conflict(line_user_id,month_start,resource) do update set used=member_monthly_usage.used+excluded.used where member_monthly_usage.used+excluded.used<=cap
 returning used into consumed;
 if consumed is null or consumed>cap then raise exception 'โควตาเดือนนี้เต็ม (%): ฟรีมีข้อจำกัด / Plus 59 บาทต่อเดือน หรือรอเดือนใหม่',kind; end if;
 return new;
end;$$;
revoke all on function public.enforce_member_quota() from public,anon,authenticated;
grant execute on function public.enforce_member_quota() to service_role;
create trigger member_quota before insert on public.line_tasks for each row execute function public.enforce_member_quota('tasks');
create trigger member_quota before insert on public.line_reminders for each row execute function public.enforce_member_quota('reminders');
create trigger member_quota before insert on public.line_finances for each row execute function public.enforce_member_quota('finance');
create trigger member_quota before insert on public.line_notes for each row execute function public.enforce_member_quota('notes');
create trigger member_quota before insert on public.line_files for each row execute function public.enforce_member_quota('files');
-- Start counters from existing records this month; do not delete any user data.
insert into public.member_monthly_usage(line_user_id,month_start,resource,used)
select line_user_id,date_trunc('month',now() at time zone 'Asia/Bangkok')::date,resource,sum(cost) from (
 select line_user_id,'tasks' resource,1::bigint cost,created_at from public.line_tasks
 union all select line_user_id,'reminders',1,created_at from public.line_reminders
 union all select line_user_id,'finance',1,created_at from public.line_finances
 union all select line_user_id,'notes',1,created_at from public.line_notes
 union all select line_user_id,'files',coalesce(size_bytes,0),created_at from public.line_files
) records where line_user_id is not null and line_user_id<>'' and created_at >= (date_trunc('month',now() at time zone 'Asia/Bangkok') at time zone 'Asia/Bangkok') group by line_user_id,resource;
