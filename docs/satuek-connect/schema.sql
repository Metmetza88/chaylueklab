-- แบบฐานข้อมูลสำหรับทบทวนและทดสอบในเครื่องเท่านั้น ยังไม่ได้ติดตั้งบน Supabase จริง
-- แยก schema เพื่อไม่แก้ตาราง CHAYLUEKLAB/WORAMET เดิม
-- ก่อนใช้จริง: เลือกโปรเจกต์, ตั้ง Auth, ทดสอบ staging, expose schema ใน Data API
begin;
create schema satuek_connect;
revoke all on schema satuek_connect from public;
grant usage on schema satuek_connect to anon, authenticated, service_role;

create function satuek_connect.is_moderator() returns boolean
language sql stable security invoker set search_path = '' as $$
  select coalesce((select auth.jwt()) -> 'app_metadata' ->> 'satuek_role', '') in ('moderator', 'admin')
$$;
create function satuek_connect.valid_area(value text) returns boolean
language sql immutable security invoker set search_path = '' as $$
 select value = any(array['สตึก','นิคม','ทุ่งวัง','เมืองแก','หนองใหญ่','ร่อนทอง','ดอนมนต์','ชุมแสง','ท่าม่วง','สะแก','สนามชัย','กระสัง'])
$$;

create table satuek_connect.users (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check(length(btrim(display_name)) between 2 and 50),
 area text not null check(satuek_connect.valid_area(area)),
 -- ข้อมูลติดต่อเป็นข้อมูลส่วนตัว เฉพาะเจ้าของและผู้ตรวจสอบอ่านได้
 phone text check(phone ~ '^0[0-9]{8,9}$'),
 line_id text check(line_id ~ '^[A-Za-z0-9_.-]{4,40}$'),
 verified_at timestamptz,
 created_at timestamptz not null default now()
);
create table satuek_connect.shops (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references satuek_connect.users(id) on delete cascade,
 name text not null check(length(btrim(name)) between 2 and 80),
 description text not null default '' check(length(description) <= 1000),
 area text not null check(satuek_connect.valid_area(area)),
 -- เขียนได้เฉพาะฝั่งตรวจสอบ ห้ามนำ phone ใน users มาแสดงเอง
 verified_phone text check(verified_phone ~ '^0[0-9]{8,9}$'),
 verified_line_url text check(verified_line_url ~ '^https://line[.]me/R/ti/p/[A-Za-z0-9_@~%.+-]+$'),
 contact_verified_at timestamptz,
 published_at timestamptz,
 created_at timestamptz not null default now(),
 check((verified_phone is null and verified_line_url is null) or contact_verified_at is not null)
);
create table satuek_connect.products (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references satuek_connect.users(id) on delete cascade,
 shop_id uuid references satuek_connect.shops(id) on delete set null,
 title text not null check(length(btrim(title)) between 3 and 90),
 description text not null check(length(btrim(description)) between 5 and 1000),
 price numeric(12,2) not null check(price between 0 and 10000000),
 unit text not null check(length(btrim(unit)) between 1 and 20),
 category text not null check(category in ('อาหารและของกิน','ผักและผลไม้','เกษตรและข้าว','ของใช้และมือสอง')),
 area text not null check(satuek_connect.valid_area(area)),
 image_path text check(length(image_path) <= 300 and image_path !~ '(^/|\.\.|:)'),
 published_at timestamptz,
 created_at timestamptz not null default now()
);
create table satuek_connect.services (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references satuek_connect.users(id) on delete cascade,
 shop_id uuid references satuek_connect.shops(id) on delete set null,
 title text not null check(length(btrim(title)) between 3 and 90),
 description text not null check(length(btrim(description)) between 5 and 1000),
 category text not null check(category in ('ช่างไฟฟ้า','ช่างประปา','ช่างแอร์','ช่างก่อสร้าง','รถรับจ้าง','ช่างซ่อมรถและปะยาง')),
 area text not null check(satuek_connect.valid_area(area)),
 image_path text check(length(image_path) <= 300 and image_path !~ '(^/|\.\.|:)'),
 published_at timestamptz,
 created_at timestamptz not null default now()
);
create table satuek_connect.reviews (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references satuek_connect.users(id) on delete cascade,
 service_id uuid not null references satuek_connect.services(id) on delete cascade,
 rating smallint not null check(rating between 1 and 5),
 body text not null check(length(btrim(body)) between 5 and 500),
 customer_verified_at timestamptz,
 published_at timestamptz,
 created_at timestamptz not null default now(),
 unique(owner_id,service_id)
);
create table satuek_connect.help_requests (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references satuek_connect.users(id) on delete cascade,
 title text not null check(length(btrim(title)) between 5 and 90),
 description text not null check(length(btrim(description)) between 10 and 1000),
 area text not null check(satuek_connect.valid_area(area)),
 status text not null default 'รอความช่วยเหลือ' check(status in ('รอความช่วยเหลือ','กำลังดำเนินการ','เสร็จสิ้น')),
 published_at timestamptz,
 created_at timestamptz not null default now()
);
create table satuek_connect.reports (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references satuek_connect.users(id) on delete cascade,
 product_id uuid references satuek_connect.products(id) on delete cascade,
 service_id uuid references satuek_connect.services(id) on delete cascade,
 help_request_id uuid references satuek_connect.help_requests(id) on delete cascade,
 reason text not null check(reason in ('ข้อมูลไม่ถูกต้อง','ประกาศสแปม','เนื้อหาไม่เหมาะสม','สงสัยการหลอกลวง')),
 description text not null check(length(btrim(description)) between 5 and 500),
 resolved_at timestamptz,
 created_at timestamptz not null default now(),
 check(num_nonnulls(product_id,service_id,help_request_id)=1)
);

