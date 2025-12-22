import { requireLabAdmin } from "@/lib/lab";
import { runMultimodalAlign } from "./actions";

export default async function MultimodalAlignPage() {
  await requireLabAdmin();

  return (
    <section className="mx-auto max-w-3xl space-y-6 py-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Multimodal Align</p>
        <h1 className="text-3xl font-semibold text-neutral-900">Audio × Choreo 同期チェック</h1>
        <p className="text-sm text-neutral-700">
          音声RMSピークと動きピークの一致率（sync_score）と遅延（lag_ms）を推定して、AI実験ログとして保存します。
        </p>
      </header>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <form action={runMultimodalAlign} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-neutral-900">動画ファイル</label>
            <p className="text-xs text-neutral-600">mp4 / mov</p>
            <input
              name="file"
              type="file"
              accept=".mp4,.mov,video/*"
              required
              className="mt-2 block w-full rounded-lg border border-neutral-300 bg-white p-2 text-sm"
            />
          </div>

          <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-neutral-600">
            max_seconds
            <input
              className="mt-2 rounded-lg border border-neutral-300 bg-white p-2 text-sm text-neutral-900"
              name="max_seconds"
              type="number"
              min={1}
              step={1}
              defaultValue={60}
            />
            <span className="mt-1 text-[11px] text-neutral-500">処理する最大秒数（デフォルト60秒まで）</span>
          </label>

          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full bg-neutral-900 px-5 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            同期を推定
          </button>
        </form>
      </div>
    </section>
  );
}

