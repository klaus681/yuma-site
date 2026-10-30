-- Membri equipaggio dinamici (schede con foto)
create table if not exists public.members (
  id bigint generated always as identity primary key,
  name text not null,
  role text not null default '',
  description text not null default '',
  image_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.members enable row level security;

drop policy if exists "public read members" on public.members;
create policy "public read members"
  on public.members for select
  to anon, authenticated
  using (true);

drop policy if exists "admin insert members" on public.members;
create policy "admin insert members"
  on public.members for insert
  to authenticated
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "admin update members" on public.members;
create policy "admin update members"
  on public.members for update
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "admin delete members" on public.members;
create policy "admin delete members"
  on public.members for delete
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Seed iniziale (solo se tabella vuota)
insert into public.members (name, role, description, sort_order)
select * from (values
  ('Skipper Founder', 'Timoniere & Fondatore', 'Presente dal 2001. Specialista in partenze e tattica di regata.', 1),
  ('Tactical Master', 'Tattico di Bordo', 'Esperto di lettura dei salti di vento e rotte di regata.', 2),
  ('Senior Navigator', 'Navigatore / Tailer', 'Coordinatore delle manovre e gestione spinnaker nelle poppe.', 3)
) as v(name, role, description, sort_order)
where not exists (select 1 from public.members limit 1);
