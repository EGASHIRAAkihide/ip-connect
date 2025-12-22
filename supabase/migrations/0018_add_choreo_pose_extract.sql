-- 0018_add_choreo_pose_extract.sql
-- Extend lab_runs.type to allow choreo_pose_extract.

alter table if exists lab_runs drop constraint if exists lab_runs_type_check;

alter table if exists lab_runs
add constraint lab_runs_type_check
check (type in ('asr','diarization','speaker_embedding','speaker_compare','asr_diarize','choreo_pose_extract'));
