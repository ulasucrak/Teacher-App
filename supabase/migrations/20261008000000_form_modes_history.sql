-- =============================================================================
-- Form modes, repeatable marks and history (audit log)
--
-- 1) forms.mode: 'daily' (once a day; form_sessions + form_entries, a new value
--    replaces the day's previous one) or 'repeatable' (form_marks; marks add up).
--    Existing forms become 'daily'. The mode cannot change while the form has
--    records (trigger forms_guard_mode_change).
-- 2) forms.options items accept an optional numeric `score` (for the net total).
-- 3) form_marks: one row per mark on a repeatable form. Rows are never updated;
--    a mark is added or deleted (undo).
-- 4) form_events: read-only history written by triggers only.
--    daily      -> form_entries insert / update / delete (and a day's session delete)
--    repeatable -> form_marks insert / delete
--    Existing entries get one 'entry_baseline' event each (their current value
--    at updated_at), so the history of old days is not empty.
-- 5) RPCs: form_tally (per-student counts for a date range + one day),
--    form_history (paged history), undo_last_mark. copy_form_to_classes also
--    copies the mode.
--
-- Custom SQLSTATEs (mapped to Turkish messages in the app):
--   TA001  mode change on a form that has records
--   TA002  daily record on a repeatable form, or a mark on a daily form
--   TA003  mark for a student who is not in the form's class
--   TA004  mark with an option key the form does not define
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. forms.mode
-- -----------------------------------------------------------------------------

alter table public.forms
  add column if not exists mode text not null default 'daily';

alter table public.forms drop constraint if exists forms_mode_check;
alter table public.forms
  add constraint forms_mode_check check (mode in ('daily', 'repeatable'));

-- -----------------------------------------------------------------------------
-- 2. forms.options: optional numeric score
-- Items: {key, label, tone, score?}; score is absent, null or a number in
-- [-1000, 1000]. Only widens the old rule, so existing rows stay valid.
-- -----------------------------------------------------------------------------

create or replace function public.is_valid_form_options(p_options jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p_options) = 'array'
     and not exists (
       select 1
       from jsonb_array_elements(p_options) as o(item)
       where jsonb_typeof(o.item) <> 'object'
          or jsonb_typeof(o.item -> 'key') is distinct from 'string'
          or jsonb_typeof(o.item -> 'label') is distinct from 'string'
          or (o.item ->> 'tone') is null
          or (o.item ->> 'tone') not in ('positive', 'neutral', 'warning', 'negative')
          or coalesce(jsonb_typeof(o.item -> 'score'), 'null') not in ('number', 'null')
          or case
               when jsonb_typeof(o.item -> 'score') = 'number'
                 then abs((o.item ->> 'score')::numeric) > 1000
               else false
             end
     );
$$;

-- -----------------------------------------------------------------------------
-- 3. Tables
-- -----------------------------------------------------------------------------

