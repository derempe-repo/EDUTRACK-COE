create index if not exists submissions_assignment_submitted_at_idx
on public.submissions using btree (assignment_id, submitted_at);

create index if not exists quiz_attempts_quiz_started_at_idx
on public.quiz_attempts using btree (quiz_id, started_at);

create index if not exists quiz_attempts_student_started_at_idx
on public.quiz_attempts using btree (student_id, started_at);

create index if not exists exam_mode_events_attempt_created_at_idx
on public.exam_mode_events using btree (attempt_id, created_at);

create index if not exists certificates_class_id_idx
on public.certificates using btree (class_id);

create index if not exists exports_class_created_at_idx
on public.exports using btree (class_id, created_at);
