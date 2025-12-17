import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import type { IPAsset } from "@/lib/types";

type PageProps = {
  searchParams: Promise<{
    type?: string;
    purpose?: string;
    ai?: string;
    region_scope?: string;
    price_max?: string;
    q?: string;
    lang?: string;
    speakers?: string;
  }>;
};

const typeOptions = ["all", "voice", "choreography"] as const;
const purposeOptions = ["all", "ads", "sns", "app", "education", "ai"] as const;
const aiOptions = ["all", "true", "false"] as const;
const regionOptions = ["all", "jp", "global"] as const;
const langOptions = ["all", "ja", "en", "auto"] as const;
const speakersOptions = ["all", "solo", "multi"] as const;
const purposeLabels: Record<(typeof purposeOptions)[number], string> = {
  all: "すべて",
  ads: "広告",
  sns: "SNS",
  app: "アプリ",
  education: "教育",
  ai: "AI",
};

function parseFilter<T extends readonly string[]>(value: string | undefined, options: T, fallback: T[number]) {
  return options.includes((value ?? "") as T[number]) ? ((value ?? fallback) as T[number]) : fallback;
}

function previewType(url?: string | null) {
  if (!url) return "link" as const;
  const ext = url.split(".").pop()?.toLowerCase() ?? "";
  if (["mp4", "mov", "webm"].includes(ext)) return "video" as const;
  if (["mp3", "wav", "aac", "ogg", "m4a"].includes(ext)) return "audio" as const;
  return "link" as const;
}

function formatPriceRange(min?: number | null, max?: number | null) {
  if (min && max) return `目安：¥${min.toLocaleString()}〜¥${max.toLocaleString()}`;
  if (min && !max) return `下限：¥${min.toLocaleString()}`;
  if (!min && max) return `上限：¥${max.toLocaleString()}`;
  return "価格は問い合わせにて確認";
}

function labelForType(type?: string | null) {
  if (type === "voice") return "声";
  if (type === "choreography") return "振付";
  return "IP";
}

