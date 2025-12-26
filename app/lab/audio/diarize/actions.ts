"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireLabAdmin } from "@/lib/lab";
import { augmentLabOutput } from "@/lib/labMeta";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL;
const allowedAudioExt = ["mp3", "wav", "m4a", "ogg", "aac"];

export async function runDiarization(formData: FormData) {
  const { supabase, user } = await requireLabAdmin();

  if (!AI_SERVICE_URL) {
    throw new Error("AI_SERVICE_URL が未設定です。");
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    throw new Error("音声ファイルをアップロードしてください。");
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!allowedAudioExt.includes(ext)) {
    throw new Error("mp3 / wav / m4a / ogg / aac のファイルをアップロードしてください。");
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const storagePath = `${user.id}/${Date.now()}-${randomUUID()}-${file.name}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("lab-inputs")
    .upload(storagePath, fileBuffer, {
      contentType: file.type || "audio/mpeg",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`アップロードに失敗しました: ${uploadError.message}`);
  }

  const { data: run, error: insertError } = await supabase
    .from("lab_runs")
    .insert({
      type: "diarization",
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
    const aiForm = new FormData();
    aiForm.append(
      "file",
      new File([new Uint8Array(fileBuffer)], file.name, {
        type: file.type || "audio/mpeg",
      }),
    );

    const response = await fetch(`${AI_SERVICE_URL}/diarize`, {
      method: "POST",
      body: aiForm,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`AIサービスエラー: ${response.status} ${text}`);
    }

    const json = await response.json();
    const enriched = augmentLabOutput(json);
    const durationMs = Date.now() - startedAt;

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
