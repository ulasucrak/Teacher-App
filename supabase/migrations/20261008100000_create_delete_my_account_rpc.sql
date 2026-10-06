-- Delete only the authenticated caller. All five application tables have
-- teacher_id references to auth.users ON DELETE CASCADE in the initial schema.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Authenticated user not found' using errcode = '42501';
  end if;

  delete from auth.users where id = v_uid;
end;
$$;

-- Functions otherwise grant EXECUTE to PUBLIC by default.
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
