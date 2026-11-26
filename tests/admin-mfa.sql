begin;

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
