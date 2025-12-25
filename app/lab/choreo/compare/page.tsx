import { runChoreoCompare } from "./actions";
import { requireChoreoLabAdmin } from "@/lib/lab";

export default async function ChoreoComparePage() {
  await requireChoreoLabAdmin();

  return (
    <section className="mx-auto max-w-3xl space-y-6 py-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Choreo Compare</p>
        <h1 className="text-3xl font-semibold text-neutral-900">振付比較（DTW）</h1>
        <p className="text-sm text-neutral-700">
          mp4 / mov の2動画をアップロードし、骨格ランドマークをDTWで比較します。PoC用途の参考値です。
        </p>
      </header>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <form action={runChoreoCompare} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-neutral-900">動画A</label>
              <p className="text-xs text-neutral-600">mp4 / mov</p>
              <input
                name="fileA"
                type="file"
                accept=".mp4,.mov,video/*"
                required
                className="mt-2 block w-full rounded-lg border border-neutral-300 bg-white p-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-neutral-900">動画B</label>
              <p className="text-xs text-neutral-600">mp4 / mov</p>
              <input
                name="fileB"
                type="file"
                accept=".mp4,.mov,video/*"
                required
                className="mt-2 block w-full rounded-lg border border-neutral-300 bg-white p-2 text-sm"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-neutral-600">
              backend
              <select
                className="mt-2 rounded-lg border border-neutral-300 bg-white p-2 text-sm text-neutral-900"
                name="backend"
                defaultValue="mediapipe"
              >
                <option value="mediapipe">mediapipe</option>
                <option value="mmpose">mmpose</option>
                <option value="openpose">openpose</option>
              </select>
              <span className="mt-1 text-[11px] text-neutral-500">実行に使うPose backend</span>
            </label>
            <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-neutral-600">
              sample_fps
              <input
                className="mt-2 rounded-lg border border-neutral-300 bg-white p-2 text-sm text-neutral-900"
                name="sample_fps"
                type="number"
                min={1}
                step={1}
                defaultValue={15}
              />
              <span className="mt-1 text-[11px] text-neutral-500">フレーム間引き用のFPS（デフォルト15）</span>
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
            類似度は骨格ランドマークを用いた参考値です。用途に応じて必ず人手で確認してください。
          </div>

          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full bg-neutral-900 px-5 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            DTW比較を実行
          </button>
        </form>
      </div>
    </section>
  );
}
