alter table public.profiles
  add column if not exists is_super_admin boolean not null default false,
  add column if not exists permissions text[] not null default '{}';

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_super_admin
  );
$$;

-- بس السوبر أدمن (أو service role) بغيّر الصلاحيات أو بعيّن/بسحب دور admin
create or replace function public.protect_admin_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_super_admin() and (
       new.is_super_admin is distinct from old.is_super_admin
    or new.permissions is distinct from old.permissions
    or (new.role is distinct from old.role
        and (new.role::text = 'admin' or old.role::text = 'admin'))
  ) then
    raise exception 'only super admin can change admin roles or permissions';
  end if;
  return new;
end $$;

drop trigger if exists trg_protect_admin_columns on public.profiles;
create trigger trg_protect_admin_columns
before update on public.profiles
for each row execute function public.protect_admin_columns();

-- البحث عن مستخدم بالإيميل (الإيميل موجود بـ auth.users مش بـ profiles)
create or replace function public.find_user_id_by_email(p_email text)
returns uuid language sql stable security definer set search_path = public, auth as $$
  select id from auth.users where lower(email) = lower(trim(p_email)) limit 1;
$$;
revoke all on function public.find_user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.find_user_id_by_email(text) to service_role;

grant select, update on public.profiles to service_role;
