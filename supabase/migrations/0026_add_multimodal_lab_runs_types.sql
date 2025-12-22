-- 0026_add_multimodal_lab_runs_types.sql
-- Extend lab_runs.type to allow multimodal_align and multimodal_compare while keeping existing types.

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
    'choreo_phrase_compare',
    'multimodal_align',
    'multimodal_compare'
  )
);