-- ดัชนี ownership/FK และตัวกรองที่ใช้งานจริง
create index on satuek_connect.shops(owner_id);
create index on satuek_connect.products(owner_id,created_at);
create index on satuek_connect.products(shop_id);
create index on satuek_connect.products(area,category) where published_at is not null;
create unique index on satuek_connect.products(owner_id,lower(title),area);
create index on satuek_connect.services(owner_id,created_at);
create index on satuek_connect.services(shop_id);
create index on satuek_connect.services(area,category) where published_at is not null;
create index on satuek_connect.reviews(service_id);
create index on satuek_connect.help_requests(owner_id,created_at);
create index on satuek_connect.help_requests(area,status) where published_at is not null;
create index on satuek_connect.reports(owner_id,created_at);
create index on satuek_connect.reports(product_id);
create index on satuek_connect.reports(service_id);
create index on satuek_connect.reports(help_request_id);

alter table satuek_connect.users enable row level security;
alter table satuek_connect.shops enable row level security;
alter table satuek_connect.products enable row level security;
alter table satuek_connect.services enable row level security;
alter table satuek_connect.reviews enable row level security;
alter table satuek_connect.help_requests enable row level security;
alter table satuek_connect.reports enable row level security;
revoke all on all tables in schema satuek_connect from public, anon, authenticated;

create policy users_read on satuek_connect.users for select to authenticated
 using(id=(select auth.uid()) or (select satuek_connect.is_moderator()));
create policy users_insert on satuek_connect.users for insert to authenticated with check(id=(select auth.uid()) and verified_at is null);
create policy users_update on satuek_connect.users for update to authenticated
 using(id=(select auth.uid())) with check(id=(select auth.uid()));

create policy shops_read on satuek_connect.shops for select to anon, authenticated
 using(published_at is not null or owner_id=(select auth.uid()) or (select satuek_connect.is_moderator()));
create policy shops_insert on satuek_connect.shops for insert to authenticated with check(owner_id=(select auth.uid()) and published_at is null and contact_verified_at is null);
create policy shops_update on satuek_connect.shops for update to authenticated
 using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));

create policy products_read on satuek_connect.products for select to anon, authenticated
 using(published_at is not null or owner_id=(select auth.uid()) or (select satuek_connect.is_moderator()));
create policy products_insert on satuek_connect.products for insert to authenticated
 with check(owner_id=(select auth.uid()) and published_at is null and (shop_id is null or exists(select 1 from satuek_connect.shops s where s.id=shop_id and s.owner_id=(select auth.uid()))));
create policy products_update on satuek_connect.products for update to authenticated
 using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()) and (shop_id is null or exists(select 1 from satuek_connect.shops s where s.id=shop_id and s.owner_id=(select auth.uid()))));
create policy products_delete on satuek_connect.products for delete to authenticated using(owner_id=(select auth.uid()));

create policy services_read on satuek_connect.services for select to anon, authenticated
 using(published_at is not null or owner_id=(select auth.uid()) or (select satuek_connect.is_moderator()));
create policy services_insert on satuek_connect.services for insert to authenticated
 with check(owner_id=(select auth.uid()) and published_at is null and (shop_id is null or exists(select 1 from satuek_connect.shops s where s.id=shop_id and s.owner_id=(select auth.uid()))));
create policy services_update on satuek_connect.services for update to authenticated
 using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()) and (shop_id is null or exists(select 1 from satuek_connect.shops s where s.id=shop_id and s.owner_id=(select auth.uid()))));
create policy services_delete on satuek_connect.services for delete to authenticated using(owner_id=(select auth.uid()));

create policy reviews_read on satuek_connect.reviews for select to anon, authenticated
 using((published_at is not null and customer_verified_at is not null) or owner_id=(select auth.uid()) or (select satuek_connect.is_moderator()));
create policy reviews_insert on satuek_connect.reviews for insert to authenticated with check(
 owner_id=(select auth.uid()) and published_at is null and customer_verified_at is null and
 exists(select 1 from satuek_connect.services s where s.id=service_id and s.owner_id<>(select auth.uid()) and s.published_at is not null));
