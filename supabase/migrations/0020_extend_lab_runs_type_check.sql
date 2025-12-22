-- 0015_extend_lab_runs_type_check.sql
-- Extend lab_runs.type to allow choreo_pose_extract (and keep existing types).

alter table if exists lab_runs drop constraint if exists lab_runs_type_check;

alter table if exists lab_runs
add constraint lab_runs_type_check
check (
  type in (
    'asr',
    'diarization',
    'speaker_embedding',
    'speaker_compare',
    'asr_diarize',
    'choreo_pose_extract'
  )
);
