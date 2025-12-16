"use server";

import { createServerClient } from "@/lib/supabase/server";
import type { InquiryStatus } from "@/lib/types";

type InquiryWithAsset = {
  id: string;
  status: string | null;
  ip_assets:
    | { created_by: string }
    | { created_by: string }[]
    | null;
};

async function verifyCreator(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  inquiryId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from("inquiries")
    .select(
      `
        id,
        status,
        ip_assets!inner(created_by)
      `,
    )
    .eq("id", inquiryId)
    .single<InquiryWithAsset>();

  if (error || !data) {
    throw new Error("問い合わせが見つかりません。");
  }

  let assetCreatorId: string | null = null;
  const ipAssets = data.ip_assets;

  if (ipAssets) {
    if (Array.isArray(ipAssets)) {
      if (ipAssets.length > 0) {
        assetCreatorId = ipAssets[0]?.created_by ?? null;
      }
    } else {
      assetCreatorId = ipAssets.created_by ?? null;
    }
  }

  if (assetCreatorId !== userId) {
    throw new Error("権限がありません。");
  }

  return data;
}

async function updateStatus(inquiryId: string, nextStatus: InquiryStatus) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("認証されていません。");
  }

  const inquiry = await verifyCreator(supabase, inquiryId, user.id);
  const previousStatus = (inquiry.status as InquiryStatus | null) ?? "new";

  const { error: updateError } = await supabase
    .from("inquiries")
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", inquiryId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const { error: eventError } = await supabase
    .from("inquiry_events")
    .insert({
      inquiry_id: inquiryId,
      actor_id: user.id,
      event_type: nextStatus,
      payload: {
        previous_status: previousStatus,
        new_status: nextStatus,
      },
    });

  if (eventError) {
    throw new Error(eventError.message);
  }
}

export async function moveInquiryToReview(inquiryId: string) {
  return updateStatus(inquiryId, "in_review");
}

export async function acceptInquiry(inquiryId: string) {
  return updateStatus(inquiryId, "accepted");
}

export async function rejectInquiry(inquiryId: string) {
  return updateStatus(inquiryId, "rejected");
}
