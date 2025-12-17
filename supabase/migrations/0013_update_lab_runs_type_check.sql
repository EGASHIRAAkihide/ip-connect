-- 0013_update_lab_runs_type_check.sql
-- Allow speaker_embedding lab run type.

alter table if exists lab_runs drop constraint if exists lab_runs_type_check;

alter table if exists lab_runs
add constraint lab_runs_type_check
check (type in ('asr','diarization','speaker_embedding'));
