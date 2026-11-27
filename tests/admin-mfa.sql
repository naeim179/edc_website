begin;

do $$
begin
  if has_function_privilege('anon','public.is_admin()','execute')
    or has_function_privilege('authenticated','public.is_super_admin()','execute')
    or has_function_privilege('authenticated','public.assignment_is_admin()','execute')
    or not has_function_privilege('authenticated','public.is_admin()','execute') then
    raise exception 'Internal role predicate privileges were not narrowed safely';
  end if;
end;
$$;

insert into auth.users (id, email) values
('8a100000-0000-4000-8000-000000000001', 'mfa-admin-one@example.test'),
('8a100000-0000-4000-8000-000000000002', 'mfa-admin-two@example.test'),
('8a100000-0000-4000-8000-000000000003', 'mfa-future-admin@example.test');
update public.profiles set role = 'admin'
where id in ('8a100000-0000-4000-8000-000000000001','8a100000-0000-4000-8000-000000000002');
insert into storage.objects (id, bucket_id, name) values
('8a300000-0000-4000-8000-000000000001', 'images', 'test/mfa-object.png');
create policy mfa_test_can_read_object on storage.objects for select to authenticated
using (id = '8a300000-0000-4000-8000-000000000001');

set local role authenticated;
set local request.jwt.claim.sub = '8a100000-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"aal":"aal1"}';
set local request.path = '/profiles';
do $$
begin
  if public.current_admin_mfa_status() is distinct from 'optional' then raise exception 'Enrollment must be available'; end if;
  perform admin_auth.enforce_admin_mfa_rest();
  if not exists (select 1 from storage.objects where id = '8a300000-0000-4000-8000-000000000001') then
    raise exception 'Storage denied a session eligible for optional setup';
  end if;
  begin
    perform public.finish_admin_mfa_setup();
    raise exception 'A password-only session recorded an enrollment';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;
insert into auth.mfa_factors (id, user_id, status) values
('8a200000-0000-4000-8000-000000000001', '8a100000-0000-4000-8000-000000000001', 'verified'),
('8a200000-0000-4000-8000-000000000002', '8a100000-0000-4000-8000-000000000002', 'verified');
set local role authenticated;
do $$
begin
  if public.current_admin_mfa_status() is distinct from 'verify' then raise exception 'Verified factor did not require challenge'; end if;
  if exists (select 1 from storage.objects where id = '8a300000-0000-4000-8000-000000000001') then
    raise exception 'Password-only admin could read protected Storage metadata';
  end if;
  begin
    perform admin_auth.enforce_admin_mfa_rest();
    raise exception 'Password-only admin was permitted to access the Data API';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.path', '/rpc/current_admin_mfa_status', true);
  perform admin_auth.enforce_admin_mfa_rest();
  perform set_config('request.path', '/rpc/admin_list_orders_page', true);
  begin
    perform admin_auth.enforce_admin_mfa_rest();
    raise exception 'Password-only admin was permitted to call a protected RPC';
  exception when insufficient_privilege then null;
  end;
end;
$$;
set local request.jwt.claims = '{"aal":"aal2"}';
select admin_auth.enforce_admin_mfa_rest();
select public.finish_admin_mfa_setup();

reset role;
do $$
begin
  if (select required from admin_auth.admin_mfa_settings) then raise exception 'Enforcement activated before all administrators enrolled'; end if;
end;
$$;
set local role authenticated;
set local request.jwt.claim.sub = '8a100000-0000-4000-8000-000000000002';
select public.finish_admin_mfa_setup();
reset role;
do $$
begin
  if not (select required from admin_auth.admin_mfa_settings) then raise exception 'Finishing all enrollments did not activate enforcement'; end if;
end;
$$;

