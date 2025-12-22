import Link from "next/link";
import { requireLabAdmin } from "@/lib/lab";

async function getHealth() {
  const aiUrl = process.env.AI_SERVICE_URL;
  if (!aiUrl) return { ok: false, message: "AI_SERVICE_URL 未設定" };

  try {
    const res = await fetch(`${aiUrl}/health`, { cache: "no-store" });
    if (!res.ok) {
      return { ok: false, message: `AIサービス応答エラー (${res.status})` };
    }
    const json = await res.json();
    return { ok: Boolean(json?.ok), message: "OK" };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "不明なエラー" };
  }
}

export default async function LabHomePage() {
  await requireLabAdmin();
  const health = await getHealth();

  return (
    <section className="mx-auto max-w-4xl space-y-6 py-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Admin Only</p>
        <h1 className="text-3xl font-semibold text-neutral-900">AI Lab</h1>
        <p className="text-sm text-neutral-600">
          カテゴリを選んで実験メニューに進んでください。管理者限定のPoC機能です。
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/lab/audio"
          className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:-translate-y-[2px] hover:shadow-md"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Category</p>
          <h2 className="mt-1 text-2xl font-semibold text-neutral-900">Audio Lab</h2>
          <p className="mt-2 text-sm text-neutral-700">
            Whisper や pyannote を用いた音声系の実験メニューへ。
          </p>
        </Link>

        <Link
          href="/lab/choreo"
          className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:-translate-y-[2px] hover:shadow-md"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Category</p>
          <h2 className="mt-1 text-2xl font-semibold text-neutral-900">Choreo Lab</h2>
          <p className="mt-2 text-sm text-neutral-700">
            MediaPipe Pose などの振付系実験メニューへ。
          </p>
        </Link>

        <Link
          href="/lab/multimodal"
          className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-[2px] hover:shadow-md"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Multimodal</p>
          <h2 className="mt-1 text-xl font-semibold text-neutral-900">Audio × Choreo</h2>
          <p className="mt-2 text-sm text-neutral-700">音声ピークと動きピークの整合を検証するPoCです。</p>
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

      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h3 className="text-base font-semibold text-neutral-900">AIサービスの状態</h3>
        <p className="mt-2 text-sm">
          {health.ok ? (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
              稼働中
            </span>
          ) : (
            <span className="rounded-full bg-rose-50 px-3 py-1 text-sm font-semibold text-rose-700">
              非稼働
            </span>
          )}
        </p>
        <p className="mt-2 text-sm text-neutral-700">AI_SERVICE_URL: {process.env.AI_SERVICE_URL ?? "未設定"}</p>
        {!health.ok && (
          <p className="mt-1 text-sm text-rose-600">ヘルスチェックエラー: {health.message}</p>
        )}
      </div>
    </section>
  );
}
