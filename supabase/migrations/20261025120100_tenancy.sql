create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null
    constraint profiles_email_check check (email = lower(email)),
  display_name text
    constraint profiles_display_name_check check (
      char_length(display_name) between 1 and 80 and display_name = btrim(display_name)
    ),
  is_platform_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_email_idx on public.profiles (email);

create table public.organizations (
  id uuid primary key,
  name text not null
    constraint organizations_name_check check (char_length(name) between 1 and 120 and name = btrim(name)),
  created_by uuid not null references public.profiles,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.organization_members (
  organization_id uuid not null references public.organizations on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  role text not null
    constraint organization_members_role_check check (role in ('owner', 'reviewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index organization_members_user_id_idx on public.organization_members (user_id);

create table public.organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  email text not null
    constraint organization_invites_email_check check (
      email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    ),
  role text not null
    constraint organization_invites_role_check check (role in ('owner', 'reviewer')),
  invited_by uuid not null references public.profiles,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  accepted_by uuid references public.profiles,
  revoked_at timestamptz
);

create unique index organization_invites_pending_key on public.organization_invites (organization_id, email)
  where accepted_at is null and revoked_at is null;

create index organization_invites_email_idx on public.organization_invites (email)
  where accepted_at is null and revoked_at is null;

create trigger profiles_set_timestamps before insert or update on public.profiles
  for each row execute function private.set_timestamps();
create trigger organizations_set_timestamps before insert or update on public.organizations
  for each row execute function private.set_timestamps();
create trigger organization_members_set_timestamps before insert or update on public.organization_members
  for each row execute function private.set_timestamps();

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email) values (new.id, lower(coalesce(new.email, '')));
  return new;
end;
$$;

create function private.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = lower(coalesce(new.email, '')) where id = new.id;
  return new;
end;
$$;

revoke execute on function private.handle_new_user(), private.sync_profile_email() from public;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

create trigger on_auth_user_email_updated after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function private.sync_profile_email();

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_invites enable row level security;

-- Supabase's default privileges grant everything to anon and authenticated; start from nothing.
revoke all on public.profiles, public.organizations, public.organization_members, public.organization_invites
  from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant select on public.organizations to authenticated;
grant update (name, deleted_at) on public.organizations to authenticated;
grant select on public.organization_members to authenticated;
grant select on public.organization_invites to authenticated;
