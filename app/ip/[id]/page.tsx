"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import type { IPAsset, UserProfile } from "@/lib/types";

const imageExt = ["png", "jpg", "jpeg", "gif", "webp"];
const audioExt = ["mp3", "wav", "aac", "ogg", "m4a"];
const videoExt = ["mp4", "mov", "webm"];

export default function IPDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [asset, setAsset] = useState<IPAsset | null>(null);
  const [creator, setCreator] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // id がまだ取れていない初期レンダリングをスキップ
    if (!id) return;

    const loadAsset = async () => {
      setLoading(true);
      setError(null);

      console.log("IPDetailPage id from useParams:", id);

      const { data, error } = await supabaseClient
        .from("ip_assets")
        .select("*")
        .eq("id", id)
        .single<IPAsset>();

      console.log("Supabase ip_assets result:", { data, error });

      if (error || !data) {
        setError(error?.message ?? "Asset not found.");
        setLoading(false);
        return;
      }

      setAsset(data);

      const { data: creatorData, error: creatorError } = await supabaseClient
        .from("users")
        .select("*")
        .eq("id", data.creator_id)
        .single<UserProfile>();

      if (creatorError) {
        console.log("creator fetch error:", creatorError);
      }

      setCreator(creatorData ?? null);
      setLoading(false);
    };

    loadAsset();
  }, [id]);

  const previewType = useMemo(() => {
    if (!asset) return "link";
    const ext = asset.file_url.split(".").pop()?.toLowerCase() ?? "";
    if (imageExt.includes(ext)) return "image";
    if (audioExt.includes(ext)) return "audio";
    if (videoExt.includes(ext)) return "video";
    return "link";
  }, [asset]);

  if (!id) {
    return <p className="mt-10 text-slate-300">Loading route…</p>;
  }

  if (loading) {
    return <p className="mt-10 text-slate-300">Loading asset…</p>;
  }

  if (error || !asset) {
    return (
      <div className="mt-10 space-y-3 text-slate-300">
        <p>{error}</p>
        <button
          onClick={() => router.push("/ip")}
          className="text-emerald-300 underline"
        >
          Back to list
        </button>
      </div>
    );
  }

  return (
    <section className="space-y-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">
            {asset.category}
          </p>
          <h1 className="text-3xl font-semibold text-white">{asset.title}</h1>
          {creator && (
            <p className="text-sm text-slate-400">
              Creator: {creator.email} ({creator.role})
            </p>
          )}
        </div>
        <Link
          href={`/ip/${asset.id}/inquire`}
          className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-black"
        >
          Request license
        </Link>
      </div>
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-lg font-semibold text-white">Preview</h2>
        <div className="mt-4">
          {previewType === "image" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={asset.file_url}
              alt={asset.title}
              className="max-h-96 w-full rounded-xl object-contain"
            />
          )}
          {previewType === "audio" && (
            <audio controls className="w-full">
              <source src={asset.file_url} />
              Your browser does not support audio.
            </audio>
          )}
          {previewType === "video" && (
            <video controls className="w-full rounded-xl">
              <source src={asset.file_url} />
              Your browser does not support video.
            </video>
          )}
          {previewType === "link" && (
            <a
              href={asset.file_url}
              target="_blank"
              rel="noreferrer"
              className="text-emerald-300 underline"
            >
              Open asset
            </a>
          )}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h3 className="text-lg font-semibold text-white">Usage terms</h3>
          <p className="mt-2 text-sm text-slate-300">
            {asset.terms?.preset ?? "Not provided"}
          </p>
          {asset.terms?.notes && (
            <p className="mt-1 text-sm text-slate-400">{asset.terms.notes}</p>
          )}
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h3 className="text-lg font-semibold text-white">Price range</h3>
          <p className="mt-2 text-sm text-slate-300">
            {asset.price_min && asset.price_max
              ? `$${asset.price_min}–$${asset.price_max}`
              : "Discuss with creator"}
          </p>
        </div>
      </div>
      {asset.description && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h3 className="text-lg font-semibold text-white">Description</h3>
          <p className="mt-2 text-sm text-slate-300">{asset.description}</p>
        </div>
      )}
    </section>
  );
}
