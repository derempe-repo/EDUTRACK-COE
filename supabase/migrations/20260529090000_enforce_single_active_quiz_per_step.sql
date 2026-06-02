with ranked_quizzes as (
  select
    q.id,
    row_number() over (
      partition by q.module_step_id
      order by
        (count(qa.id) > 0) desc,
        q.created_at asc,
        q.id asc
    ) as rank_in_step
  from public.quizzes q
  left join public.quiz_attempts qa on qa.quiz_id = q.id
  where q.is_active = true
  group by q.id
)
update public.quizzes q
set
  is_active = false,
  updated_at = now()
from ranked_quizzes ranked
where ranked.id = q.id
  and ranked.rank_in_step > 1;

create unique index if not exists quizzes_active_step_unique
on public.quizzes(module_step_id)
where is_active = true;
