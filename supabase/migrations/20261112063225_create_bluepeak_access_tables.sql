create table public.bp_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[A-Za-z0-9._-]{3,32}$'),
  email text not null,
  role text not null default 'buyer' check (role in ('buyer','admin')),
  access_status text not null default 'pending' check (access_status in ('pending','approved','revoked')),
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  revoked_reason text
);
create unique index bp_profiles_email_lower_idx on public.bp_profiles (lower(email));

create table public.bp_access_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  username text not null check (username ~ '^[A-Za-z0-9._-]{3,32}$'),
  note text not null default '' check (char_length(note) <= 500),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  request_ip inet,
  country text,
  region text,
  city text
);
create unique index bp_one_pending_request_per_email on public.bp_access_requests (lower(email)) where status = 'pending';
create index bp_access_requests_status_date_idx on public.bp_access_requests (status, requested_at desc);

create table public.bp_active_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  auth_session_id text not null unique,
  device_id text not null,
  device_label text not null default 'Browser',
  ip_address inet,
  country text,
  region text,
  city text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_reason text
);
create index bp_active_sessions_user_live_idx on public.bp_active_sessions (user_id, created_at desc) where revoked_at is null;

create table public.bp_login_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  username text,
  email text,
  success boolean not null,
  event text not null default 'login' check (event in ('login','logout','session_revoked','access_denied')),
  risk_flag text,
  ip_address inet,
  country text,
  region text,
  city text,
  device_id text,
  created_at timestamptz not null default now()
);
create index bp_login_events_user_date_idx on public.bp_login_events (user_id, created_at desc);
create index bp_login_events_ip_date_idx on public.bp_login_events (ip_address, created_at desc);

create table public.bp_admin_audit (
  id bigint generated always as identity primary key,
  admin_user_id uuid not null references auth.users(id) on delete restrict,
  action text not null,
  target_user_id uuid references auth.users(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index bp_admin_audit_date_idx on public.bp_admin_audit (created_at desc);

alter table public.bp_profiles enable row level security;
alter table public.bp_access_requests enable row level security;
alter table public.bp_active_sessions enable row level security;
alter table public.bp_login_events enable row level security;
alter table public.bp_admin_audit enable row level security;
revoke all on public.bp_profiles, public.bp_access_requests, public.bp_active_sessions, public.bp_login_events, public.bp_admin_audit from anon, authenticated;
grant all on public.bp_profiles, public.bp_access_requests, public.bp_active_sessions, public.bp_login_events, public.bp_admin_audit to service_role;
grant usage, select on all sequences in schema public to service_role;
