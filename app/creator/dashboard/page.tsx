import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getServerUserWithRole } from "@/lib/auth";

type CreatorAsset = {
  id: string;
  title: string;
  asset_type: string | null;
  category: string | null;
  created_at: string | null;
};

export default async function CreatorDashboardPage() {
  const { user, role } = await getServerUserWithRole();

  if (!user) {
    redirect("/auth/login");
  }

  if (role !== "creator") {
    redirect("/ip");
  }

  const supabase = await createServerClient();
  const { data: assets } = await supabase
    .from("ip_assets")
    .select("id, title, asset_type, type, category, created_at")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false });

  const typedAssets: CreatorAsset[] = (assets ?? []).map((asset) => ({
    id: String((asset as { id: string }).id),
    title: String((asset as { title?: string }).title ?? "Untitled"),
    asset_type:
      (asset as { asset_type?: string | null }).asset_type ??
      (asset as { type?: string | null }).type ??
      null,
    category: (asset as { category?: string | null }).category ?? null,
    created_at: (asset as { created_at?: string | null }).created_at ?? null,
  }));

  return (
    <section className="mx-auto max-w-5xl space-y-8 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-neutral-600">{user.email ?? "クリエイター"}</p>
          <h1 className="text-3xl font-semibold text-neutral-900">クリエイターダッシュボード</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/creator/ip/new"
            className="inline-flex items-center rounded-full border border-neutral-900 px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-900 hover:text-white"
          >
            IPを登録
          </Link>
          <Link
            href="/creator/voice/new"
            className="inline-flex items-center rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800 hover:border-neutral-900"
          >
            声IPを登録
          </Link>
        </div>
      </header>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-neutral-900">あなたのIP</h2>
          <p className="text-xs text-neutral-500">
            {typedAssets.length === 0 ? "まだありません" : `${typedAssets.length} 件`}
          </p>
        </div>

        {typedAssets.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-neutral-200 p-6 text-sm text-neutral-700">
            <p>まだIPを公開していません。</p>
            <Link
              href="/creator/ip/new"
              className="mt-3 inline-flex rounded-full border border-neutral-900 px-3 py-1 text-xs font-semibold text-neutral-900 hover:bg-neutral-900 hover:text-white"
            >
              最初のIPを登録
            </Link>
            <Link
              href="/creator/voice/new"
              className="mt-2 inline-flex rounded-full border border-neutral-300 px-3 py-1 text-xs font-semibold text-neutral-800 hover:border-neutral-900"
            >
              声のIPを登録
            </Link>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-neutral-200">
            {typedAssets.map((asset) => {
              const created =
                asset.created_at && !Number.isNaN(Date.parse(asset.created_at))
                  ? new Date(asset.created_at).toLocaleDateString()
                  : "—";
              const typeLabel =
                asset.asset_type === "voice"
                  ? "声"
                  : asset.asset_type === "choreography"
                    ? "振付"
                    : asset.asset_type ?? "IP";
              return (
                <li
                  key={asset.id}
                  className="flex flex-wrap items-center gap-3 py-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm uppercase tracking-wide text-neutral-500">
                      {typeLabel}
                    </p>
                    <h3 className="text-lg font-semibold text-neutral-900">
                      {asset.title}
                    </h3>
                    <p className="text-xs text-neutral-500">
                      カテゴリ: {asset.category ?? "—"} · 作成日: {created}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/ip/${asset.id}`}
                      className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-semibold text-neutral-800 hover:border-neutral-900"
                    >
                      詳細
                    </Link>
                    <Link
                      href={`/creator/ip/${asset.id}/edit`}
                      className="rounded-full border border-neutral-900 px-3 py-1 text-xs font-semibold text-neutral-900 hover:bg-neutral-900 hover:text-white"
                    >
                      編集
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
