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

alter table public.leads enable row level security;

drop policy if exists "allow_public_insert_leads" on public.leads;
create policy "allow_public_insert_leads"
on public.leads for insert
to anon
with check (true);

drop policy if exists "allow_public_update_leads" on public.leads;
create policy "allow_public_update_leads"
on public.leads for update
to anon
using (true)
with check (true);

drop policy if exists "allow_public_read_leads" on public.leads;
create policy "allow_public_read_leads"
on public.leads for select
to anon
using (true);
