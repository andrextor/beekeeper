-- security definer so the helpers read organization_members without recursing into its policy.
create function private.is_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = p_organization_id and m.user_id = (select auth.uid())
  );
$$;

create function private.has_role(p_organization_id uuid, p_role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = p_organization_id and m.user_id = (select auth.uid()) and m.role = p_role
  );
$$;

create function private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.is_platform_admin from public.profiles p where p.id = (select auth.uid())),
    false
  );
$$;

create function private.can_read(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_member(p_organization_id) or private.is_platform_admin();
$$;

create function private.shares_org(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members mine
    join public.organization_members theirs on theirs.organization_id = mine.organization_id
    where mine.user_id = (select auth.uid()) and theirs.user_id = p_user_id
  );
$$;

revoke execute on function
  private.is_member(uuid),
  private.has_role(uuid, text),
  private.is_platform_admin(),
  private.can_read(uuid),
  private.shares_org(uuid)
from public;

grant execute on function
  private.is_member(uuid),
  private.has_role(uuid, text),
  private.is_platform_admin(),
  private.can_read(uuid),
  private.shares_org(uuid)
to authenticated;

create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or private.shares_org(id) or private.is_platform_admin());

create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy organizations_select on public.organizations for select to authenticated
  using (private.can_read(id));

create policy organizations_update_owner on public.organizations for update to authenticated
  using (private.has_role(id, 'owner'))
  with check (private.has_role(id, 'owner'));

create policy organization_members_select on public.organization_members for select to authenticated
  using (private.can_read(organization_id));

create policy organization_invites_select on public.organization_invites for select to authenticated
  using (private.has_role(organization_id, 'owner') or private.is_platform_admin());
