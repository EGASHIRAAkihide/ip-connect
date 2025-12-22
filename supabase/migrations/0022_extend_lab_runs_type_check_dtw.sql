-- 0022_extend_lab_runs_type_check_dtw.sql
-- Extend lab_runs.type to include choreo_compare_dtw while keeping existing types.

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
