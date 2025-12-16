"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import type { IPAsset, UserProfile } from "@/lib/types";

export default function UserProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const userId = useMemo(() => {
    const raw = params?.id;
    if (!raw) return null;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);
  const supabase = useMemo(() => createBrowserClient(), []);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [assets, setAssets] = useState<IPAsset[]>([]);
  const [viewerIsOwner, setViewerIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (!userId) {
        setError("プロフィールが見つかりません。");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single<UserProfile>();

      if (error || !data) {
        setError("プロフィールが見つかりません。");
        setLoading(false);
        return;
      }

      setProfile(data);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      setViewerIsOwner(user?.id === data.id);

      if (data.role === "creator") {
        const { data: assetData } = await supabase
          .from("ip_assets")
          .select("*")
          .eq("creator_id", data.id)
          .order("created_at", { ascending: false });

        setAssets((assetData as IPAsset[]) ?? []);
      }

      setLoading(false);
    };

    loadProfile();
  }, [supabase, userId]);

  if (loading) {
    return <p className="mt-10 text-sm text-neutral-600">プロフィールを読み込み中…</p>;
  }

  if (error || !profile) {
    return (
      <div className="mt-10 space-y-4 text-neutral-800">
        <p>{error ?? "プロフィールが見つかりません。"}</p>
        <button
          onClick={() => router.push("/ip")}
          className="rounded-full border border-neutral-900 px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-100"
        >
          IP一覧へ戻る
        </button>
      </div>
    );
  }

  const heading =
    profile.role === "creator"
      ? "クリエイタープロフィール"
      : profile.role === "company"
        ? "企業プロフィール"
        : "ユーザープロフィール";

  return (
    <section className="mx-auto mt-8 max-w-3xl space-y-6 rounded-2xl border border-neutral-200 bg-white p-8">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
          公開プロフィール
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold text-neutral-900">{heading}</h1>
          {viewerIsOwner && (
            <span className="rounded-full border border-neutral-900 px-3 py-1 text-xs uppercase tracking-wide text-neutral-900">
              自分のアカウント
            </span>
          )}
        </div>
        <p className="text-sm text-neutral-600">{profile.email}</p>
        <p className="text-sm text-neutral-600">ロール: {profile.role}</p>
      </header>

      {profile.role === "company" ? (
        <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-6">
          <h2 className="text-base font-semibold text-neutral-900">
            企業について
          </h2>
          <p className="text-sm text-neutral-700">
            この企業はIP Connectを使ってクリエイターを探し、ライセンス利用を相談しています。
            企業紹介は今後ここに表示されます。
          </p>
          <Link
            href="/ip"
            className="inline-flex rounded-full border border-neutral-900 px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-100"
          >
            IPを探す
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2 rounded-2xl border border-neutral-200 bg-white p-6">
            <h2 className="text-base font-semibold text-neutral-900">
              公開中のIP
            </h2>
            {assets.length === 0 ? (
              <p className="text-sm text-neutral-700">
                このクリエイターはまだIPを公開していません。
              </p>
            ) : (
              <ul className="space-y-3">
                {assets.map((asset) => (
                  <li
                    key={asset.id}
                    className="rounded-xl border border-neutral-200 bg-white p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-neutral-500">
                          {asset.category}
                        </p>
                        <h3 className="text-lg font-semibold text-neutral-900">
                          {asset.title}
                        </h3>
                      </div>
                      <span className="text-sm text-neutral-700">
                        {asset.price_min && asset.price_max
                          ? `¥${asset.price_min.toLocaleString()}〜¥${asset.price_max.toLocaleString()}`
                          : "価格未設定"}
                      </span>
                    </div>
                    {asset.description && (
                      <p className="mt-2 text-sm text-neutral-700 line-clamp-3">
                        {asset.description}
                      </p>
                    )}
                    <Link
                      href={`/ip/${asset.id}`}
                      className="mt-3 inline-flex text-sm text-neutral-900 underline"
                    >
                      IP詳細を見る
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
