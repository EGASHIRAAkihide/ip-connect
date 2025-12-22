-- 0024_add_choreo_phrase_compare.sql
-- Extend lab_runs.type to allow choreo_phrase_compare while keeping existing types.

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
    'choreo_segment',
    'choreo_phrase_compare'
  )
);
