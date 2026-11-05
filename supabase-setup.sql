begin;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  owner_name text,
  phone text,
  email text,
  restaurant_name text,
  location text,
  country text,
  monthly_revenue numeric,
  food_cost numeric,
  gross_profit numeric,
  rating numeric,
  score numeric,
  status text,
  profit_leakage_score numeric,
  menu_complexity_risk text,
  owner_readiness_score numeric,
  team_dependence_risk text,
  customer_return_risk text,
  first_intervention text,
  input_data jsonb,
  diagnosis jsonb,
  cx_data jsonb
);

-- Restore the optional detail columns for databases created with the earlier schema.
alter table public.leads
  add column if not exists profit_leakage_score numeric,
  add column if not exists menu_complexity_risk text,
  add column if not exists owner_readiness_score numeric,
  add column if not exists team_dependence_risk text,
  add column if not exists customer_return_risk text,
  add column if not exists first_intervention text;

alter table public.leads enable row level security;
alter table public.leads force row level security;

drop policy if exists "allow_public_insert_leads" on public.leads;
drop policy if exists "allow_public_update_leads" on public.leads;
drop policy if exists "allow_public_read_leads" on public.leads;

revoke all on table public.leads from public, anon, authenticated;
grant select, insert, update on table public.leads to service_role;

commit;
