"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCompany } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL;
const IP_ASSETS_BUCKET = "ip-assets";

function classifyConfidence(overall: number) {
  if (overall >= 0.8) return "high";
  if (overall >= 0.5) return "medium";
  return "low";
}

function extractStoragePath(fileUrl: string | null, bucket: string) {
  if (!fileUrl) return null;
  try {
    const url = new URL(fileUrl);
    const marker = "/storage/v1/object/";
    const [, tail] = url.pathname.split(marker);
    if (!tail) return null;
    const bucketMarker = `/${bucket}/`;
    const index = tail.indexOf(bucketMarker);
    if (index === -1) return null;
    const path = tail.slice(index + bucketMarker.length);
    return path.length > 0 ? path : null;
  } catch {
    return null;
  }
}

export async function runChoreoCheck(id: string) {
  const { user } = await requireCompany();

  if (!AI_SERVICE_URL) {
    throw new Error("AI_SERVICE_URL が未設定です。");
  }

  const supabase = createServiceClient();
  const { data: check, error: fetchError } = await supabase
    .from("choreo_checks")
    .select("id, company_id, video_path, status, reference_asset_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !check) {
    throw new Error("choreo_checks が見つかりません。");
  }

  if (check.company_id !== user.id) {
    throw new Error("権限がありません。");
  }

  if (check.status !== "pending" && check.status !== "error") {
    redirect(`/company/choreo-checks/${id}`);
  }

  if (!check.reference_asset_id) {
    await supabase
      .from("choreo_checks")
      .update({
        status: "error",
        result_json: { error: "REFERENCE_MISSING" },
      })
      .eq("id", id);
    revalidatePath(`/company/choreo-checks/${id}`);
    redirect(`/company/choreo-checks/${id}`);
    return;
  }

  const { data: referenceAsset, error: referenceError } = await supabase
    .from("ip_assets")
    .select("id, title, file_url, preview_url")
    .eq("id", check.reference_asset_id)
    .maybeSingle();

  if (referenceError || !referenceAsset) {
    await supabase
      .from("choreo_checks")
      .update({
        status: "error",
        result_json: { error: "REFERENCE_NOT_FOUND" },
      })
      .eq("id", id);
    revalidatePath(`/company/choreo-checks/${id}`);
    redirect(`/company/choreo-checks/${id}`);
    return;
  }

  const referenceUrl = referenceAsset.preview_url ?? referenceAsset.file_url ?? null;
  if (!referenceUrl) {
    await supabase
      .from("choreo_checks")
      .update({
        status: "error",
        result_json: { error: "REFERENCE_FILE_MISSING" },
      })
      .eq("id", id);
    revalidatePath(`/company/choreo-checks/${id}`);
    redirect(`/company/choreo-checks/${id}`);
    return;
  }

  const { error: runningError } = await supabase
    .from("choreo_checks")
    .update({ status: "running" })
    .eq("id", id);

  if (runningError) {
    throw new Error(runningError.message);
  }

  try {
    const { data: file, error: downloadError } = await supabase.storage
      .from("choreo-inputs")
      .download(check.video_path);

    if (downloadError || !file) {
      throw new Error(downloadError?.message ?? "動画の取得に失敗しました。");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = check.video_path.split("/").pop() || "choreo.mp4";
    const referenceResponse = await fetch(referenceUrl);
    if (!referenceResponse.ok) {
      throw new Error(`reference fetch failed: ${referenceResponse.status}`);
    }
    const referenceBuffer = Buffer.from(await referenceResponse.arrayBuffer());
    const referenceFilename = referenceUrl.split("/").pop() || "reference.mp4";
    const aiForm = new FormData();
    aiForm.append(
      "file",
      new File([buffer], filename, {
        type: "video/mp4",
      }),
    );
    aiForm.append(
      "reference",
      new File([referenceBuffer], referenceFilename, {
        type: "video/mp4",
      }),
    );
    aiForm.append("input_path", check.video_path);
    const referencePath = extractStoragePath(referenceUrl, IP_ASSETS_BUCKET);
    if (referencePath) {
      aiForm.append("reference_path", referencePath);
    }

    const response = await fetch(`${AI_SERVICE_URL}/choreo/check`, {
      method: "POST",
      body: aiForm,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`AIサービスエラー: ${response.status} ${text}`);
    }

    const json = (await response.json()) as Record<string, unknown>;
    const overallRaw = json.overall_similarity;
    const overall =
      typeof overallRaw === "number" && Number.isFinite(overallRaw)
        ? overallRaw
        : overallRaw === null
          ? null
          : 0;
    const confidenceRaw = json.confidence;
    const confidence =
      confidenceRaw === "high" || confidenceRaw === "medium" || confidenceRaw === "low"
        ? confidenceRaw
        : overall === null
          ? "low"
          : classifyConfidence(overall);
    const explanation = json.explanation as Record<string, unknown> | undefined;
    const meta = json.meta as Record<string, unknown> | undefined;
    const resultJson = {
      overall_similarity: overall,
      confidence,
      explanation: {
        similar_reason:
          typeof explanation?.similar_reason === "string"
            ? explanation.similar_reason
            : "",
        different_reason:
          typeof explanation?.different_reason === "string"
            ? explanation.different_reason
            : "",
      },
      phrases: Array.isArray(json.phrases) ? json.phrases : [],
      meta: meta ?? null,
    };

    const { error: updateError } = await supabase
      .from("choreo_checks")
      .update({
        status: "done",
        result_json: resultJson,
        confidence,
      })
      .eq("id", id);

    if (updateError) {
      throw new Error(updateError.message);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    await supabase
      .from("choreo_checks")
      .update({
        status: "error",
        result_json: { error: message },
      })
      .eq("id", id);
  }

  revalidatePath(`/company/choreo-checks/${id}`);
  redirect(`/company/choreo-checks/${id}`);
}

export async function updateReferenceCheck(id: string, formData: FormData) {
  const { user } = await requireCompany();
  const rawReferenceId = formData.get("reference_asset_id");
  const referenceAssetId =
    typeof rawReferenceId === "string" && rawReferenceId.length > 0
      ? rawReferenceId
      : null;

  const supabase = createServiceClient();
  const { data: current, error: currentError } = await supabase
    .from("choreo_checks")
    .select("id, company_id")
    .eq("id", id)
    .maybeSingle();

  if (currentError || !current) {
    throw new Error("choreo_checks が見つかりません。");
  }

  if (current.company_id !== user.id) {
    throw new Error("権限がありません。");
  }

  if (referenceAssetId) {
    const { data: reference, error: referenceError } = await supabase
      .from("ip_assets")
      .select("id")
      .eq("id", referenceAssetId)
      .maybeSingle();

    if (referenceError || !reference) {
      throw new Error("参照先の ip_assets が見つかりません。");
    }
  }

  const { error: updateError } = await supabase
    .from("choreo_checks")
    .update({ reference_asset_id: referenceAssetId })
    .eq("id", id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidatePath(`/company/choreo-checks/${id}`);
  redirect(`/company/choreo-checks/${id}`);
}
