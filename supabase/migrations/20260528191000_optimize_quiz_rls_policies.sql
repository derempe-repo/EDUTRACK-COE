drop policy if exists "question_options_manage_class_managers" on public.question_options;

drop policy if exists "question_options_insert_class_managers" on public.question_options;
create policy "question_options_insert_class_managers"
on public.question_options for insert to authenticated
with check (
  exists (
    select 1 from public.questions q
    join public.module_steps ms on ms.id = q.module_step_id
    join public.modules m on m.id = ms.module_id
    where q.id = question_id and private.can_manage_class(m.class_id)
  )
);

drop policy if exists "question_options_update_class_managers" on public.question_options;
create policy "question_options_update_class_managers"
on public.question_options for update to authenticated
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

drop policy if exists "question_options_delete_class_managers" on public.question_options;
create policy "question_options_delete_class_managers"
on public.question_options for delete to authenticated
using (
  exists (
    select 1 from public.questions q
    join public.module_steps ms on ms.id = q.module_step_id
    join public.modules m on m.id = ms.module_id
    where q.id = question_id and private.can_manage_class(m.class_id)
  )
);

drop policy if exists "quiz_answers_manage_owner" on public.quiz_answers;

drop policy if exists "quiz_answers_insert_owner" on public.quiz_answers;
create policy "quiz_answers_insert_owner"
on public.quiz_answers for insert to authenticated
with check (
  exists (
    select 1 from public.quiz_attempt_questions qaq
    join public.quiz_attempts qa on qa.id = qaq.attempt_id
    where qaq.id = attempt_question_id and qa.student_id = (select auth.uid())
  )
);

drop policy if exists "quiz_answers_update_owner" on public.quiz_answers;
create policy "quiz_answers_update_owner"
on public.quiz_answers for update to authenticated
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

drop policy if exists "quiz_answers_delete_owner" on public.quiz_answers;
create policy "quiz_answers_delete_owner"
on public.quiz_answers for delete to authenticated
using (
  exists (
    select 1 from public.quiz_attempt_questions qaq
    join public.quiz_attempts qa on qa.id = qaq.attempt_id
    where qaq.id = attempt_question_id and qa.student_id = (select auth.uid())
  )
);

drop policy if exists "grades_manage_owner_or_class_managers" on public.grades;

drop policy if exists "grades_insert_owner_or_class_managers" on public.grades;
create policy "grades_insert_owner_or_class_managers"
on public.grades for insert to authenticated
with check (student_id = (select auth.uid()) or private.can_manage_class(class_id));

drop policy if exists "grades_update_owner_or_class_managers" on public.grades;
create policy "grades_update_owner_or_class_managers"
on public.grades for update to authenticated
using (student_id = (select auth.uid()) or private.can_manage_class(class_id))
with check (student_id = (select auth.uid()) or private.can_manage_class(class_id));

drop policy if exists "grades_delete_class_managers" on public.grades;
create policy "grades_delete_class_managers"
on public.grades for delete to authenticated
using (private.can_manage_class(class_id));
