import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getServerUserWithRole } from "@/lib/auth";
import type { ChoreoMetadata, IPAsset, UserProfile, VoiceMetadata } from "@/lib/types";
import { recordEvent } from "@/lib/events";

type PageProps = {
  params: { id: string };
};

const audioExt = ["mp3", "wav", "aac", "ogg", "m4a"];
const videoExt = ["mp4", "mov", "webm"];
const purposeLabels: Record<string, string> = {
  ads: "広告",
  sns: "SNS",
  app: "アプリ",
  education: "教育",
  ai: "AI",
};

function resolvePreviewType(url?: string | null) {
  if (!url) return "link" as const;
  const ext = url.split(".").pop()?.toLowerCase() ?? "";
  if (audioExt.includes(ext)) return "audio" as const;
  if (videoExt.includes(ext)) return "video" as const;
  return "link" as const;
}

function labelForType(type?: string | null) {
  if (type === "voice") return "声";
  if (type === "choreography") return "振付";
  return "IP";
}

function describePrice(min?: number | null, max?: number | null) {
  if (min && max) return `¥${min.toLocaleString()}〜¥${max.toLocaleString()}`;
  if (min && !max) return `¥${min.toLocaleString()} から`;
  if (!min && max) return `〜¥${max.toLocaleString()}`;
  return "価格は問い合わせで確認";
}

export default async function IPDetailPage({ params }: PageProps) {
  const supabase = await createServerClient();
  const { user, role } = await getServerUserWithRole();

  const { data: asset, error } = await supabase
    .from("ip_assets")
    .select("*")
    .eq("id", params.id)
    .single<IPAsset>();

  if (error || !asset) {
    return notFound();
  }

  await recordEvent("asset_view", {
    userId: user?.id ?? null,
    assetId: asset.id,
    meta: { type: asset.type ?? asset.asset_type },
  });

  const { data: creator } = await supabase
    .from("users")
    .select("*")
    .eq("id", asset.created_by)
    .maybeSingle<UserProfile>();

  const previewUrl = asset.preview_url ?? asset.file_url;
  const previewType = resolvePreviewType(previewUrl);
  const purposes = asset.usage_purposes ?? [];

  const isCompany = role === "company";
  const ctaDisabled = !isCompany;
  const ctaLabel = isCompany ? "このIPに問い合わせる" : user ? "企業ロールが必要です" : "ログインして問い合わせ";

  const aiBadge =
    asset.ai_allowed === true
      ? { label: "AI利用可", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" }
      : asset.ai_allowed === false
        ? { label: "AI利用不可", tone: "bg-rose-50 text-rose-700 border-rose-200" }
        : null;

  return (
    <section className="space-y-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            {labelForType(asset.type ?? asset.asset_type)}
          </p>
          <h1 className="text-3xl font-semibold text-neutral-900">{asset.title}</h1>
          {creator && (
            <Link
              href={`/users/${creator.id}`}
              className="text-sm text-neutral-900 underline"
            >
              クリエイター: {creator.email}
            </Link>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <Link
            href={isCompany ? `/ip/${asset.id}/inquire` : "#"}
            aria-disabled={ctaDisabled}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
              ctaDisabled
                ? "cursor-not-allowed border border-neutral-200 bg-neutral-100 text-neutral-500"
                : "bg-neutral-900 text-white hover:bg-neutral-800"
            }`}
          >
            {ctaLabel}
          </Link>
          {!isCompany && (
            <p className="text-xs text-neutral-500">
              企業アカウントでログインすると問い合わせできます。
            </p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {asset.region_scope && (
            <span className="rounded-full border border-neutral-200 px-2 py-0.5 text-neutral-700">
              {asset.region_scope.toUpperCase()}
            </span>
          )}
          {aiBadge && (
            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${aiBadge.tone}`}>
              {aiBadge.label}
            </span>
          )}
          {asset.secondary_use_allowed && (
            <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[11px] font-semibold text-neutral-800">
              二次利用OK
            </span>
          )}
          {asset.derivative_allowed && (
            <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[11px] font-semibold text-neutral-800">
              改変OK
            </span>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {purposes.map((p) => (
            <span
              key={p}
              className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs text-neutral-700"
            >
              {purposeLabels[p] ?? p.toUpperCase()}
            </span>
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-4">
          {previewType === "audio" && (
            <audio controls className="w-full">
              <source src={previewUrl ?? ""} />
              音声プレビューを再生できません。
            </audio>
          )}
          {previewType === "video" && (
            <video controls className="w-full rounded-lg">
              <source src={previewUrl ?? ""} />
              動画プレビューを再生できません。
            </video>
          )}
          {previewType === "link" && previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold text-neutral-900 underline"
            >
              プレビューを開く
            </a>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h3 className="text-lg font-semibold text-neutral-900">利用条件</h3>
          <p className="mt-2 text-sm text-neutral-700">
            {asset.terms?.preset ?? "未設定"}
          </p>
          {asset.terms?.notes && (
            <p className="mt-1 text-sm text-neutral-600">{asset.terms.notes}</p>
          )}
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h3 className="text-lg font-semibold text-neutral-900">価格目安</h3>
          <p className="mt-2 text-sm text-neutral-700">
            {describePrice(asset.price_min, asset.price_max)}
          </p>
        </div>
      </div>

      {asset.description && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h3 className="text-lg font-semibold text-neutral-900">説明</h3>
          <p className="mt-2 text-sm text-neutral-700">{asset.description}</p>
        </div>
      )}

      {asset.type === "voice" && (asset.meta as VoiceMetadata | undefined)?.type === "voice" && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h3 className="text-lg font-semibold text-neutral-900">声の詳細</h3>
          <dl className="mt-3 grid gap-3 text-sm text-neutral-700 md:grid-cols-3">
            <div>
              <dt className="text-neutral-500">言語</dt>
              <dd className="text-neutral-900">
                {(asset.meta as VoiceMetadata).language ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500">性別</dt>
              <dd className="text-neutral-900">
                {(asset.meta as VoiceMetadata).gender ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500">トーン</dt>
              <dd className="text-neutral-900">
                {(asset.meta as VoiceMetadata).tone ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500">年齢レンジ</dt>
              <dd className="text-neutral-900">
                {(asset.meta as VoiceMetadata).age_range ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500">アクセント</dt>
              <dd className="text-neutral-900">
                {(asset.meta as VoiceMetadata).accent ?? "—"}
              </dd>
            </div>
          </dl>
        </div>
      )}

      {asset.type === "choreography" &&
        (asset.meta as ChoreoMetadata | undefined)?.type === "choreography" && (
          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h3 className="text-lg font-semibold text-neutral-900">振付の詳細</h3>
            <dl className="mt-3 grid gap-3 text-sm text-neutral-700 md:grid-cols-3">
              <div>
                <dt className="text-neutral-500">ジャンル</dt>
                <dd className="text-neutral-900">
                  {(asset.meta as ChoreoMetadata).genre ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">難易度</dt>
                <dd className="text-neutral-900">
                  {(asset.meta as ChoreoMetadata).difficulty ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">人数</dt>
                <dd className="text-neutral-900">
                  {(asset.meta as ChoreoMetadata).members ?? "—"}
                </dd>
              </div>
            </dl>
          </div>
        )}
    </section>
  );
}
