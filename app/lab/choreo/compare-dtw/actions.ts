"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireChoreoLabAdmin } from "@/lib/lab";
import { createServiceClient } from "@/lib/supabase/service";

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
  supabase: ReturnType<typeof createServiceClient>,
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

export async function runChoreoCompareDtw(formData: FormData) {
  const { user } = await requireChoreoLabAdmin();
  const serviceClient = createServiceClient();

  if (!AI_SERVICE_URL) {
    throw new Error("AI_SERVICE_URL が未設定です。");
  }

  const fileA = ensureFile(formData.get("fileA"), "動画A");
  const referenceAssetIdRaw = formData.get("reference_asset_id");
  const referenceAssetId =
    typeof referenceAssetIdRaw === "string" && referenceAssetIdRaw.length > 0
      ? referenceAssetIdRaw
      : null;
  const fileB = referenceAssetId ? null : ensureFile(formData.get("fileB"), "動画B");
  const sampleFpsRaw = Number(formData.get("sample_fps") ?? 10);
  const maxSecondsRaw = Number(formData.get("max_seconds") ?? 30);
  const bandRaw = Number(formData.get("band") ?? 10);
  const sampleFps = Number.isFinite(sampleFpsRaw) && sampleFpsRaw > 0 ? sampleFpsRaw : 10;
  const maxSeconds = Number.isFinite(maxSecondsRaw) && maxSecondsRaw > 0 ? maxSecondsRaw : 30;
  const band = Number.isFinite(bandRaw) && bandRaw > 0 ? Math.floor(bandRaw) : 10;
  const backendRaw = formData.get("backend");
  const backend = typeof backendRaw === "string" && backendRaw ? backendRaw : "mediapipe";

  const uploadA = await uploadFile(serviceClient, user.id, fileA);
  let uploadB: Awaited<ReturnType<typeof uploadFile>> | null = null;
  let referenceAsset: {
    id: string;
    video_bucket: string;
    video_path: string;
    pose_cache_path: string | null;
  } | null = null;
  let referenceBuffer: Buffer | null = null;

  if (referenceAssetId) {
    const { data, error } = await serviceClient
      .from("choreo_ip_assets")
      .select("id, video_bucket, video_path, pose_cache_path")
      .eq("id", referenceAssetId)
      .maybeSingle();
    if (error || !data) {
      throw new Error("参照IPが見つかりませんでした。");
    }
    referenceAsset = data;
    const { data: refBlob, error: refError } = await serviceClient.storage
      .from(referenceAsset.video_bucket)
      .download(referenceAsset.video_path);
    if (refError || !refBlob) {
      throw new Error(
        `参照動画の取得に失敗しました: ${refError?.message ?? "unknown error"}`,
      );
    }
    referenceBuffer = Buffer.from(await refBlob.arrayBuffer());
  } else if (fileB) {
    uploadB = await uploadFile(serviceClient, user.id, fileB);
  }

  if (!referenceAsset && !uploadB) {
    throw new Error("参照動画を指定してください。");
  }

  const { data: run, error: insertError } = await serviceClient
    .from("lab_runs")
    .insert({
      type: "choreo_compare_dtw",
      status: "queued",
      input_bucket: "lab-inputs",
      input_path: `${uploadA.path} | ${
        referenceAsset ? `${referenceAsset.video_bucket}/${referenceAsset.video_path}` : uploadB?.path
      }`,
      created_by: user.id,
    })
    .select("id")
    .maybeSingle();

  if (insertError || !run) {
    throw new Error(insertError?.message ?? "lab_runs の作成に失敗しました。");
  }

  const runId = run.id;
  const startedAt = Date.now();
  await serviceClient.from("lab_runs").update({ status: "running" }).eq("id", runId);

  try {
    const refName = referenceAsset?.video_path?.split("/").pop() ?? "reference.mp4";
    const fileABytes = new Uint8Array(uploadA.buffer);
    const aiForm = new FormData();
    aiForm.append(
      "fileA",
      new File([new Uint8Array(fileABytes)], fileA.name, {
        type: fileA.type || "video/mp4",
      }),
    );
    if (referenceAsset && referenceBuffer) {
      const refBytes = new Uint8Array(referenceBuffer);
      aiForm.append(
        "fileB",
        new File([new Uint8Array(refBytes)], refName, {
          type: "video/mp4",
        }),
      );
    } else if (fileB && uploadB) {
      const fileBBytes = new Uint8Array(uploadB.buffer);
      aiForm.append(
        "fileB",
        new File([new Uint8Array(fileBBytes)], fileB.name, {
          type: fileB.type || "video/mp4",
        }),
      );
    }
    aiForm.append("backend", backend);
    aiForm.append("sample_fps", sampleFps.toString());
    aiForm.append("max_seconds", maxSeconds.toString());
    aiForm.append("band", band.toString());

    const response = await fetch(`${AI_SERVICE_URL}/choreo/compare_dtw`, {
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
    const durationMs = Date.now() - startedAt;
    const inputPayload = {
      a: {
        bucket: "lab-inputs",
        path: uploadA.path,
      },
      b: referenceAsset
        ? {
            bucket: referenceAsset.video_bucket,
            path: referenceAsset.video_path,
            pose_cache_path: referenceAsset.pose_cache_path,
            reference_asset_id: referenceAsset.id,
          }
        : {
            bucket: "lab-inputs",
            path: uploadB?.path,
          },
    };
    const output = {
      ...json,
      meta: {
        ...(json?.meta ?? {}),
        reference_asset_id: referenceAsset?.id ?? null,
      },
    };
    const enriched = {
      input: inputPayload,
      output,
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
    const inputPayload = {
      a: {
        bucket: "lab-inputs",
        path: uploadA.path,
      },
      b: referenceAsset
        ? {
            bucket: referenceAsset.video_bucket,
            path: referenceAsset.video_path,
            pose_cache_path: referenceAsset.pose_cache_path,
            reference_asset_id: referenceAsset.id,
          }
        : {
            bucket: "lab-inputs",
            path: uploadB?.path,
          },
    };
    await serviceClient
      .from("lab_runs")
      .update({
        status: "failed",
        output_json: {
          input: inputPayload,
          error: error instanceof Error ? error.message : "unknown error",
        },
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