export default async function PublicIPListing({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const type = parseFilter(resolvedSearchParams?.type, typeOptions, "all");
  const purpose = parseFilter(resolvedSearchParams?.purpose, purposeOptions, "all");
  const aiAllowed = parseFilter(resolvedSearchParams?.ai, aiOptions, "all");
  const regionScope = parseFilter(resolvedSearchParams?.region_scope, regionOptions, "all");
  const priceMaxRaw = resolvedSearchParams?.price_max;
  const priceMax = priceMaxRaw ? Number(priceMaxRaw) : null;
  const q = resolvedSearchParams?.q?.trim() ?? "";
  const lang = parseFilter(resolvedSearchParams?.lang, langOptions, "all");
  const speakers = parseFilter(resolvedSearchParams?.speakers, speakersOptions, "all");

  const supabase = await createServerClient();
  let query = supabase
    .from("ip_assets")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (type !== "all") {
    query = query.eq("type", type);
  }
  if (purpose !== "all") {
    query = query.contains("usage_purposes", [purpose]);
  }
  if (aiAllowed === "true") {
    query = query.eq("ai_allowed", true);
  } else if (aiAllowed === "false") {
    query = query.eq("ai_allowed", false);
  }
  if (regionScope !== "all") {
    query = query.eq("region_scope", regionScope);
  }
  if (Number.isFinite(priceMax)) {
    query = query.or(`price_min.lte.${priceMax},price_min.is.null`);
  }
  if (q) {
    const like = `%${q}%`;
    query = query.or(
      `title.ilike.${like},description.ilike.${like},ai_meta->>transcript.ilike.${like}`,
    );
  }
  if (lang !== "all") {
    query = query.eq("ai_meta->>language", lang);
  }
  if (speakers === "solo") {
    query = query.eq("ai_meta->>speakers_count", "1");
  } else if (speakers === "multi") {
    query = query.gte("ai_meta->>speakers_count", 2 as any);
  }

  const { data, error } = await query;

  if (error) {
    return (
      <section className="py-8">
        <p className="mt-10 text-sm text-neutral-700" role="alert">
          IP一覧の取得に失敗しました: {error.message}
        </p>
      </section>
    );
  }

  const assets = (data as IPAsset[]) ?? [];

  return (
    <section className="space-y-6 py-8">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-neutral-600">企業向けカタログ</p>
            <h1 className="text-3xl font-semibold text-neutral-900">IPを検索する</h1>
            <p className="mt-2 text-sm text-neutral-600">
              種類・利用目的・AI可否・地域・価格で絞り込み、詳細から問い合わせできます。
            </p>
          </div>
        </div>

        <form className="grid gap-3 rounded-2xl border border-neutral-200 bg-white p-4 md:grid-cols-5">
          <label className="md:col-span-2 flex flex-col text-xs font-semibold uppercase tracking-wide text-neutral-600">
            キーワード
            <input
              className="mt-2 rounded-lg border border-neutral-300 bg-white p-2 text-sm text-neutral-900"
              name="q"
              defaultValue={q}
              placeholder="タイトル / 説明 / transcript を検索"
            />
          </label>
          <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-neutral-600">
            種類
            <select
              className="mt-2 rounded-lg border border-neutral-300 bg-white p-2 text-sm text-neutral-900"
              name="type"
              defaultValue={type}
            >
              {typeOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "すべて" : labelForType(option)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-neutral-600">
            利用目的
            <select
              className="mt-2 rounded-lg border border-neutral-300 bg-white p-2 text-sm text-neutral-900"
              name="purpose"
              defaultValue={purpose}
            >
              {purposeOptions.map((option) => (
                <option key={option} value={option}>
                  {purposeLabels[option]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-neutral-600">
            AI利用
            <select
              className="mt-2 rounded-lg border border-neutral-300 bg-white p-2 text-sm text-neutral-900"
              name="ai"
              defaultValue={aiAllowed}
            >
              {aiOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "すべて" : option === "true" ? "可" : "不可"}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-neutral-600">
            利用地域
            <select
              className="mt-2 rounded-lg border border-neutral-300 bg-white p-2 text-sm text-neutral-900"
              name="region_scope"
              defaultValue={regionScope}
            >
              {regionOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "すべて" : option.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-neutral-600">
            言語
            <select
              className="mt-2 rounded-lg border border-neutral-300 bg-white p-2 text-sm text-neutral-900"
              name="lang"
              defaultValue={lang}
            >
              {langOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "すべて" : option.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-neutral-600">
            話者
            <select
              className="mt-2 rounded-lg border border-neutral-300 bg-white p-2 text-sm text-neutral-900"
              name="speakers"
              defaultValue={speakers}
            >
              <option value="all">すべて</option>
              <option value="solo">1人</option>
              <option value="multi">複数</option>
            </select>
          </label>
          <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-neutral-600">
            価格上限
            <input
              type="number"
              min={0}
              name="price_max"
              defaultValue={priceMax ?? ""}
              className="mt-2 rounded-lg border border-neutral-300 bg-white p-2 text-sm text-neutral-900"
              placeholder="¥ 上限"
            />
          </label>
          <div className="md:col-span-5 flex justify-end gap-2 text-sm">
            <Link
              href="/ip"
              className="rounded-full border border-neutral-300 px-4 py-2 font-semibold text-neutral-800 hover:bg-neutral-100"
            >
              リセット
            </Link>
            <button
              type="submit"
              className="rounded-full bg-neutral-900 px-5 py-2 font-semibold text-white hover:bg-neutral-800"
            >
              絞り込み
            </button>
          </div>
        </form>
      </div>

      {assets.length === 0 ? (
        <p className="text-sm text-neutral-600">該当するIPがありません。条件を変えてお試しください。</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {assets.map((asset) => {
            const previewUrl = asset.preview_url ?? asset.file_url;
            const mediaType = previewType(previewUrl);
            const purposes = asset.usage_purposes ?? [];
            const aiBadge =
              asset.ai_allowed === true
                ? { label: "AI可", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" }
                : asset.ai_allowed === false
                  ? { label: "AI不可", tone: "bg-rose-50 text-rose-700 border-rose-200" }
                  : null;

            return (
              <article
                key={asset.id}
                className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-600">
                    <span>{labelForType(asset.type ?? asset.asset_type)}</span>
                    {asset.region_scope && (
                      <span className="rounded-full border border-neutral-200 px-2 py-0.5">
                        {asset.region_scope.toUpperCase()}
                      </span>
                    )}
                  </div>
                  {aiBadge && (
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${aiBadge.tone}`}
                    >
                      {aiBadge.label}
                    </span>
                  )}
                </div>

                <h2 className="text-2xl font-semibold text-neutral-900">{asset.title}</h2>
                {asset.description && (
                  <p className="text-sm text-neutral-700 line-clamp-2">{asset.description}</p>
                )}
                <div className="flex flex-wrap gap-2 text-xs text-neutral-600">
                  {asset.ai_meta?.language && <span className="rounded-full bg-neutral-100 px-2 py-0.5">Lang: {asset.ai_meta.language}</span>}
                  {asset.ai_meta?.speakers_count && (
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5">
                      Speakers: {asset.ai_meta.speakers_count}
                    </span>
                  )}
                  {Array.isArray(asset.ai_meta?.keywords) &&
                    (asset.ai_meta.keywords as string[]).slice(0, 3).map((kw) => (
                      <span key={kw} className="rounded-full bg-neutral-50 px-2 py-0.5">
                        {kw}
                      </span>
                    ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  {purposes.map((p) => (
                    <span
                      key={p}
                      className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs text-neutral-700"
                    >
                      {purposeLabels[p as (typeof purposeOptions)[number]] ?? p.toUpperCase()}
                    </span>
                  ))}
                </div>

                <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-3">
                  {mediaType === "audio" && (
                    <audio controls className="w-full">
                      <source src={previewUrl ?? ""} />
                      音声プレビューが再生できません。
                    </audio>
                  )}
                  {mediaType === "video" && (
                    <video controls className="w-full rounded-lg">
                      <source src={previewUrl ?? ""} />
                      動画プレビューが再生できません。
                    </video>
                  )}
                  {mediaType === "link" && previewUrl && (
                    <a
                      href={previewUrl}
                      className="text-sm font-semibold text-neutral-900 underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      プレビューを開く
                    </a>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-neutral-700">
                  <span>{formatPriceRange(asset.price_min, asset.price_max)}</span>
                  <Link
                    href={`/ip/${asset.id}`}
                    className="inline-flex items-center gap-1 rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
                  >
                    詳細を見る
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
