import { requireCompany } from "@/lib/auth";

export default async function CompanyChoreoChecksNewPage() {
  await requireCompany();

  return (
    <section className="mx-auto max-w-3xl space-y-6 py-8">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
          企業ダッシュボード
        </p>
        <h1 className="text-3xl font-semibold text-neutral-900">新規 Choreo Check</h1>
        <p className="text-sm text-neutral-600">
          振付動画を登録してチェックを開始する画面です（準備中）。
        </p>
      </header>

      <form
        action="/api/choreo-checks"
        method="post"
        encType="multipart/form-data"
        className="space-y-4 rounded-2xl border border-dashed border-neutral-200 bg-white p-6 text-sm text-neutral-700"
      >
        <div className="space-y-2">
          <p className="font-semibold text-neutral-900">動画アップロード</p>
          <input
            type="file"
            name="file"
            accept="video/mp4"
            required
            className="block w-full text-sm text-neutral-700"
          />
          <p className="text-xs text-neutral-500">
            mp4のみ対応。50MB以内を推奨します。
          </p>
        </div>
        <div className="space-y-1 rounded-xl border border-neutral-100 bg-neutral-50 p-3 text-xs text-neutral-600">
          <p>本チェックは参考情報の提供を目的としています。</p>
          <p>法的判断・権利侵害の断定を行うものではありません。</p>
        </div>
        <button
          type="submit"
          className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
        >
          アップロードしてチェック開始
        </button>
      </form>
    </section>
  );
}
