-- NYUMBANI BILL UPDATE (run AFTER nyumbani-setup.sql, once, in Supabase > SQL Editor)

-- 1. New roles and account fields
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('landlord','assistant','tenant','admin'));
alter table public.profiles add column if not exists parent_id uuid references public.profiles(id) on delete cascade;
alter table public.profiles add column if not exists super_user boolean not null default false;
alter table public.profiles add column if not exists suspended boolean not null default false;
alter table public.profiles add column if not exists system_fee_paid numeric not null default 0;

-- 2. Who owns the data you are working on
-- Landlord: themselves, only once the one-time fee of KSh 30,000 is received and not suspended.
-- Assistant: their landlord, with the same conditions.
create or replace function public.owner_id()
returns uuid language sql stable security definer set search_path = public as $$
  select case
    when p.role = 'assistant' then
      (select q.id from public.profiles q
        where q.id = p.parent_id and not q.suspended and q.system_fee_paid >= 30000)
    when p.role = 'landlord' and p.system_fee_paid >= 30000 then p.id
  end
  from public.profiles p where p.id = auth.uid() and not p.suspended;
$$;

-- Landlords and super-user assistants may add apartments and units
create or replace function public.can_manage()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles
    where id = auth.uid() and not suspended
      and (role = 'landlord' or (role = 'assistant' and super_user)));
$$;

-- 3. Security rules
drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select to authenticated
  using (id = auth.uid() or parent_id = auth.uid() or public.is_admin());

drop policy if exists "apartments read" on public.apartments;
create policy "apartments read" on public.apartments for select to authenticated
  using (landlord_id = public.owner_id() or public.is_admin());

drop policy if exists "apartments add" on public.apartments;
create policy "apartments add" on public.apartments for insert to authenticated
  with check (landlord_id = public.owner_id() and public.can_manage());

drop policy if exists "apartments edit" on public.apartments;
create policy "apartments edit" on public.apartments for update to authenticated
  using (landlord_id = public.owner_id() and public.can_manage())
  with check (landlord_id = public.owner_id() and public.can_manage());

drop policy if exists "units read" on public.units;
create policy "units read" on public.units for select to authenticated
  using (public.is_admin() or exists (select 1 from public.apartments a
         where a.id = apartment_id and a.landlord_id = public.owner_id()));

drop policy if exists "units add" on public.units;
create policy "units add" on public.units for insert to authenticated
  with check (status = 'pending' and public.can_manage()
    and exists (select 1 from public.apartments a
         where a.id = apartment_id and a.landlord_id = public.owner_id()));

-- any assistant may allocate (vacant/occupied); only admin approves pending units
drop policy if exists "units landlord edit" on public.units;
create policy "units landlord edit" on public.units for update to authenticated
  using (status in ('vacant','occupied') and exists (select 1 from public.apartments a
         where a.id = apartment_id and a.landlord_id = public.owner_id()))
  with check (status in ('vacant','occupied') and exists (select 1 from public.apartments a
         where a.id = apartment_id and a.landlord_id = public.owner_id()));

-- 4. Your admin account (change the email if needed)
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'dkglobaltech@gmail.com');
