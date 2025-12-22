-- 0021_add_choreo_compare_dtw.sql
-- Extend lab_runs.type to allow choreo_compare_dtw (includes all prior types).

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
    'choreo_pose_extract',
    'choreo_compare',
    'choreo_compare_dtw'
  )
);
