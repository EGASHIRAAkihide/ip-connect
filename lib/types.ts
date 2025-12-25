export type Role = "creator" | "company";

export type UserProfile = {
  id: string;
  email: string;
  role: Role;
  is_admin?: boolean;
  created_at?: string;
};

export type AssetType = "voice" | "choreography";

export type VoiceMetadata = {
  type: "voice";
  gender?: string | null;
  age_range?: string | null;
  language?: string | null;
  accent?: string | null;
  tone?: string | null;
};

export type ChoreoMetadata = {
  type: "choreography";
  genre?: string | null;
  difficulty?: string | null;
  members?: number | null;
};

export type IPAsset = {
  id: string;
  created_by: string;
  creator_id?: string;
  title: string;
  description: string | null;
  category?: "voice" | "illustration" | "choreography";
  type: AssetType;
  asset_type?: AssetType;
  file_url: string;
  preview_url?: string | null;
  usage_purposes?: string[] | null;
  ai_allowed?: boolean | null;
  region_scope?: string | null;
  secondary_use_allowed?: boolean | null;
  derivative_allowed?: boolean | null;
  status?: "published" | "draft";
  tags?: string[] | null;
  ai_meta?: {
    language?: string | null;
    speakers_count?: number | null;
    keywords?: string[] | null;
    transcript?: string | null;
  };
  lab_run_id?: string | null;
  meta?: VoiceMetadata | ChoreoMetadata | null;
  metadata?: VoiceMetadata | ChoreoMetadata | null;
  terms: {
    preset: string;
    notes?: string;
  } | null;
  price_min: number | null;
  price_max: number | null;
  created_at?: string;
};

export type InquiryStatus = "new" | "in_review" | "accepted" | "rejected";

export type Inquiry = {
  id: string;
  asset_id: string;
  ip_id?: string;
  creator_user_id: string;
  creator_id?: string;
  company_user_id: string;
  company_id?: string;
  purpose: string | null;
  media: string | null;
  region: string | null;
  period_start: string | null;
  period_end: string | null;
  secondary_use: boolean | null;
  derivative: boolean | null;
  ai_use: boolean | null;
  budget_min: number | null;
  budget_max: number | null;
  message: string | null;
  status: InquiryStatus;
  created_at?: string;
  updated_at?: string;
};

export const IP_CATEGORIES = [
  { label: "Voice", value: "voice" },
  { label: "Illustration", value: "illustration" },
  { label: "Choreography", value: "choreography" },
] as const;

export const TERM_PRESETS = [
  "Standard promotional use (SNS / Ads)",
  "One-time event usage",
  "Digital content bundle",
] as const;

export const INQUIRY_PURPOSES = [
  "ads",
  "sns",
  "app",
  "education",
  "ai",
] as const;

export const REGION_OPTIONS = ["jp", "global"] as const;

export type LabRunStatus = "queued" | "running" | "success" | "failed";
export type LabRunType =
  | "asr"
  | "diarization"
  | "speaker_embedding"
  | "speaker_compare"
  | "asr_diarize"
  | "choreo_pose_extract"
  | "choreo_compare"
  | "choreo_compare_dtw"
  | "choreo_segment"
  | "choreo_phrase_compare"
  | "multimodal_align"
  | "multimodal_compare";

export type LabRun = {
  id: string;
  type: LabRunType;
  status: LabRunStatus;
  input_bucket: string;
  input_path: string;
  input_json?: Record<string, unknown> | null;
  output_json: Record<string, unknown> | null;
  duration_ms: number | null;
  error_message: string | null;
  created_by: string;
  created_at: string;
};

export type ChoreoPoseExtractLandmark = {
  name: string;
  x: number;
  y: number;
  score: number;
};

export type ChoreoPoseExtractFrame = {
  t: number;
  landmarks: ChoreoPoseExtractLandmark[];
};

export type ChoreoPoseExtractResult = {
  meta: {
    backend: string;
    sample_fps: number;
    max_seconds: number;
    frames: number;
    pose_success_rate: number;
    warnings: string[];
  };
  frames: ChoreoPoseExtractFrame[];
};
