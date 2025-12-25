import Script from "next/script";
import { notFound } from "next/navigation";
import { requireCompany } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  runChoreoCheck,
  updateReferenceCheck,
} from "@/app/(poc)/company/choreo-checks/[id]/actions";

export const dynamic = "force-dynamic";

const IP_ASSETS_BUCKET = "ip-assets";

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

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CompanyChoreoChecksDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { user, role } = await requireCompany();
  const supabase = await createServerClient();
  const serviceClient = createServiceClient();
  const { data: rawData, error: rawError } = await serviceClient
    .from("choreo_checks")
    .select(
      "id, company_id, status, created_at, result_json, confidence, video_path, video_hash, reference_check_id, reference_asset_id",
    )
    .eq("id", id)
    .maybeSingle();

  if (rawError || !rawData) {
    return (
      <section className="mx-auto max-w-3xl space-y-4 py-10 text-sm text-neutral-700">
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">
            404 Debug
          </p>
          <h1 className="text-xl font-semibold text-neutral-900">
            DBに存在しない
          </h1>
          <p className="text-sm text-neutral-600">ID: {id}</p>
          {rawError && (
            <p className="text-sm text-rose-600">Error: {rawError.message}</p>
          )}
        </div>
      </section>
    );
  }

  if (rawData.company_id !== user.id) {
    return (
      <section className="mx-auto max-w-3xl space-y-4 py-10 text-sm text-neutral-700">
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">
            404 Debug
          </p>
          <h1 className="text-xl font-semibold text-neutral-900">
            別companyに紐づいている
          </h1>
          <p className="text-sm text-neutral-600">ID: {id}</p>
          <p className="text-sm text-neutral-600">company_id: {rawData.company_id}</p>
          <p className="text-sm text-neutral-600">user.id: {user.id}</p>
          <p className="text-sm text-neutral-600">role: {role}</p>
        </div>
      </section>
    );
  }
  const data = rawData;

  const canRun = data.status === "pending" || data.status === "error";
  const resultJson = (data.result_json ?? {}) as Record<string, unknown>;
  const errorMessage =
    typeof resultJson.error === "string" ? resultJson.error : null;
  const createdAt = data.created_at
    ? new Date(data.created_at).toLocaleString()
    : "—";
  const overallRaw = resultJson.overall_similarity;
  const overall =
    typeof overallRaw === "number" && Number.isFinite(overallRaw) ? overallRaw : null;
  const overallPercent =
    overall !== null ? Math.round(overall * 1000) / 10 : null;
  const confidenceRaw = resultJson.confidence ?? data.confidence;
  const confidence =
    confidenceRaw === "high" || confidenceRaw === "medium" || confidenceRaw === "low"
      ? confidenceRaw
      : null;
  const explanation = (resultJson.explanation ?? {}) as Record<string, unknown>;
  const similarReason =
    typeof explanation.similar_reason === "string" ? explanation.similar_reason : "";
  const differentReason =
    typeof explanation.different_reason === "string" ? explanation.different_reason : "";
  const phraseItems = Array.isArray(resultJson.phrases) ? resultJson.phrases : [];
  const phrases = phraseItems
    .map((phrase) => {
      const item = phrase as Record<string, unknown>;
      const start = typeof item.start === "number" ? item.start : null;
      const end = typeof item.end === "number" ? item.end : null;
      const similarity = typeof item.similarity === "number" ? item.similarity : null;
      return { start, end, similarity };
    })
    .filter((item) => item.start !== null && item.end !== null);
  const statusLabel = {
    pending: "pending",
    running: "running",
    done: "done",
    error: "error",
  }[data.status as "pending" | "running" | "done" | "error"] ?? "unknown";
  const statusStyle = {
    pending: "bg-amber-100 text-amber-800",
    running: "bg-sky-100 text-sky-800",
    done: "bg-emerald-100 text-emerald-800",
    error: "bg-rose-100 text-rose-700",
    unknown: "bg-neutral-100 text-neutral-700",
  } as const;
  const { data: referenceAsset } = data.reference_asset_id
    ? await supabase
        .from("ip_assets")
        .select("id, title, created_by, created_at, file_url, preview_url")
        .eq("id", data.reference_asset_id)
        .maybeSingle()
    : { data: null };
  const { data: ipAssets } = await supabase
    .from("ip_assets")
    .select("id, title, created_by, created_at, file_url, preview_url, type, asset_type")
    .eq("status", "published")
    .or("type.eq.choreography,asset_type.eq.choreography")
    .order("created_at", { ascending: false });
  const videoPath = data.video_path ? data.video_path : null;
  let videoUrl: string | null = null;
  let videoUrlError: string | null = null;
  if (videoPath) {
    const serviceClient = createServiceClient();
    const { data: signedData, error: signedError } = await serviceClient.storage
      .from("choreo-inputs")
      .createSignedUrl(videoPath, 60 * 60);
    if (signedError) {
      videoUrlError = signedError.message;
    }
    if (!signedData?.signedUrl) {
      videoUrlError = videoUrlError ?? "signedUrl is missing";
    }
    videoUrl = signedData?.signedUrl ?? null;
  }
  const referencePreviewUrl = referenceAsset?.preview_url ?? referenceAsset?.file_url ?? null;
  const referencePath = extractStoragePath(referencePreviewUrl, IP_ASSETS_BUCKET);
  let referenceVideoUrl: string | null = null;
  let referenceVideoError: string | null = null;
  if (referencePath) {
    const { data: signedRef, error: signedRefError } = await serviceClient.storage
      .from(IP_ASSETS_BUCKET)
      .createSignedUrl(referencePath, 60 * 60);
    if (signedRefError) {
      referenceVideoError = signedRefError.message;
    }
    if (!signedRef?.signedUrl) {
      referenceVideoError = referenceVideoError ?? "signedUrl is missing";
    }
    referenceVideoUrl = signedRef?.signedUrl ?? null;
  } else if (referencePreviewUrl) {
    referenceVideoError = "reference file path is missing";
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6 py-8">
      <Script id="choreo-jump">
        {`
          document.addEventListener("click", (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;
            const button = target.closest("[data-jump-seconds]");
            if (!button) return;
            const seconds = Number(button.getAttribute("data-jump-seconds"));
            const video = document.getElementById("choreo-video");
            if (!video || Number.isNaN(seconds)) return;
            event.preventDefault();
            video.currentTime = Math.max(0, seconds);
            video.play?.();
          });
        `}
      </Script>
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
          企業ダッシュボード
        </p>
        <h1 className="text-3xl font-semibold text-neutral-900">Choreo Check 詳細</h1>
        <p className="text-sm text-neutral-600">チェックID: {id}</p>
      </header>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-700 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">Status</p>
            <p className="text-base font-semibold text-neutral-900">{statusLabel}</p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusStyle[statusLabel as keyof typeof statusStyle] ?? statusStyle.unknown}`}
          >
            {statusLabel}
          </span>
        </div>
        <p className="text-xs text-neutral-500">作成日時: {createdAt}</p>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-700 space-y-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">Reference</p>
          <p className="text-base font-semibold text-neutral-900">比較対象</p>
        </div>
        {data.reference_asset_id && referenceAsset ? (
          <div className="space-y-1">
            <p className="text-sm text-neutral-900">
              {referenceAsset.title ?? "タイトル未設定"}
            </p>
            <p className="text-xs text-neutral-500">
              {referenceAsset.created_at
                ? new Date(referenceAsset.created_at).toLocaleString()
                : "—"}
            </p>
            <p className="text-xs text-neutral-500">ID: {referenceAsset.id}</p>
            <p className="text-xs text-neutral-500">
              Creator: {referenceAsset.created_by ?? "—"}
            </p>
          </div>
        ) : (
          <p className="text-sm text-neutral-500">未選択</p>
        )}

        {data.status === "pending" && (
          <form
            action={updateReferenceCheck.bind(null, data.id)}
            className="flex flex-wrap items-center gap-3"
          >
            <select
              name="reference_asset_id"
              defaultValue={data.reference_asset_id ?? ""}
              className="min-w-[240px] rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-800"
            >
              <option value="">未選択</option>
              {(ipAssets ?? []).map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.title ?? "タイトル未設定"} /{" "}
                  {asset.created_at ? new Date(asset.created_at).toLocaleString() : "—"}
                  {" / "}
                  {asset.id}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-full border border-neutral-900 px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-900 hover:text-white"
            >
              保存
            </button>
          </form>
        )}
      </div>

      {canRun && (
        <form action={runChoreoCheck.bind(null, data.id)}>
          <button
            type="submit"
            className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            解析を実行
          </button>
        </form>
      )}

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-700 space-y-4">
        <p className="font-semibold text-neutral-900">結果</p>
        {data.status === "error" && (
          <p className="text-sm text-rose-600">
            エラー: {errorMessage ?? "詳細不明"}
          </p>
        )}
        {data.status === "done" ? (
          <div className="space-y-6">
            <div className="grid gap-4 rounded-xl border border-neutral-100 bg-neutral-50 p-4 md:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">
                  Overall Similarity
                </p>
                <p className="mt-1 text-2xl font-semibold text-neutral-900">
                  {overallPercent !== null ? `${overallPercent}%` : "—"}
                </p>
                {overallPercent === null && (
                  <p className="mt-1 text-xs text-rose-600">
                    解析条件不足のため参考値です。
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">
                  Confidence
                </p>
                <div className="mt-2">
                  {confidence ? (
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                        confidence === "high"
                          ? "bg-emerald-100 text-emerald-800"
                          : confidence === "medium"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {confidence}
                    </span>
                  ) : (
                    <span className="text-sm text-neutral-500">—</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">
                  Reference
                </p>
                <p className="mt-2 text-xs text-neutral-500">
                  解析結果は参考情報として扱われます。
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-neutral-900">解釈ポイント</p>
              <p className="text-sm text-neutral-700">
                似ていると考えられる点:{" "}
                {similarReason ? similarReason : "該当する説明はまだありません。"}
              </p>
              <p className="text-sm text-neutral-700">
                違いとして整理できる点:{" "}
                {differentReason ? differentReason : "該当する説明はまだありません。"}
              </p>
            </div>

            {(videoPath || referenceAsset) && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-neutral-900">提出動画</p>
                  <p className="text-xs text-neutral-500">path: {videoPath ?? "—"}</p>
                  {videoUrl ? (
                    <video
                      id="choreo-video"
                      src={videoUrl}
                      controls
                      className="w-full rounded-xl border border-neutral-200 bg-neutral-900"
                    />
                  ) : (
                    <p className="text-sm text-neutral-500">
                      プレビューURL生成に失敗: {videoUrlError ?? "unknown error"}
                    </p>
                  )}
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-neutral-900">参照動画</p>
                  <p className="text-xs text-neutral-500">
                    {referenceAsset?.title ?? "未選択"}
                  </p>
                  {referenceVideoUrl ? (
                    <video
                      src={referenceVideoUrl}
                      controls
                      className="w-full rounded-xl border border-neutral-200 bg-neutral-900"
                    />
                  ) : referenceAsset ? (
                    <p className="text-sm text-neutral-500">
                      プレビューURL生成に失敗: {referenceVideoError ?? "unknown error"}
                    </p>
                  ) : (
                    <p className="text-sm text-neutral-500">参照動画は未選択です。</p>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <p className="text-sm font-semibold text-neutral-900">フレーズ別の一致度</p>
              {phrases.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-neutral-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-neutral-50 text-xs uppercase tracking-[0.2em] text-neutral-400">
                      <tr>
                        <th className="px-4 py-3">Start</th>
                        <th className="px-4 py-3">End</th>
                        <th className="px-4 py-3">Similarity</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {phrases.map((phrase, index) => {
                        const similarityValue =
                          phrase.similarity !== null && Number.isFinite(phrase.similarity)
                            ? Math.round(phrase.similarity * 1000) / 10
                            : null;
                        return (
                          <tr key={`${phrase.start}-${phrase.end}-${index}`}>
                            <td className="px-4 py-3">{phrase.start?.toFixed(2)}s</td>
                            <td className="px-4 py-3">{phrase.end?.toFixed(2)}s</td>
                            <td className="px-4 py-3">
                              {similarityValue !== null ? `${similarityValue}%` : "—"}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                data-jump-seconds={phrase.start}
                                className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-semibold text-neutral-800 hover:border-neutral-900"
                              >
                                該当秒へジャンプ
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-neutral-500">フレーズ情報はまだありません。</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-neutral-600">
            解析が完了すると結果が表示されます。
          </p>
        )}
      </div>

      <p className="text-xs text-neutral-500">
        本結果はAIによる参考情報であり、法的判断を行うものではありません。
      </p>

      <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-6 text-sm text-neutral-700 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
            Debug
          </p>
          <h2 className="text-lg font-semibold text-neutral-900">
            Choreo Check Debug
          </h2>
        </div>
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-neutral-200">
              <tr>
                <th className="w-48 bg-neutral-50 px-4 py-3 text-xs uppercase tracking-[0.2em] text-neutral-400">
                  id
                </th>
                <td className="px-4 py-3">{data.id}</td>
              </tr>
              <tr>
                <th className="bg-neutral-50 px-4 py-3 text-xs uppercase tracking-[0.2em] text-neutral-400">
                  status
                </th>
                <td className="px-4 py-3">{data.status}</td>
              </tr>
              <tr>
                <th className="bg-neutral-50 px-4 py-3 text-xs uppercase tracking-[0.2em] text-neutral-400">
                  confidence
                </th>
                <td className="px-4 py-3">{data.confidence ?? "—"}</td>
              </tr>
              <tr>
                <th className="bg-neutral-50 px-4 py-3 text-xs uppercase tracking-[0.2em] text-neutral-400">
                  created_at
                </th>
                <td className="px-4 py-3">{createdAt}</td>
              </tr>
              <tr>
                <th className="bg-neutral-50 px-4 py-3 text-xs uppercase tracking-[0.2em] text-neutral-400">
                  video_path
                </th>
                <td className="px-4 py-3">{videoPath ?? "—"}</td>
              </tr>
              <tr>
                <th className="bg-neutral-50 px-4 py-3 text-xs uppercase tracking-[0.2em] text-neutral-400">
                  video_hash
                </th>
                <td className="px-4 py-3">{data.video_hash ?? "—"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {(explanation.similar_reason ||
          explanation.different_reason ||
          Object.keys(explanation).length > 0) && (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
              Explanation
            </p>
            <pre className="overflow-x-auto rounded-xl border border-neutral-200 bg-white p-4 text-xs text-neutral-700">
              {JSON.stringify(explanation, null, 2)}
            </pre>
          </div>
        )}

        {typeof resultJson.meta === "object" && resultJson.meta !== null && (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
              Meta
            </p>
            <pre className="overflow-x-auto rounded-xl border border-neutral-200 bg-white p-4 text-xs text-neutral-700">
              {JSON.stringify(resultJson.meta, null, 2)}
            </pre>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
            result_json
          </p>
          <pre className="overflow-x-auto rounded-xl border border-neutral-200 bg-white p-4 text-xs text-neutral-700">
            {JSON.stringify(resultJson, null, 2)}
          </pre>
        </div>
      </div>
    </section>
  );
}
