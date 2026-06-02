alter table public.quizzes add column if not exists module_id uuid;
alter table public.quizzes add column if not exists quiz_type text not null default 'step';

alter table public.quizzes alter column module_step_id drop not null;

alter table public.quizzes
  drop constraint if exists quizzes_module_id_modules_id_fk;

alter table public.quizzes
  add constraint quizzes_module_id_modules_id_fk
  foreign key (module_id) references public.modules(id)
  on delete cascade;

alter table public.quizzes
  drop constraint if exists quizzes_context_check;

alter table public.quizzes
  add constraint quizzes_context_check
  check (
    (quiz_type = 'step' and module_step_id is not null and module_id is null)
    or
    (quiz_type = 'final' and module_step_id is null and module_id is not null)
  );

drop index if exists public.quizzes_active_step_unique;
create unique index quizzes_active_step_unique
  on public.quizzes(module_step_id)
  where is_active = true and quiz_type = 'step';

create unique index if not exists quizzes_active_final_module_unique
  on public.quizzes(module_id)
  where is_active = true and quiz_type = 'final';

create index if not exists quizzes_module_id_idx on public.quizzes(module_id);
create index if not exists quizzes_quiz_type_idx on public.quizzes(quiz_type);
