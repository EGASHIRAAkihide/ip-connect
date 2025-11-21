export type Role = "creator" | "company";

export type UserProfile = {
  id: string;
  email: string;
  role: Role;
  created_at?: string;
};

export type IPAsset = {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  category: "voice" | "illustration" | "choreography";
  file_url: string;
  terms: {
    preset: string;
    notes?: string;
  } | null;
  price_min: number | null;
  price_max: number | null;
  created_at?: string;
};

export type InquiryStatus = "pending" | "approved" | "rejected";

export type Inquiry = {
  id: string;
  ip_id: string;
  creator_id: string;
  company_id: string;
  purpose: string | null;
  region: string | null;
  period: string | null;
  budget: number | null;
  message: string | null;
  status: InquiryStatus;
  payment_status: "unpaid" | "invoiced" | "paid_simulated";
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
  "Ad",
  "SNS",
  "Game",
  "VTuber",
  "Event",
  "Other",
] as const;

export const REGION_OPTIONS = ["JP", "Global", "Other"] as const;
