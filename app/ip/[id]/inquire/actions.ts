"use server";

import { createServerClient } from "@/lib/supabase/server";

export async function createInquiry(assetId: string, formData: FormData) {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Unauthorized");
  }

  const purpose = formData.get("purpose")?.toString() ?? null;
  const region = formData.get("region")?.toString() ?? null;
  const period = formData.get("period")?.toString() ?? null;
  const usage_media = formData.get("usage_media")?.toString() ?? null;
  const budgetRaw = formData.get("budget")?.toString();
  const message = formData.get("message")?.toString() ?? null;
  const creatorId = formData.get("creator_id")?.toString() ?? null;

  const { data: inserted, error } = await supabase
    .from("inquiries")
    .insert({
      ip_id: assetId,
      ...(creatorId ? { creator_id: creatorId } : {}),
      company_id: user.id,
      purpose,
      region,
      period,
      usage_media,
      budget: budgetRaw ? Number(budgetRaw) : null,
      message,
      status: "pending",
      payment_status: "unpaid",
    })
    .select()
    .single();

  if (error || !inserted) {
    throw new Error(error?.message ?? "Failed to create inquiry");
  }

  const { error: eventError } = await supabase.from("inquiry_events").insert({
    inquiry_id: inserted.id,
    actor_id: user.id,
    event_type: "created",
    payload: {},
  });

  if (eventError) {
    throw new Error(eventError.message);
  }

  return inserted;
}
