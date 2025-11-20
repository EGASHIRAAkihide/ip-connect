'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import type { IPAsset, UserProfile } from "@/lib/types";

export default function CreatorDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [assets, setAssets] = useState<IPAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAssets = async () => {
      setLoading(true);
      setError(null);
      const {
        data: { user },
      } = await supabaseClient.auth.getUser();

      if (!user) {
        router.replace("/auth/login");
        return;
      }

      const { data: profileData, error: profileError } = await supabaseClient
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single<UserProfile>();

      if (profileError || !profileData) {
        setError("Profile missing. Please register again.");
        setLoading(false);
        return;
      }

      if (profileData.role !== "creator") {
        router.replace("/ip");
        setLoading(false);
        return;
      }

      setProfile(profileData);

      const { data: assetsData, error: assetsError } = await supabaseClient
        .from("ip_assets")
        .select("*")
        .eq("creator_id", profileData.id)
        .order("created_at", { ascending: false });

      if (assetsError) {
        setError(assetsError.message);
        setLoading(false);
        return;
      }

      setAssets(assetsData as IPAsset[]);
      setLoading(false);
    };

    loadAssets();
  }, [router]);

  const handleSignOut = async () => {
    await supabaseClient.auth.signOut();
    router.replace("/auth/login");
  };

  if (loading) {
    return <p className="mt-10 text-slate-300">Loading dashboard…</p>;
  }

  if (error) {
    return (
      <p className="mt-10 text-sm text-amber-300" role="alert">
        {error}
      </p>
    );
  }

  return (
    <section className="space-y-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">Logged in as</p>
          <h1 className="text-3xl font-semibold text-white">{profile?.email}</h1>
        </div>
        <div className="flex gap-3">
          <Link
            href="/creator/ip/new"
            className="rounded-full bg-emerald-500 px-4 py-2 font-medium text-black"
          >
            New IP
          </Link>
          <button
            onClick={handleSignOut}
            className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-200"
          >
            Log out
          </button>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-lg font-semibold text-white">Your IP Assets</h2>
        {assets.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">
            No assets yet. Click “New IP” to add your first entry.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {assets.map((asset) => (
              <li
                key={asset.id}
                className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm uppercase text-slate-400">
                      {asset.category}
                    </p>
                    <h3 className="text-xl font-semibold text-white">
                      {asset.title}
                    </h3>
                  </div>
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs uppercase tracking-wide text-slate-300">
                    {asset.price_min && asset.price_max
                      ? `$${asset.price_min}–$${asset.price_max}`
                      : "Price TBD"}
                  </span>
                </div>
                {asset.description && (
                  <p className="mt-2 text-sm text-slate-400">
                    {asset.description}
                  </p>
                )}
                <Link
                  href={`/ip/${asset.id}`}
                  className="mt-3 inline-flex text-sm text-emerald-300 underline"
                >
                  View public page
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

