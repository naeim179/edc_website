-- Roll out after the application switches its private reads to read_own_profile.
-- RLS still decides which rows can supply names, avatars and role checks.
revoke select on table public.profiles from public, anon, authenticated;
revoke select (phone, username, is_super_admin, permissions)
  on public.profiles from public, anon, authenticated;
grant select (id, full_name) on public.profiles to anon;
grant select (id, full_name, avatar_url, role, created_at, updated_at)
  on public.profiles to authenticated;
