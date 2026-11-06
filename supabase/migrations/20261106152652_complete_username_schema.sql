alter table public.profiles add column if not exists username text;

-- Stop on pre-existing case-insensitive duplicates instead of renaming users.
do $$ begin
  if not exists (
    select 1 from pg_index i
    where i.indrelid = 'public.profiles'::regclass and i.indisunique
      and i.indisvalid and i.indnkeyatts = 1
      and pg_get_indexdef(i.indexrelid, 1, true) = 'lower(username)'
      and i.indpred is null
  ) and to_regclass('public.profiles_username_lower_unique') is null then
    create unique index profiles_username_lower_unique
      on public.profiles (lower(username)) where username is not null;
  end if;
end $$;

-- NOT VALID preserves any legacy usernames. New/changed rows must comply.
alter table public.profiles add constraint profiles_username_format_check
  check (username is null or username ~ '^[A-Za-z0-9_.]{3,30}$') not valid;
alter table public.profiles add constraint profiles_username_reserved_check
  check (username is null or lower(username) <> all (
    array['admin','administrator','support','root','yourway','moderator','teacher']
  )) not valid;
grant update (username) on public.profiles to authenticated;

-- Restore valid Auth metadata without choosing arbitrary winners for collisions.
with candidates as (
  select p.id, trim(u.raw_user_meta_data ->> 'username') as username,
    count(*) over (partition by lower(trim(u.raw_user_meta_data ->> 'username'))) as matches
  from public.profiles p join auth.users u on u.id = p.id
  where p.username is null
), valid as (
  select * from candidates c
  where c.matches = 1 and c.username ~ '^[A-Za-z0-9_.]{3,30}$'
    and lower(c.username) <> all (
      array['admin','administrator','support','root','yourway','moderator','teacher'])
    and not exists (select 1 from public.profiles p
      where lower(p.username) = lower(c.username))
)
update public.profiles p set username = v.username from valid v where p.id = v.id;

create or replace function public.is_username_available(p_username text)
returns boolean language sql stable security definer set search_path = public
as $$
  select coalesce(
    trim(p_username) ~ '^[A-Za-z0-9_.]{3,30}$'
    and lower(trim(p_username)) <> all (
      array['admin','administrator','support','root','yourway','moderator','teacher'])
    and not exists (select 1 from public.profiles
      where lower(username) = lower(trim(p_username))), false);
$$;
revoke all on function public.is_username_available(text) from public;
grant execute on function public.is_username_available(text) to anon, authenticated, service_role;

-- Email lookup is backend-only; never expose Auth email addresses via public RPC.
create or replace function public.get_email_by_username(p_username text)
returns text language sql stable security definer set search_path = public, auth
as $$
  select u.email::text from auth.users u join public.profiles p on p.id = u.id
  where lower(p.username) = lower(trim(p_username)) limit 1;
$$;
revoke all on function public.get_email_by_username(text) from public, anon, authenticated;
grant execute on function public.get_email_by_username(text) to service_role;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, username)
  values (new.id, nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'username'), ''));
  return new;
end;
$$;
