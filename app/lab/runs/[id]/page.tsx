import Link from "next/link";
import { notFound } from "next/navigation";
import { requireLabAdmin } from "@/lib/lab";
import type { LabRun } from "@/lib/types";
import { EmbeddingViewer } from "./EmbeddingViewer";
import { ExportButtons } from "./ExportButtons";
import { createIpDraftFromRun } from "./actions";
import { isLabEnabled } from "@/lib/lab";
import { ChoreoPhraseReview } from "./ChoreoPhraseReview";

type RunInputs = {
  a?: { bucket?: string; path?: string };
  b?: { bucket?: string; path?: string };
};

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object") {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  return {};
}

function resolvePayload(raw: unknown) {
  const payload = asObject(raw);
  const output = asObject(payload.output ?? payload);
  const inputs = asObject(payload.inputs ?? payload.input);
  const meta = asObject(output.meta ?? payload.meta);
  return { payload, output, inputs, meta };
}

function getPath(obj: unknown, path: string[]) {
  let cursor: any = obj;
  for (const key of path) {
    if (!cursor || typeof cursor !== "object") return undefined;
    cursor = cursor[key];
  }
  return cursor;
}

function getNumber(obj: unknown, ...paths: string[][]) {
  for (const path of paths) {
    const value = getPath(obj, path);
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function Badge({ status }: { status: LabRun["status"] }) {
  const tone =
    status === "success"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "running"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : status === "failed"
          ? "bg-rose-50 text-rose-700 border-rose-200"
          : "bg-neutral-50 text-neutral-700 border-neutral-200";

  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tone}`}>{status}</span>;
}

export default async function LabRunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireLabAdmin();
  const { id } = await params;
  const enableExport = isLabEnabled() && process.env.ENABLE_LAB_IP_EXPORT === "true";

  const { data: run } = await supabase
    .from("lab_runs")
    .select("*")
    .eq("id", id)
    .maybeSingle<LabRun>();

  if (!run) {
    return notFound();
  }

  const { payload, output, inputs, meta: resolvedMeta } = resolvePayload(run.output_json);
  const input = inputs as unknown as RunInputs;
  let videoAUrl: string | null = null;
  let videoBUrl: string | null = null;
  let signError: string | null = null;
  if (input?.a?.bucket && input?.a?.path) {
    const { data, error } = await supabase.storage
      .from(input.a.bucket as string)
      .createSignedUrl(input.a.path as string, 60 * 60);
    if (data?.signedUrl) {
      videoAUrl = data.signedUrl;
    } else if (error) {
      signError = error.message;
    }
  }
  if (input?.b?.bucket && input?.b?.path) {
    const { data, error } = await supabase.storage
      .from(input.b.bucket as string)
      .createSignedUrl(input.b.path as string, 60 * 60);
    if (data?.signedUrl) {
      videoBUrl = data.signedUrl;
    } else if (error) {
      signError = error?.message ?? signError;
    }
  }

  return (
    <section className="mx-auto max-w-4xl space-y-6 py-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Run Detail</p>
        <h1 className="text-3xl font-semibold text-neutral-900">実行ID: {run.id}</h1>
        <div className="flex items-center gap-2 text-sm">
          <Badge status={run.status} />
          <span className="text-neutral-600">{new Date(run.created_at).toLocaleString()}</span>
        </div>
        <div className="text-sm text-neutral-600">
          <span className="font-semibold text-neutral-900">Type:</span> {run.type}
        </div>
      </header>

      <ExportButtons data={run.output_json as Record<string, unknown>} />
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/lab/runs/${run.id}/report.pdf`}
          className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-semibold text-neutral-800 hover:bg-neutral-100"
        >
          PDF出力
        </Link>
        <Link href={`/lab/runs/${run.id}/report`} className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-semibold text-neutral-800 hover:bg-neutral-100">
          Report（HTML）
        </Link>
      </div>
      {enableExport && (
        <form action={createIpDraftFromRun.bind(null, run.id)}>
          <button
            type="submit"
            className="rounded-full border border-neutral-200 bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            IP下書きを作成
          </button>
        </form>
      )}

      <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="space-y-1 text-sm">
          <p className="font-semibold text-neutral-900">入力</p>
          <p className="text-neutral-700">
            bucket: <code className="rounded bg-neutral-100 px-1 py-0.5">{run.input_bucket}</code>
          </p>
          <p className="text-neutral-700">
            path: <code className="rounded bg-neutral-100 px-1 py-0.5">{run.input_path}</code>
          </p>
        </div>

        <div className="space-y-2 text-sm">
          <p className="font-semibold text-neutral-900">結果</p>
          {run.type === "diarization" && Boolean((output as { segments?: { speaker: string; start: number; end: number }[] } | null)?.segments) ? (
            <div className="overflow-hidden rounded-lg border border-neutral-200">
              <table className="min-w-full divide-y divide-neutral-200 text-sm">
                <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-600">
                  <tr>
                    <th className="px-3 py-2">Speaker</th>
                    <th className="px-3 py-2">Start (s)</th>
                    <th className="px-3 py-2">End (s)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {((output as { segments?: { speaker: string; start: number; end: number }[] }).segments ?? []).map(
                    (segment, idx) => (
                      <tr key={`${segment.speaker}-${idx}`} className="hover:bg-neutral-50">
                        <td className="px-3 py-2 font-mono text-xs">{segment.speaker}</td>
                        <td className="px-3 py-2 font-mono text-xs">{segment.start}</td>
                        <td className="px-3 py-2 font-mono text-xs">{segment.end}</td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          ) : run.type === "speaker_embedding" && (output as any)?.embedding ? (
            <EmbeddingViewer
              embedding={(output as { embedding: number[] }).embedding}
              dim={(output as { meta?: { dim?: number; returned?: number; trimmed?: boolean } }).meta?.dim ?? 0}
              returned={(output as { meta?: { returned?: number } }).meta?.returned ?? ((output as { embedding: number[] }).embedding.length)}
              trimmed={(output as { meta?: { trimmed?: boolean } }).meta?.trimmed ?? false}
            />
          ) : run.type === "asr_diarize" && (output as { segments?: { speaker: string; start: number; end: number; text: string }[] } | null)?.segments ? (
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-neutral-900">話者付きセグメント</p>
              <div className="overflow-hidden rounded-lg border border-neutral-200">
                <table className="min-w-full divide-y divide-neutral-200 text-sm">
                  <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-600">
                    <tr>
                      <th className="px-3 py-2">Speaker</th>
                      <th className="px-3 py-2">Start</th>
                      <th className="px-3 py-2">End</th>
                      <th className="px-3 py-2">Text</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {((output as { segments?: { speaker: string; start: number; end: number; text: string }[] }).segments ?? []).map(
                      (seg, idx) => (
                        <tr key={`${seg.speaker}-${idx}`} className="hover:bg-neutral-50">
                          <td className="px-3 py-2 font-mono text-xs">{seg.speaker}</td>
                          <td className="px-3 py-2 font-mono text-xs">{seg.start}</td>
                          <td className="px-3 py-2 font-mono text-xs">{seg.end}</td>
                          <td className="px-3 py-2 text-neutral-800">{seg.text}</td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
              <div className="space-y-1 text-sm">
                <details className="rounded-lg border border-neutral-200 bg-neutral-50">
                  <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-neutral-900">全体の文字起こしを表示</summary>
                  <div className="space-y-2 px-3 pb-3">
                    <p className="text-sm text-neutral-800">{(output as { transcript?: string }).transcript ?? ""}</p>
                  </div>
                </details>
                <p className="text-xs text-amber-700">話者割当は推定の参考情報です。用途に応じて必ず人手で確認してください。</p>
              </div>
            </div>
          ) : run.type === "speaker_compare" && (output as any)?.similarity !== undefined ? (
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-neutral-900">類似度（cosine）</p>
              <p className="text-lg font-semibold text-neutral-900">
                {(output as { similarity: number }).similarity.toFixed(4)}
                <span className="ml-2 text-xs text-neutral-600">
                  {((output as { similarity: number }).similarity ?? 0) >= 0.8
                    ? "高め(参考)"
                    : ((output as { similarity: number }).similarity ?? 0) >= 0.5
                      ? "中程度(参考)"
                      : "低め(参考)"}
                </span>
              </p>
              <p className="text-xs text-amber-700">本人一致を保証しない参考値です。用途に応じて必ず人手で確認してください。</p>
            </div>
          ) : run.type === "choreo_compare" ? (
            (() => {
              const similarity = getNumber(output, ["similarity"]) ?? getNumber(payload, ["output", "similarity"], ["similarity"]);
              if (similarity === null) {
                const payloadOutputType = typeof (payload as any)?.output;
                const payloadKeys = Object.keys(payload ?? {}).join(", ");
                const outputKeys = Object.keys(output ?? {}).join(", ");
                return (
                  <div className="space-y-2 text-sm text-neutral-600">
                    <p>similarity が見つかりません。</p>
                    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs">
                      <p>payload keys: {payloadKeys || "—"}</p>
                      <p>payload.output type: {payloadOutputType ?? "—"}</p>
                      <p>output keys: {outputKeys || "—"}</p>
                    </div>
                  </div>
                );
              }
              return (
                <div className="space-y-2 text-sm">
                  <p className="font-semibold text-neutral-900">振付類似度（cosine）</p>
                  <p className="text-lg font-semibold text-neutral-900">
                    {similarity.toFixed(4)}
                    <span className="ml-2 text-xs text-neutral-600">
                      {similarity >= 0.75 ? "高め(参考)" : similarity >= 0.5 ? "中程度(参考)" : "低め(参考)"}
                    </span>
                  </p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {Object.entries(resolvedMeta ?? {}).map(([k, v]) => (
                      <div key={k} className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{k}</p>
                        <p className="text-sm text-neutral-900">{String(v)}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-amber-700">骨格ランドマークに基づく参考値です。用途に応じて必ず人手で確認してください。</p>
                </div>
              );
            })()
          ) : run.type === "choreo_compare_dtw" && output ? (
            <div className="space-y-3 text-sm">
              {(() => {
                const similarity = getNumber(payload, ["output", "similarity"], ["similarity"]);
                const dtwCost = getNumber(payload, ["output", "dtw_cost"], ["dtw_cost"], ["meta", "dtw_cost"]);
                const warnings = Array.isArray((resolvedMeta as any)?.warnings) ? (resolvedMeta as any).warnings : [];
                const phrases = Array.isArray((output as any)?.phrases) ? (output as any).phrases : [];
                const metaEntries = Object.entries(resolvedMeta ?? {}).filter(([key]) => key !== "warnings");
                return (
                  <>
                    <p className="font-semibold text-neutral-900">DTW振付類似度</p>
                    <p className="text-lg font-semibold text-neutral-900">
                      {similarity !== null ? similarity.toFixed(4) : "—"}
                      {typeof (resolvedMeta as any)?.confidence === "number" && (
                        <span
                          className={`ml-2 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                            (resolvedMeta as any)?.label === "High"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : (resolvedMeta as any)?.label === "Medium"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          Confidence: {(resolvedMeta as any)?.label} ({Number((resolvedMeta as any)?.confidence ?? 0).toFixed(2)})
                        </span>
                      )}
                    </p>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">dtw_cost</p>
                        <p className="text-sm text-neutral-900">{dtwCost ?? "—"}</p>
                      </div>
                      {warnings.length > 0 && (
                        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">warnings</p>
                          <p className="text-sm text-neutral-900">{warnings.join(", ")}</p>
                        </div>
                      )}
                      {metaEntries.map(([k, v]) => (
                        <div key={k} className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{k}</p>
                          <p className="text-sm text-neutral-900">{String(v)}</p>
                        </div>
                      ))}
                    </div>
                    <ChoreoPhraseReview
                      videoA={videoAUrl}
                      videoB={videoBUrl}
                      phrases={phrases}
                      signError={signError}
                    />
                    <p className="text-xs text-amber-700">骨格ランドマークに基づく参考値です。用途に応じて必ず人手で確認してください。</p>
                  </>
                );
              })()}
            </div>
          ) : run.type === "choreo_segment" && output ? (
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-neutral-900">フレーズ分割</p>
              <div className="overflow-hidden rounded-lg border border-neutral-200">
                <table className="min-w-full divide-y divide-neutral-200 text-sm">
                  <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-600">
                    <tr>
                      <th className="px-3 py-2">Start (s)</th>
                      <th className="px-3 py-2">End (s)</th>
                      <th className="px-3 py-2">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {Array.isArray((output as any).segments) &&
                      (output as any).segments.map((seg: any, idx: number) => (
                        <tr key={`${seg.start}-${seg.end}-${idx}`} className="hover:bg-neutral-50">
                          <td className="px-3 py-2 font-mono text-xs">{seg.start}</td>
                          <td className="px-3 py-2 font-mono text-xs">{seg.end}</td>
                          <td className="px-3 py-2 text-neutral-800">{seg.reason ?? ""}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {Array.isArray((output as any).energy_preview) && (
                <details className="rounded-lg border border-neutral-200 bg-neutral-50">
                  <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-neutral-900">energy preview</summary>
                  <div className="space-y-1 px-3 pb-3">
                    <p className="text-xs text-neutral-600">先頭200点の滑らかエネルギー値です。</p>
                    <pre className="overflow-auto rounded bg-neutral-900 p-3 text-xs text-neutral-50">
                      {JSON.stringify((output as any).energy_preview, null, 2)}
                    </pre>
                  </div>
                </details>
              )}
              <div className="grid gap-3 md:grid-cols-2">
                {Object.entries(((output as any).meta ?? {})).map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{k}</p>
                    <p className="text-sm text-neutral-900">{String(v)}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : run.type === "choreo_phrase_compare" && output ? (
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-neutral-900">フレーズ類似度マッチング</p>
              <ChoreoPhraseReview
                videoA={videoAUrl}
                videoB={videoBUrl}
                matches={
                  Array.isArray((output as any).matches)
                    ? (output as any).matches
                    : Array.isArray((payload as any).matches)
                      ? (payload as any).matches
                      : []
                }
                signError={signError}
              />
              <div className="grid gap-3 md:grid-cols-2">
                {Object.entries(resolvedMeta ?? {}).map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{k}</p>
                    <p className="text-sm text-neutral-900">{String(v)}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : run.type === "multimodal_align" && output ? (
            <div className="space-y-3 text-sm">
              <p className="font-semibold text-neutral-900">Multimodal Align</p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">sync_score</p>
                  <p className="text-lg font-semibold text-neutral-900">
                    {Number((output as any).sync_score ?? 0).toFixed(4)}
                  </p>
                </div>
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">lag_ms</p>
                  <p className="text-lg font-semibold text-neutral-900">{String((output as any).lag_ms ?? "—")}</p>
                </div>
              </div>
              <details className="rounded-lg border border-neutral-200 bg-neutral-50">
                <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-neutral-900">peaks preview</summary>
                <div className="space-y-2 px-3 pb-3">
                  <pre className="overflow-auto rounded bg-neutral-900 p-3 text-xs text-neutral-50">
                    {JSON.stringify(
                      {
                        audio_peaks: (output as any).audio_peaks ?? [],
                        motion_peaks: (output as any).motion_peaks ?? [],
                      },
                      null,
                      2,
                    )}
                  </pre>
                </div>
              </details>
              <div className="grid gap-3 md:grid-cols-2">
                {Object.entries(((output as any).meta ?? {})).map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{k}</p>
                    <p className="text-sm text-neutral-900">{String(v)}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : run.type === "multimodal_compare" && output ? (
            <div className="space-y-3 text-sm">
              <p className="font-semibold text-neutral-900">Multimodal Compare</p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">audio_similarity</p>
                  <p className="text-lg font-semibold text-neutral-900">
                    {Number((output as any).audio_similarity ?? 0).toFixed(4)}
                  </p>
                </div>
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">motion_similarity</p>
                  <p className="text-lg font-semibold text-neutral-900">
                    {Number((output as any).motion_similarity ?? 0).toFixed(4)}
                  </p>
                </div>
              </div>
              {(output as any).interpretation && (
                <p className="rounded-lg border border-neutral-200 bg-white p-3 text-sm text-neutral-800">
                  {(output as any).interpretation}
                </p>
              )}
              <details className="rounded-lg border border-neutral-200 bg-neutral-50">
                <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-neutral-900">peaks preview</summary>
                <div className="space-y-2 px-3 pb-3">
                  <pre className="overflow-auto rounded bg-neutral-900 p-3 text-xs text-neutral-50">
                    {JSON.stringify(
                      {
                        A: (output as any).A ?? null,
                        B: (output as any).B ?? null,
                      },
                      null,
                      2,
                    )}
                  </pre>
                </div>
              </details>
              <div className="grid gap-3 md:grid-cols-2">
                {Object.entries(((output as any).meta ?? {})).map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{k}</p>
                    <p className="text-sm text-neutral-900">{String(v)}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : run.type === "choreo_pose_extract" && output ? (
            <div className="space-y-3 text-sm">
              <p className="font-semibold text-neutral-900">骨格推定結果</p>
              {(() => {
                const frames = (output as any)?.frames ?? (output as any)?.pose_frames ?? [];
                const summary = (output as any)?.summary;
                const features = (output as any)?.features;
                const vectors = Array.isArray((output as any)?.vectors) ? (output as any).vectors : [];
                return (
                  <>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">backend</p>
                        <p className="text-sm text-neutral-900">
                          {String((resolvedMeta as any)?.backend ?? "—")}
                        </p>
                      </div>
                      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">frames</p>
                        <p className="text-sm text-neutral-900">
                          {Array.isArray(frames) ? frames.length : (resolvedMeta as any)?.frames ?? "—"}
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {Object.entries(resolvedMeta ?? {}).map(([k, v]) => (
                        <div key={k} className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{k}</p>
                          <p className="text-sm text-neutral-900">{String(v)}</p>
                        </div>
                      ))}
                    </div>
                    {(summary || features) && (
                      <div className="grid gap-3 md:grid-cols-2">
                        {summary && (
                          <div className="space-y-1 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">summary</p>
                            <pre className="overflow-auto text-xs text-neutral-900">
                              {JSON.stringify(summary, null, 2)}
                            </pre>
                          </div>
                        )}
                        {features && (
                          <div className="space-y-1 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">features</p>
                            <pre className="overflow-auto text-xs text-neutral-900">
                              {JSON.stringify(features, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                    {vectors.length > 0 && (
                      <details className="rounded-lg border border-neutral-200 bg-neutral-50">
                        <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-neutral-900">
                          vectors (先頭のみ表示)
                        </summary>
                        <div className="space-y-2 px-3 pb-3">
                          <p className="text-xs text-neutral-600">
                            vectors は正規化済みの骨格ベクトルです。表示は先頭50件に制限しています。
                          </p>
                          <pre className="overflow-auto rounded bg-neutral-900 p-3 text-xs text-neutral-50">
                            {JSON.stringify(vectors.slice(0, 50), null, 2)}
                          </pre>
                        </div>
                      </details>
                    )}
                    <details className="rounded-lg border border-neutral-200 bg-neutral-50">
                      <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-neutral-900">
                        pose_frames / frames (先頭のみ表示)
                      </summary>
                      <div className="space-y-2 px-3 pb-3">
                        <p className="text-xs text-neutral-600">
                          frames は最大50件まで保存しています。time は秒、33ランドマークの x/y/score を含みます。
                        </p>
                        <pre className="overflow-auto rounded bg-neutral-900 p-3 text-xs text-neutral-50">
                          {JSON.stringify(frames, null, 2)}
                        </pre>
                      </div>
                    </details>
                  </>
                );
              })()}
            </div>
          ) : output ? (
            <pre className="overflow-auto rounded-lg bg-neutral-900 p-4 text-xs text-neutral-50">
              {JSON.stringify(output, null, 2)}
            </pre>
          ) : (
            <p className="text-neutral-600">まだ出力がありません。</p>
          )}
        </div>

        {run.error_message && (
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-neutral-900 text-rose-700">エラー</p>
            <p className="text-rose-700">{run.error_message}</p>
          </div>
        )}

        <div className="text-sm text-neutral-600">
          <p>実行時間: {run.duration_ms ? `${run.duration_ms} ms` : "—"}</p>
        </div>
      </div>

      <Link href="/lab/runs" className="text-sm font-semibold text-neutral-900 underline">
        ← 実行一覧に戻る
      </Link>
    </section>
  );
}
