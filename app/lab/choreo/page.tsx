import Link from "next/link";
import { requireChoreoLabAdmin } from "@/lib/lab";

export default async function ChoreoLabPage() {
  await requireChoreoLabAdmin();

  return (
    <section className="mx-auto max-w-4xl space-y-6 py-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Choreo Lab</p>
        <h1 className="text-3xl font-semibold text-neutral-900">振付ラボ</h1>
        <p className="text-sm text-neutral-700">
          管理者向けのPoCです。動画をアップロードし、MediaPipe Poseで骨格ランドマークを抽出します。
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/lab/choreo/pose"
          className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-[2px] hover:shadow-md"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Pose</p>
          <h2 className="mt-1 text-xl font-semibold text-neutral-900">骨格推定</h2>
          <p className="mt-2 text-sm text-neutral-700">
            mp4 / mov をアップロードして、33ランドマークの骨格推定を実行します（最大30秒）。
          </p>
        </Link>

        <Link
          href="/lab/runs"
          className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-[2px] hover:shadow-md"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Logs</p>
          <h2 className="mt-1 text-xl font-semibold text-neutral-900">実行履歴</h2>
          <p className="mt-2 text-sm text-neutral-700">最近の lab_runs を確認します。</p>
        </Link>

        <Link
          href="/lab/choreo/compare"
          className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-[2px] hover:shadow-md"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Choreo</p>
          <h2 className="mt-1 text-xl font-semibold text-neutral-900">振付類似度 (A/B)</h2>
          <p className="mt-2 text-sm text-neutral-700">
            2つの動画の骨格ランドマークを正規化し、コサイン類似度を算出します（参考値）。
          </p>
        </Link>

        <Link
          href="/lab/choreo/compare-dtw"
          className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-[2px] hover:shadow-md"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Choreo</p>
          <h2 className="mt-1 text-xl font-semibold text-neutral-900">振付類似度 (DTW)</h2>
          <p className="mt-2 text-sm text-neutral-700">
            時間ずれを考慮したDTWベースの類似度を計算します（参考値）。
          </p>
        </Link>

        <Link
          href="/lab/choreo/segment"
          className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-[2px] hover:shadow-md"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Choreo</p>
          <h2 className="mt-1 text-xl font-semibold text-neutral-900">フレーズ分割</h2>
          <p className="mt-2 text-sm text-neutral-700">
            動画の骨格動きからエネルギーベースでフレーズ区間を推定します（参考情報）。
          </p>
        </Link>

        <Link
          href="/lab/choreo/phrase-compare"
          className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-[2px] hover:shadow-md"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Choreo</p>
          <h2 className="mt-1 text-xl font-semibold text-neutral-900">フレーズ類似度</h2>
          <p className="mt-2 text-sm text-neutral-700">
            フレーズ単位で動画Aに対する動画BのTop-K候補をマッチングします（参考値）。
          </p>
        </Link>

        <Link
          href="/lab/guide"
          className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-[2px] hover:shadow-md"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Docs</p>
          <h2 className="mt-1 text-xl font-semibold text-neutral-900">Lab Guide</h2>
          <p className="mt-2 text-sm text-neutral-700">Step1〜8 の開発内容と検証方法をまとめています。</p>
        </Link>
      </div>
    </section>
  );
}
