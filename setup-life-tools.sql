-- Life OS Plus: personal debts and exact weekly reporting.
-- Access is through verified LINE identity in Edge Functions only.
create table public.life_debts (
 id uuid primary key default gen_random_uuid(),
 line_user_id text not null check(line_user_id ~ '^U[0-9a-fA-F]{32}$'),
 target_id text not null,
 title text not null check(length(btrim(title)) between 1 and 200),
 counterparty text not null default '' check(length(counterparty)<=100),
 direction text not null check(direction in ('receivable','payable')),
 amount numeric(14,2) not null check(amount>0 and amount<=1000000000),
 settled_amount numeric(14,2) not null default 0 check(settled_amount>=0 and settled_amount<=amount),
 due_date date,
 status text not null default 'open' check(status in ('open','settled')),
 create_request_id uuid,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check(target_id=line_user_id),
 check((status='settled' and settled_amount=amount) or (status='open' and settled_amount<amount)),
 check(due_date is null or due_date between date '1900-01-01' and date '2100-12-31'),
 unique(line_user_id,create_request_id)
);
create index life_debts_owner_status_due_idx on public.life_debts(line_user_id,status,due_date);
create table public.life_debt_settlements (
 line_user_id text not null,
 request_id uuid not null,
 debt_id uuid not null references public.life_debts(id) on delete cascade,
 amount numeric(14,2) not null check(amount>0 and amount<=1000000000),
 created_at timestamptz not null default now(),
 primary key(line_user_id,request_id)
);
create index life_debt_settlements_debt_idx on public.life_debt_settlements(debt_id);
alter table public.life_debts enable row level security;
alter table public.life_debt_settlements enable row level security;
revoke all on public.life_debts,public.life_debt_settlements from public,anon,authenticated;
grant select,insert,update,delete on public.life_debts to service_role;
grant select,insert,delete on public.life_debt_settlements to service_role;

