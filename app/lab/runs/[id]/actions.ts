"use server";

import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { requireLabAdmin, isLabEnabled } from "@/lib/lab";
import type { LabRun } from "@/lib/types";

const ENABLE_LAB_IP_EXPORT = process.env.ENABLE_LAB_IP_EXPORT === "true";

export async function createIpDraftFromRun(runId: string) {
  if (!ENABLE_LAB_IP_EXPORT || !isLabEnabled()) {
    throw new Error("IP下書き作成は無効化されています。");
  }

  const { user } = await requireLabAdmin();
  const service = createServiceClient();

  const { data: run, error: runError } = await service
    .from("lab_runs")
    .select("*")
    .eq("id", runId)
    .maybeSingle<LabRun>();

  if (runError || !run) {
    throw new Error(runError?.message ?? "lab_run が見つかりません。");
  }

  const output = (run.output_json as any) ?? {};
  const transcript = (output.transcript as string) ?? "";
  const meta = output.meta ?? {};
  const segments = Array.isArray(output.segments) ? output.segments : [];
  const speakers = segments
    .map((s: { speaker?: string }) => s?.speaker)
    .filter((s: string | undefined) => typeof s === "string" && s.length > 0);

  const descSummary = transcript.trim().slice(0, 500);
  const descMeta = `segments:${segments.length}, speakers:${speakers.length > 0 ? new Set(speakers).size : "n/a"}`;
  const description = [descSummary, descMeta].filter(Boolean).join("\n\n");

  const { data: inserted, error: insertError } = await service
    .from("ip_assets")
    .insert({
      title: `Lab Draft ${run.id.slice(0, 8)}`,
      description,
      type: "voice",
      status: "draft",
      created_by: user.id,
      file_url: run.input_path ?? `lab://draft/${run.id}`,
      preview_url: null,
      usage_purposes: [],
      ai_allowed: null,
      secondary_use_allowed: null,
      derivative_allowed: null,
      region_scope: null,
      price_min: null,
      price_max: null,
      lab_run_id: run.id,
      ai_meta: {
        lab_run_id: run.id,
        transcript: transcript.trim(),
        segments_count: segments.length,
        speakers_count: speakers.length > 0 ? new Set(speakers).size : null,
        keywords: output.meta?.keywords ?? [],
        language: meta.language ?? null,
      },
    })
    .select("id")
    .maybeSingle();

  if (insertError || !inserted) {
    throw new Error(insertError?.message ?? "IP draft の作成に失敗しました。");
  }

  redirect(`/creator/ip/${inserted.id}/edit`);
}
