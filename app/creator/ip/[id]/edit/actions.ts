"use server";

import { createServerClient } from "@/lib/supabase/server";
import type { ChoreoMetadata, VoiceMetadata } from "@/lib/types";

type AssetType = "choreography" | "voice";

export async function updateAsset(formData: FormData) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("認証されていません。");
  }

  const id = formData.get("id")?.toString();
  if (!id) {
    throw new Error("IP ID が取得できません。");
  }

  const { data: existing, error: existingError } = await supabase
    .from("ip_assets")
    .select("creator_id, created_by")
    .eq("id", id)
    .single<{ creator_id: string; created_by: string }>();

  if (existingError || !existing) {
    throw new Error("IPが見つかりません。");
  }

  if (existing.created_by !== user.id && existing.creator_id !== user.id) {
    throw new Error("権限がありません。");
  }

  const title = formData.get("title")?.toString().trim() ?? "";
  const description =
    formData.get("description")?.toString().trim() || null;
  const category = formData.get("category")?.toString().trim() ?? "";
  const fileUrl = formData.get("file_url")?.toString().trim() ?? "";

  const rawAssetType = formData.get("asset_type")?.toString() as
    | AssetType
    | undefined;
  const assetType: AssetType = rawAssetType ?? "choreography";

  const priceMinRaw = formData.get("price_min")?.toString();
  const priceMaxRaw = formData.get("price_max")?.toString();

  const termsRaw = formData.get("terms")?.toString();

  const usagePurposesRaw = formData.get("usage_purposes")?.toString();
  const regionScope = formData.get("region_scope")?.toString() ?? null;
  const aiAllowed = formData.get("ai_allowed")?.toString() === "true";
  const secondaryAllowed =
    formData.get("secondary_use_allowed")?.toString() === "true";
  const derivativeAllowed =
    formData.get("derivative_allowed")?.toString() === "true";
  const tagsRaw = formData.get("tags")?.toString();

  const choreographyGenre = formData.get("choreography_genre")?.toString();
  const choreographyDifficulty = formData.get("choreography_difficulty")?.toString();
  const choreographyMembers = formData.get("choreography_members")?.toString();

  const voiceLanguage = formData.get("voice_language")?.toString();
  const voiceGender = formData.get("voice_gender")?.toString();
  const voiceTone = formData.get("voice_tone")?.toString();
  const voiceAgeRange = formData.get("voice_age_range")?.toString();
  const voiceAccent = formData.get("voice_accent")?.toString();

  if (!title || !category || !fileUrl) {
    throw new Error("必須項目が不足しています。");
  }

  const terms =
    termsRaw && termsRaw.length > 0
      ? (() => {
          try {
            return JSON.parse(termsRaw);
          } catch {
            return termsRaw;
          }
        })()
      : null;

  const priceMin =
    priceMinRaw && !Number.isNaN(Number(priceMinRaw))
      ? Number(priceMinRaw)
      : null;
  const priceMax =
    priceMaxRaw && !Number.isNaN(Number(priceMaxRaw))
      ? Number(priceMaxRaw)
      : null;

  let metadata: ChoreoMetadata | VoiceMetadata | null = null;
  if (assetType === "choreography") {
    metadata = {
      type: "choreography",
      genre: choreographyGenre?.trim() || null,
      difficulty: choreographyDifficulty?.trim() || null,
      members:
        choreographyMembers && !Number.isNaN(Number(choreographyMembers))
          ? Number(choreographyMembers)
          : null,
    };
  } else {
    metadata = {
      type: "voice",
      language: voiceLanguage?.trim() || null,
      gender: voiceGender?.trim() || null,
      tone: voiceTone?.trim() || null,
      age_range: voiceAgeRange?.trim() || null,
      accent: voiceAccent?.trim() || null,
    };
  }

  const usagePurposes = usagePurposesRaw
    ? (() => {
        try {
          return JSON.parse(usagePurposesRaw);
        } catch {
          return [];
        }
      })()
    : [];

  const tags =
    tagsRaw && tagsRaw.length > 0
      ? tagsRaw.split(",").map((tag) => tag.trim()).filter(Boolean)
      : [];

  const payload = {
    title,
    description,
    category,
    asset_type: assetType,
    type: assetType,
    metadata,
    meta: metadata,
    price_min: priceMin,
    price_max: priceMax,
    terms,
    file_url: fileUrl,
    preview_url: fileUrl,
    usage_purposes: usagePurposes,
    ai_allowed: aiAllowed,
    region_scope: regionScope,
    secondary_use_allowed: secondaryAllowed,
    derivative_allowed: derivativeAllowed,
    tags,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("ip_assets")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? { success: true };
}
