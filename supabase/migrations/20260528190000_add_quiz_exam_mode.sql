create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  module_step_id uuid not null references public.module_steps(id) on delete cascade,
  title text not null,
  description text,
  duration_minutes integer not null default 30,
  question_count integer not null default 5,
  passing_score integer not null default 70,
  is_active boolean not null default true,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  module_step_id uuid not null references public.module_steps(id) on delete cascade,
  question_text text not null,
  difficulty text not null default 'medium',
  weight integer not null default 1,
  is_active boolean not null default true,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  label text not null,
  option_text text not null,
  is_correct boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint question_options_question_label_unique unique (question_id, label)
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status public.quiz_attempt_status not null default 'started',
  score integer,
  total_weight integer not null default 0,
  correct_weight integer not null default 0,
  warning_count integer not null default 0,
  started_at timestamp with time zone not null default now(),
  expires_at timestamp with time zone not null,
  submitted_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.quiz_attempt_questions (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete restrict,
  question_text text not null,
  weight integer not null default 1,
  sort_order integer not null default 0,
  created_at timestamp with time zone not null default now(),
  constraint quiz_attempt_questions_attempt_question_unique unique (attempt_id, question_id)
);

create table if not exists public.quiz_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_question_id uuid not null references public.quiz_attempt_questions(id) on delete cascade,
  selected_option_id uuid references public.question_options(id) on delete set null,
  is_correct boolean not null default false,
  weight_awarded integer not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint quiz_answers_attempt_question_unique unique (attempt_question_id)
);

create table if not exists public.grades (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  source_type text not null,
  source_id uuid not null,
  score integer not null,
  max_score integer not null default 100,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint grades_student_source_unique unique (student_id, source_type, source_id)
);

create table if not exists public.exam_mode_events (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  detail text,
  created_at timestamp with time zone not null default now()
);

create index if not exists quizzes_module_step_id_idx on public.quizzes(module_step_id);
create index if not exists quizzes_created_by_idx on public.quizzes(created_by);
create index if not exists quizzes_is_active_idx on public.quizzes(is_active);
create index if not exists questions_module_step_id_idx on public.questions(module_step_id);
create index if not exists questions_created_by_idx on public.questions(created_by);
create index if not exists questions_difficulty_idx on public.questions(difficulty);
create index if not exists questions_is_active_idx on public.questions(is_active);
create index if not exists question_options_question_id_idx on public.question_options(question_id);
create index if not exists quiz_attempts_quiz_id_idx on public.quiz_attempts(quiz_id);
create index if not exists quiz_attempts_student_id_idx on public.quiz_attempts(student_id);
create index if not exists quiz_attempts_status_idx on public.quiz_attempts(status);
create index if not exists quiz_attempt_questions_attempt_id_idx on public.quiz_attempt_questions(attempt_id);
create index if not exists quiz_attempt_questions_question_id_idx on public.quiz_attempt_questions(question_id);
create index if not exists quiz_answers_selected_option_id_idx on public.quiz_answers(selected_option_id);
create index if not exists grades_class_id_idx on public.grades(class_id);
create index if not exists grades_student_id_idx on public.grades(student_id);
create index if not exists exam_mode_events_attempt_id_idx on public.exam_mode_events(attempt_id);
create index if not exists exam_mode_events_student_id_idx on public.exam_mode_events(student_id);
create index if not exists exam_mode_events_event_type_idx on public.exam_mode_events(event_type);

alter table public.quizzes enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.quiz_attempt_questions enable row level security;
alter table public.quiz_answers enable row level security;
alter table public.grades enable row level security;
alter table public.exam_mode_events enable row level security;

grant select, insert, update, delete on public.quizzes to authenticated;
grant select, insert, update, delete on public.questions to authenticated;
grant select, insert, update, delete on public.question_options to authenticated;
grant select, insert, update, delete on public.quiz_attempts to authenticated;
grant select, insert, update, delete on public.quiz_attempt_questions to authenticated;
grant select, insert, update, delete on public.quiz_answers to authenticated;
grant select, insert, update, delete on public.grades to authenticated;
grant select, insert, update, delete on public.exam_mode_events to authenticated;

drop policy if exists "quizzes_select_accessible" on public.quizzes;
create policy "quizzes_select_accessible"
on public.quizzes for select to authenticated
using (
  exists (
    select 1
    from public.module_steps ms
    join public.modules m on m.id = ms.module_id
    join public.classes c on c.id = m.class_id
    where ms.id = module_step_id
      and (
        private.can_manage_class(c.id)
        or (
          c.status = 'published'
          and m.is_locked = false
          and is_active = true
          and exists (
            select 1 from public.class_members cm
            where cm.class_id = c.id
              and cm.profile_id = (select auth.uid())
              and cm.role = 'student'
          )
        )
      )
  )
);

