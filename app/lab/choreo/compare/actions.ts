"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireChoreoLabAdmin } from "@/lib/lab";
import { ensurePoseCache } from "@/lib/choreoCache";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL;
const allowedVideoExt = ["mp4", "mov", "m4v"];

function ensureFile(file: unknown, label: string): File {
  if (!(file instanceof File)) {
    throw new Error(`${label} をアップロードしてください。`);
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!allowedVideoExt.includes(ext)) {
    throw new Error(`${label} は mp4 / mov のファイルをアップロードしてください。`);
  }
  return file;
}

async function uploadFile(
  supabase: Awaited<ReturnType<typeof requireChoreoLabAdmin>>["supabase"],
  userId: string,
  file: File,
) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const storagePath = `${userId}/${Date.now()}-${randomUUID()}-${file.name}`;
  const { data, error } = await supabase.storage.from("lab-inputs").upload(storagePath, buffer, {
    contentType: file.type || "video/mp4",
    upsert: false,
  });
  if (error) {
    throw new Error(`アップロードに失敗しました: ${error.message}`);
  }
  return { path: data?.path, buffer };
}

export async function runChoreoCompare(formData: FormData) {
  const { supabase, user } = await requireChoreoLabAdmin();

  if (!AI_SERVICE_URL) {
    throw new Error("AI_SERVICE_URL が未設定です。");
  }

  const fileA = ensureFile(formData.get("fileA"), "動画A");
  const fileB = ensureFile(formData.get("fileB"), "動画B");
  const sampleFpsRaw = Number(formData.get("sample_fps") ?? 10);
  const maxSecondsRaw = Number(formData.get("max_seconds") ?? 30);
  const sampleFps = Number.isFinite(sampleFpsRaw) && sampleFpsRaw > 0 ? sampleFpsRaw : 10;
  const maxSeconds = Number.isFinite(maxSecondsRaw) && maxSecondsRaw > 0 ? maxSecondsRaw : 30;

  const [uploadA, uploadB, poseA, poseB] = await Promise.all([
    uploadFile(supabase, user.id, fileA),
    uploadFile(supabase, user.id, fileB),
    ensurePoseCache(supabase, fileA, sampleFps, maxSeconds),
    ensurePoseCache(supabase, fileB, sampleFps, maxSeconds),
  ]);

  const { data: run, error: insertError } = await supabase
    .from("lab_runs")
    .insert({
      type: "choreo_compare",
      status: "queued",
      input_bucket: "lab-inputs",
      input_path: `${uploadA.path} | ${uploadB.path}`,
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
        mode: "compare",
        poseA_url: poseA.signedUrl,
        poseB_url: poseB.signedUrl,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`AIサービスエラー: ${response.status} ${text}`);
    }

    const json = await response.json();
    const durationMs = Date.now() - startedAt;
    const enriched = {
      ...json,
      inputs: {
        a: {
          bucket: "lab-inputs",
          path: uploadA.path,
          hash: poseA.hash,
          pose_ref: poseA.poseRef,
          cache: poseA.cacheHit ? "hit" : "miss",
        },
        b: {
          bucket: "lab-inputs",
          path: uploadB.path,
          hash: poseB.hash,
          pose_ref: poseB.poseRef,
          cache: poseB.cacheHit ? "hit" : "miss",
        },
      },
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
