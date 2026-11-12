-- Allow buyer profile identifiers to be either a conventional username or an email.
-- Applied to the linked Supabase project as migration 20261112124634 after a zero-duplicate preflight.
alter table public.bp_profiles
  drop constraint if exists bp_profiles_username_check;

alter table public.bp_profiles
  add constraint bp_profiles_username_identifier_check
  check (
    char_length(username) <= 254
    and (
      username ~ '^[A-Za-z0-9._-]{3,32}$'
      or username ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    )
  );

-- Prevent case-only duplicates for new identifiers, including concurrent admin creates.
create unique index if not exists bp_profiles_username_lower_idx
  on public.bp_profiles (lower(username));
