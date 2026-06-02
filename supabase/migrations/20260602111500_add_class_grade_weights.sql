alter table public.classes
add column if not exists assignment_weight integer not null default 30,
add column if not exists quiz_weight integer not null default 30,
add column if not exists final_exam_weight integer not null default 40;

alter table public.classes
drop constraint if exists classes_grade_weights_range_check;

alter table public.classes
add constraint classes_grade_weights_range_check check (
  assignment_weight between 0 and 100
  and quiz_weight between 0 and 100
  and final_exam_weight between 0 and 100
);

alter table public.classes
drop constraint if exists classes_grade_weights_total_check;

alter table public.classes
add constraint classes_grade_weights_total_check check (
  assignment_weight + quiz_weight + final_exam_weight = 100
);
