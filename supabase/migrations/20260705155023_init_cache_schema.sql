-- CarRundown cache schema (Phase 0) — see BUSINESS.md "Data model".
--
-- Deliberate RLS posture, flagged per the build-with-confidence playbook:
-- these are SHARED PUBLIC CACHE tables, not per-user data. RLS is ON with
-- public SELECT, and there are NO insert/update/delete policies — so the
-- only writer is the server (edge functions using service_role, which
-- bypasses RLS). Future per-user tables (saved_cars, search_history) will
-- gate on user_id = auth.uid() per the playbook.

-- Decoded specs, recalls, crash ratings. Keyed by VIN, long TTL.
create table public.vehicles (
  vin text primary key check (vin ~ '^[A-HJ-NPR-Z0-9]{17}$'),
  specs jsonb not null default '{}'::jsonb,
  recalls jsonb not null default '[]'::jsonb,
  safety jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default now()
);

-- Seller reputation. dealer_key = normalized "name + street address" so the
-- same lot maps to one record. ~30-day TTL.
create table public.dealers (
  id uuid primary key default gen_random_uuid(),
  dealer_key text not null unique,
  name text not null,
  address text not null,
  bbb jsonb not null default '{}'::jsonb,
  yelp jsonb not null default '{}'::jsonb,
  google jsonb not null default '{}'::jsonb,
  complaint_pattern text,
  shared_address_flag text,
  fetched_at timestamptz not null default now()
);

-- Price/mileage snapshot from a listing. Short TTL; re-fetch when stale.
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  vin text not null references public.vehicles (vin) on delete cascade,
  listing_url text unique,
  asking_price integer,
  mileage integer,
  snapshot jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default now()
);

create index listings_vin_idx on public.listings (vin);

-- The composed rundown served at /report/<vin>. body holds the Report shape
-- the frontend renders (src/types/report.ts). Regenerated only when inputs
-- go stale or on manual refresh.
create table public.reports (
  vin text primary key references public.vehicles (vin) on delete cascade,
  dealer_id uuid references public.dealers (id) on delete set null,
  verdict text not null check (verdict in ('go', 'caution', 'flag')),
  body jsonb not null,
  generated_at timestamptz not null default now(),
  refreshed_at timestamptz not null default now()
);

create index reports_dealer_idx on public.reports (dealer_id);

alter table public.vehicles enable row level security;
alter table public.dealers enable row level security;
alter table public.listings enable row level security;
alter table public.reports enable row level security;

create policy "public read" on public.vehicles
  for select to anon, authenticated using (true);

create policy "public read" on public.dealers
  for select to anon, authenticated using (true);

create policy "public read" on public.listings
  for select to anon, authenticated using (true);

create policy "public read" on public.reports
  for select to anon, authenticated using (true);
