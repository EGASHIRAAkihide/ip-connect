"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireChoreoLabAdmin } from "@/lib/lab";
import { ensurePoseCache } from "@/lib/choreoCache";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL;
const allowedVideoExt = ["mp4", "mov", "m4v"];

function ensureFile(file: unknown): File {
  if (!(file instanceof File)) {
    throw new Error("動画ファイルをアップロードしてください。");
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!allowedVideoExt.includes(ext)) {
    throw new Error("mp4 / mov のファイルをアップロードしてください。");
  }
  return file;
}

export async function runChoreoSegment(formData: FormData) {
  const { supabase, user } = await requireChoreoLabAdmin();

  if (!AI_SERVICE_URL) {
    throw new Error("AI_SERVICE_URL が未設定です。");
  }

  const file = ensureFile(formData.get("file"));
  const sampleFpsRaw = Number(formData.get("sample_fps") ?? 10);
  const maxSecondsRaw = Number(formData.get("max_seconds") ?? 30);
  const sampleFps = Number.isFinite(sampleFpsRaw) && sampleFpsRaw > 0 ? sampleFpsRaw : 10;
  const maxSeconds = Number.isFinite(maxSecondsRaw) && maxSecondsRaw > 0 ? maxSecondsRaw : 30;

  const buffer = Buffer.from(await file.arrayBuffer());
  const pose = await ensurePoseCache(supabase, file, sampleFps, maxSeconds);
  const storagePath = `${user.id}/${Date.now()}-${randomUUID()}-${file.name}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("lab-inputs")
    .upload(storagePath, buffer, {
      contentType: file.type || "video/mp4",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`アップロードに失敗しました: ${uploadError.message}`);
  }

  const { data: run, error: insertError } = await supabase
    .from("lab_runs")
    .insert({
      type: "choreo_segment",
      status: "queued",
      input_bucket: "lab-inputs",
      input_path: uploadData?.path,
      created_by: user.id,
    })
    .select("id")
    .maybeSingle();

  if (insertError || !run) {
    throw new Error(insertError?.message ?? "lab_runs の作成に失敗しました。");
  }

  const runId = run.id;
  const startedAt = Date.now();
  await supabase.from("lab_runs").update({ status: "running" }).eq("id", runId);

  try {
    const response = await fetch(`${AI_SERVICE_URL}/choreo/compute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "segment",
        poseA_url: pose.signedUrl,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`AIサービスエラー: ${response.status} ${text}`);
    }

    const json = await response.json();
    const durationMs = Date.now() - startedAt;
    const enriched = {
      input: {
        a: { hash: pose.hash, pose_ref: pose.poseRef, cache: pose.cacheHit ? "hit" : "miss" },
      },
      output: json,
    };

    const { error: updateError } = await supabase
      .from("lab_runs")
      .update({
        status: "success",
        output_json: enriched,
        duration_ms: durationMs,
        error_message: null,
      })
      .eq("id", runId);

    if (updateError) {
      throw new Error(updateError.message);
    }
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    await supabase
      .from("lab_runs")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "unknown error",
        duration_ms: durationMs,
      })
      .eq("id", runId);
    throw error;
  }

  revalidatePath("/lab/runs");
  revalidatePath(`/lab/runs/${runId}`);
  redirect(`/lab/runs/${runId}`);
}
