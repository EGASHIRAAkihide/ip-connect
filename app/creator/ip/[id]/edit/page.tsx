"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/client";
import { updateAsset } from "./actions";
import {
  IP_CATEGORIES,
  TERM_PRESETS,
  type ChoreoMetadata,
  type IPAsset,
  type UserProfile,
  type VoiceMetadata,
} from "@/lib/types";

const STORAGE_BUCKET = "ip-assets";

type AssetType = "choreography" | "voice";

export default function EditIPPage() {
  const params = useParams<{ id: string }>();
  const assetId = useMemo(() => {
    const raw = params?.id;
    if (!raw) return null;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);

  const router = useRouter();
  const supabase = useMemo(() => createBrowserClient(), []);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [asset, setAsset] = useState<IPAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [assetType, setAssetType] = useState<AssetType>("choreography");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] =
    useState<(typeof IP_CATEGORIES)[number]["value"]>("voice");
  const [usagePreset, setUsagePreset] =
    useState<(typeof TERM_PRESETS)[number]>(TERM_PRESETS[0]);
  const [usageNotes, setUsageNotes] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [existingFileUrl, setExistingFileUrl] = useState<string | null>(null);

  const [choreographyBpm, setChoreographyBpm] = useState("");
  const [choreographyLengthSeconds, setChoreographyLengthSeconds] =
    useState("");
  const [choreographyStyle, setChoreographyStyle] = useState("");

  const [voiceLanguage, setVoiceLanguage] = useState("");
  const [voiceGender, setVoiceGender] = useState("");
  const [voiceTone, setVoiceTone] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!assetId) return;
      setLoading(true);
      setMessage(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/auth/login");
        return;
      }

      const { data: profileData } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single<UserProfile>();

      if (!profileData || profileData.role !== "creator") {
        router.replace("/ip");
        return;
      }

      setProfile(profileData);

      const { data: assetData, error } = await supabase
        .from("ip_assets")
        .select("*")
        .eq("id", assetId)
        .single<IPAsset>();

      if (error || !assetData) {
        setMessage("Asset not found.");
        setLoading(false);
        return;
      }

      if (assetData.creator_id !== profileData.id) {
        setMessage("You do not have permission to edit this asset.");
        setLoading(false);
        return;
      }

      setAsset(assetData);
      setAssetType((assetData.asset_type as AssetType) ?? "choreography");
      setTitle(assetData.title ?? "");
      setDescription(assetData.description ?? "");
      setCategory(
        (assetData.category as (typeof IP_CATEGORIES)[number]["value"]) ??
          "voice",
      );
      setExistingFileUrl(assetData.file_url ?? null);
      setPriceMin(
        assetData.price_min !== null && assetData.price_min !== undefined
          ? String(assetData.price_min)
          : "",
      );
      setPriceMax(
        assetData.price_max !== null && assetData.price_max !== undefined
          ? String(assetData.price_max)
          : "",
      );

      const terms = assetData.terms as any;
      if (terms?.preset && TERM_PRESETS.includes(terms.preset)) {
        setUsagePreset(terms.preset);
      }
      if (terms?.notes) {
        setUsageNotes(String(terms.notes));
      }

      const metadata = assetData.metadata;
      if (metadata?.type === "choreography") {
        const choreoMeta = metadata as ChoreoMetadata;
        setChoreographyBpm(
          choreoMeta.bpm !== null && choreoMeta.bpm !== undefined
            ? String(choreoMeta.bpm)
            : "",
        );
        setChoreographyLengthSeconds(
          choreoMeta.length_seconds !== null &&
            choreoMeta.length_seconds !== undefined
            ? String(choreoMeta.length_seconds)
            : "",
        );
        setChoreographyStyle(choreoMeta.style ?? "");
      } else if (metadata?.type === "voice") {
        const voiceMeta = metadata as VoiceMetadata;
        setVoiceLanguage(voiceMeta.language ?? "");
        setVoiceGender(voiceMeta.gender ?? "");
        setVoiceTone(voiceMeta.tone ?? "");
      }

      setLoading(false);
    };

    void load();
  }, [assetId, supabase, router]);

  const uploadFile = async () => {
    if (!file || !profile) return existingFileUrl ?? "";

    const path = `${profile.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, {
        upsert: true,
        contentType: file.type || "application/octet-stream",
      });

    if (error) {
      throw new Error(error.message);
    }

    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!baseUrl) {
      throw new Error("Supabase URL is not configured.");
    }

    return `${baseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile || !assetId) {
      setMessage("Profile not loaded.");
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      let fileUrl = existingFileUrl ?? "";
      if (file) {
        fileUrl = await uploadFile();
      }

      if (!fileUrl) {
        throw new Error("File is required.");
      }

      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("category", category);
      formData.append("file_url", fileUrl);
      formData.append("asset_type", assetType);

      formData.append(
        "terms",
        JSON.stringify({
          preset: usagePreset,
          ...(usageNotes ? { notes: usageNotes } : {}),
        }),
      );

      if (priceMin) formData.append("price_min", priceMin);
      if (priceMax) formData.append("price_max", priceMax);

      if (assetType === "choreography") {
        if (choreographyBpm) {
          formData.append("choreography_bpm", choreographyBpm);
        }
        if (choreographyLengthSeconds) {
          formData.append(
            "choreography_length_seconds",
            choreographyLengthSeconds,
          );
        }
        if (choreographyStyle) {
          formData.append("choreography_style", choreographyStyle);
        }
      } else {
        if (voiceLanguage) formData.append("voice_language", voiceLanguage);
        if (voiceGender) formData.append("voice_gender", voiceGender);
        if (voiceTone) formData.append("voice_tone", voiceTone);
      }

      await updateAsset(assetId, formData);
      setMessage("IP asset updated.");
      router.push(`/ip/${assetId}`);
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const fileAccept = assetType === "choreography" ? "video/*" : "audio/*";

  if (loading) {
    return <p className="mt-8 text-sm text-neutral-600">Loading asset…</p>;
  }

  if (!assetId || !asset) {
    return (
      <div className="mt-8 space-y-3 text-neutral-800">
        <p>Asset not found.</p>
        <Link
          href="/creator/dashboard"
          className="text-sm text-neutral-900 underline"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <section className="mx-auto mt-8 max-w-3xl rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-neutral-600">Creator</p>
          <h1 className="text-3xl font-semibold text-neutral-900">
            Edit IP Asset
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            Update details for your choreography or voice asset.
          </p>
        </div>
        <Link
          href={`/ip/${assetId}`}
          className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-semibold text-neutral-800 hover:border-neutral-900"
        >
          View public page
        </Link>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-neutral-800">
          Asset type *
          <select
            className="mt-2 w-full rounded-lg border border-neutral-300 bg-white p-2 text-neutral-900"
            value={assetType}
            onChange={(event) =>
              setAssetType(event.target.value as AssetType)
            }
          >
            <option value="choreography">Choreography（ダンス振付）</option>
            <option value="voice">Voice（声・ナレーション）</option>
          </select>
        </label>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <label className="block text-sm font-medium text-neutral-800">
          Title *
          <input
            required
            className="mt-2 w-full rounded-lg border border-neutral-300 bg-white p-2 text-neutral-900"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>

        <label className="block text-sm font-medium text-neutral-800">
          Description
          <textarea
            className="mt-2 w-full rounded-lg border border-neutral-300 bg-white p-2 text-neutral-900"
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>

        <label className="block text-sm font-medium text-neutral-800">
          Category *
          <select
            className="mt-2 w-full rounded-lg border border-neutral-300 bg-white p-2 text-neutral-900"
            value={category}
            onChange={(event) =>
              setCategory(
                event.target.value as (typeof IP_CATEGORIES)[number]["value"],
              )
            }
          >
            {IP_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium text-neutral-800">
          Media file
          <input
            type="file"
            accept={fileAccept}
            className="mt-2 w-full text-sm text-neutral-800"
            onChange={(event) => {
              const selected = event.target.files?.[0];
              setFile(selected ?? null);
            }}
          />
          <p className="mt-1 text-xs text-neutral-500">
            {assetType === "choreography"
              ? "Upload a video file for the choreography."
              : "Upload an audio file for the voice / narration."}
          </p>
          {existingFileUrl && (
            <p className="mt-1 text-xs text-neutral-600">
              Current file:{" "}
              <a
                href={existingFileUrl}
                className="underline"
                target="_blank"
                rel="noreferrer"
              >
                {existingFileUrl}
              </a>
            </p>
          )}
        </label>

        <label className="block text-sm font-medium text-neutral-800">
          Usage terms preset
          <select
            className="mt-2 w-full rounded-lg border border-neutral-300 bg-white p-2 text-neutral-900"
            value={usagePreset}
            onChange={(event) =>
              setUsagePreset(
                event.target.value as (typeof TERM_PRESETS)[number],
              )
            }
          >
            {TERM_PRESETS.map((preset) => (
              <option key={preset} value={preset}>
                {preset}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium text-neutral-800">
          Additional usage notes
          <textarea
            className="mt-2 w-full rounded-lg border border-neutral-300 bg-white p-2 text-neutral-900"
            rows={3}
            value={usageNotes}
            onChange={(event) => setUsageNotes(event.target.value)}
            placeholder="Optional clarifications for companies"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium text-neutral-800">
            Price min (USD)
            <input
              type="number"
              min="0"
              className="mt-2 w-full rounded-lg border border-neutral-300 bg-white p-2 text-neutral-900"
              value={priceMin}
              onChange={(event) => setPriceMin(event.target.value)}
            />
          </label>
          <label className="block text-sm font-medium text-neutral-800">
            Price max (USD)
            <input
              type="number"
              min="0"
              className="mt-2 w-full rounded-lg border border-neutral-300 bg-white p-2 text-neutral-900"
              value={priceMax}
              onChange={(event) => setPriceMax(event.target.value)}
            />
          </label>
        </div>

        {assetType === "choreography" ? (
          <div className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
            <p className="text-sm font-semibold text-neutral-900">
              Choreography details (optional)
            </p>
            <label className="block text-sm font-medium text-neutral-800">
              BPM
              <input
                type="number"
                min="0"
                className="mt-2 w-full rounded-lg border border-neutral-300 bg-white p-2 text-neutral-900"
                value={choreographyBpm}
                onChange={(event) => setChoreographyBpm(event.target.value)}
              />
            </label>
            <label className="block text-sm font-medium text-neutral-800">
              Length (seconds)
              <input
                type="number"
                min="0"
                className="mt-2 w-full rounded-lg border border-neutral-300 bg-white p-2 text-neutral-900"
                value={choreographyLengthSeconds}
                onChange={(event) =>
                  setChoreographyLengthSeconds(event.target.value)
                }
              />
            </label>
            <label className="block text-sm font-medium text-neutral-800">
              Style
              <input
                className="mt-2 w-full rounded-lg border border-neutral-300 bg-white p-2 text-neutral-900"
                value={choreographyStyle}
                onChange={(event) => setChoreographyStyle(event.target.value)}
                placeholder="e.g., Hip hop, Jazz, Idol"
              />
            </label>
          </div>
        ) : (
          <div className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
            <p className="text-sm font-semibold text-neutral-900">
              Voice details (optional)
            </p>
            <label className="block text-sm font-medium text-neutral-800">
              Language
              <input
                className="mt-2 w-full rounded-lg border border-neutral-300 bg-white p-2 text-neutral-900"
                value={voiceLanguage}
                onChange={(event) => setVoiceLanguage(event.target.value)}
                placeholder="e.g., Japanese, English"
              />
            </label>
            <label className="block text-sm font-medium text-neutral-800">
              Gender
              <input
                className="mt-2 w-full rounded-lg border border-neutral-300 bg-white p-2 text-neutral-900"
                value={voiceGender}
                onChange={(event) => setVoiceGender(event.target.value)}
                placeholder="e.g., male, female, other"
              />
            </label>
            <label className="block text-sm font-medium text-neutral-800">
              Tone
              <input
                className="mt-2 w-full rounded-lg border border-neutral-300 bg-white p-2 text-neutral-900"
                value={voiceTone}
                onChange={(event) => setVoiceTone(event.target.value)}
                placeholder="e.g., soft, energetic"
              />
            </label>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-neutral-900 px-6 py-2 font-semibold text-white hover:bg-neutral-800 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>

      {message && (
        <p className="mt-4 text-sm text-neutral-700" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
