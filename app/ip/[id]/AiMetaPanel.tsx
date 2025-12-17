"use client";

type Props = {
  meta?: {
    language?: string | null;
    speakers_count?: number | null;
    segments_count?: number | null;
    keywords?: string[] | null;
    transcript?: string | null;
  } | null;
};

export function AiMetaPanel({ meta }: Props) {
  if (!meta) return null;
  const { language, speakers_count, segments_count, keywords, transcript } = meta;
  const speakersLabel =
    typeof speakers_count === "number"
      ? speakers_count === 1
        ? "1人"
        : `${speakers_count}人`
      : null;

  const copyTranscript = async () => {
    if (!transcript) return;
    try {
      await navigator.clipboard.writeText(transcript);
    } catch (e) {
      console.error("copy failed", e);
    }
  };

  return (
    <div className="space-y-2 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">AIメタ情報</p>
          <p className="text-xs text-amber-700">AI推定（参考）/ 権利の最終確認は契約時に必要です。</p>
        </div>
        {transcript && (
          <button
            type="button"
            onClick={copyTranscript}
            className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-semibold text-neutral-800 hover:bg-neutral-100"
          >
            transcriptをコピー
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-neutral-700">
        {language && <span className="rounded-full bg-neutral-100 px-2 py-0.5">Lang: {language}</span>}
        {speakersLabel && (
          <span className="rounded-full bg-neutral-100 px-2 py-0.5">Speakers: {speakersLabel}</span>
        )}
        {typeof segments_count === "number" && (
          <span className="rounded-full bg-neutral-100 px-2 py-0.5">Segments: {segments_count}</span>
        )}
        {Array.isArray(keywords) &&
          keywords.slice(0, 10).map((kw) => (
            <span key={kw} className="rounded-full bg-neutral-50 px-2 py-0.5">
              {kw}
            </span>
          ))}
      </div>
      {transcript && (
        <details className="rounded-lg border border-neutral-200 bg-neutral-50">
          <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-neutral-900">transcript</summary>
          <div className="px-3 pb-3 pt-1 text-sm text-neutral-800 whitespace-pre-wrap">{transcript}</div>
        </details>
      )}
    </div>
  );
}
