"use client";

import { useRef } from "react";

type Match = {
  start?: number;
  end?: number;
  candidates?: {
    start?: number;
    end?: number;
    similarity?: number;
    parts?: { upper?: number; core?: number; lower?: number };
    explain?: { note?: string };
    not_similar?: { note?: string };
  }[];
};

type Props = {
  videoA?: string | null;
  videoB?: string | null;
  matches: Match[];
  signError?: string | null;
};

export function ChoreoPhraseReview({ videoA, videoB, matches, signError }: Props) {
  const videoARef = useRef<HTMLVideoElement | null>(null);
  const videoBRef = useRef<HTMLVideoElement | null>(null);

  const jump = (ref: React.RefObject<HTMLVideoElement | null>, t?: number) => {
    if (!ref.current || typeof t !== "number") return;
    ref.current.currentTime = Math.max(0, t);
    void ref.current.play();
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs text-amber-700">
        参考値です。法的判断ではありません。実素材を確認してください。
      </div>
      {signError && <p className="text-xs text-rose-600">動画URLの生成に失敗しました: {signError}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">Video A</p>
          {videoA ? (
            <video ref={videoARef} src={videoA} controls className="w-full rounded-lg border border-neutral-200" />
          ) : (
            <p className="text-xs text-neutral-600">動画AのURLを生成できませんでした。</p>
          )}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">Video B</p>
          {videoB ? (
            <video ref={videoBRef} src={videoB} controls className="w-full rounded-lg border border-neutral-200" />
          ) : (
            <p className="text-xs text-neutral-600">動画BのURLを生成できませんでした。</p>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200">
        <table className="min-w-full divide-y divide-neutral-200 text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-600">
            <tr>
              <th className="px-3 py-2">Phrase A</th>
              <th className="px-3 py-2">Top-K (B)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {matches.map((m, idx) => (
              <tr key={`${m.start}-${m.end}-${idx}`} className="align-top hover:bg-neutral-50">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="font-mono text-xs">
                      {m.start ?? "—"}s - {m.end ?? "—"}s
                    </div>
                    <button
                      type="button"
                      onClick={() => jump(videoARef, m.start)}
                      className="rounded-full border border-neutral-300 px-2 py-0.5 text-[11px] font-semibold text-neutral-800 hover:bg-neutral-100"
                    >
                      ▶A
                    </button>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="space-y-1">
                    {(m.candidates ?? []).map((c, cidx) => (
                      <div key={`${m.start}-${c.start}-${cidx}`} className="flex items-center gap-2">
                        <span className="font-mono text-xs">
                          {c.start ?? "—"}s - {c.end ?? "—"}s
                        </span>
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-800">
                          {Number(c.similarity ?? 0).toFixed(4)}
                        </span>
                        {c.parts && (
                          <span className="flex flex-wrap items-center gap-1">
                            {["upper", "core", "lower"].map((p) =>
                              c.parts && c.parts[p as keyof typeof c.parts] !== undefined ? (
                                <span
                                  key={p}
                                  className="rounded-full bg-neutral-50 px-2 py-0.5 text-[10px] text-neutral-700"
                                >
                                  {p}:{Number(c.parts[p as keyof typeof c.parts]).toFixed(2)}
                                </span>
                              ) : null,
                            )}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => jump(videoBRef, c.start)}
                          className="rounded-full border border-neutral-300 px-2 py-0.5 text-[11px] font-semibold text-neutral-800 hover:bg-neutral-100"
                        >
                          ▶B(Top{cidx + 1})
                        </button>
                      </div>
                    ))}
                    {m.candidates?.[0]?.explain?.note && (
                      <p className="text-[11px] text-neutral-600 line-clamp-1">
                        {m.candidates[0].explain.note}
                      </p>
                    )}
                    {m.candidates?.[0]?.not_similar?.note && (
                      <p className="text-[11px] text-rose-700 line-clamp-1">
                        差分: {m.candidates[0].not_similar.note}
                      </p>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
