"use server";

import { randomUUID, createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { requireChoreoLabAdmin } from "@/lib/lab";
import { createServiceClient } from "@/lib/supabase/service";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL;
const allowedVideoExt = ["mp4", "mov", "m4v"];
const POSE_CACHE_BUCKET = "lab-outputs";
const INPUT_BUCKET = "choreo-inputs";
const allowedBackends = new Set(["mediapipe", "mmpose", "openpose"]);
const POSE_CACHE_VERSION = "v1";

function sanitizeFileName(name: string) {
  return name.replace(/[^\w.\-]/g, "_");
}

export async function runChoreoPose(formData: FormData) {
  const { user } = await requireChoreoLabAdmin();
  const serviceClient = createServiceClient();

  if (!AI_SERVICE_URL) {
    throw new Error("AI_SERVICE_URL が未設定です。");
  }

  const file = formData.get("file");
  const sampleFpsRaw = Number(formData.get("sample_fps") ?? 15);
  const maxSecondsRaw = Number(formData.get("max_seconds") ?? 30);
  const sampleFps = Number.isFinite(sampleFpsRaw) && sampleFpsRaw > 0 ? sampleFpsRaw : 15;
  const maxSeconds = Number.isFinite(maxSecondsRaw) && maxSecondsRaw > 0 ? maxSecondsRaw : 30;
  const backendRaw = formData.get("backend");
  const requestedBackend = typeof backendRaw === "string" ? backendRaw : "mediapipe";
  const poseBackend = allowedBackends.has(requestedBackend)
    ? requestedBackend
    : "mediapipe";
  console.log({ requestedBackend, poseBackend });

  if (!(file instanceof File)) {
    throw new Error("動画ファイルをアップロードしてください。");
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!allowedVideoExt.includes(ext)) {
    throw new Error("mp4 / mov のファイルをアップロードしてください。");
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const inputHash = createHash("sha256").update(fileBuffer).digest("hex");
  const posePath = `choreo/pose/${POSE_CACHE_VERSION}/${inputHash}_${poseBackend}_fps${sampleFps}_s${maxSeconds}.json`;
  const safeName = sanitizeFileName(file.name);
  const storagePath = `${user.id}/${Date.now()}-${randomUUID()}-${safeName}`;

  const { data: uploadData, error: uploadError } = await serviceClient.storage
    .from(INPUT_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: file.type || "video/mp4",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`アップロードに失敗しました: ${uploadError.message}`);
  }

  const { data: run, error: insertError } = await serviceClient
    .from("lab_runs")
    .insert({
      type: "choreo_pose_extract",
      status: "running",
      input_bucket: INPUT_BUCKET,
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

  try {
    // Cache lookup
    const { data: cachedFile, error: cacheError } = await serviceClient.storage
      .from(POSE_CACHE_BUCKET)
      .download(posePath);

    if (cachedFile && !cacheError) {
      const cachedText =
        typeof cachedFile.text === "function"
          ? await cachedFile.text()
          : Buffer.from(await cachedFile.arrayBuffer()).toString("utf-8");
      const cachedJson = JSON.parse(cachedText);
      const cachedFrames = Array.isArray(cachedJson?.frames)
        ? cachedJson.frames.slice(0, 50)
        : cachedJson?.frames;
      const durationMs = Date.now() - startedAt;
      const inputPayload = {
        backend: poseBackend,
        sample_fps: sampleFps,
        max_seconds: maxSeconds,
        bucket: INPUT_BUCKET,
        path: uploadData?.path ?? null,
      };
      const enriched = {
        input: inputPayload,
        output: cachedJson && cachedFrames ? { ...cachedJson, frames: cachedFrames } : cachedJson,
      };

      console.log("update status", "success");
      const { error: updateError } = await serviceClient
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
      new File([new Uint8Array(fileBuffer)], file.name, {
        type: file.type || "video/mp4",
      }),
    );
    aiForm.append("backend", poseBackend);
    aiForm.append("sample_fps", sampleFps.toString());
    aiForm.append("max_seconds", maxSeconds.toString());

    const response = await fetch(`${AI_SERVICE_URL}/choreo/pose`, {
      method: "POST",
      body: aiForm,
    });

    if (response.status === 501) {
      const text = await response.text();
      throw new Error(`そのbackendは未起動/未対応です: ${text}`);
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`AIサービスエラー: ${response.status} ${text}`);
    }

    const json = await response.json();
    const trimmedFrames = Array.isArray(json?.frames) ? json.frames.slice(0, 50) : json?.frames;
    const durationMs = Date.now() - startedAt;
    const inputPayload = {
      backend: poseBackend,
      sample_fps: sampleFps,
      max_seconds: maxSeconds,
      bucket: INPUT_BUCKET,
      path: uploadData?.path ?? null,
    };
    const enriched = {
      input: inputPayload,
      output: json && trimmedFrames ? { ...json, frames: trimmedFrames } : json,
    };

    await serviceClient.storage
      .from(POSE_CACHE_BUCKET)
      .upload(posePath, Buffer.from(JSON.stringify(json)), {
        contentType: "application/json",
        upsert: true,
      });

    console.log("update status", "success");
    const { error: updateError } = await serviceClient
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
    if (isRedirectError(error)) {
      throw error;
    }
    const durationMs = Date.now() - startedAt;
    const message = error instanceof Error ? error.message : "unknown error";
    const inputPayload = {
      backend: poseBackend,
      sample_fps: sampleFps,
      max_seconds: maxSeconds,
      bucket: INPUT_BUCKET,
      path: uploadData?.path ?? null,
    };
    console.log("update status", "failed");
    await serviceClient
      .from("lab_runs")
      .update({
        status: "failed",
        output_json: { input: inputPayload, error: message },
        error_message: message,
        duration_ms: durationMs,
      })
      .eq("id", runId);

    throw error;
  }

  revalidatePath("/lab/runs");
  revalidatePath(`/lab/runs/${runId}`);
  redirect(`/lab/runs/${runId}`);
}
