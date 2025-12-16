"use server";

import { createServerClient } from "@/lib/supabase/server";
import { recordEvent } from "@/lib/events";

export async function createInquiry(assetId: string, formData: FormData) {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("認証されていません。");
  }

  const {
    data: asset,
    error: assetError,
  } = await supabase
    .from("ip_assets")
    .select("id, created_by")
    .eq("id", assetId)
    .single();

  if (assetError || !asset) {
    throw new Error("IPが見つかりません。");
  }

  const purpose = formData.get("purpose")?.toString() ?? null;
  const media = formData.get("media")?.toString() ?? null;
  const region = formData.get("region")?.toString() ?? null;
  const periodStart = formData.get("period_start")?.toString() ?? null;
  const periodEnd = formData.get("period_end")?.toString() ?? null;
  const secondaryUse = formData.get("secondary_use") === "on";
  const derivative = formData.get("derivative") === "on";
  const aiUse = formData.get("ai_use") === "on";
  const budgetMinRaw = formData.get("budget_min")?.toString();
  const budgetMaxRaw = formData.get("budget_max")?.toString();
  const message = formData.get("message")?.toString() ?? null;

  const budgetMin = budgetMinRaw ? Number(budgetMinRaw) : null;
  const budgetMax = budgetMaxRaw ? Number(budgetMaxRaw) : null;

  if (budgetMin !== null && budgetMax !== null && budgetMin > budgetMax) {
    throw new Error("予算の下限は上限以下にしてください。");
  }

  if (periodStart && periodEnd && new Date(periodStart) > new Date(periodEnd)) {
    throw new Error("開始日は終了日より前に設定してください。");
  }

  const { data: inserted, error } = await supabase
    .from("inquiries")
    .insert({
      asset_id: assetId,
      company_user_id: user.id,
      creator_user_id: asset.created_by,
      purpose,
      media,
      region,
      period_start: periodStart,
      period_end: periodEnd,
      secondary_use: secondaryUse,
      derivative,
      ai_use: aiUse,
      budget_min: budgetMin,
      budget_max: budgetMax,
      message,
      status: "new",
    })
    .select()
    .single();

  if (error || !inserted) {
    throw new Error(error?.message ?? "問い合わせの作成に失敗しました。");
  }

  await supabase.from("inquiry_events").insert({
    inquiry_id: inserted.id,
    actor_id: user.id,
    event_type: "created",
    payload: {},
  });

  await recordEvent("inquiry_submit", {
    userId: user.id,
    assetId: assetId,
    meta: { status: "new" },
  });

  return inserted;
}