create function public.life_debt_create(p_user text,p_title text,p_counterparty text,p_direction text,p_amount numeric,p_due_date date default null,p_request_id uuid default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare d public.life_debts%rowtype; owner boolean;
begin
 if p_user is null or p_user !~ '^U[0-9a-fA-F]{32}$' or p_title is null or length(btrim(p_title)) not between 1 and 200 or length(coalesce(p_counterparty,''))>100 or p_direction is null or p_direction not in ('receivable','payable') or p_amount is null or p_amount<=0 or p_amount>1000000000 or p_amount<>round(p_amount,2) or (p_due_date is not null and p_due_date not between date '1900-01-01' and date '2100-12-31') then raise exception 'invalid_debt'; end if;
 -- Serialize cap checks and duplicate retries for each member.
 perform pg_advisory_xact_lock(hashtextextended('life_debt_create:'||p_user,0));
 if p_request_id is not null then
  select * into d from public.life_debts where line_user_id=p_user and target_id=p_user and create_request_id=p_request_id;
  if found then
   if d.title<>btrim(p_title) or d.counterparty<>btrim(coalesce(p_counterparty,'')) or d.direction<>p_direction or d.amount<>p_amount or d.due_date is distinct from p_due_date then raise exception 'request_conflict'; end if;
   return to_jsonb(d);
  end if;
 end if;
 select exists(select 1 from public.app_owner where singleton=true and line_user_id=p_user) into owner;
 if not owner and (select count(*) from public.life_debts where line_user_id=p_user and target_id=p_user and status='open')>=100 then raise exception 'debt_limit_reached'; end if;
 insert into public.life_debts(line_user_id,target_id,title,counterparty,direction,amount,due_date,create_request_id)
 values(p_user,p_user,btrim(p_title),btrim(coalesce(p_counterparty,'')),p_direction,p_amount,p_due_date,p_request_id) returning * into d;
 return to_jsonb(d);
end;$$;

create function public.life_debt_settle(p_user text,p_id uuid,p_amount numeric,p_request_id uuid default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare d public.life_debts%rowtype; s public.life_debt_settlements%rowtype;
begin
 if p_user is null or p_user !~ '^U[0-9a-fA-F]{32}$' or p_id is null or p_amount is null or p_amount<=0 or p_amount>1000000000 or p_amount<>round(p_amount,2) then raise exception 'invalid_settlement'; end if;
 if p_request_id is not null then perform pg_advisory_xact_lock(hashtextextended('life_debt_settle:'||p_user||':'||p_request_id::text,0)); end if;
 select * into d from public.life_debts where id=p_id and line_user_id=p_user and target_id=p_user for update;
 if not found then raise exception 'debt_not_found'; end if;
 if p_request_id is not null then
  select * into s from public.life_debt_settlements where line_user_id=p_user and request_id=p_request_id;
  if found then
   if s.debt_id<>p_id or s.amount<>p_amount then raise exception 'request_conflict'; end if;
   return jsonb_build_object('debt',to_jsonb(d),'already',true,'accountingRecorded',false);
  end if;
 end if;
 if d.status='settled' or p_amount>d.amount-d.settled_amount then raise exception 'settlement_exceeds_balance'; end if;
 update public.life_debts set settled_amount=settled_amount+p_amount,status=case when settled_amount+p_amount=amount then 'settled' else 'open' end,updated_at=now() where id=d.id returning * into d;
 if p_request_id is not null then insert into public.life_debt_settlements(line_user_id,request_id,debt_id,amount) values(p_user,p_request_id,p_id,p_amount); end if;
 return jsonb_build_object('debt',to_jsonb(d),'already',false,'accountingRecorded',false);
end;$$;

create function public.life_weekly_summary(p_user text)
returns jsonb language sql stable security invoker set search_path='' as $$
 with period as (
  select date_trunc('week',now() at time zone 'Asia/Bangkok') at time zone 'Asia/Bangkok' as start_at,now() as end_at
 ), money as (
  select coalesce(sum(f.amount) filter(where f.entry_type='income'),0) income,coalesce(sum(f.amount) filter(where f.entry_type='expense'),0) expense
  from public.line_finances f,period p where f.line_user_id=p_user and f.target_id=p_user and f.created_at>=p.start_at and f.created_at<=p.end_at
 ), tasks as (
  select count(*) filter(where t.status='done' and t.completed_at>=p.start_at and t.completed_at<=p.end_at) done_tasks,count(*) filter(where t.status='pending') pending_tasks
  from public.line_tasks t,period p where t.line_user_id=p_user and t.target_id=p_user
 )
 select jsonb_build_object('income',m.income,'expense',m.expense,'net',m.income-m.expense,'doneTasks',t.done_tasks,'pendingTasks',t.pending_tasks,'start',(p.start_at at time zone 'Asia/Bangkok')::date,'end',(p.end_at at time zone 'Asia/Bangkok')::date,'asOf',p.end_at,'timeZone','Asia/Bangkok') from period p cross join money m cross join tasks t;
$$;

create function public.life_debt_totals(p_user text)
returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('receivable',coalesce(sum(amount-settled_amount) filter(where direction='receivable'),0),'payable',coalesce(sum(amount-settled_amount) filter(where direction='payable'),0),'openCount',count(*),'overdueCount',count(*) filter(where due_date<(now() at time zone 'Asia/Bangkok')::date))
 from public.life_debts where line_user_id=p_user and target_id=p_user and status='open';
$$;

revoke all on function public.life_debt_create(text,text,text,text,numeric,date,uuid),public.life_debt_settle(text,uuid,numeric,uuid),public.life_weekly_summary(text),public.life_debt_totals(text) from public,anon,authenticated;
grant execute on function public.life_debt_create(text,text,text,text,numeric,date,uuid),public.life_debt_settle(text,uuid,numeric,uuid),public.life_weekly_summary(text),public.life_debt_totals(text) to service_role;
