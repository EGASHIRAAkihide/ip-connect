type Landmark = {
  x?: number;
  y?: number;
  z?: number;
  score?: number;
  visibility?: number;
};

type Frame = {
  landmarks?: Landmark[];
  keypoints?: Landmark[];
};

function pickLandmarks(frame: Frame): Landmark[] {
  if (Array.isArray(frame.landmarks)) return frame.landmarks;
  if (Array.isArray(frame.keypoints)) return frame.keypoints;
  return [];
}

export function buildVectorsFromFrames(frames: Frame[]): number[][] {
  if (!Array.isArray(frames) || frames.length === 0) return [];

  const sampleFrame = frames.find((frame) => pickLandmarks(frame).length > 0);
  const sampleLandmark = sampleFrame ? pickLandmarks(sampleFrame)[0] : null;
  const useZ = !!sampleLandmark && typeof sampleLandmark.z === "number";
  const useScore =
    !useZ &&
    !!sampleLandmark &&
    (typeof sampleLandmark.score === "number" ||
      typeof sampleLandmark.visibility === "number");

  const vectors: number[][] = [];
  for (const frame of frames) {
    const landmarks = pickLandmarks(frame);
    if (!landmarks.length) continue;
    const vector: number[] = [];
    for (const lm of landmarks) {
      const x = typeof lm.x === "number" ? lm.x : 0;
      const y = typeof lm.y === "number" ? lm.y : 0;
      vector.push(x, y);
      if (useZ) {
        vector.push(typeof lm.z === "number" ? lm.z : 0);
      } else if (useScore) {
        const score =
          typeof lm.score === "number"
            ? lm.score
            : typeof lm.visibility === "number"
              ? lm.visibility
              : 0;
        vector.push(score);
      }
    }
    vectors.push(vector);
  }
  return vectors;
}
