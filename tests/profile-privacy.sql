\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email) values
 ('ad54a4e6-87df-43ae-8305-a33114255811','profile-privacy-student@example.test'),
 ('ad54a4e6-87df-43ae-8305-a33114255812','profile-privacy-teacher@example.test'),
 ('ad54a4e6-87df-43ae-8305-a33114255813','profile-privacy-staff@example.test');
update public.profiles set full_name='Privacy student',phone='0700000001'
 where id='ad54a4e6-87df-43ae-8305-a33114255811';
update public.profiles set role='teacher',full_name='Privacy teacher',phone='0700000002'
 where id='ad54a4e6-87df-43ae-8305-a33114255812';
update public.profiles set role='admin',permissions=array['manage_support']
 where id='ad54a4e6-87df-43ae-8305-a33114255813';
insert into public.conversations(student_id,teacher_id)
 values ('ad54a4e6-87df-43ae-8305-a33114255811','ad54a4e6-87df-43ae-8305-a33114255812');

set local role authenticated;
select set_config('request.jwt.claim.sub','ad54a4e6-87df-43ae-8305-a33114255811',true);
do $$
declare column_name text;
begin
 foreach column_name in array array['phone','username','permissions','is_super_admin'] loop
  if has_column_privilege(current_user,'public.profiles',column_name,'select') then
   raise exception 'Direct private profile access remains for %',column_name;
  end if;
 end loop;
 if (select count(*) from public.read_own_profile()) <> 1
 or (select phone from public.read_own_profile()) is distinct from '0700000001' then
  raise exception 'Own account profile is unavailable or incorrectly scoped';
 end if;
 if not exists (select 1 from public.profiles where id='ad54a4e6-87df-43ae-8305-a33114255812' and full_name='Privacy teacher') then
  raise exception 'Chat cannot display recipient name';
 end if;
end $$;
update public.profiles set phone='0700000003',username='privacy_test_student'
 where id='ad54a4e6-87df-43ae-8305-a33114255811';
do $$ begin
 if not exists (select 1 from public.read_own_profile() where phone='0700000003' and username='privacy_test_student') then
  raise exception 'Own profile editing stopped working';
 end if;
end $$;

select set_config('request.jwt.claim.sub','ad54a4e6-87df-43ae-8305-a33114255813',true);
do $$ begin
 if not exists (select 1 from public.read_own_profile() where role='admin' and 'manage_support'=any(permissions)) then
  raise exception 'Staff cannot read own authorization';
 end if;
 if (select phone from public.read_own_profile()) is not null then
  raise exception 'Staff received another profile phone';
 end if;
end $$;
set local role anon;
do $$ begin
 if has_function_privilege(current_user,'public.read_own_profile()','execute')
 or has_column_privilege(current_user,'public.profiles','phone','select') then
  raise exception 'Anonymous private profile grant';
 end if;
end $$;
set local role service_role;
do $$ begin
 if not exists(select 1 from public.profiles where id='ad54a4e6-87df-43ae-8305-a33114255812' and phone='0700000002') then
  raise exception 'Authorized account management lost contact data';
 end if;
end $$;
reset role;
rollback;
\echo 'Profile privacy, own profile editing and staff access checks passed.'
