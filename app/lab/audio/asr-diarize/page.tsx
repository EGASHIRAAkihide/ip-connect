import { runAsrDiarize } from "./actions";
import { requireLabAdmin } from "@/lib/lab";

export default async function LabAsrDiarizePage() {
  await requireLabAdmin();

  return (
    <section className="mx-auto max-w-3xl space-y-6 py-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">ASR × Diarize</p>
        <h1 className="text-3xl font-semibold text-neutral-900">文字起こし + 話者推定</h1>
        <p className="text-sm text-neutral-700">
          WhisperのASRと話者ダイアリゼーションを同時に実行し、セグメントに推定話者ラベルを付与します。話者割当は推定の参考情報です。
        </p>
      </header>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <form action={runAsrDiarize} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-neutral-900">音声ファイル</label>
            <p className="text-xs text-neutral-600">mp3 / wav / m4a / ogg / aac をサポート</p>
            <input
              name="file"
              type="file"
              accept=".mp3,.wav,.m4a,.ogg,.aac,audio/*"
              required
              className="mt-2 block w-full rounded-lg border border-neutral-300 bg-white p-2 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-neutral-900">言語</label>
            <p className="text-xs text-neutral-600">auto は自動判定</p>
            <select
              name="language"
              defaultValue="auto"
              className="mt-2 block w-full rounded-lg border border-neutral-300 bg-white p-2 text-sm"
            >
              <option value="auto">自動判定</option>
              <option value="ja">日本語</option>
              <option value="en">英語</option>
            </select>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            話者割当は推定の参考情報です。本人一致を保証しないため、用途に応じて必ず人手で確認してください。
          </div>

          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full bg-neutral-900 px-5 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            実行する
          </button>
        </form>
      </div>
    </section>
  );
}
