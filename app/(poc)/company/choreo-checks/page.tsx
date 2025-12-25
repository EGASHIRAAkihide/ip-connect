import Link from "next/link";
import { requireCompany } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

export default async function CompanyChoreoChecksPage() {
  const { user } = await requireCompany();
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("choreo_checks")
    .select("id, created_at, status, result_json, confidence")
    .eq("company_id", user.id)
    .order("created_at", { ascending: false });

  const checks = (data ?? []).map((item) => {
    const record = item as Record<string, unknown>;
    const result = (record.result_json ?? {}) as Record<string, unknown>;
    const similarityRaw = result.overall_similarity;
    const similarity =
      typeof similarityRaw === "number" && Number.isFinite(similarityRaw)
        ? Math.round(similarityRaw * 1000) / 10
        : null;
    const confidenceRaw = record.confidence ?? result.confidence;
    const confidence =
      confidenceRaw === "high" || confidenceRaw === "medium" || confidenceRaw === "low"
        ? confidenceRaw
        : null;
    return {
      id: String(record.id),
      status: String(record.status),
      createdAt: record.created_at ? String(record.created_at) : null,
      similarity,
      confidence,
    };
  });

  return (
    <section className="mx-auto max-w-4xl space-y-6 py-8">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
          企業ダッシュボード
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-neutral-900">Choreo Checks</h1>
            <p className="text-sm text-neutral-600">
              振付チェックの結果を確認するスペースです。
            </p>
          </div>
          <Link
            href="/company/choreo-checks/new"
            className="rounded-full border border-neutral-900 px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-900 hover:text-white"
          >
            新規チェック
          </Link>
        </div>
      </header>

      {checks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-6 text-sm text-neutral-700">
          <p>まだチェック結果がありません。</p>
          <p className="mt-2">最初の動画をアップロードして解析を始めましょう。</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-xs uppercase tracking-[0.2em] text-neutral-400">
              <tr>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Similarity</th>
                <th className="px-4 py-3">Confidence</th>
                <th className="px-4 py-3 text-right">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {checks.map((check) => {
                const createdAtLabel = check.createdAt
                  ? new Date(check.createdAt).toLocaleString()
                  : "—";
                const similarityLabel =
                  check.similarity !== null ? `${check.similarity}%` : "—";
                return (
                  <tr key={check.id}>
                    <td className="px-4 py-3 text-neutral-700">{createdAtLabel}</td>
                    <td className="px-4 py-3 text-neutral-700">{check.status}</td>
                    <td className="px-4 py-3 text-neutral-700">{similarityLabel}</td>
                    <td className="px-4 py-3 text-neutral-700">
                      {check.confidence ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/company/choreo-checks/${check.id}`}
                        className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-semibold text-neutral-800 hover:border-neutral-900"
                      >
                        詳細
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
