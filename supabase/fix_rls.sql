-- Fix: infinite recursion on profiles
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "admin update profiles" on public.profiles;
create policy "admin update profiles"
  on public.profiles for update
  to authenticated
  using (public.is_admin());

drop policy if exists "admin insert members" on public.members;
create policy "admin insert members"
  on public.members for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "admin update members" on public.members;
create policy "admin update members"
  on public.members for update
  to authenticated
  using (public.is_admin());

drop policy if exists "admin delete members" on public.members;
create policy "admin delete members"
  on public.members for delete
  to authenticated
  using (public.is_admin());

drop policy if exists "admin update site_content" on public.site_content;
create policy "admin update site_content"
  on public.site_content for update
  to authenticated
  using (public.is_admin());

drop policy if exists "admin insert site_content" on public.site_content;
create policy "admin insert site_content"
  on public.site_content for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "admin read candidature" on public.candidature;
create policy "admin read candidature"
  on public.candidature for select
  to authenticated
  using (public.is_admin());

drop policy if exists "admin update candidature" on public.candidature;
create policy "admin update candidature"
  on public.candidature for update
  to authenticated
  using (public.is_admin());

update public.profiles
set role = 'admin'
where lower(email) = 'klaus68@hotmail.it';

insert into public.profiles (id, email, role)
select id, email, 'admin'
from auth.users
where lower(email) = 'klaus68@hotmail.it'
on conflict (id) do update set role = 'admin', email = excluded.email;
