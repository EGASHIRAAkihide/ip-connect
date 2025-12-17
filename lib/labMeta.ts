type LabPayload = Record<string, any>;

function tokenize(text: string) {
  const tokens = text.match(/[A-Za-z0-9]+/g) ?? [];
  const freq = new Map<string, number>();
  for (const t of tokens) {
    const lower = t.toLowerCase();
    freq.set(lower, (freq.get(lower) ?? 0) + 1);
  }
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

export function augmentLabOutput(payload: LabPayload): LabPayload {
  const transcript = (payload?.transcript ?? "") as string;
  const segments = Array.isArray(payload?.segments) ? payload.segments : [];
  const speakers = segments
    .map((s) => s?.speaker)
    .filter((s) => typeof s === "string" && s.length > 0);

  const metaExtras = {
    chars: transcript.trim().length,
    keywords: tokenize(transcript),
    segments_count: segments.length,
    speakers_count: speakers.length > 0 ? new Set(speakers).size : null,
    has_multiple_speakers: speakers.length > 0 ? new Set(speakers).size >= 2 : false,
  };

  return {
    ...payload,
    meta: {
      ...(payload?.meta ?? {}),
      ...metaExtras,
    },
  };
}
