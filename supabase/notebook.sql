-- EFETEE NOTEBOOK: run this once in Supabase > SQL Editor > New query > Run
create extension if not exists btree_gist;

create table if not exists public.apartments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rate numeric not null default 0,
  parent_id uuid references public.apartments(id),   -- a bedroom inside a whole flat
  sort int not null default 0,
  active boolean not null default true
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  guest text not null,
  phone text default '',
  apartment_id uuid not null references public.apartments(id),
  check_in date not null,
  check_out date not null,
  amount numeric not null default 0,
  paid numeric not null default 0,
  status text not null default 'booked' check (status in ('booked','in','out','cancelled')),
  note text default '',
  updated_by text,
  updated_at timestamptz not null default now(),
  constraint dates_ok check (check_out > check_in),
  -- the same apartment can never be booked twice on the same night (cancelled bookings are ignored)
  constraint no_double_booking exclude using gist (apartment_id with =, daterange(check_in, check_out, '[)') with &&) where (status <> 'cancelled')
);

-- records who made the last change and when
create or replace function public.stamp() returns trigger language plpgsql as $$
begin
  new.updated_by := coalesce(auth.jwt() ->> 'email', 'unknown');
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists bookings_stamp on public.bookings;
create trigger bookings_stamp before insert or update on public.bookings for each row execute function public.stamp();

-- a whole flat and the bedrooms inside it cannot be booked at the same time
create or replace function public.space_check() returns trigger language plpgsql as $$
declare other text;
begin
  if new.status <> 'cancelled' then
    select g.name into other from public.bookings b
      join public.apartments a on a.id = b.apartment_id
      join public.apartments g on g.id = a.id
     where b.id <> new.id and b.status <> 'cancelled' and b.apartment_id <> new.apartment_id
       and b.check_in < new.check_out and b.check_out > new.check_in
       and (a.id = (select parent_id from public.apartments where id = new.apartment_id) or a.parent_id = new.apartment_id)
     limit 1;
    if other is not null then raise exception 'That flat is already taken on those dates (%).', other using errcode = '23P01'; end if;
  end if;
  return new;
end $$;
drop trigger if exists bookings_space on public.bookings;
create trigger bookings_space before insert or update on public.bookings for each row execute function public.space_check();

-- only people you create under Authentication > Users can use it; nothing is public, nothing can be deleted
alter table public.apartments enable row level security;
alter table public.bookings   enable row level security;
drop policy if exists apartments_read on public.apartments;
create policy apartments_read on public.apartments for select to authenticated using (true);
drop policy if exists apartments_add on public.apartments;
create policy apartments_add on public.apartments for insert to authenticated with check (true);
drop policy if exists apartments_change on public.apartments;
create policy apartments_change on public.apartments for update to authenticated using (true) with check (true);
drop policy if exists bookings_read on public.bookings;
create policy bookings_read on public.bookings   for select to authenticated using (true);
drop policy if exists bookings_add on public.bookings;
create policy bookings_add on public.bookings   for insert to authenticated with check (true);
drop policy if exists bookings_change on public.bookings;
create policy bookings_change on public.bookings   for update to authenticated using (true) with check (true);
grant usage on schema public to authenticated;
grant select, insert, update on public.apartments, public.bookings to authenticated;

-- starter apartments from the price list (edit them later in the app)
insert into public.apartments (name, rate, sort)
select * from (values
  ('Flat 1 - Room 1', 45000, 1),
  ('Flat 1 - Room 2', 45000, 2),
  ('Flat 6 - Room 1', 50000, 3),
  ('Flat 6 - Room 2', 50000, 4),
  ('Flat 1 - Studio', 60000, 5),
  ('Flat 6 - Studio', 60000, 6),
  ('Flat 7 - 1 Bedroom', 70000, 7),
  ('Flat 2 - Bedroom 1 (shared)', 70000, 8),
  ('Flat 2 - Bedroom 2 (shared)', 70000, 9),
  ('Flat 5 - Bedroom 1 (shared)', 70000, 10),
  ('Flat 5 - Bedroom 2 (shared)', 70000, 11),
  ('Flat 3 - Bedroom 1 (shared)', 80000, 12),
  ('Flat 3 - Bedroom 2 (shared)', 80000, 13),
  ('Flat 4 - Bedroom 1 (shared)', 80000, 14),
  ('Flat 4 - Bedroom 2 (shared)', 80000, 15),
  ('Flat 2 - Whole flat', 120000, 16),
  ('Flat 5 - Whole flat', 120000, 17),
  ('Flat 3 - Whole flat', 140000, 18),
  ('Flat 4 - Whole flat', 140000, 19)
) as v(name, rate, sort)
where not exists (select 1 from public.apartments);

update public.apartments b set parent_id = w.id
  from public.apartments w
 where b.parent_id is null and b.name ~ '^Flat [2-5] - Bedroom' and w.name = split_part(b.name, ' - ', 1) || ' - Whole flat';