create table if not exists public.form_marks (
  id          uuid primary key default gen_random_uuid(),
  form_id     uuid not null references public.forms (id) on delete cascade,
  student_id  uuid not null references public.students (id) on delete cascade,
  teacher_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  option_key  text not null,
  note        text,
  -- The device's local calendar day, sent by the client (like session_date).
  mark_date   date not null default current_date,
  marked_at   timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create table if not exists public.form_events (
  -- Identity keeps insertion order for events of the same transaction
  -- (they share occurred_at = now()).
  id              bigint generated always as identity primary key,
  form_id         uuid not null references public.forms (id) on delete cascade,
  student_id      uuid not null references public.students (id) on delete cascade,
  teacher_id      uuid not null references auth.users (id) on delete cascade,
  kind            text not null
                  constraint form_events_kind_check check (kind in (
                    'entry_created', 'entry_updated', 'entry_deleted', 'entry_baseline',
                    'mark_added', 'mark_removed'
                  )),
  -- The day the change belongs to: session_date (daily) or mark_date (repeatable).
  event_date      date not null,
  old_option_key  text,
  new_option_key  text,
  old_note        text,
  new_note        text,
  -- form_marks.id for mark events (no FK: the mark may have been deleted).
  mark_id         uuid,
  occurred_at     timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------

-- form_tally: marks of a form in a date range
create index if not exists form_marks_form_id_mark_date_idx
  on public.form_marks (form_id, mark_date);
-- FK (student_id) + undo_last_mark (student, form, day)
create index if not exists form_marks_student_id_form_id_mark_date_idx
  on public.form_marks (student_id, form_id, mark_date);
create index if not exists form_marks_teacher_id_idx
  on public.form_marks (teacher_id);

-- form_history: newest first, keyset pagination on (occurred_at, id)
create index if not exists form_events_form_id_occurred_at_idx
  on public.form_events (form_id, occurred_at desc, id desc);
create index if not exists form_events_student_id_idx
  on public.form_events (student_id);
create index if not exists form_events_teacher_id_idx
  on public.form_events (teacher_id);

-- -----------------------------------------------------------------------------
-- Privileges: marks are added or deleted (never updated); history is read-only
-- for clients and written by SECURITY DEFINER triggers only.
-- -----------------------------------------------------------------------------

revoke all on table public.form_marks, public.form_events from anon, authenticated;
grant select, insert, delete on table public.form_marks to authenticated;
grant select on table public.form_events to authenticated;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

alter table public.form_marks  enable row level security;
alter table public.form_events enable row level security;

-- form_marks ------------------------------------------------------------------
drop policy if exists form_marks_select_own on public.form_marks;
create policy form_marks_select_own on public.form_marks
  for select to authenticated
  using (teacher_id = (select auth.uid()));

drop policy if exists form_marks_insert_own on public.form_marks;
create policy form_marks_insert_own on public.form_marks
  for insert to authenticated
  with check (
    teacher_id = (select auth.uid())
    -- form and student owned by caller, and the student is in the form's class
    and exists (
      select 1
      from public.forms f
      join public.students st on st.class_id = f.class_id
      where f.id = form_id
        and st.id = student_id
        and f.teacher_id = (select auth.uid())
        and st.teacher_id = (select auth.uid())
    )
  );

drop policy if exists form_marks_delete_own on public.form_marks;
create policy form_marks_delete_own on public.form_marks
  for delete to authenticated
  using (teacher_id = (select auth.uid()));

-- form_events (select only) ---------------------------------------------------
drop policy if exists form_events_select_own on public.form_events;
create policy form_events_select_own on public.form_events
  for select to authenticated
  using (teacher_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- Guards
-- -----------------------------------------------------------------------------

-- forms.mode is fixed once the form has a daily record or a mark.
create or replace function public.forms_guard_mode_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from public.form_sessions s where s.form_id = old.id)
     or exists (select 1 from public.form_marks m where m.form_id = old.id) then
    raise exception 'form % already has records; its mode cannot change', old.id
      using errcode = 'TA001';
  end if;
  return new;
end;
$$;

drop trigger if exists forms_guard_mode_change on public.forms;
create trigger forms_guard_mode_change
  before update of mode on public.forms
  for each row
  when (old.mode is distinct from new.mode)
  execute function public.forms_guard_mode_change();

-- Daily records (form_sessions) only on daily forms.
create or replace function public.form_sessions_require_daily_form()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.forms f
    where f.id = new.form_id and f.mode <> 'daily'
  ) then
    raise exception 'form % is not a daily form', new.form_id
      using errcode = 'TA002';
  end if;
  return new;
end;
$$;

drop trigger if exists form_sessions_require_daily_form on public.form_sessions;
create trigger form_sessions_require_daily_form
  before insert or update of form_id on public.form_sessions
  for each row execute function public.form_sessions_require_daily_form();

-- Marks: repeatable form, student in the form's class, option key defined on
-- the form (options is jsonb, so this cannot be a foreign key).
create or replace function public.form_marks_validate()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_class_id uuid;
  v_mode text;
  v_options jsonb;
begin
  select f.class_id, f.mode, f.options
    into v_class_id, v_mode, v_options
  from public.forms f
  where f.id = new.form_id;

  if not found then
    raise exception 'form % not found', new.form_id
      using errcode = '23503';
  end if;

  if v_mode <> 'repeatable' then
    raise exception 'form % is not a repeatable form', new.form_id
      using errcode = 'TA002';
  end if;

  if not exists (
    select 1 from public.students st
    where st.id = new.student_id and st.class_id = v_class_id
  ) then
    raise exception 'student % is not in the class of form %', new.student_id, new.form_id
      using errcode = 'TA003';
  end if;

  if not (v_options @> jsonb_build_array(jsonb_build_object('key', new.option_key))) then
    raise exception 'option "%" is not defined on form %', new.option_key, new.form_id
      using errcode = 'TA004';
  end if;

  return new;
end;
$$;

drop trigger if exists form_marks_validate on public.form_marks;
create trigger form_marks_validate
  before insert or update of form_id, student_id, option_key on public.form_marks
  for each row execute function public.form_marks_validate();

-- -----------------------------------------------------------------------------
-- History (audit) triggers
--
-- SECURITY DEFINER: clients cannot write form_events. The values come from the
-- row being written, which already passed RLS.
--
-- While a parent is being deleted (student, form, class or the user account),
-- the cascaded child deletes fire these triggers too. Such rows must not be
-- logged: the history is deleted with that parent and an insert would violate
-- the foreign keys. form_event_targets_exist() checks the parents first.
-- -----------------------------------------------------------------------------

create or replace function public.form_event_targets_exist(
  p_form_id uuid,
  p_student_id uuid,
  p_teacher_id uuid
)
returns boolean
language sql
volatile
set search_path = ''
as $$
  select exists (select 1 from public.forms f where f.id = p_form_id)
     and exists (select 1 from public.students st where st.id = p_student_id)
     and exists (select 1 from auth.users u where u.id = p_teacher_id);
$$;

-- form_entries (daily) --------------------------------------------------------
create or replace function public.form_entries_log_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old_form uuid;
  v_old_date date;
  v_new_form uuid;
  v_new_date date;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    select s.form_id, s.session_date into v_old_form, v_old_date
    from public.form_sessions s where s.id = old.session_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    select s.form_id, s.session_date into v_new_form, v_new_date
    from public.form_sessions s where s.id = new.session_id;
  end if;

  -- Same day and student: one 'entry_updated' event with old and new values.
  if tg_op = 'UPDATE' then
    if old.session_id = new.session_id and old.student_id = new.student_id then
      if v_new_form is not null
         and public.form_event_targets_exist(v_new_form, new.student_id, new.teacher_id) then
        insert into public.form_events (
          form_id, student_id, teacher_id, kind, event_date,
          old_option_key, new_option_key, old_note, new_note
        ) values (
          v_new_form, new.student_id, new.teacher_id, 'entry_updated', v_new_date,
          old.option_key, new.option_key, old.note, new.note
        );
      end if;
      return null;
    end if;
  end if;

  -- DELETE, or an UPDATE that moved the row to another day/student.
  -- No session (v_old_form is null): the session is being deleted and
  -- form_sessions_log_delete has already logged this row.
  if tg_op in ('UPDATE', 'DELETE') then
    if (old.option_key is not null or old.note is not null)
       and v_old_form is not null
       and public.form_event_targets_exist(v_old_form, old.student_id, old.teacher_id) then
      insert into public.form_events (
        form_id, student_id, teacher_id, kind, event_date, old_option_key, old_note
      ) values (
        v_old_form, old.student_id, old.teacher_id, 'entry_deleted', v_old_date,
        old.option_key, old.note
      );
    end if;
  end if;

  -- INSERT (also the insert branch of an upsert), or the new side of a move.
  if tg_op in ('INSERT', 'UPDATE') then
    if (new.option_key is not null or new.note is not null)
       and v_new_form is not null
       and public.form_event_targets_exist(v_new_form, new.student_id, new.teacher_id) then
      insert into public.form_events (
        form_id, student_id, teacher_id, kind, event_date, new_option_key, new_note
      ) values (
        v_new_form, new.student_id, new.teacher_id, 'entry_created', v_new_date,
        new.option_key, new.note
      );
    end if;
  end if;

  return null;
end;
$$;

drop trigger if exists form_entries_log_insert on public.form_entries;
create trigger form_entries_log_insert
  after insert on public.form_entries
  for each row
  when (new.option_key is not null or new.note is not null)
  execute function public.form_entries_log_event();

drop trigger if exists form_entries_log_update on public.form_entries;
create trigger form_entries_log_update
  after update on public.form_entries
  for each row
  when (
    old.option_key is distinct from new.option_key
    or old.note is distinct from new.note
    or old.session_id is distinct from new.session_id
    or old.student_id is distinct from new.student_id
  )
  execute function public.form_entries_log_event();

drop trigger if exists form_entries_log_delete on public.form_entries;
create trigger form_entries_log_delete
  after delete on public.form_entries
  for each row
  when (old.option_key is not null or old.note is not null)
  execute function public.form_entries_log_event();

-- form_sessions: deleting a day's record removes its entries by cascade. The
-- cascade runs after the session row is gone, so log the entries here (BEFORE
-- DELETE, while the session and its entries are still readable).
create or replace function public.form_sessions_log_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.form_events (
    form_id, student_id, teacher_id, kind, event_date, old_option_key, old_note
  )
  select old.form_id, e.student_id, e.teacher_id, 'entry_deleted', old.session_date,
         e.option_key, e.note
  from public.form_entries e
  where e.session_id = old.id
    and (e.option_key is not null or e.note is not null)
    and public.form_event_targets_exist(old.form_id, e.student_id, e.teacher_id)
  order by e.updated_at, e.id;
  return old;
end;
$$;

drop trigger if exists form_sessions_log_delete on public.form_sessions;
create trigger form_sessions_log_delete
  before delete on public.form_sessions
  for each row execute function public.form_sessions_log_delete();

-- form_marks (repeatable) -----------------------------------------------------
create or replace function public.form_marks_log_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if public.form_event_targets_exist(new.form_id, new.student_id, new.teacher_id) then
      insert into public.form_events (
        form_id, student_id, teacher_id, kind, event_date, new_option_key, new_note, mark_id
      ) values (
        new.form_id, new.student_id, new.teacher_id, 'mark_added', new.mark_date,
        new.option_key, new.note, new.id
      );
    end if;
  elsif tg_op = 'DELETE' then
    if public.form_event_targets_exist(old.form_id, old.student_id, old.teacher_id) then
      insert into public.form_events (
        form_id, student_id, teacher_id, kind, event_date, old_option_key, old_note, mark_id
      ) values (
        old.form_id, old.student_id, old.teacher_id, 'mark_removed', old.mark_date,
        old.option_key, old.note, old.id
      );
    end if;
  end if;
  return null;
end;
$$;

drop trigger if exists form_marks_log_event on public.form_marks;
create trigger form_marks_log_event
  after insert or delete on public.form_marks
  for each row execute function public.form_marks_log_event();

-- -----------------------------------------------------------------------------
-- Baseline: existing entries get one 'entry_baseline' event (their current
-- value, at updated_at). Earlier changes were never recorded. Runs only while
-- the history is still empty, so re-running this file adds nothing.
-- -----------------------------------------------------------------------------

insert into public.form_events (
  form_id, student_id, teacher_id, kind, event_date, new_option_key, new_note, occurred_at
)
select s.form_id, e.student_id, e.teacher_id, 'entry_baseline', s.session_date,
       e.option_key, e.note, e.updated_at
from public.form_entries e
join public.form_sessions s on s.id = e.session_id
where (e.option_key is not null or e.note is not null)
  and not exists (select 1 from public.form_events)
order by e.updated_at, e.id;

-- -----------------------------------------------------------------------------
-- RPC: form_tally
-- Per-student option counts of a form.
--   counts      marks/entries whose day is in [p_from, p_to] (null = open end)
--   day_counts  marks/entries of p_day (null -> '{}')
-- Daily forms count the current entry of each day (one per student per day);
-- repeatable forms count the current (not undone) marks. History events are
-- never counted. Every student of the form's class is returned (zeros as '{}'),
-- plus any other student that still has counted rows on this form.
-- SECURITY INVOKER: RLS limits everything to the caller's own data.
-- -----------------------------------------------------------------------------

create or replace function public.form_tally(
  p_form_id uuid,
  p_from date default null,
  p_to date default null,
  p_day date default null
)
returns table (
  student_id  uuid,
  full_name   text,
  number      text,
  counts      jsonb,
  day_counts  jsonb
)
language sql
stable
security invoker
set search_path = ''
as $$
  with src_form as (
    select f.id, f.class_id
    from public.forms f
    where f.id = p_form_id
  ),
  facts as (
    select e.student_id, e.option_key, s.session_date as day
    from public.form_sessions s
    join public.form_entries e on e.session_id = s.id
    where s.form_id = p_form_id
      and e.option_key is not null
      and (((p_from is null or s.session_date >= p_from)
            and (p_to is null or s.session_date <= p_to))
           or s.session_date = p_day)
    union all
    select m.student_id, m.option_key, m.mark_date as day
    from public.form_marks m
    where m.form_id = p_form_id
      and (((p_from is null or m.mark_date >= p_from)
            and (p_to is null or m.mark_date <= p_to))
           or m.mark_date = p_day)
  ),
  per_option as (
    select x.student_id,
           x.option_key,
           count(*) filter (
             where (p_from is null or x.day >= p_from)
               and (p_to is null or x.day <= p_to)
           ) as n,
           count(*) filter (where x.day = p_day) as d
    from facts x
    group by x.student_id, x.option_key
  ),
  per_student as (
    select o.student_id,
           jsonb_object_agg(o.option_key, o.n) filter (where o.n > 0) as counts,
           jsonb_object_agg(o.option_key, o.d) filter (where o.d > 0) as day_counts
    from per_option o
    group by o.student_id
  ),
  ids as (
    select st.id
    from public.students st
    join src_form sf on sf.class_id = st.class_id
    union
    select ps.student_id from per_student ps
  )
  select st.id,
         st.full_name,
         st.number,
         coalesce(ps.counts, '{}'::jsonb),
         coalesce(ps.day_counts, '{}'::jsonb)
  from ids
  join public.students st on st.id = ids.id
  left join per_student ps on ps.student_id = st.id
  where exists (select 1 from src_form)
  order by st.full_name, st.id;
$$;

-- -----------------------------------------------------------------------------
-- RPC: form_history
-- History of a form, newest first, with the student's name.
--   p_from / p_to   filter on event_date (the day the change belongs to)
--   p_student_id    optional, one student only
--   p_before_*      keyset cursor: rows strictly older than (occurred_at, id)
--   p_limit         page size, 1..500 (default 50)
-- undone: a 'mark_added' event whose mark has since been deleted.
-- -----------------------------------------------------------------------------

create or replace function public.form_history(
  p_form_id uuid,
  p_from date default null,
  p_to date default null,
  p_student_id uuid default null,
  p_before_occurred_at timestamptz default null,
  p_before_id bigint default null,
  p_limit integer default 50
)
returns table (
  id              bigint,
  kind            text,
  student_id      uuid,
  student_name    text,
  student_number  text,
  event_date      date,
  occurred_at     timestamptz,
  old_option_key  text,
  new_option_key  text,
  old_note        text,
  new_note        text,
  mark_id         uuid,
  undone          boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  select e.id,
         e.kind,
         e.student_id,
         st.full_name,
         st.number,
         e.event_date,
         e.occurred_at,
         e.old_option_key,
         e.new_option_key,
         e.old_note,
         e.new_note,
         e.mark_id,
         (e.kind = 'mark_added'
          and not exists (select 1 from public.form_marks m where m.id = e.mark_id)) as undone
  from public.form_events e
  join public.students st on st.id = e.student_id
  where e.form_id = p_form_id
    and (p_from is null or e.event_date >= p_from)
    and (p_to is null or e.event_date <= p_to)
    and (p_student_id is null or e.student_id = p_student_id)
    and (p_before_occurred_at is null
         or e.occurred_at < p_before_occurred_at
         or (e.occurred_at = p_before_occurred_at
             and e.id < coalesce(p_before_id, 9223372036854775807)))
  order by e.occurred_at desc, e.id desc
  limit least(greatest(coalesce(p_limit, 50), 1), 500);
$$;

-- -----------------------------------------------------------------------------
-- RPC: undo_last_mark
-- Deletes the student's latest mark on the form (optionally only of one day
-- and/or one option) and returns it; returns no row when there is nothing to
-- undo. The delete trigger logs a 'mark_removed' event.
-- -----------------------------------------------------------------------------

create or replace function public.undo_last_mark(
  p_form_id uuid,
  p_student_id uuid,
  p_mark_date date default null,
  p_option_key text default null
)
returns setof public.form_marks
language sql
volatile
security invoker
set search_path = ''
as $$
  delete from public.form_marks m
  where m.id = (
    select x.id
    from public.form_marks x
    where x.form_id = p_form_id
      and x.student_id = p_student_id
      and (p_mark_date is null or x.mark_date = p_mark_date)
      and (p_option_key is null or x.option_key = p_option_key)
    order by x.marked_at desc, x.created_at desc, x.id desc
    limit 1
  )
  returning m.*;
$$;

-- -----------------------------------------------------------------------------
-- RPC: copy_form_to_classes (now also copies mode)
-- -----------------------------------------------------------------------------

create or replace function public.copy_form_to_classes(p_form_id uuid, p_class_ids uuid[])
returns setof public.forms
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_src public.forms%rowtype;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select f.* into v_src
  from public.forms f
  where f.id = p_form_id and f.teacher_id = v_uid;

  if not found then
    raise exception 'form % not found or not owned by caller', p_form_id
      using errcode = '42501';
  end if;

  return query
  insert into public.forms (class_id, teacher_id, title, subject, description, options, mode, sort_order)
  select c.id,
         v_uid,
         v_src.title,
         v_src.subject,
         v_src.description,
         v_src.options,
         v_src.mode,
         coalesce((select max(f2.sort_order) + 1 from public.forms f2 where f2.class_id = c.id), 0)
  from public.classes c
  where c.id = any (coalesce(p_class_ids, '{}'::uuid[]))
    and c.teacher_id = v_uid
  returning *;
end;
$$;

-- -----------------------------------------------------------------------------
-- Function privileges
-- Trigger functions and the helper are not callable through the API (trigger
-- firing does not check EXECUTE). RPCs: authenticated only.
-- -----------------------------------------------------------------------------

revoke all on function public.forms_guard_mode_change() from public, anon, authenticated;
revoke all on function public.form_sessions_require_daily_form() from public, anon, authenticated;
revoke all on function public.form_marks_validate() from public, anon, authenticated;
revoke all on function public.form_event_targets_exist(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.form_entries_log_event() from public, anon, authenticated;
revoke all on function public.form_sessions_log_delete() from public, anon, authenticated;
revoke all on function public.form_marks_log_event() from public, anon, authenticated;

revoke all on function public.form_tally(uuid, date, date, date) from public, anon;
grant execute on function public.form_tally(uuid, date, date, date) to authenticated;

revoke all on function public.form_history(uuid, date, date, uuid, timestamptz, bigint, integer) from public, anon;
grant execute on function public.form_history(uuid, date, date, uuid, timestamptz, bigint, integer) to authenticated;

revoke all on function public.undo_last_mark(uuid, uuid, date, text) from public, anon;
grant execute on function public.undo_last_mark(uuid, uuid, date, text) to authenticated;

revoke all on function public.copy_form_to_classes(uuid, uuid[]) from public, anon;
grant execute on function public.copy_form_to_classes(uuid, uuid[]) to authenticated;
