"use server";

import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import type { ChoreoMetadata, VoiceMetadata } from "@/lib/types";

export async function updateAsset(assetId: string, formData: FormData) {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Unauthorized");
  }

  const { data: existing, error: existingError } = await supabase
    .from("ip_assets")
    .select("creator_id")
    .eq("id", assetId)
    .single();

  if (existingError || !existing) {
    throw new Error("Asset not found");
  }

  if (existing.creator_id !== user.id) {
    throw new Error("Forbidden");
  }

  const title = formData.get("title")?.toString().trim() ?? "";
  const description = formData.get("description")?.toString().trim() || null;
  const category = formData.get("category")?.toString().trim() ?? "";
  const assetType =
    (formData.get("asset_type")?.toString() as "choreography" | "voice" | null) ??
    "choreography";
  const fileUrl = formData.get("file_url")?.toString().trim() ?? "";

  if (!title || !category || !fileUrl) {
    throw new Error("Title, category, and file are required.");
  }

  const termsRaw = formData.get("terms")?.toString();
  let terms: any = null;
  if (termsRaw) {
    try {
      terms = JSON.parse(termsRaw);
    } catch {
      terms = termsRaw;
    }
  }

  const priceMinRaw = formData.get("price_min")?.toString();
  const priceMaxRaw = formData.get("price_max")?.toString();
  const price_min =
    priceMinRaw && !Number.isNaN(Number(priceMinRaw))
      ? Number(priceMinRaw)
      : null;
  const price_max =
    priceMaxRaw && !Number.isNaN(Number(priceMaxRaw))
      ? Number(priceMaxRaw)
      : null;

  let metadata: ChoreoMetadata | VoiceMetadata | null = null;
  if (assetType === "choreography") {
    const bpmRaw = formData.get("choreography_bpm")?.toString();
    const lengthRaw = formData.get("choreography_length_seconds")?.toString();
    const style = formData.get("choreography_style")?.toString().trim() || null;

    metadata = {
      type: "choreography",
      bpm: bpmRaw && !Number.isNaN(Number(bpmRaw)) ? Number(bpmRaw) : null,
      length_seconds:
        lengthRaw && !Number.isNaN(Number(lengthRaw)) ? Number(lengthRaw) : null,
      style,
    };
  } else {
    const language = formData.get("voice_language")?.toString().trim() || null;
    const gender = formData.get("voice_gender")?.toString().trim() || null;
    const tone = formData.get("voice_tone")?.toString().trim() || null;

    metadata = {
      type: "voice",
      language,
      gender,
      tone,
    };
  }

  const { error: updateError } = await supabase
    .from("ip_assets")
    .update({
      title,
      description,
      category,
      asset_type: assetType,
      metadata,
      price_min,
      price_max,
      terms,
      file_url: fileUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", assetId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  redirect(`/ip/${assetId}`);
}
