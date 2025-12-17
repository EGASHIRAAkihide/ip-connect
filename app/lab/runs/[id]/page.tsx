import Link from "next/link";
import { notFound } from "next/navigation";
import { requireLabAdmin } from "@/lib/lab";
import type { LabRun } from "@/lib/types";
import { EmbeddingViewer } from "./EmbeddingViewer";
import { ExportButtons } from "./ExportButtons";
import { createIpDraftFromRun } from "./actions";
import { isLabEnabled } from "@/lib/lab";

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
          {run.type === "diarization" && Boolean((run.output_json as { segments?: { speaker: string; start: number; end: number }[] } | null)?.segments) ? (
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
                  {((run.output_json as { segments?: { speaker: string; start: number; end: number }[] }).segments ?? []).map(
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
          ) : run.type === "speaker_embedding" && run.output_json?.embedding ? (
            <EmbeddingViewer
              embedding={(run.output_json as { embedding: number[] }).embedding}
              dim={(run.output_json as { meta?: { dim?: number; returned?: number; trimmed?: boolean } }).meta?.dim ?? 0}
              returned={(run.output_json as { meta?: { returned?: number } }).meta?.returned ?? ((run.output_json as { embedding: number[] }).embedding.length)}
              trimmed={(run.output_json as { meta?: { trimmed?: boolean } }).meta?.trimmed ?? false}
            />
          ) : run.type === "asr_diarize" && (run.output_json as { segments?: { speaker: string; start: number; end: number; text: string }[] } | null)?.segments ? (
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
                    {((run.output_json as { segments?: { speaker: string; start: number; end: number; text: string }[] }).segments ?? []).map(
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
                    <p className="text-sm text-neutral-800">{(run.output_json as { transcript?: string }).transcript ?? ""}</p>
                  </div>
                </details>
                <p className="text-xs text-amber-700">話者割当は推定の参考情報です。用途に応じて必ず人手で確認してください。</p>
              </div>
            </div>
          ) : run.type === "speaker_compare" && run.output_json?.similarity !== undefined ? (
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-neutral-900">類似度（cosine）</p>
              <p className="text-lg font-semibold text-neutral-900">
                {(run.output_json as { similarity: number }).similarity.toFixed(4)}
                <span className="ml-2 text-xs text-neutral-600">
                  {((run.output_json as { similarity: number }).similarity ?? 0) >= 0.8
                    ? "高め(参考)"
                    : ((run.output_json as { similarity: number }).similarity ?? 0) >= 0.5
                      ? "中程度(参考)"
                      : "低め(参考)"}
                </span>
              </p>
              <p className="text-xs text-amber-700">本人一致を保証しない参考値です。用途に応じて必ず人手で確認してください。</p>
            </div>
          ) : run.output_json ? (
            <pre className="overflow-auto rounded-lg bg-neutral-900 p-4 text-xs text-neutral-50">
              {JSON.stringify(run.output_json, null, 2)}
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
