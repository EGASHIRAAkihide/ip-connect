"use server";

import { createServerClient } from "@/lib/supabase/server";

type InquiryWithAsset = {
  id: string;
  payment_status: string | null;
  ip_assets:
    | { creator_id: string }
    | { creator_id: string }[]
    | null;
};

async function verifyCreator(
  supabase: ReturnType<typeof createServerClient>,
  inquiryId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from("inquiries")
    .select(
      `
        id,
        payment_status,
        ip_assets!inner(creator_id)
      `,
    )
    .eq("id", inquiryId)
    .single<InquiryWithAsset>();

  if (error || !data) {
    throw new Error("Inquiry not found");
  }

  let assetCreatorId: string | null = null;
  const ipAssets = data.ip_assets;

  if (ipAssets) {
    if (Array.isArray(ipAssets)) {
      if (ipAssets.length > 0) {
        assetCreatorId = ipAssets[0]?.creator_id ?? null;
      }
    } else {
      assetCreatorId = ipAssets.creator_id ?? null;
    }
  }

  if (assetCreatorId !== userId) {
    throw new Error("Forbidden");
  }

  return data;
}

export async function approveInquiry(inquiryId: string) {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const inquiry = await verifyCreator(supabase, inquiryId, user.id);
  const nextPaymentStatus =
    inquiry.payment_status === "unpaid"
      ? "pending"
      : inquiry.payment_status;

  const { error: updateError } = await supabase
    .from("inquiries")
    .update({
      status: "approved",
      payment_status: nextPaymentStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", inquiryId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const { error: eventError } = await supabase.from("inquiry_events").insert({
    inquiry_id: inquiryId,
    actor_id: user.id,
    event_type: "approved",
    payload: {},
  });

  if (eventError) {
    throw new Error(eventError.message);
  }
}

export async function rejectInquiry(inquiryId: string) {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  await verifyCreator(supabase, inquiryId, user.id);

  const { error: updateError } = await supabase
    .from("inquiries")
    .update({
      status: "rejected",
      updated_at: new Date().toISOString(),
    })
    .eq("id", inquiryId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const { error: eventError } = await supabase.from("inquiry_events").insert({
    inquiry_id: inquiryId,
    actor_id: user.id,
    event_type: "rejected",
    payload: {},
  });

  if (eventError) {
    throw new Error(eventError.message);
  }
}

export async function markInquiryPaid(inquiryId: string) {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  await verifyCreator(supabase, inquiryId, user.id);

  const { error: updateError } = await supabase
    .from("inquiries")
    .update({
      payment_status: "paid",
      updated_at: new Date().toISOString(),
    })
    .eq("id", inquiryId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const { error: eventError } = await supabase.from("inquiry_events").insert({
    inquiry_id: inquiryId,
    actor_id: user.id,
    event_type: "payment_marked_paid",
    payload: {},
  });

  if (eventError) {
    throw new Error(eventError.message);
  }
}
