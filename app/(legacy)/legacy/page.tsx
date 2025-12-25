import Link from "next/link";

export default function LegacyPage() {
  return (
    <section className="mx-auto max-w-4xl space-y-6 py-8">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
          Legacy
        </p>
        <h1 className="text-3xl font-semibold text-neutral-900">
          旧画面（Legacy）
        </h1>
        <p className="text-sm text-neutral-600">
          PoC検証中のため、旧画面はこのページからアクセスしてください。
        </p>
      </header>

      <div className="grid gap-4 rounded-2xl border border-neutral-200 bg-white p-6">
        <div className="space-y-1 text-sm text-neutral-700">
          <p className="font-semibold text-neutral-900">
            旧導線リンク集（最小）
          </p>
          <p className="text-neutral-600">
            通常導線からは非表示にしています。必要な場合のみ利用してください。
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-neutral-900">企業向け</p>
            <p className="text-sm text-neutral-600">問い合わせや分析の旧画面</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/ip"
              className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-semibold text-neutral-800 hover:border-neutral-900"
            >
              IP一覧
            </Link>
            <Link
              href="/company/inquiries"
              className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-semibold text-neutral-800 hover:border-neutral-900"
            >
              自社の問い合わせ
            </Link>
            <Link
              href="/analytics"
              className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-semibold text-neutral-800 hover:border-neutral-900"
            >
              分析
            </Link>
            <Link
              href="/users/[id]"
              className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-semibold text-neutral-800 hover:border-neutral-900"
            >
              マイページ
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-neutral-900">
              クリエイター向け
            </p>
            <p className="text-sm text-neutral-600">登録・問い合わせの旧画面</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/creator/dashboard"
              className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-semibold text-neutral-800 hover:border-neutral-900"
            >
              ダッシュボード
            </Link>
            <Link
              href="/creator/ip/new"
              className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-semibold text-neutral-800 hover:border-neutral-900"
            >
              IP登録
            </Link>
            <Link
              href="/creator/inquiries"
              className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-semibold text-neutral-800 hover:border-neutral-900"
            >
              問い合わせ受信箱
            </Link>
          </div>
        </div>
      </div>

      <p className="text-xs text-neutral-500">
        旧機能は段階的に整理予定です。
      </p>
    </section>
  );
}
