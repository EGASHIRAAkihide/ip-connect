"use server";

import { createServerClient } from "@/lib/supabase/server";

export async function createAsset(formData: FormData) {
  const supabase = createServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Unauthorized");
  }

  const title = formData.get("title")?.toString() ?? "";
  const description = formData.get("description")?.toString() ?? null;
  const category = formData.get("category")?.toString() ?? "";
  const priceMinRaw = formData.get("price_min")?.toString();
  const priceMaxRaw = formData.get("price_max")?.toString();
  const termsRaw = formData.get("terms")?.toString();
  const fileUrl = formData.get("file_url")?.toString() ?? "";
  const assetType =
    (formData.get("asset_type")?.toString() as "choreography" | "voice") ??
    "choreography";

  const choreographyBpm = formData.get("choreography_bpm")?.toString();
  const choreographyLength = formData
    .get("choreography_length_seconds")
    ?.toString();
  const choreographyStyle = formData.get("choreography_style")?.toString();

  const voiceLanguage = formData.get("voice_language")?.toString();
  const voiceGender = formData.get("voice_gender")?.toString();
  const voiceTone = formData.get("voice_tone")?.toString();

  const terms =
    termsRaw && termsRaw.length > 0
      ? (() => {
          try {
            return JSON.parse(termsRaw);
          } catch (_err) {
            return termsRaw;
          }
        })()
      : null;

  const metadata =
    assetType === "choreography"
      ? {
          type: "choreography",
          bpm: choreographyBpm ? Number(choreographyBpm) : null,
          length_seconds: choreographyLength ? Number(choreographyLength) : null,
          style: choreographyStyle || null,
        }
      : {
          type: "voice",
          language: voiceLanguage || null,
          gender: voiceGender || null,
          tone: voiceTone || null,
        };

  const payload = {
    title,
    description,
    category,
    asset_type: assetType,
    metadata,
    price_min: priceMinRaw ? Number(priceMinRaw) : null,
    price_max: priceMaxRaw ? Number(priceMaxRaw) : null,
    terms,
    file_url: fileUrl,
    creator_id: user.id,
  };

  const { data, error } = await supabase
    .from("ip_assets")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? { success: true };
}
