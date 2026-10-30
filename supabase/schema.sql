-- ============================================================
-- YUMA Team – Schema Supabase
-- Esegui questo file in: Supabase → SQL Editor → New query → Run
-- ============================================================

-- 1) Contenuti del sito (modificabili dal pannello Admin)
create table if not exists public.site_content (
  id text primary key default 'main',
  title text not null default 'YUMA',
  slogan text not null default '25 Anni in Rotta Insieme',
  subtext text not null default 'Un viaggio di amicizia, passione e cameratismo sui mari di Virtual Skipper',
  bg_url text,
  m1_name text default 'Skipper Founder',
  m1_role text default 'Timoniere & Fondatore',
  m1_desc text default 'Presente dal 2001. Specialista in partenze e tattica di regata.',
  m2_name text default 'Tactical Master',
  m2_role text default 'Tattico di Bordo',
  m2_desc text default 'Esperto di lettura dei salti di vento e rotte di regata.',
  m3_name text default 'Senior Navigator',
  m3_role text default 'Navigatore / Tailer',
  m3_desc text default 'Coordinatore delle manovre e gestione spinnaker nelle poppe.',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

insert into public.site_content (id)
values ('main')
on conflict (id) do nothing;

-- 2) Candidature dal form Unisciti
create table if not exists public.candidature (
  id bigint generated always as identity primary key,
  nome text not null,
  contatto text not null,
  messaggio text,
  created_at timestamptz not null default now(),
  letto boolean not null default false
);

-- 3) Profili / ruoli
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id,
    new.email,
    case
      when lower(new.email) = 'klaus68@hotmail.it' then 'admin'
      else 'member'
    end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.site_content enable row level security;
alter table public.candidature enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "public read site_content" on public.site_content;
create policy "public read site_content"
  on public.site_content for select
  to anon, authenticated
  using (true);

drop policy if exists "admin update site_content" on public.site_content;
create policy "admin update site_content"
  on public.site_content for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "admin insert site_content" on public.site_content;
create policy "admin insert site_content"
  on public.site_content for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "anyone insert candidature" on public.candidature;
create policy "anyone insert candidature"
  on public.candidature for insert
  to anon, authenticated
  with check (true);

drop policy if exists "admin read candidature" on public.candidature;
create policy "admin read candidature"
  on public.candidature for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "admin update candidature" on public.candidature;
create policy "admin update candidature"
  on public.candidature for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  ));