set local request.jwt.claim.sub = '8a100000-0000-4000-8000-000000000003';
set local request.jwt.claims = '{"aal":"aal1"}';
set local role authenticated;
do $$
begin
  if public.current_admin_mfa_status() is not null then raise exception 'Student was included in admin MFA'; end if;
  perform admin_auth.enforce_admin_mfa_rest();
end;
$$;
reset role;
set local request.jwt.claim.sub = '';
update public.profiles set role = 'admin' where id = '8a100000-0000-4000-8000-000000000003';
set local role authenticated;
set local request.jwt.claim.sub = '8a100000-0000-4000-8000-000000000003';
do $$
begin
  if public.current_admin_mfa_status() is distinct from 'setup' then raise exception 'A new admin did not require enrollment'; end if;
end;
$$;
reset role;

insert into auth.mfa_factors(id,user_id,status,friendly_name) values
('8a200000-0000-4000-8000-000000000005','8a100000-0000-4000-8000-000000000002','verified','Replacement app'),
('8a200000-0000-4000-8000-000000000006','8a100000-0000-4000-8000-000000000002','unverified','Pending setup');
set local role authenticated;
set local request.jwt.claim.sub = '8a100000-0000-4000-8000-000000000002';
set local request.jwt.claims = '{"aal":"aal1"}';
set local request.path = '/rpc/list_admin_authenticators';
do $$
begin
  perform admin_auth.enforce_admin_mfa_rest();
  if (select count(*) from public.list_admin_authenticators()) <> 2
    or exists(select 1 from public.list_admin_authenticators() where id='8a200000-0000-4000-8000-000000000001') then
    raise exception 'Wrong role or factor exposed in authenticator options';
  end if;
  begin
    perform public.update_admin_authenticator('8a200000-0000-4000-8000-000000000005',false);
    raise exception 'A password-only session registered a replacement';
  exception when insufficient_privilege then null;
  end;
end;
$$;
set local request.jwt.claims = '{"aal":"aal2"}';
do $$
begin
  if public.update_admin_authenticator('8a200000-0000-4000-8000-000000000002',true) then
    raise exception 'Removed the last approved factor';
  end if;
  begin
    perform public.update_admin_authenticator('8a200000-0000-4000-8000-000000000001',false);
    raise exception 'Registered someone else’s factor';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.update_admin_authenticator('8a200000-0000-4000-8000-000000000006',false);
    raise exception 'Registered an unverified factor';
  exception when insufficient_privilege then null;
  end;
  if not public.update_admin_authenticator('8a200000-0000-4000-8000-000000000005',false)
    or not public.update_admin_authenticator('8a200000-0000-4000-8000-000000000002',true) then
    raise exception 'Verified replacement could not be linked';
  end if;
  if public.update_admin_authenticator('8a200000-0000-4000-8000-000000000005',true)
    or (select count(*) from public.list_admin_authenticators() where approved) <> 1 then
    raise exception 'A pending provider removal allowed both apps to be removed';
  end if;
end;
$$;
reset role;
delete from auth.mfa_factors where id = '8a200000-0000-4000-8000-000000000002';
set local role authenticated;
set local request.jwt.claims = '{"aal":"aal1"}';
do $$
begin
  if public.current_admin_mfa_status() is distinct from 'verify'
    or (select id from public.list_admin_authenticators() where approved) is distinct from '8a200000-0000-4000-8000-000000000005'::uuid then
    raise exception 'The replacement must be used on the next login';
  end if;
end;
$$;
reset role;

delete from auth.mfa_factors where id = '8a200000-0000-4000-8000-000000000001';
insert into auth.mfa_factors (id, user_id, status) values
('8a200000-0000-4000-8000-000000000004', '8a100000-0000-4000-8000-000000000001', 'verified');
set local role authenticated;
set local request.jwt.claim.sub = '8a100000-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"aal":"aal2"}';
do $$
begin
  if public.current_admin_mfa_status() is distinct from 'recovery' then raise exception 'Replacing the only registered factor bypassed recovery'; end if;
end;
$$;

rollback;
