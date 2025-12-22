import Link from "next/link";
import { requireLabAdmin } from "@/lib/lab";

export default async function MultimodalLabPage() {
  await requireLabAdmin();

  return (
    <section className="mx-auto max-w-4xl space-y-6 py-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Admin Only</p>
        <h1 className="text-3xl font-semibold text-neutral-900">AI Lab（Multimodal）</h1>
        <p className="text-sm text-neutral-700">
          Audio × Choreo の実験ログを残すためのPoCです。音声のピークと動きのピークを用いて整合/比較を行います。
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/lab/multimodal/align"
          className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-[2px] hover:shadow-md"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Align</p>
          <h2 className="mt-1 text-xl font-semibold text-neutral-900">同期チェック</h2>
          <p className="mt-2 text-sm text-neutral-700">
            音声ピークと動きピークの一致率（sync_score）と遅延（lag_ms）を推定します。
          </p>
        </Link>

        <Link
          href="/lab/multimodal/compare"
          className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-[2px] hover:shadow-md"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Compare</p>
          <h2 className="mt-1 text-xl font-semibold text-neutral-900">比較 (A/B)</h2>
          <p className="mt-2 text-sm text-neutral-700">
            A/Bの音声ピーク系列と動き系列を簡易比較し、サマリと解釈を返します（参考値）。
          </p>
        </Link>

        <Link
          href="/lab/runs"
          className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-[2px] hover:shadow-md"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Logs</p>
          <h2 className="mt-1 text-xl font-semibold text-neutral-900">実行履歴</h2>
          <p className="mt-2 text-sm text-neutral-700">lab_runs の履歴を確認します。</p>
        </Link>

        <Link
          href="/lab/guide"
          className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-[2px] hover:shadow-md"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Docs</p>
          <h2 className="mt-1 text-xl font-semibold text-neutral-900">Lab Guide</h2>
          <p className="mt-2 text-sm text-neutral-700">実装ステップの概要を確認します。</p>
        </Link>
      </div>
    </section>
  );
}
