"use server";

import { randomUUID, createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireChoreoLabAdmin } from "@/lib/lab";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL;
const allowedVideoExt = ["mp4", "mov", "m4v"];
const POSE_CACHE_BUCKET = "lab-outputs";

export async function runChoreoPose(formData: FormData) {
  const { supabase, user } = await requireChoreoLabAdmin();

  if (!AI_SERVICE_URL) {
    throw new Error("AI_SERVICE_URL が未設定です。");
  }

  const file = formData.get("file");
  const sampleFpsRaw = Number(formData.get("sample_fps") ?? 10);
  const maxSecondsRaw = Number(formData.get("max_seconds") ?? 30);
  const sampleFps = Number.isFinite(sampleFpsRaw) && sampleFpsRaw > 0 ? sampleFpsRaw : 10;
  const maxSeconds = Number.isFinite(maxSecondsRaw) && maxSecondsRaw > 0 ? maxSecondsRaw : 30;

  if (!(file instanceof File)) {
    throw new Error("動画ファイルをアップロードしてください。");
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!allowedVideoExt.includes(ext)) {
    throw new Error("mp4 / mov のファイルをアップロードしてください。");
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const inputHash = createHash("sha256").update(fileBuffer).digest("hex");
  const posePath = `choreo/pose/${inputHash}.json`;
  const storagePath = `${user.id}/${Date.now()}-${randomUUID()}-${file.name}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("lab-inputs")
    .upload(storagePath, fileBuffer, {
      contentType: file.type || "video/mp4",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`アップロードに失敗しました: ${uploadError.message}`);
  }

  const { data: run, error: insertError } = await supabase
    .from("lab_runs")
    .insert({
      type: "choreo_pose_extract",
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
    // Cache lookup
    const { data: cachedFile, error: cacheError } = await supabase.storage
      .from(POSE_CACHE_BUCKET)
      .download(posePath);

    if (cachedFile && !cacheError) {
      const cachedText =
        typeof cachedFile.text === "function"
          ? await cachedFile.text()
          : Buffer.from(await cachedFile.arrayBuffer()).toString("utf-8");
      const cachedJson = JSON.parse(cachedText);
      const durationMs = Date.now() - startedAt;
      const enriched = {
        cache: "hit",
        input_hash: inputHash,
        pose_ref: { bucket: POSE_CACHE_BUCKET, path: posePath },
        ...cachedJson,
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

      revalidatePath("/lab/runs");
      revalidatePath(`/lab/runs/${runId}`);
      redirect(`/lab/runs/${runId}`);
      return;
    }

    // Cache miss: call AI
    const aiForm = new FormData();
    aiForm.append(
      "file",
      new File([fileBuffer], file.name, {
        type: file.type || "video/mp4",
      }),
    );
    aiForm.append("sample_fps", sampleFps.toString());
    aiForm.append("max_seconds", maxSeconds.toString());

    const response = await fetch(`${AI_SERVICE_URL}/choreo/pose`, {
      method: "POST",
      body: aiForm,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`AIサービスエラー: ${response.status} ${text}`);
    }

    const json = await response.json();
    const durationMs = Date.now() - startedAt;
    const enriched = {
      cache: "miss",
      input_hash: inputHash,
      pose_ref: { bucket: POSE_CACHE_BUCKET, path: posePath },
      ...json,
    };

    await supabase.storage
      .from(POSE_CACHE_BUCKET)
      .upload(posePath, Buffer.from(JSON.stringify(json)), {
        contentType: "application/json",
        upsert: true,
      });

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
