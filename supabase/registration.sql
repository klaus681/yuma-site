-- Registrazione con approvazione admin + ruoli socio / yuma
alter table public.profiles
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected'));

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'yuma', 'socio', 'pending', 'member'));

alter table public.profiles add column if not exists display_name text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, role, status, display_name)
  values (
    new.id,
    new.email,
    case when lower(new.email) = 'klaus68@hotmail.it' then 'admin' else 'pending' end,
    case when lower(new.email) = 'klaus68@hotmail.it' then 'approved' else 'pending' end,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'approved'
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

drop policy if exists "insert own profile" on public.profiles;
create policy "insert own profile"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

insert into public.profiles (id, email, role, status)
select id, email, 'admin', 'approved'
from auth.users
where lower(email) = 'klaus68@hotmail.it'
on conflict (id) do update
  set role = 'admin', status = 'approved', email = excluded.email;