create policy reviews_update on satuek_connect.reviews for update to authenticated
 using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));

create policy help_read on satuek_connect.help_requests for select to anon, authenticated
 using(published_at is not null or owner_id=(select auth.uid()) or (select satuek_connect.is_moderator()));
create policy help_insert on satuek_connect.help_requests for insert to authenticated with check(owner_id=(select auth.uid()) and published_at is null and status='รอความช่วยเหลือ');
create policy help_update on satuek_connect.help_requests for update to authenticated
 using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));

create policy reports_read on satuek_connect.reports for select to authenticated using(owner_id=(select auth.uid()) or (select satuek_connect.is_moderator()));
create policy reports_insert on satuek_connect.reports for insert to authenticated with check(owner_id=(select auth.uid()) and resolved_at is null);

-- ไม่ให้ frontend ยืนยันตัวตน/เผยแพร่/เปลี่ยนเจ้าของ/ปลอมวันสร้าง
grant select on all tables in schema satuek_connect to authenticated;
grant select on satuek_connect.shops,satuek_connect.products,satuek_connect.services,satuek_connect.reviews,satuek_connect.help_requests to anon;
grant insert(id,display_name,area,phone,line_id), update(display_name,area,phone,line_id) on satuek_connect.users to authenticated;
grant insert(owner_id,name,description,area), update(name,description,area) on satuek_connect.shops to authenticated;
grant insert(owner_id,shop_id,title,description,price,unit,category,area,image_path), update(shop_id,title,description,price,unit,category,area,image_path), delete on satuek_connect.products to authenticated;
grant insert(owner_id,shop_id,title,description,category,area,image_path), update(shop_id,title,description,category,area,image_path), delete on satuek_connect.services to authenticated;
grant insert(owner_id,service_id,rating,body), update(rating,body) on satuek_connect.reviews to authenticated;
grant insert(owner_id,title,description,area), update(title,description,area,status) on satuek_connect.help_requests to authenticated;
grant insert(owner_id,product_id,service_id,help_request_id,reason,description) on satuek_connect.reports to authenticated;
grant all on all tables in schema satuek_connect to service_role;

-- เมื่อเจ้าของแก้เนื้อหา ให้กลับไปรอตรวจสอบก่อนเผยแพร่ทุกครั้ง
create function satuek_connect.reset_publication() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
 new.published_at := null;
 if tg_table_name='reviews' then new.customer_verified_at := null; end if;
 if tg_table_name='shops' then
   new.verified_phone := null; new.verified_line_url := null; new.contact_verified_at := null;
 end if;
 return new;
end $$;
create trigger recheck_shop before update of name,description,area on satuek_connect.shops for each row execute function satuek_connect.reset_publication();
create trigger recheck_product before update of shop_id,title,description,price,unit,category,area,image_path on satuek_connect.products for each row execute function satuek_connect.reset_publication();
create trigger recheck_service before update of shop_id,title,description,category,area,image_path on satuek_connect.services for each row execute function satuek_connect.reset_publication();
create trigger recheck_review before update of rating,body on satuek_connect.reviews for each row execute function satuek_connect.reset_publication();
create trigger recheck_help before update of title,description,area on satuek_connect.help_requests for each row execute function satuek_connect.reset_publication();

-- จำกัดการโพสต์ฝั่งฐานข้อมูล ใช้ lock ต่อเจ้าของ/ตารางเพื่อกันคำขอพร้อมกัน
create function satuek_connect.limit_posts() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare recent_count integer; last_created timestamptz;
begin
 if (select auth.uid()) is null then return new; end if;
 perform pg_advisory_xact_lock(hashtextextended(new.owner_id::text || tg_table_name,0));
 execute format('select count(*), max(created_at) from satuek_connect.%I where owner_id=$1 and created_at>now()-interval ''10 minutes''',tg_table_name)
 into recent_count,last_created using new.owner_id;
 if recent_count>=5 or last_created>now()-interval '10 seconds' then
   raise exception 'กรุณารอก่อนลงประกาศถัดไป' using errcode='P0001';
 end if;
 return new;
end $$;
create trigger rate_product before insert on satuek_connect.products for each row execute function satuek_connect.limit_posts();
create trigger rate_service before insert on satuek_connect.services for each row execute function satuek_connect.limit_posts();
create trigger rate_help before insert on satuek_connect.help_requests for each row execute function satuek_connect.limit_posts();
create trigger rate_report before insert on satuek_connect.reports for each row execute function satuek_connect.limit_posts();

-- เปลี่ยนข้อมูลติดต่อส่วนตัวแล้วถอนสถานะยืนยันเดิม
create function satuek_connect.reset_identity() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin new.verified_at := null; return new; end $$;
create trigger recheck_identity before update of phone,line_id on satuek_connect.users for each row execute function satuek_connect.reset_identity();

revoke all on all functions in schema satuek_connect from public;
grant execute on all functions in schema satuek_connect to anon,authenticated,service_role;
commit;
