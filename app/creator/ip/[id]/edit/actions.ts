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
    throw new Error("Unauthorized");
  }

  const id = formData.get("id")?.toString();
  if (!id) {
    throw new Error("Missing asset id.");
  }

  const { data: existing, error: existingError } = await supabase
    .from("ip_assets")
    .select("creator_id")
    .eq("id", id)
    .single<{ creator_id: string }>();

  if (existingError || !existing) {
    throw new Error("Asset not found.");
  }

  if (existing.creator_id !== user.id) {
    throw new Error("Forbidden");
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

  const choreographyBpm = formData.get("choreography_bpm")?.toString();
  const choreographyLength = formData
    .get("choreography_length_seconds")
    ?.toString();
  const choreographyStyle = formData.get("choreography_style")?.toString();

  const voiceLanguage = formData.get("voice_language")?.toString();
  const voiceGender = formData.get("voice_gender")?.toString();
  const voiceTone = formData.get("voice_tone")?.toString();

  if (!title || !category || !fileUrl) {
    throw new Error("Missing required fields.");
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
      bpm:
        choreographyBpm && !Number.isNaN(Number(choreographyBpm))
          ? Number(choreographyBpm)
          : null,
      length_seconds:
        choreographyLength && !Number.isNaN(Number(choreographyLength))
          ? Number(choreographyLength)
          : null,
      style: choreographyStyle?.trim() || null,
    };
  } else {
    metadata = {
      type: "voice",
      language: voiceLanguage?.trim() || null,
      gender: voiceGender?.trim() || null,
      tone: voiceTone?.trim() || null,
    };
  }

  const payload = {
    title,
    description,
    category,
    asset_type: assetType,
    metadata,
    price_min: priceMin,
    price_max: priceMax,
    terms,
    file_url: fileUrl,
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
