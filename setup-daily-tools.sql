create table public.finance_drafts (
 id uuid primary key default gen_random_uuid(),
 line_user_id text not null,
 target_id text not null,
 source_message_id text not null,
 entry_type text not null check(entry_type in ('income','expense')),
 amount numeric(14,2) not null check(amount>0 and amount<=1000000000),
 title text not null check(char_length(title) between 1 and 300),
 requester_name text,group_name text,
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default (now()+interval '1 hour'),
 finance_id uuid references public.line_finances(id) on delete set null,
 committed boolean not null default false,
 unique(line_user_id,target_id,source_message_id)
);
alter table public.finance_drafts enable row level security;
revoke all on public.finance_drafts from public,anon,authenticated;
grant select,insert,update,delete on public.finance_drafts to service_role;
create function public.confirm_finance_draft(p_id uuid,p_user text,p_target text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare d public.finance_drafts; f uuid;
begin
 select * into d from public.finance_drafts where id=p_id and line_user_id=p_user and target_id=p_target for update;
 if not found then return jsonb_build_object('ok',false,'error','not_found'); end if;
 if d.committed then return jsonb_build_object('ok',true,'already',true,'finance_id',d.finance_id); end if;
 if d.expires_at<=now() then return jsonb_build_object('ok',false,'error','expired'); end if;
 insert into public.line_finances(line_user_id,target_id,entry_type,amount,title,requester_name,group_name)
 values(d.line_user_id,d.target_id,d.entry_type,d.amount,d.title,d.requester_name,d.group_name) returning id into f;
 update public.finance_drafts set committed=true,finance_id=f where id=d.id;
 return jsonb_build_object('ok',true,'already',false,'finance_id',f,'title',d.title,'amount',d.amount);
end;$$;
revoke all on function public.confirm_finance_draft(uuid,text,text) from public,anon,authenticated;
grant execute on function public.confirm_finance_draft(uuid,text,text) to service_role;
create table public.monthly_budgets (
 line_user_id text not null,
 month_start date not null check(extract(day from month_start)=1),
 amount numeric(14,2) not null check(amount>0 and amount<=1000000000),
 updated_at timestamptz not null default now(),
 primary key(line_user_id,month_start)
);
alter table public.monthly_budgets enable row level security;
revoke all on public.monthly_budgets from public,anon,authenticated;
grant select,insert,update,delete on public.monthly_budgets to service_role;
create function public.personal_budget_summary(p_user text)
returns jsonb language sql security invoker set search_path='' as $$
 with period as(select date_trunc('month',now() at time zone 'Asia/Bangkok')::date as first),
 expenditure as (select coalesce(sum(f.amount),0) spent from public.line_finances f,period p where f.line_user_id=p_user and f.target_id=p_user and f.entry_type='expense' and f.created_at >= (p.first::timestamp at time zone 'Asia/Bangkok') and f.created_at < ((p.first+interval '1 month') at time zone 'Asia/Bangkok'))
 select jsonb_build_object('month',p.first,'budget',b.amount,'spent',e.spent,'remaining',b.amount-e.spent) from period p cross join expenditure e left join public.monthly_budgets b on b.line_user_id=p_user and b.month_start=p.first;
$$;
revoke all on function public.personal_budget_summary(text) from public,anon,authenticated;
grant execute on function public.personal_budget_summary(text) to service_role;
