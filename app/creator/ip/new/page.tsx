"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  IP_CATEGORIES,
  TERM_PRESETS,
  INQUIRY_PURPOSES,
  REGION_OPTIONS,
  type IPAsset,
  type UserProfile,
} from "@/lib/types";
import { createAsset } from "./actions";

const STORAGE_BUCKET = "ip-assets";

type AssetType = "choreography" | "voice";

export default function NewIPPage() {
  return (
    <Suspense fallback={<p className="mt-10 text-sm text-neutral-600">読み込み中…</p>}>
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

  // common attributes
  const [usagePurposes, setUsagePurposes] = useState<string[]>([]);
  const [regionScope, setRegionScope] =
    useState<(typeof REGION_OPTIONS)[number]>("jp");
  const [aiAllowed, setAiAllowed] = useState(false);
  const [secondaryAllowed, setSecondaryAllowed] = useState(false);
  const [derivativeAllowed, setDerivativeAllowed] = useState(false);
  const [tags, setTags] = useState("");

  // choreography metadata
  const [choreographyGenre, setChoreographyGenre] = useState("");
  const [choreographyDifficulty, setChoreographyDifficulty] = useState("");
  const [choreographyMembers, setChoreographyMembers] = useState("");

  // voice metadata
  const [voiceLanguage, setVoiceLanguage] = useState("");
  const [voiceGender, setVoiceGender] = useState("");
  const [voiceTone, setVoiceTone] = useState("");
  const [voiceAgeRange, setVoiceAgeRange] = useState("");
  const [voiceAccent, setVoiceAccent] = useState("");

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
      throw new Error("ファイルとプロフィールが必要です。");
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
      throw new Error("SupabaseのURLが設定されていません。");
    }

    return `${baseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!profile) {
      setMessage("プロフィールを取得できませんでした。");
      return;
    }

    if (!title || !category || !file) {
      setMessage("タイトル・カテゴリ・ファイルは必須です。");
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
      formData.append("usage_purposes", JSON.stringify(usagePurposes));
      formData.append("region_scope", regionScope);
      formData.append("ai_allowed", aiAllowed ? "true" : "false");
      formData.append("secondary_use_allowed", secondaryAllowed ? "true" : "false");
      formData.append("derivative_allowed", derivativeAllowed ? "true" : "false");
      if (tags) formData.append("tags", tags);

      if (assetType === "choreography") {
        if (choreographyGenre) formData.append("choreography_genre", choreographyGenre);
        if (choreographyDifficulty) formData.append("choreography_difficulty", choreographyDifficulty);
        if (choreographyMembers) formData.append("choreography_members", choreographyMembers);
      } else {
        if (voiceLanguage) formData.append("voice_language", voiceLanguage);
        if (voiceGender) formData.append("voice_gender", voiceGender);
        if (voiceTone) formData.append("voice_tone", voiceTone);
        if (voiceAgeRange) formData.append("voice_age_range", voiceAgeRange);
        if (voiceAccent) formData.append("voice_accent", voiceAccent);
      }

      const result = await createAsset(formData);
      const assetId = (result as IPAsset | { id?: string }).id;

      setMessage("IPを保存しました。");
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
          <p className="text-sm text-neutral-600">クリエイター</p>
          <h1 className="text-3xl font-semibold text-neutral-900">IPを新規登録</h1>
          <p className="mt-1 text-xs text-neutral-500">
            振付/声のIPを登録し、企業が問い合わせできる状態にします。
          </p>
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-neutral-800">
          種類 *
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
          タイトル *
          <input
            required
            className="mt-2 w-full rounded-lg border border-neutral-300 bg-white p-2 text-neutral-900"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>

        <label className="block text-sm font-medium text-neutral-800">
          説明
          <textarea
            className="mt-2 w-full rounded-lg border border-neutral-300 bg-white p-2 text-neutral-900"
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>

        <label className="block text-sm font-medium text-neutral-800">
          カテゴリ *
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
          メディアファイル *
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
              ? "振付の動画ファイルをアップロードしてください。"
              : "声・ナレーションの音声ファイルをアップロードしてください。"}
          </p>
        </label>

        <label className="block text-sm font-medium text-neutral-800">
          利用条件プリセット
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
          利用条件の補足
          <textarea
            className="mt-2 w-full rounded-lg border border-neutral-300 bg-white p-2 text-neutral-900"
            rows={3}
            value={usageNotes}
            onChange={(event) => setUsageNotes(event.target.value)}
            placeholder="企業向けの補足があれば記入してください"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium text-neutral-800">
            価格下限（任意）
            <input
              type="number"
              min="0"
              className="mt-2 w-full rounded-lg border border-neutral-300 bg-white p-2 text-neutral-900"
              value={priceMin}
              onChange={(event) => setPriceMin(event.target.value)}
            />
          </label>
          <label className="block text-sm font-medium text-neutral-800">
            価格上限（任意）
            <input
              type="number"
              min="0"
              className="mt-2 w-full rounded-lg border border-neutral-300 bg-white p-2 text-neutral-900"
              value={priceMax}
              onChange={(event) => setPriceMax(event.target.value)}
            />
          </label>
        </div>

        <div className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-sm font-semibold text-neutral-900">
            Usage conditions (検索・問い合わせ用)
          </p>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
              利用目的
            </p>
            <div className="flex flex-wrap gap-2">
              {INQUIRY_PURPOSES.map((purposeValue) => {
                const checked = usagePurposes.includes(purposeValue);
                return (
                  <label
                    key={purposeValue}
                    className={`cursor-pointer rounded-full border px-3 py-1 text-sm ${
                      checked
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : "border-neutral-200 text-neutral-800"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={checked}
                      onChange={() => {
                        setUsagePurposes((prev) =>
                          prev.includes(purposeValue)
                            ? prev.filter((p) => p !== purposeValue)
                            : [...prev, purposeValue],
                        );
                      }}
                    />
                    {purposeValue.toUpperCase()}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-sm font-medium text-neutral-800">
              利用地域
              <select
                className="mt-2 w-full rounded-lg border border-neutral-300 bg-white p-2 text-neutral-900"
                value={regionScope}
                onChange={(event) =>
                  setRegionScope(event.target.value as (typeof REGION_OPTIONS)[number])
                }
              >
                {REGION_OPTIONS.map((region) => (
                  <option key={region} value={region}>
                    {region.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-neutral-800">
              タグ（カンマ区切り）
              <input
                className="mt-2 w-full rounded-lg border border-neutral-300 bg-white p-2 text-neutral-900"
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="例: J-POP, やわらかい声"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-neutral-800">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={aiAllowed}
                onChange={(event) => setAiAllowed(event.target.checked)}
                className="h-4 w-4 rounded border-neutral-300"
              />
              AI利用許可
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={secondaryAllowed}
                onChange={(event) => setSecondaryAllowed(event.target.checked)}
                className="h-4 w-4 rounded border-neutral-300"
              />
              二次利用OK
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={derivativeAllowed}
                onChange={(event) => setDerivativeAllowed(event.target.checked)}
                className="h-4 w-4 rounded border-neutral-300"
              />
              改変OK
            </label>
          </div>
        </div>

        {assetType === "choreography" ? (
          <div className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
            <p className="text-sm font-semibold text-neutral-900">
              振付の詳細（任意）
            </p>
            <label className="block text-sm font-medium text-neutral-800">
              ジャンル
              <input
                className="mt-2 w-full rounded-lg border border-neutral-300 bg-white p-2 text-neutral-900"
                value={choreographyGenre}
                onChange={(event) => setChoreographyGenre(event.target.value)}
                placeholder="例: ヒップホップ, ジャズ, アイドル"
              />
            </label>
            <label className="block text-sm font-medium text-neutral-800">
              難易度
              <input
                className="mt-2 w-full rounded-lg border border-neutral-300 bg-white p-2 text-neutral-900"
                value={choreographyDifficulty}
                onChange={(event) => setChoreographyDifficulty(event.target.value)}
                placeholder="例: 初級, 中級"
              />
            </label>
            <label className="block text-sm font-medium text-neutral-800">
              人数 (members)
              <input
                type="number"
                min="0"
                className="mt-2 w-full rounded-lg border border-neutral-300 bg-white p-2 text-neutral-900"
                value={choreographyMembers}
                onChange={(event) => setChoreographyMembers(event.target.value)}
              />
            </label>
          </div>
        ) : (
          <div className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
            <p className="text-sm font-semibold text-neutral-900">
              声の詳細（任意）
            </p>
            <label className="block text-sm font-medium text-neutral-800">
              言語
              <input
                className="mt-2 w-full rounded-lg border border-neutral-300 bg-white p-2 text-neutral-900"
                value={voiceLanguage}
                onChange={(event) => setVoiceLanguage(event.target.value)}
                placeholder="例: 日本語, 英語"
              />
            </label>
            <label className="block text-sm font-medium text-neutral-800">
              性別
              <input
                className="mt-2 w-full rounded-lg border border-neutral-300 bg-white p-2 text-neutral-900"
                value={voiceGender}
                onChange={(event) => setVoiceGender(event.target.value)}
                placeholder="例: 男性, 女性, その他"
              />
            </label>
            <label className="block text-sm font-medium text-neutral-800">
              トーン
              <input
                className="mt-2 w-full rounded-lg border border-neutral-300 bg-white p-2 text-neutral-900"
                value={voiceTone}
                onChange={(event) => setVoiceTone(event.target.value)}
                placeholder="例: やわらかい, 元気"
              />
            </label>
            <label className="block text-sm font-medium text-neutral-800">
              年齢レンジ
              <input
                className="mt-2 w-full rounded-lg border border-neutral-300 bg-white p-2 text-neutral-900"
                value={voiceAgeRange}
                onChange={(event) => setVoiceAgeRange(event.target.value)}
                placeholder="例: ティーン, 20代"
              />
            </label>
            <label className="block text-sm font-medium text-neutral-800">
              アクセント
              <input
                className="mt-2 w-full rounded-lg border border-neutral-300 bg-white p-2 text-neutral-900"
                value={voiceAccent}
                onChange={(event) => setVoiceAccent(event.target.value)}
                placeholder="例: 関西弁, 標準語"
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
            キャンセル
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-neutral-900 px-6 py-2 font-semibold text-white hover:bg-neutral-800 disabled:opacity-60"
          >
            {loading ? "保存中…" : "IPを保存"}
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
