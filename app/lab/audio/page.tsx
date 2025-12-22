import Link from "next/link";
import { requireLabAdmin } from "@/lib/lab";

export default async function AudioLabPage() {
  await requireLabAdmin();

  return (
    <section className="mx-auto max-w-4xl space-y-6 py-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Admin Only</p>
        <h1 className="text-3xl font-semibold text-neutral-900">AI Lab（Audio）</h1>
        <p className="text-sm text-neutral-600">
          Whisper / pyannote を用いた音声系のPoCメニューです。管理者向けに限定されています。
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/lab/audio/asr"
          className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-[2px] hover:shadow-md"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Audio</p>
          <h2 className="mt-1 text-xl font-semibold text-neutral-900">ASR（文字起こし）</h2>
          <p className="mt-2 text-sm text-neutral-700">音声ファイルをアップロードしてWhisperで文字起こしを実行します。</p>
        </Link>

        <Link
          href="/lab/audio/diarize"
          className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-[2px] hover:shadow-md"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Audio</p>
          <h2 className="mt-1 text-xl font-semibold text-neutral-900">話者ダイアリゼーション</h2>
          <p className="mt-2 text-sm text-neutral-700">
            音声を話者ごとに区間分割します（本人一致を保証しない参考情報）。
          </p>
        </Link>

        <Link
          href="/lab/audio/embed"
          className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-[2px] hover:shadow-md"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Audio</p>
          <h2 className="mt-1 text-xl font-semibold text-neutral-900">話者埋め込み</h2>
          <p className="mt-2 text-sm text-neutral-700">
            音声から話者埋め込みベクトルを生成します（本人一致を保証しない参考情報）。
          </p>
        </Link>

        <Link
          href="/lab/audio/compare"
          className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-[2px] hover:shadow-md"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Audio</p>
          <h2 className="mt-1 text-xl font-semibold text-neutral-900">話者比較 (A/B)</h2>
          <p className="mt-2 text-sm text-neutral-700">
            2つの音声の話者埋め込み類似度を計算します（本人一致を保証しない参考値）。
          </p>
        </Link>

        <Link
          href="/lab/audio/asr-diarize"
          className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-[2px] hover:shadow-md"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Audio</p>
          <h2 className="mt-1 text-xl font-semibold text-neutral-900">ASR × 話者推定</h2>
          <p className="mt-2 text-sm text-neutral-700">
            文字起こしと話者ダイアリゼーションを同時実行し、セグメントに推定話者ラベルを付与します（参考情報）。
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
          <p className="mt-2 text-sm text-neutral-700">Step1〜8 の開発内容と検証方法をまとめています。</p>
        </Link>
      </div>
    </section>
  );
}
