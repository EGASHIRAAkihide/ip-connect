-- 0015_allow_speaker_compare.sql
-- Extend lab_runs.type to allow speaker_compare.

alter table if exists lab_runs drop constraint if exists lab_runs_type_check;

alter table if exists lab_runs
add constraint lab_runs_type_check
check (type in ('asr','diarization','speaker_embedding','speaker_compare'));
