-- 0023_add_choreo_segment.sql
-- Extend lab_runs.type to allow choreo_segment while retaining existing types.

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
    'choreo_compare_dtw',
    'choreo_segment'
  )
);
