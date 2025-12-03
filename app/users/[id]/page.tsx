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
        setError("Profile not found.");
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
        setError("Profile not found.");
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
  }, [userId]);

  if (loading) {
    return <p className="mt-10 text-sm text-neutral-600">Loading profile…</p>;
  }

  if (error || !profile) {
    return (
      <div className="mt-10 space-y-4 text-neutral-800">
        <p>{error ?? "Profile not found."}</p>
        <button
          onClick={() => router.push("/ip")}
          className="rounded-full border border-neutral-900 px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-100"
        >
          Back to IP catalog
        </button>
      </div>
    );
  }

  const heading =
    profile.role === "creator"
      ? "Creator profile"
      : profile.role === "company"
        ? "Company profile"
        : "User profile";

  return (
    <section className="mx-auto mt-8 max-w-3xl space-y-6 rounded-2xl border border-neutral-200 bg-white p-8">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
          Public profile
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold text-neutral-900">{heading}</h1>
          {viewerIsOwner && (
            <span className="rounded-full border border-neutral-900 px-3 py-1 text-xs uppercase tracking-wide text-neutral-900">
              This is you
            </span>
          )}
        </div>
        <p className="text-sm text-neutral-600">{profile.email}</p>
        <p className="text-sm text-neutral-600">Role: {profile.role}</p>
      </header>

      {profile.role === "company" ? (
        <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-6">
          <h2 className="text-base font-semibold text-neutral-900">
            About this company
          </h2>
          <p className="text-sm text-neutral-700">
            This company uses IP Connect to discover creators and request
            licensing deals. Public company bios will appear here in future
            versions.
          </p>
          <Link
            href="/ip"
            className="inline-flex rounded-full border border-neutral-900 px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-100"
          >
            Browse IP catalog
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2 rounded-2xl border border-neutral-200 bg-white p-6">
            <h2 className="text-base font-semibold text-neutral-900">
              Published IP assets
            </h2>
            {assets.length === 0 ? (
              <p className="text-sm text-neutral-700">
                This creator has not published any IP assets yet.
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
                          ? `$${asset.price_min}–$${asset.price_max}`
                          : "Price TBD"}
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
                      View asset
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
