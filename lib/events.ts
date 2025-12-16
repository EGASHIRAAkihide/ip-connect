import { createServerClient } from "@/lib/supabase/server";

type EventPayload = {
  userId: string | null;
  assetId?: string | null;
  meta?: Record<string, unknown> | null;
};

export async function recordEvent(
  eventName: string,
  { userId, assetId, meta }: EventPayload,
) {
  const supabase = await createServerClient();

  const { error } = await supabase.from("events").insert({
    event_name: eventName,
    user_id: userId,
    asset_id: assetId ?? null,
    meta: meta ?? {},
  });

  if (error) {
    // Non-blocking: log and continue
    console.error("[recordEvent] failed:", error);
  }
}
