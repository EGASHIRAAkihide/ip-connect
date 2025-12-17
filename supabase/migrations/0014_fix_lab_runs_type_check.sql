-- 0014_fix_lab_runs_type_check.sql
-- Ensure lab_runs.type allows speaker_embedding.

alter table if exists lab_runs drop constraint if exists lab_runs_type_check;

alter table if exists lab_runs
add constraint lab_runs_type_check
check (type in ('asr','diarization','speaker_embedding'));
