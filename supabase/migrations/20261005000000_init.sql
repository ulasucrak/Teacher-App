-- =============================================================================
-- Teacher app — initial schema
-- Tables: classes, students, forms, form_sessions, form_entries
-- Every row is owned by a teacher (teacher_id = auth.uid()); RLS enforces it.
-- =============================================================================

-- gen_random_uuid() is built into Postgres 13+ (no extension needed).

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Validates forms.options: array of {key, label, tone}
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
     );
$$;

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

create table if not exists public.classes (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null,
  grade       text,
  section     text,
  created_at  timestamptz not null default now()
);

create table if not exists public.students (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.classes (id) on delete cascade,
  teacher_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  full_name   text not null,
  number      text,            -- okul no
  photo_url   text,
  created_at  timestamptz not null default now()
);

create table if not exists public.forms (
  id           uuid primary key default gen_random_uuid(),
  class_id     uuid not null references public.classes (id) on delete cascade,
  teacher_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title        text not null,
  subject      text,
  description  text,
  options      jsonb not null default '[]'::jsonb
               constraint forms_options_valid check (public.is_valid_form_options(options)),
  sort_order   integer not null default 0,
  archived     boolean not null default false,
  created_at   timestamptz not null default now()
);

create table if not exists public.form_sessions (
  id            uuid primary key default gen_random_uuid(),
  form_id       uuid not null references public.forms (id) on delete cascade,
  teacher_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_date  date not null default current_date,
  title         text,
  status        text not null default 'draft'
                constraint form_sessions_status_check check (status in ('draft', 'published')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.form_entries (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.form_sessions (id) on delete cascade,
  student_id  uuid not null references public.students (id) on delete cascade,
  teacher_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  option_key  text,
  note        text,
  updated_at  timestamptz not null default now(),
  constraint form_entries_session_student_key unique (session_id, student_id)
);

-- -----------------------------------------------------------------------------
-- Indexes (all FKs)
-- -----------------------------------------------------------------------------

create index if not exists classes_teacher_id_idx        on public.classes (teacher_id);
create index if not exists students_class_id_idx         on public.students (class_id);
create index if not exists students_teacher_id_idx       on public.students (teacher_id);
create index if not exists forms_class_id_idx            on public.forms (class_id);
create index if not exists forms_teacher_id_idx          on public.forms (teacher_id);
create index if not exists form_sessions_form_id_idx     on public.form_sessions (form_id);
create index if not exists form_sessions_teacher_id_idx  on public.form_sessions (teacher_id);
-- form_entries.session_id is covered by the unique (session_id, student_id) index
create index if not exists form_entries_student_id_idx   on public.form_entries (student_id);
create index if not exists form_entries_teacher_id_idx   on public.form_entries (teacher_id);

-- -----------------------------------------------------------------------------
-- updated_at triggers
-- -----------------------------------------------------------------------------

drop trigger if exists form_sessions_set_updated_at on public.form_sessions;
create trigger form_sessions_set_updated_at
  before update on public.form_sessions
  for each row execute function public.set_updated_at();

drop trigger if exists form_entries_set_updated_at on public.form_entries;
create trigger form_entries_set_updated_at
  before update on public.form_entries
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Privileges: no anon access, authenticated goes through RLS
-- -----------------------------------------------------------------------------

revoke all on table
  public.classes, public.students, public.forms, public.form_sessions, public.form_entries
  from anon;

grant select, insert, update, delete on table
  public.classes, public.students, public.forms, public.form_sessions, public.form_entries
  to authenticated;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

alter table public.classes       enable row level security;
alter table public.students      enable row level security;
alter table public.forms         enable row level security;
alter table public.form_sessions enable row level security;
alter table public.form_entries  enable row level security;

-- classes ---------------------------------------------------------------------
drop policy if exists classes_select_own on public.classes;
create policy classes_select_own on public.classes
  for select to authenticated
  using (teacher_id = (select auth.uid()));

drop policy if exists classes_insert_own on public.classes;
create policy classes_insert_own on public.classes
  for insert to authenticated
  with check (teacher_id = (select auth.uid()));

drop policy if exists classes_update_own on public.classes;
create policy classes_update_own on public.classes
  for update to authenticated
  using (teacher_id = (select auth.uid()))
  with check (teacher_id = (select auth.uid()));

drop policy if exists classes_delete_own on public.classes;
create policy classes_delete_own on public.classes
  for delete to authenticated
  using (teacher_id = (select auth.uid()));

-- students --------------------------------------------------------------------
drop policy if exists students_select_own on public.students;
create policy students_select_own on public.students
  for select to authenticated
  using (teacher_id = (select auth.uid()));

drop policy if exists students_insert_own on public.students;
create policy students_insert_own on public.students
  for insert to authenticated
  with check (
    teacher_id = (select auth.uid())
    and exists (
      select 1 from public.classes c
      where c.id = class_id and c.teacher_id = (select auth.uid())
    )
  );

drop policy if exists students_update_own on public.students;
create policy students_update_own on public.students
  for update to authenticated
  using (teacher_id = (select auth.uid()))
  with check (
    teacher_id = (select auth.uid())
    and exists (
      select 1 from public.classes c
      where c.id = class_id and c.teacher_id = (select auth.uid())
    )
  );

drop policy if exists students_delete_own on public.students;
create policy students_delete_own on public.students
  for delete to authenticated
  using (teacher_id = (select auth.uid()));

-- forms -----------------------------------------------------------------------
drop policy if exists forms_select_own on public.forms;
create policy forms_select_own on public.forms
  for select to authenticated
  using (teacher_id = (select auth.uid()));

drop policy if exists forms_insert_own on public.forms;
create policy forms_insert_own on public.forms
  for insert to authenticated
  with check (
    teacher_id = (select auth.uid())
    and exists (
      select 1 from public.classes c
      where c.id = class_id and c.teacher_id = (select auth.uid())
    )
  );

drop policy if exists forms_update_own on public.forms;
create policy forms_update_own on public.forms
  for update to authenticated
  using (teacher_id = (select auth.uid()))
  with check (
    teacher_id = (select auth.uid())
    and exists (
      select 1 from public.classes c
      where c.id = class_id and c.teacher_id = (select auth.uid())
    )
  );

drop policy if exists forms_delete_own on public.forms;
create policy forms_delete_own on public.forms
  for delete to authenticated
  using (teacher_id = (select auth.uid()));

-- form_sessions ---------------------------------------------------------------
drop policy if exists form_sessions_select_own on public.form_sessions;
create policy form_sessions_select_own on public.form_sessions
  for select to authenticated
  using (teacher_id = (select auth.uid()));

drop policy if exists form_sessions_insert_own on public.form_sessions;
create policy form_sessions_insert_own on public.form_sessions
  for insert to authenticated
  with check (
    teacher_id = (select auth.uid())
    and exists (
      select 1 from public.forms f
      where f.id = form_id and f.teacher_id = (select auth.uid())
    )
  );

drop policy if exists form_sessions_update_own on public.form_sessions;
create policy form_sessions_update_own on public.form_sessions
  for update to authenticated
  using (teacher_id = (select auth.uid()))
  with check (
    teacher_id = (select auth.uid())
    and exists (
      select 1 from public.forms f
      where f.id = form_id and f.teacher_id = (select auth.uid())
    )
  );

drop policy if exists form_sessions_delete_own on public.form_sessions;
create policy form_sessions_delete_own on public.form_sessions
  for delete to authenticated
  using (teacher_id = (select auth.uid()));

-- form_entries ----------------------------------------------------------------
drop policy if exists form_entries_select_own on public.form_entries;
create policy form_entries_select_own on public.form_entries
  for select to authenticated
  using (teacher_id = (select auth.uid()));

drop policy if exists form_entries_insert_own on public.form_entries;
create policy form_entries_insert_own on public.form_entries
  for insert to authenticated
  with check (
    teacher_id = (select auth.uid())
    and exists (
      select 1 from public.form_sessions s
      where s.id = session_id and s.teacher_id = (select auth.uid())
    )
    and exists (
      select 1 from public.students st
      where st.id = student_id and st.teacher_id = (select auth.uid())
    )
  );

drop policy if exists form_entries_update_own on public.form_entries;
create policy form_entries_update_own on public.form_entries
  for update to authenticated
  using (teacher_id = (select auth.uid()))
  with check (
    teacher_id = (select auth.uid())
    and exists (
      select 1 from public.form_sessions s
      where s.id = session_id and s.teacher_id = (select auth.uid())
    )
    and exists (
      select 1 from public.students st
      where st.id = student_id and st.teacher_id = (select auth.uid())
    )
  );

drop policy if exists form_entries_delete_own on public.form_entries;
create policy form_entries_delete_own on public.form_entries
  for delete to authenticated
  using (teacher_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- RPC: copy_form_to_classes
-- Copies title/subject/description/options of a form into each target class
-- owned by the caller. Classes not owned by the caller are silently skipped.
-- Raises if the source form is not visible/owned by the caller.
-- SECURITY INVOKER: all reads/writes go through RLS.
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
  insert into public.forms (class_id, teacher_id, title, subject, description, options, sort_order)
  select c.id,
         v_uid,
         v_src.title,
         v_src.subject,
         v_src.description,
         v_src.options,
         coalesce((select max(f2.sort_order) + 1 from public.forms f2 where f2.class_id = c.id), 0)
  from public.classes c
  where c.id = any (coalesce(p_class_ids, '{}'::uuid[]))
    and c.teacher_id = v_uid
  returning *;
end;
$$;

revoke all on function public.copy_form_to_classes(uuid, uuid[]) from public, anon;
grant execute on function public.copy_form_to_classes(uuid, uuid[]) to authenticated;
