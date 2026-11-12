create table public.bp_access_settings (id boolean primary key default true check (id), max_active_sessions integer not null default 2 check (max_active_sessions between 1 and 5), revoke_oldest boolean not null default true, updated_at timestamptz not null default now());
insert into public.bp_access_settings(id,max_active_sessions,revoke_oldest) values (true,2,true);
alter table public.bp_access_settings enable row level security;
revoke all on public.bp_access_settings from anon, authenticated;
create unique index bp_access_requests_one_pending_email on public.bp_access_requests (lower(email)) where status = 'pending';
