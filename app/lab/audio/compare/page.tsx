import { runCompare } from "./actions";
import { requireLabAdmin } from "@/lib/lab";

export default async function LabComparePage() {
  await requireLabAdmin();

  return (
    <section className="mx-auto max-w-3xl space-y-6 py-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Speaker Compare</p>
        <h1 className="text-3xl font-semibold text-neutral-900">話者比較（A/B）</h1>
        <p className="text-sm text-neutral-700">
          2つの音声から話者埋め込みを生成し、cosine類似度を計算します。本人一致を保証しない参考値です。
        </p>
      </header>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <form action={runCompare} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-neutral-900">音声A</label>
            <p className="text-xs text-neutral-600">mp3 / wav / m4a / ogg / aac</p>
            <input
              name="fileA"
              type="file"
              accept=".mp3,.wav,.m4a,.ogg,.aac,audio/*"
              required
              className="mt-2 block w-full rounded-lg border border-neutral-300 bg-white p-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-neutral-900">音声B</label>
            <p className="text-xs text-neutral-600">mp3 / wav / m4a / ogg / aac</p>
            <input
              name="fileB"
              type="file"
              accept=".mp3,.wav,.m4a,.ogg,.aac,audio/*"
              required
              className="mt-2 block w-full rounded-lg border border-neutral-300 bg-white p-2 text-sm"
            />
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            本人一致を保証しない参考値です。用途に応じて必ず人手で確認してください。
          </div>

          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full bg-neutral-900 px-5 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            類似度を計算
          </button>
        </form>
      </div>
    </section>
  );
}
