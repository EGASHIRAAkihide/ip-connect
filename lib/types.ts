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
