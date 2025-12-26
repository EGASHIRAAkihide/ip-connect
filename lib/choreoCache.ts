import { createHash } from "crypto";
import { buildVectorsFromFrames } from "@/lib/choreo/features";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL;
const POSE_CACHE_BUCKET = "lab-outputs";
const POSE_CACHE_VERSION = "v1";

type PoseCacheResult = {
  hash: string;
  poseRef: { bucket: string; path: string };
  cacheHit: boolean;
  signedUrl: string | null;
  data: any;
};

export async function ensurePoseCache(
  supabase: any,
  file: File,
  sampleFps = 10,
  maxSeconds = 30,
  variant?: string,
): Promise<PoseCacheResult> {
  if (!AI_SERVICE_URL) {
    throw new Error("AI_SERVICE_URL が未設定です。");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const hash = createHash("sha256").update(buffer).digest("hex");
  const suffix = variant ? `_${variant}` : "";
  const posePath = `choreo/pose/${POSE_CACHE_VERSION}/${hash}${suffix}.json`;
  const poseRef = { bucket: POSE_CACHE_BUCKET, path: posePath };

  const download = await supabase.storage.from(POSE_CACHE_BUCKET).download(posePath);
  if (download.data && !download.error) {
    const blob: any = download.data;
    const cachedText =
      typeof blob.text === "function"
        ? await blob.text()
        : Buffer.from(await blob.arrayBuffer()).toString("utf-8");
    const cachedJson = JSON.parse(cachedText);
    const cachedVectors = Array.isArray(cachedJson?.vectors)
      ? cachedJson.vectors
      : buildVectorsFromFrames(
          (cachedJson?.frames ?? cachedJson?.pose_frames ?? []) as any[],
        );
    if (cachedVectors.length > 0) {
      const normalizedJson =
        cachedVectors === cachedJson?.vectors
          ? cachedJson
          : {
              ...cachedJson,
              vectors: cachedVectors,
              meta: {
                ...(cachedJson?.meta ?? {}),
                vectors_generated: true,
              },
            };
      if (normalizedJson !== cachedJson) {
        await supabase.storage
          .from(POSE_CACHE_BUCKET)
          .upload(posePath, Buffer.from(JSON.stringify(normalizedJson)), {
            contentType: "application/json",
            upsert: true,
          });
      }
      const { data: signed, error: signErr } = await supabase.storage
        .from(POSE_CACHE_BUCKET)
        .createSignedUrl(posePath, 60 * 60);
      if (!signed?.signedUrl || signErr) {
        throw new Error("poseキャッシュの署名URL生成に失敗しました。");
      }
      return {
        hash,
        poseRef,
        cacheHit: true,
        signedUrl: signed.signedUrl,
        data: normalizedJson,
      };
    }
  }

  const aiForm = new FormData();
  aiForm.append(
    "file",
    new File([new Uint8Array(buffer)], file.name, {
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
  const frames = (json?.frames ?? json?.pose_frames ?? []) as any[];
  const vectors = Array.isArray(json?.vectors) ? json.vectors : buildVectorsFromFrames(frames);
  console.log("[ensurePoseCache]", {
    keys: Object.keys(json ?? {}),
    frames: frames.length,
    vectors: vectors.length,
  });
  if (vectors.length === 0) {
    throw new Error("pose response missing vectors");
  }
  const normalizedJson = {
    ...json,
    vectors,
    meta: {
      ...(json?.meta ?? {}),
      vectors_generated: !Array.isArray(json?.vectors),
    },
  };

  await supabase.storage
    .from(POSE_CACHE_BUCKET)
    .upload(posePath, Buffer.from(JSON.stringify(normalizedJson)), {
      contentType: "application/json",
      upsert: true,
    });

  const { data: signed, error: signErr } = await supabase.storage
    .from(POSE_CACHE_BUCKET)
    .createSignedUrl(posePath, 60 * 60);
  if (!signed?.signedUrl || signErr) {
    throw new Error("poseキャッシュの署名URL生成に失敗しました。");
  }

  return {
    hash,
    poseRef,
    cacheHit: false,
    signedUrl: signed.signedUrl,
    data: normalizedJson,
  };
}
