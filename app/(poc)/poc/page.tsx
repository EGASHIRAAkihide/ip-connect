import Link from "next/link";

export default function PocHomePage() {
  return (
    <section className="mx-auto max-w-4xl space-y-6 py-8">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">PoC</p>
        <h1 className="text-3xl font-semibold text-neutral-900">PoC機能一覧</h1>
        <p className="text-sm text-neutral-600">
          最小構成の機能のみを整理して提供します。
        </p>
      </header>

      <div className="grid gap-4 rounded-2xl border border-neutral-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-neutral-900">企業向け</p>
            <p className="text-sm text-neutral-600">
              振付チェックの登録と結果確認
            </p>
          </div>
          <Link
            href="/company/choreo-checks"
            className="rounded-full border border-neutral-900 px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-900 hover:text-white"
          >
            Choreo Checks
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 opacity-50">
          <div>
            <p className="text-sm font-semibold text-neutral-900">将来追加予定</p>
            <p className="text-sm text-neutral-600">順次拡張予定です。</p>
          </div>
          <button
            type="button"
            disabled
            className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-500"
          >
            Coming Soon
          </button>
        </div>
      </div>

      <p className="text-xs text-neutral-500">
        本ページはPoC検証のための最小構成です。
      </p>
    </section>
  );
}
