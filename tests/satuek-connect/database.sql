-- รันเฉพาะ PostgreSQL ทดสอบที่มี auth.uid()/auth.jwt() จำลอง ห้ามรันบน production
\set ON_ERROR_STOP on
begin;
insert into auth.users values ('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');
insert into satuek_connect.users(id,display_name,area) values
 ('00000000-0000-4000-8000-000000000001','เจ้าของหนึ่ง','สตึก'),('00000000-0000-4000-8000-000000000002','เจ้าของสอง','นิคม');
insert into satuek_connect.shops(id,owner_id,name,area,published_at,created_at) values
 ('10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002','ร้านทดสอบ','นิคม',now(),now()-interval '1 hour');
insert into satuek_connect.products(id,owner_id,title,description,price,unit,category,area,published_at,created_at) values
 ('20000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','สินค้าของหนึ่ง','รายละเอียดสินค้า',35,'ชิ้น','เกษตรและข้าว','สตึก',null,now()-interval '1 hour'),
 ('20000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002','สินค้าของสอง','รายละเอียดสินค้า',35,'ชิ้น','เกษตรและข้าว','นิคม',now(),now()-interval '1 hour');
insert into satuek_connect.services(id,owner_id,title,description,category,area,published_at,created_at) values
 ('30000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','ช่างทดสอบหนึ่ง','รายละเอียดบริการ','ช่างไฟฟ้า','สตึก',now(),now()-interval '1 hour'),
 ('30000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002','ช่างทดสอบสอง','รายละเอียดบริการ','ช่างไฟฟ้า','นิคม',now(),now()-interval '1 hour');

set local role anon;
do $$ begin
 assert (select count(*)=1 from satuek_connect.products), 'anonymous sees only published products';
 begin perform * from satuek_connect.users; raise exception 'private users leaked'; exception when insufficient_privilege then null; end;
 begin insert into satuek_connect.help_requests(owner_id,title,description,area) values ('00000000-0000-4000-8000-000000000001','ทดสอบช่วยเหลือ','รายละเอียดคำขอทดลอง','สตึก'); raise exception 'anonymous inserted'; exception when insufficient_privilege then null; end;
 raise notice 'PASS anon: public-only reads, private users protected, anonymous writes rejected';
end $$;
reset role;

select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","user_metadata":{"satuek_role":"admin"}}',true);
set local role authenticated;
do $$ declare n integer; begin
 assert not satuek_connect.is_moderator(), 'user_metadata cannot grant moderator';
 assert (select count(*)=1 from satuek_connect.users), 'other user profiles private';
 assert (select count(*)=2 from satuek_connect.products), 'owner reads draft and public products';
 update satuek_connect.products set title='ห้ามเปลี่ยนของผู้อื่น' where id='20000000-0000-4000-8000-000000000002';
 get diagnostics n=row_count; assert n=0, 'cannot update other owner';
 delete from satuek_connect.products where id='20000000-0000-4000-8000-000000000002';
 get diagnostics n=row_count; assert n=0, 'cannot delete other owner';
 begin update satuek_connect.products set owner_id='00000000-0000-4000-8000-000000000002' where id='20000000-0000-4000-8000-000000000001'; raise exception 'owner reassigned'; exception when insufficient_privilege then null; end;
 begin update satuek_connect.users set verified_at=now() where id='00000000-0000-4000-8000-000000000001'; raise exception 'self verified'; exception when insufficient_privilege then null; end;
 begin update satuek_connect.products set published_at=now() where id='20000000-0000-4000-8000-000000000001'; raise exception 'self published'; exception when insufficient_privilege then null; end;
 begin insert into satuek_connect.products(owner_id,title,description,price,unit,category,area) values ('00000000-0000-4000-8000-000000000002','สวมสิทธิ์เจ้าของ','ทดสอบประกาศ',1,'ชิ้น','เกษตรและข้าว','สตึก'); raise exception 'spoofed ownership'; exception when insufficient_privilege then null; end;
 begin insert into satuek_connect.products(owner_id,shop_id,title,description,price,unit,category,area) values ('00000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','ร้านของผู้อื่น','ทดสอบประกาศ',1,'ชิ้น','เกษตรและข้าว','สตึก'); raise exception 'spoofed shop'; exception when insufficient_privilege then null; end;
 raise notice 'PASS ownership: read own private profile, read own drafts, no cross-owner update/delete/reassignment, no self-verification/publication, no spoofed owner/shop';
end $$;

insert into satuek_connect.reviews(owner_id,service_id,rating,body) values ('00000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002',4,'รีวิวทดสอบบริการ');
do $$ begin
 begin insert into satuek_connect.reviews(owner_id,service_id,rating,body) values ('00000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',5,'รีวิวบริการตนเอง'); raise exception 'self review'; exception when insufficient_privilege then null; end;
 begin update satuek_connect.reviews set customer_verified_at=now(); raise exception 'verified review'; exception when insufficient_privilege then null; end;
 begin insert into satuek_connect.products(owner_id,title,description,price,unit,category,area) values ('00000000-0000-4000-8000-000000000001','พื้นที่ไม่ถูกต้อง','ทดสอบพื้นที่',1,'ชิ้น','เกษตรและข้าว','ไม่มีตำบลนี้'); raise exception 'invalid area accepted'; exception when check_violation then null; end;
 raise notice 'PASS reviews and validation: no self review, no self customer verification, invalid area rejected';
end $$;

insert into satuek_connect.help_requests(owner_id,title,description,area) values ('00000000-0000-4000-8000-000000000001','ขอแรงทดสอบ','รายละเอียดคำขอช่วยเหลือทดสอบ','สตึก');
do $$ begin
 begin
   insert into satuek_connect.help_requests(owner_id,title,description,area) values ('00000000-0000-4000-8000-000000000001','ขอแรงซ้ำเร็ว','รายละเอียดคำขอช่วยเหลือทดสอบ','สตึก');
   raise exception 'spam accepted' using errcode='P0002';
 exception when sqlstate 'P0001' then null; end;
 raise notice 'PASS server rate limit: rapid duplicate posts rejected';
end $$;
update satuek_connect.help_requests set status='กำลังดำเนินการ';
do $$ begin assert (select bool_and(status='กำลังดำเนินการ') from satuek_connect.help_requests); end $$;
reset role;

select set_config('request.jwt.claims','{}',true);
set local role anon;
do $$ begin
 assert (select count(*)=0 from satuek_connect.reviews), 'unverified review cannot be public';
 assert (select count(*)=0 from satuek_connect.help_requests), 'pending help not public';
 raise notice 'PASS moderation: unverified reviews and pending help hidden';
end $$;
reset role;

update satuek_connect.products set published_at=now() where id='20000000-0000-4000-8000-000000000001';
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001"}',true);
set local role authenticated;
update satuek_connect.products set title='สินค้าที่แก้ไขแล้ว' where id='20000000-0000-4000-8000-000000000001';
do $$ begin assert (select published_at is null from satuek_connect.products where id='20000000-0000-4000-8000-000000000001'), 'edit must reset moderation'; raise notice 'PASS edit sends published listing back to review'; end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","app_metadata":{"satuek_role":"moderator"}}',true);
set local role authenticated;
do $$ begin
 assert satuek_connect.is_moderator(), 'trusted app_metadata grants moderator read';
 assert (select count(*)=2 from satuek_connect.users), 'moderator can review identities';
 raise notice 'PASS trusted moderator role';
end $$;
reset role;
do $$ begin assert (select count(*)=7 from pg_tables where schemaname='satuek_connect' and rowsecurity); raise notice 'PASS RLS enabled on all seven tables'; end $$;
rollback;
