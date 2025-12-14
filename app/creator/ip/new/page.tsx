"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  IP_CATEGORIES,
  TERM_PRESETS,
  type IPAsset,
  type UserProfile,
} from "@/lib/types";
import { createAsset } from "./actions";

const STORAGE_BUCKET = "ip-assets";

type AssetType = "choreography" | "voice";

export default function NewIPPage() {
  return (
    <Suspense fallback={<p className="mt-10 text-sm text-neutral-600">Loading...</p>}>
      <NewIPForm />
    </Suspense>
  );
}

function NewIPForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const supabase = useMemo(() => createBrowserClient(), []);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [assetType, setAssetType] = useState<AssetType>(() => {
    const initialType = searchParams.get("type");
    if (initialType === "voice") return "voice";
    if (pathname?.includes("/creator/voice")) return "voice";
    return "choreography";
  });
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

  // choreography metadata
  const [choreographyBpm, setChoreographyBpm] = useState("");
  const [choreographyLengthSeconds, setChoreographyLengthSeconds] =
    useState("");
  const [choreographyStyle, setChoreographyStyle] = useState("");

  // voice metadata
  const [voiceLanguage, setVoiceLanguage] = useState("");
  const [voiceGender, setVoiceGender] = useState("");
  const [voiceTone, setVoiceTone] = useState("");

  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ログイン & クリエイターロールチェック
  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/auth/login");
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single<UserProfile>();

      if (error || !data) {
        router.replace("/auth/register");
        return;
      }

      if (data.role !== "creator") {
        router.replace("/ip");
        return;
      }

      setProfile(data);
    };

    void loadProfile();
  }, [router, supabase]);

  // ファイルアップロード（Storage）
  const uploadFile = async () => {
    if (!file || !profile) {
      throw new Error("File and profile are required.");
    }

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

    if (!profile) {
      setMessage("Profile not loaded.");
      return;
    }

    if (!title || !category || !file) {
      setMessage("Title, category, and file are required.");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const fileUrl = await uploadFile();
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

      const result = await createAsset(formData);
      const assetId = (result as IPAsset | { id?: string }).id;

      setMessage("IP asset saved.");
      if (assetId) {
        router.push(`/ip/${assetId}`);
      } else {
        router.push("/ip");
      }
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const fileAccept =
    assetType === "choreography" ? "video/*" : "audio/*";

  return (
    <section className="mx-auto mt-8 max-w-3xl rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-neutral-600">Creator</p>
          <h1 className="text-3xl font-semibold text-neutral-900">
            New IP Asset
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            Register choreography or voice IP for commercial licensing.
          </p>
        </div>
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
            <option value="choreography">
              Choreography（ダンス振付）
            </option>
            <option value="voice">
              Voice（声・ナレーション）
            </option>
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
          Media file *
          <input
            type="file"
            accept={fileAccept}
            required
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
                onChange={(event) =>
                  setChoreographyBpm(event.target.value)
                }
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
                className="mt-2 w-full rounded-lg border border-neutral-300 bg白 p-2 text-neutral-900"
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
            disabled={loading}
            className="rounded-full bg-neutral-900 px-6 py-2 font-semibold text-white hover:bg-neutral-800 disabled:opacity-60"
          >
            {loading ? "Saving…" : "Save IP"}
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