drop policy if exists "quizzes_insert_class_managers" on public.quizzes;
create policy "quizzes_insert_class_managers"
on public.quizzes for insert to authenticated
with check (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.module_steps ms
    join public.modules m on m.id = ms.module_id
    where ms.id = module_step_id and private.can_manage_class(m.class_id)
  )
);

drop policy if exists "quizzes_update_class_managers" on public.quizzes;
create policy "quizzes_update_class_managers"
on public.quizzes for update to authenticated
using (
  exists (
    select 1 from public.module_steps ms
    join public.modules m on m.id = ms.module_id
    where ms.id = module_step_id and private.can_manage_class(m.class_id)
  )
)
with check (
  exists (
    select 1 from public.module_steps ms
    join public.modules m on m.id = ms.module_id
    where ms.id = module_step_id and private.can_manage_class(m.class_id)
  )
);

drop policy if exists "questions_select_class_managers" on public.questions;
create policy "questions_select_class_managers"
on public.questions for select to authenticated
using (
  exists (
    select 1 from public.module_steps ms
    join public.modules m on m.id = ms.module_id
    where ms.id = module_step_id and private.can_manage_class(m.class_id)
  )
);

drop policy if exists "questions_insert_class_managers" on public.questions;
create policy "questions_insert_class_managers"
on public.questions for insert to authenticated
with check (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.module_steps ms
    join public.modules m on m.id = ms.module_id
    where ms.id = module_step_id and private.can_manage_class(m.class_id)
  )
);

drop policy if exists "questions_update_class_managers" on public.questions;
create policy "questions_update_class_managers"
on public.questions for update to authenticated
using (
  exists (
    select 1 from public.module_steps ms
    join public.modules m on m.id = ms.module_id
    where ms.id = module_step_id and private.can_manage_class(m.class_id)
  )
)
with check (
  exists (
    select 1 from public.module_steps ms
    join public.modules m on m.id = ms.module_id
    where ms.id = module_step_id and private.can_manage_class(m.class_id)
  )
);

drop policy if exists "questions_delete_class_managers" on public.questions;
create policy "questions_delete_class_managers"
on public.questions for delete to authenticated
using (
  exists (
    select 1 from public.module_steps ms
    join public.modules m on m.id = ms.module_id
    where ms.id = module_step_id and private.can_manage_class(m.class_id)
  )
);

drop policy if exists "question_options_select_via_question" on public.question_options;
create policy "question_options_select_via_question"
on public.question_options for select to authenticated
using (
  exists (
    select 1 from public.questions q
    join public.module_steps ms on ms.id = q.module_step_id
    join public.modules m on m.id = ms.module_id
    join public.classes c on c.id = m.class_id
    where q.id = question_id
      and (
        private.can_manage_class(c.id)
        or exists (
          select 1 from public.class_members cm
          where cm.class_id = c.id
            and cm.profile_id = (select auth.uid())
            and cm.role = 'student'
            and c.status = 'published'
            and m.is_locked = false
        )
      )
  )
);

drop policy if exists "question_options_manage_class_managers" on public.question_options;
create policy "question_options_manage_class_managers"
on public.question_options for all to authenticated
using (
  exists (
    select 1 from public.questions q
    join public.module_steps ms on ms.id = q.module_step_id
    join public.modules m on m.id = ms.module_id
    where q.id = question_id and private.can_manage_class(m.class_id)
  )
)
with check (
  exists (
    select 1 from public.questions q
    join public.module_steps ms on ms.id = q.module_step_id
    join public.modules m on m.id = ms.module_id
    where q.id = question_id and private.can_manage_class(m.class_id)
  )
);

drop policy if exists "quiz_attempts_select_owner_or_class_managers" on public.quiz_attempts;
create policy "quiz_attempts_select_owner_or_class_managers"
on public.quiz_attempts for select to authenticated
using (
  student_id = (select auth.uid())
  or exists (
    select 1 from public.quizzes q
    join public.module_steps ms on ms.id = q.module_step_id
    join public.modules m on m.id = ms.module_id
    where q.id = quiz_id and private.can_manage_class(m.class_id)
  )
);

