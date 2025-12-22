import { runChoreoSegment } from "./actions";
import { requireChoreoLabAdmin } from "@/lib/lab";

export default async function ChoreoSegmentPage() {
  await requireChoreoLabAdmin();

  return (
    <section className="mx-auto max-w-3xl space-y-6 py-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Choreo Segment</p>
        <h1 className="text-3xl font-semibold text-neutral-900">振付のフレーズ分割 (PoC)</h1>
        <p className="text-sm text-neutral-700">
          mp4 / mov をアップロードし、骨格ランドマークの動きからフレーズ区間を推定します。PoC用途の参考情報です。
        </p>
      </header>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <form action={runChoreoSegment} className="space-y-4">
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

          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-neutral-600">
              sample_fps
              <input
                className="mt-2 rounded-lg border border-neutral-300 bg-white p-2 text-sm text-neutral-900"
                name="sample_fps"
                type="number"
                min={1}
                step={1}
                defaultValue={10}
              />
              <span className="mt-1 text-[11px] text-neutral-500">フレーム間引き用FPS（デフォルト10）</span>
            </label>
            <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-neutral-600">
              max_seconds
              <input
                className="mt-2 rounded-lg border border-neutral-300 bg-white p-2 text-sm text-neutral-900"
                name="max_seconds"
                type="number"
                min={1}
                step={1}
                defaultValue={30}
              />
              <span className="mt-1 text-[11px] text-neutral-500">処理する最大秒数（デフォルト30秒まで）</span>
            </label>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            区間推定は参考情報です。用途に応じて必ず人手で確認してください。
          </div>

          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full bg-neutral-900 px-5 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            区間を推定
          </button>
        </form>
      </div>
    </section>
  );
}
