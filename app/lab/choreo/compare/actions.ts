"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireChoreoLabAdmin } from "@/lib/lab";
import { createServiceClient } from "@/lib/supabase/service";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL;
const allowedVideoExt = ["mp4", "mov", "m4v"];
const INPUT_BUCKET = "choreo-inputs";

function sanitizeFileName(name: string) {
  return name.replace(/[^\w.\-]/g, "_");
}

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
  serviceClient: ReturnType<typeof createServiceClient>,
  userId: string,
  file: File,
) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = sanitizeFileName(file.name);
  const storagePath = `${userId}/${Date.now()}-${randomUUID()}-${safeName}`;
  const { data, error } = await serviceClient.storage.from(INPUT_BUCKET).upload(storagePath, buffer, {
    contentType: file.type || "video/mp4",
    upsert: false,
  });
  if (error) {
    throw new Error(`アップロードに失敗しました: ${error.message}`);
  }
  return { path: data?.path, buffer };
}

export async function runChoreoCompare(formData: FormData) {
  const { user } = await requireChoreoLabAdmin();
  const serviceClient = createServiceClient();

  if (!AI_SERVICE_URL) {
    throw new Error("AI_SERVICE_URL が未設定です。");
  }

  const fileA = ensureFile(formData.get("fileA"), "動画A");
  const fileB = ensureFile(formData.get("fileB"), "動画B");
  const backendRaw = formData.get("backend");
  const backend = typeof backendRaw === "string" ? backendRaw : "mediapipe";
  const sampleFpsRaw = Number(formData.get("sample_fps") ?? 15);
  const maxSecondsRaw = Number(formData.get("max_seconds") ?? 30);
  const sampleFps = Number.isFinite(sampleFpsRaw) && sampleFpsRaw > 0 ? sampleFpsRaw : 15;
  const maxSeconds = Number.isFinite(maxSecondsRaw) && maxSecondsRaw > 0 ? maxSecondsRaw : 30;

  const [uploadA, uploadB] = await Promise.all([
    uploadFile(serviceClient, user.id, fileA),
    uploadFile(serviceClient, user.id, fileB),
  ]);

  const inputsPayload = {
    a: { bucket: INPUT_BUCKET, path: uploadA.path },
    b: { bucket: INPUT_BUCKET, path: uploadB.path },
  };

  const { data: run, error: insertError } = await serviceClient
    .from("lab_runs")
    .insert({
      type: "choreo_compare_dtw",
      status: "running",
      input_bucket: INPUT_BUCKET,
      input_path: uploadA.path,
      output_json: { inputs: inputsPayload },
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
    const aiForm = new FormData();
    aiForm.append(
      "fileA",
      new File([uploadA.buffer], fileA.name, {
        type: fileA.type || "video/mp4",
      }),
    );
    aiForm.append(
      "fileB",
      new File([uploadB.buffer], fileB.name, {
        type: fileB.type || "video/mp4",
      }),
    );
    aiForm.append("backend", backend);
    aiForm.append("sample_fps", sampleFps.toString());
    aiForm.append("max_seconds", maxSeconds.toString());

    const response = await fetch(`${AI_SERVICE_URL}/choreo/compare_dtw`, {
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
      inputs: inputsPayload,
      output: json,
    };

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
    const durationMs = Date.now() - startedAt;
    await serviceClient
      .from("lab_runs")
      .update({
        status: "failed",
        output_json: { inputs: inputsPayload, error: error instanceof Error ? error.message : "unknown error" },
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