drop policy if exists "quiz_attempts_insert_enrolled_students" on public.quiz_attempts;
create policy "quiz_attempts_insert_enrolled_students"
on public.quiz_attempts for insert to authenticated
with check (
  student_id = (select auth.uid())
  and exists (
    select 1 from public.quizzes q
    join public.module_steps ms on ms.id = q.module_step_id
    join public.modules m on m.id = ms.module_id
    join public.classes c on c.id = m.class_id
    join public.class_members cm on cm.class_id = c.id
    where q.id = quiz_id
      and q.is_active = true
      and c.status = 'published'
      and m.is_locked = false
      and cm.profile_id = (select auth.uid())
      and cm.role = 'student'
  )
);

drop policy if exists "quiz_attempts_update_owner_or_class_managers" on public.quiz_attempts;
create policy "quiz_attempts_update_owner_or_class_managers"
on public.quiz_attempts for update to authenticated
using (
  student_id = (select auth.uid())
  or exists (
    select 1 from public.quizzes q
    join public.module_steps ms on ms.id = q.module_step_id
    join public.modules m on m.id = ms.module_id
    where q.id = quiz_id and private.can_manage_class(m.class_id)
  )
)
with check (
  student_id = (select auth.uid())
  or exists (
    select 1 from public.quizzes q
    join public.module_steps ms on ms.id = q.module_step_id
    join public.modules m on m.id = ms.module_id
    where q.id = quiz_id and private.can_manage_class(m.class_id)
  )
);

drop policy if exists "quiz_attempt_questions_select_attempt_access" on public.quiz_attempt_questions;
create policy "quiz_attempt_questions_select_attempt_access"
on public.quiz_attempt_questions for select to authenticated
using (
  exists (
    select 1 from public.quiz_attempts qa
    join public.quizzes q on q.id = qa.quiz_id
    join public.module_steps ms on ms.id = q.module_step_id
    join public.modules m on m.id = ms.module_id
    where qa.id = attempt_id
      and (qa.student_id = (select auth.uid()) or private.can_manage_class(m.class_id))
  )
);

drop policy if exists "quiz_attempt_questions_insert_owner" on public.quiz_attempt_questions;
create policy "quiz_attempt_questions_insert_owner"
on public.quiz_attempt_questions for insert to authenticated
with check (
  exists (
    select 1 from public.quiz_attempts qa
    where qa.id = attempt_id and qa.student_id = (select auth.uid())
  )
);

drop policy if exists "quiz_answers_select_attempt_access" on public.quiz_answers;
create policy "quiz_answers_select_attempt_access"
on public.quiz_answers for select to authenticated
using (
  exists (
    select 1 from public.quiz_attempt_questions qaq
    join public.quiz_attempts qa on qa.id = qaq.attempt_id
    join public.quizzes q on q.id = qa.quiz_id
    join public.module_steps ms on ms.id = q.module_step_id
    join public.modules m on m.id = ms.module_id
    where qaq.id = attempt_question_id
      and (qa.student_id = (select auth.uid()) or private.can_manage_class(m.class_id))
  )
);

drop policy if exists "quiz_answers_manage_owner" on public.quiz_answers;
create policy "quiz_answers_manage_owner"
on public.quiz_answers for all to authenticated
using (
  exists (
    select 1 from public.quiz_attempt_questions qaq
    join public.quiz_attempts qa on qa.id = qaq.attempt_id
    where qaq.id = attempt_question_id and qa.student_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.quiz_attempt_questions qaq
    join public.quiz_attempts qa on qa.id = qaq.attempt_id
    where qaq.id = attempt_question_id and qa.student_id = (select auth.uid())
  )
);

drop policy if exists "grades_select_owner_or_class_managers" on public.grades;
create policy "grades_select_owner_or_class_managers"
on public.grades for select to authenticated
using (student_id = (select auth.uid()) or private.can_manage_class(class_id));

drop policy if exists "grades_manage_owner_or_class_managers" on public.grades;
create policy "grades_manage_owner_or_class_managers"
on public.grades for all to authenticated
using (student_id = (select auth.uid()) or private.can_manage_class(class_id))
with check (student_id = (select auth.uid()) or private.can_manage_class(class_id));

drop policy if exists "exam_mode_events_select_owner_or_class_managers" on public.exam_mode_events;
create policy "exam_mode_events_select_owner_or_class_managers"
on public.exam_mode_events for select to authenticated
using (
  student_id = (select auth.uid())
  or exists (
    select 1 from public.quiz_attempts qa
    join public.quizzes q on q.id = qa.quiz_id
    join public.module_steps ms on ms.id = q.module_step_id
    join public.modules m on m.id = ms.module_id
    where qa.id = attempt_id and private.can_manage_class(m.class_id)
  )
);

drop policy if exists "exam_mode_events_insert_owner" on public.exam_mode_events;
create policy "exam_mode_events_insert_owner"
on public.exam_mode_events for insert to authenticated
with check (student_id = (select auth.uid()));
