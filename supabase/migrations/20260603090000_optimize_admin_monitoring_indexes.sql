create index if not exists submissions_plagiarism_status_idx
on public.submissions using btree (plagiarism_status);

create index if not exists plagiarism_checks_status_checked_at_idx
on public.plagiarism_checks using btree (status, checked_at);

create index if not exists exam_mode_events_created_at_idx
on public.exam_mode_events using btree (created_at);
