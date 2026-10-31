-- Fix: infinite recursion on profiles + policy robuste per approvazione
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and (status is null or status = 'approved' or status = 'pending')
  )
  or exists (
    select 1 from auth.users
    where id = auth.uid()
      and lower(email) = 'klaus68@hotmail.it'
  );
$$;

update public.profiles
set role = 'admin', status = 'approved'
where lower(email) = 'klaus68@hotmail.it';

insert into public.profiles (id, email, role, status)
select id, email, 'admin', 'approved'
from auth.users
where lower(email) = 'klaus68@hotmail.it'
on conflict (id) do update
  set role = 'admin', status = 'approved', email = excluded.email;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "admin update profiles" on public.profiles;
create policy "admin update profiles"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admin insert members" on public.members;
create policy "admin insert members"
  on public.members for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "admin update members" on public.members;
create policy "admin update members"
  on public.members for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admin delete members" on public.members;
create policy "admin delete members"
  on public.members for delete
  to authenticated
  using (public.is_admin());

drop policy if exists "admin update site_content" on public.site_content;
create policy "admin update site_content"
  on public.site_content for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

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
  using (public.is_admin())
  with check (public.is_admin());
