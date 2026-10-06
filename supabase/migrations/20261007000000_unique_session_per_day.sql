-- =============================================================================
-- One form_session per (form, day).
-- 1) Merge existing duplicates into the oldest session of each group.
-- 2) Add a unique index so duplicates cannot be created again.
-- =============================================================================

create temporary table _session_merge as
select id as dup_id, keep_id
from (
  select
    id,
    first_value(id) over (
      partition by form_id, session_date
      order by created_at asc, id asc
    ) as keep_id
  from public.form_sessions
) s
where id <> keep_id;

-- Move entries (newest per student) whose student has no entry in the kept session.
with candidates as (
  select distinct on (m.keep_id, e.student_id)
    e.id, m.keep_id
  from public.form_entries e
  join _session_merge m on m.dup_id = e.session_id
  where not exists (
    select 1 from public.form_entries k
    where k.session_id = m.keep_id and k.student_id = e.student_id
  )
  order by m.keep_id, e.student_id, e.updated_at desc, e.id desc
)
update public.form_entries e
set session_id = c.keep_id
from candidates c
where e.id = c.id;

-- Both sides have an entry: copy option_key/note from the newest duplicate
-- entry into the kept entry when it is more recently updated.
with newest as (
  select distinct on (m.keep_id, e.student_id)
    m.keep_id, e.student_id, e.option_key, e.note, e.updated_at
  from public.form_entries e
  join _session_merge m on m.dup_id = e.session_id
  order by m.keep_id, e.student_id, e.updated_at desc, e.id desc
)
update public.form_entries k
set option_key = n.option_key,
    note = n.note
from newest n
where k.session_id = n.keep_id
  and k.student_id = n.student_id
  and n.updated_at > k.updated_at;

-- Remove duplicate sessions (remaining entries cascade).
delete from public.form_sessions
where id in (select dup_id from _session_merge);

drop table _session_merge;

create unique index if not exists form_sessions_form_id_session_date_key
  on public.form_sessions (form_id, session_date);
