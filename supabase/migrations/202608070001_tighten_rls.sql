-- Tighten the blanket family write policies created by the do-block in
-- 202608060001_initial_schema.sql.
--
-- That loop applied `for all` (read + write) to 21 family-scoped tables. Four of
-- them are integrity or trust surfaces that only service-role code paths ever
-- write, so a family member holding write access is a hole with no upside:
--
--   sisters_audit_logs        a parent could rewrite their own audit trail
--   sisters_ai_jobs           a parent could set status='completed' and inject
--                             a `result` payload that is later consumed as AI output
--   sisters_notification_jobs same, for delivery state and attempt counts
--   sisters_plan_versions     snapshots must be append-only history
--
-- Reads stay open to the family; writes go to service-role only. Nothing in
-- src/ writes these tables through an authenticated client, so this is
-- behaviour-preserving for the application.

begin;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'sisters_audit_logs',
    'sisters_ai_jobs',
    'sisters_notification_jobs',
    'sisters_plan_versions'
  ] loop
    -- Drop the read+write policy pair the initial migration installed.
    execute format('drop policy if exists "family read %1$s" on public.%1$I', table_name);
    execute format('drop policy if exists "family write %1$s" on public.%1$I', table_name);

    -- Reinstate read-only access for family members and app admins.
    execute format(
      'create policy "family read %1$s" on public.%1$I for select using (public.sisters_is_family_member(family_id) or public.sisters_is_app_admin())',
      table_name
    );
  end loop;
end $$;

commit;
