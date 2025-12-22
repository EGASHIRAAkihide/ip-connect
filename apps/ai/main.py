import os
import math
import tempfile
import time
import json
import urllib.request
import subprocess
import wave
from typing import Any, Dict, Optional

import whisper
import cv2
import mediapipe as mp
import numpy as np
from fastapi import Body
import torch
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="AI Lab (Audio)", version="0.3.2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_NAME = "base"
_asr_model = None

_diar_pipeline = None
_diar_init_error: Optional[str] = None
_embed_inference = None
_embed_init_error: Optional[str] = None
EMBED_MODEL_ID = "pyannote/embedding"
EMBED_MODEL_ID = "pyannote/wespeaker-voxceleb-resnet34-LM"
_pose = None


def load_asr_model():
    global _asr_model
    if _asr_model is None:
        _asr_model = whisper.load_model(MODEL_NAME)
    return _asr_model


def load_diarization():
    global _diar_pipeline, _diar_init_error
    if _diar_pipeline or _diar_init_error:
        return _diar_pipeline

    hf_token = os.getenv("HF_TOKEN")
    if not hf_token:
        _diar_init_error = "HF_TOKEN is not set"
        return None

    try:
        from pyannote.audio import Pipeline  # imported lazily

        _diar_pipeline = Pipeline.from_pretrained("pyannote/speaker-diarization-3.1", use_auth_token=hf_token)
        return _diar_pipeline
    except Exception as exc:  # noqa: BLE001
        _diar_init_error = str(exc)
        return None


def load_embedding():
    global _embed_inference, _embed_init_error
    if _embed_inference:
        return _embed_inference
    if _embed_init_error:
        return None

    hf_token = os.getenv("HF_TOKEN")
    if not hf_token:
        _embed_init_error = "HF_TOKEN is not set"
        return None

    try:
        from pyannote.audio import Inference, Model  # lazy import

        model = Model.from_pretrained(EMBED_MODEL_ID, use_auth_token=hf_token)
        inference = Inference(model, device=torch.device("cpu"), window="whole")
        _embed_inference = inference
        return _embed_inference
    except Exception as exc:  # noqa: BLE001
        _embed_init_error = f"{exc.__class__.__name__}: {exc}"
        _embed_inference = None
        return None


def load_pose():
    global _pose
    if _pose:
        return _pose
    _pose = mp.solutions.pose.Pose(
        static_image_mode=False,
        model_complexity=1,
        enable_segmentation=False,
        smooth_landmarks=True,
    )
    return _pose


def _normalize_landmarks(landmarks):
    if len(landmarks) < 25:
        return None
    lhip, rhip = landmarks[23], landmarks[24]
    lsho, rsho = landmarks[11], landmarks[12]
    center_x = (lhip.x + rhip.x) / 2
    center_y = (lhip.y + rhip.y) / 2
    center_z = (lhip.z + rhip.z) / 2
    shoulder_center_x = (lsho.x + rsho.x) / 2
    shoulder_center_y = (lsho.y + rsho.y) / 2
    shoulder_center_z = (lsho.z + rsho.z) / 2
    torso = math.sqrt(
        (shoulder_center_x - center_x) ** 2 + (shoulder_center_y - center_y) ** 2 + (shoulder_center_z - center_z) ** 2
    )
    shoulder_dist = math.sqrt((lsho.x - rsho.x) ** 2 + (lsho.y - rsho.y) ** 2 + (lsho.z - rsho.z) ** 2)
    scale = max(torso, shoulder_dist, 1e-6)
    vec = []
    for lm in landmarks:
        vec.extend([(lm.x - center_x) / scale, (lm.y - center_y) / scale, (lm.z - center_z) / scale])
    return vec


def _pool_vectors(vectors):
    if not vectors:
        return []
    dim = len(vectors[0])
    sums = [0.0] * dim
    count = 0
    for vec in vectors:
        if len(vec) != dim:
            continue
        count += 1
        for i, val in enumerate(vec):
            sums[i] += val
    if count == 0:
        return []
    return [s / count for s in sums]


def _process_pose_bytes(file_bytes: bytes, sample_fps: float, max_seconds: float):
    pose = load_pose()
    if pose is None:
        raise HTTPException(status_code=500, detail="Pose model unavailable")

    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=True) as tmp:
        tmp.write(file_bytes)
        tmp.flush()

        cap = cv2.VideoCapture(tmp.name)
        if not cap.isOpened():
            raise HTTPException(status_code=400, detail="Failed to open video file")

        started = time.time()
        try:
            fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
            stride = max(int(round(fps / sample_fps)), 1) if sample_fps > 0 else 1
            max_frames = int(max_seconds * fps) if max_seconds and max_seconds > 0 else 0

            frame_idx = 0
            frames_processed = 0
            frames_with_pose = 0
            pose_frames = []
            vectors = []

            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                if max_frames and frame_idx >= max_frames:
                    break
                if frame_idx % stride != 0:
                    frame_idx += 1
                    continue

                frames_processed += 1
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = pose.process(rgb)
                if results.pose_landmarks:
                    frames_with_pose += 1
                    landmarks = [
                        {
                            "x": float(lm.x),
                            "y": float(lm.y),
                            "z": float(lm.z),
                            "v": float(lm.visibility),
                        }
                        for lm in results.pose_landmarks.landmark
                    ]
                    pose_frames.append({"t": round(frame_idx / fps, 3), "landmarks": landmarks})
                    norm = _normalize_landmarks(results.pose_landmarks.landmark)
                    if norm:
                        vectors.append(norm)

                frame_idx += 1
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=500, detail=f"{exc.__class__.__name__}: {exc}") from exc
        finally:
            cap.release()

    duration_ms = int((time.time() - started) * 1000)
    truncated = len(pose_frames) > 50
    pose_frames_light = pose_frames[:50]
    all_vis = [lm.get("v", 0.0) for frame in pose_frames_light for lm in frame.get("landmarks", [])]
    avg_vis = sum(all_vis) / len(all_vis) if all_vis else None
    seconds_used = round((min(frame_idx, max_frames) if max_frames else frame_idx) / fps, 3) if fps else None

    summary = {
        "frames_processed": frames_processed,
        "frames_with_pose": frames_with_pose,
        "frames_with_pose_ratio": round(frames_with_pose / frames_processed, 4) if frames_processed else 0.0,
        "returned_frames": len(pose_frames_light),
    }
    features = {"avg_visibility": round(avg_vis, 4) if avg_vis is not None else None}
    meta = {
        "fps": round(fps, 3),
        "sample_fps": sample_fps,
        "max_seconds": max_seconds,
        "processing_ms": duration_ms,
        "pose_frames_total": len(pose_frames),
        "pose_frames_returned": len(pose_frames_light),
        "truncated": truncated,
        "seconds_used": seconds_used,
    }

    return {
        "pose_frames": pose_frames_light,
        "meta": meta,
        "summary": summary,
        "features": features,
        "vectors": vectors,
        "seconds_used": seconds_used,
        "processing_ms": duration_ms,
    }


def _downsample_vectors(vectors, max_frames=300):
    if len(vectors) <= max_frames:
        return vectors
    step = math.ceil(len(vectors) / max_frames)
    return vectors[::step][:max_frames]


def _dtw_cost(seq_a, seq_b, band: int):
    len_a, len_b = len(seq_a), len(seq_b)
    if len_a == 0 or len_b == 0:
        return float("inf")
    band = max(band, abs(len_a - len_b))
    inf = float("inf")
    prev = [inf] * (len_b + 1)
    curr = [inf] * (len_b + 1)
    prev[0] = 0.0

    for i in range(1, len_a + 1):
        curr[0] = inf
        start = max(1, i - band)
        end = min(len_b, i + band)
        for j in range(start, end + 1):
            dist = 1 - _cosine_similarity(seq_a[i - 1], seq_b[j - 1])
            best = min(prev[j], curr[j - 1], prev[j - 1])
            curr[j] = dist + best
        prev, curr = curr, [inf] * (len_b + 1)

    return prev[len_b]


def _cosine_similarity(a, b):
    import math

    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


PART_MAP = {
    "upper": [11, 12, 13, 14, 15, 16],  # shoulders / arms
    "core": [11, 12, 23, 24],  # shoulders + hips
    "lower": [23, 24, 25, 26, 27, 28, 31, 32],  # hips + legs
}

_PART_LABELS_JA = {"upper": "上半身", "core": "体幹", "lower": "下半身", "timing": "タイミング"}


def _part_similarity(vec_a, vec_b):
    def slice_part(vec, idxs):
        out = []
        for idx in idxs:
            base = idx * 3
            out.extend(vec[base : base + 3])
        return out

    parts = {}
    for name, idxs in PART_MAP.items():
        pa = slice_part(vec_a, idxs)
        pb = slice_part(vec_b, idxs)
        parts[name] = _cosine_similarity(pa, pb) if pa and pb else 0.0
    return parts


def _not_similar_explain(parts: Dict[str, float], mid_a: float, mid_b: float):
    # "Not similar" = weakest body part + optional timing mismatch.
    sorted_parts = sorted(parts.items(), key=lambda x: x[1])
    min_part = sorted_parts[0][0] if sorted_parts else "core"
    dominant_parts = [min_part]

    if abs(mid_a - mid_b) >= 1.5:
        dominant_parts.append("timing")

    part_ja = _PART_LABELS_JA.get(min_part, "体幹")
    if "timing" in dominant_parts:
        note = f"{part_ja}の動きに差分があり、タイミングにずれがある可能性（参考情報）"
    else:
        note = f"{part_ja}の動きに差分がある可能性（参考情報）"

    return {"dominant_parts": dominant_parts, "note": note}


def _moving_average(values, window: int):
  """Simple moving average for smoothing energy."""
  if window <= 1:
    return values
  smoothed = []
  half = window // 2
  for i in range(len(values)):
    start = max(0, i - half)
    end = min(len(values), i + half + 1)
    smoothed.append(sum(values[start:end]) / (end - start))
  return smoothed


def _assign_speakers(asr_segments, diar_segments):
    assigned = []
    for seg in asr_segments:
        start, end = seg.get("start", 0.0), seg.get("end", 0.0)
        best_speaker = "unknown"
        best_overlap = 0.0
        for diar in diar_segments:
            ds, de = diar["start"], diar["end"]
            overlap = max(0.0, min(end, de) - max(start, ds))
            if overlap > best_overlap:
                best_overlap = overlap
                best_speaker = diar["speaker"]
        assigned.append(
            {
                "start": round(start, 3),
                "end": round(end, 3),
                "speaker": best_speaker,
                "text": seg.get("text", ""),
            }
        )
    return assigned


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/asr")
async def asr(
    file: UploadFile = File(...),
    language: str = Form("auto"),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="File is required")

    model = load_asr_model()

    with tempfile.NamedTemporaryFile(suffix=file.filename, delete=True) as tmp:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Empty file")

        tmp.write(content)
        tmp.flush()

        started = time.time()
        try:
            result: Dict[str, Any] = model.transcribe(
                tmp.name,
                language=None if language == "auto" else language,
            )
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=500, detail=str(exc)) from exc
        duration_ms = int((time.time() - started) * 1000)

    segments = result.get("segments") or []
    transcript = result.get("text") or ""
    meta: Dict[str, Optional[Any]] = {
        "language": result.get("language"),
        "duration": result.get("duration"),
        "model": MODEL_NAME,
        "processing_ms": duration_ms,
    }

    return {
        "transcript": transcript.strip(),
        "segments": segments,
        "meta": meta,
    }


@app.post("/diarize")
async def diarize(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="File is required")

    pipeline = load_diarization()
    if _diar_init_error:
        raise HTTPException(status_code=500, detail=f"Pipeline init failed: {_diar_init_error}")
    if pipeline is None:
        raise HTTPException(status_code=500, detail="Diarization pipeline unavailable")

    with tempfile.NamedTemporaryFile(suffix=file.filename, delete=True) as tmp:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Empty file")
        tmp.write(content)
        tmp.flush()

        started = time.time()
        try:
          # pyannote uses torch; keep payload minimal
            diarization = pipeline(tmp.name)
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=500, detail=str(exc)) from exc
        duration_ms = int((time.time() - started) * 1000)

    segments = []
    for turn, _, speaker in diarization.itertracks(yield_label=True):
        segments.append(
            {
                "speaker": speaker,
                "start": round(turn.start, 3),
                "end": round(turn.end, 3),
            }
        )

    return {
        "meta": {"processing_ms": duration_ms, "speakers_count": len({s['speaker'] for s in segments})},
        "segments": segments,
    }


@app.post("/embed")
async def embed(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="File is required")

    inference = load_embedding()
    if _embed_init_error:
        raise HTTPException(status_code=500, detail=f"Embedding init failed: {_embed_init_error}")
    if inference is None:
        raise HTTPException(status_code=500, detail="Embedding model unavailable")

    with tempfile.NamedTemporaryFile(suffix=file.filename, delete=True) as tmp:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Empty file")
        tmp.write(content)
        tmp.flush()

        started = time.time()
        try:
            emb = inference(tmp.name)
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=500, detail=str(exc)) from exc
        duration_ms = int((time.time() - started) * 1000)

    # emb is numpy array; convert to list and optionally trim if very long
    embedding_list = emb.tolist()
    dim = len(embedding_list)
    max_dim = 256
    trimmed = False
    if dim > max_dim:
        embedding_list = embedding_list[:max_dim]
        trimmed = True

    return {
        "meta": {"processing_ms": duration_ms, "dim": dim, "trimmed": trimmed, "returned": len(embedding_list)},
        "embedding": embedding_list,
    }


@app.post("/compare")
async def compare(fileA: UploadFile = File(...), fileB: UploadFile = File(...)):
    if not fileA.filename or not fileB.filename:
        raise HTTPException(status_code=400, detail="fileA and fileB are required")

    inference = load_embedding()
    if _embed_init_error:
        raise HTTPException(status_code=500, detail=f"Embedding init failed: {_embed_init_error}")
    if inference is None:
        raise HTTPException(status_code=500, detail="Embedding model unavailable")

    def infer_file(upload: UploadFile):
        with tempfile.NamedTemporaryFile(suffix=upload.filename, delete=True) as tmp:
            content = upload.file.read()
            if not content:
                raise HTTPException(status_code=400, detail=f"{upload.filename} is empty")
            tmp.write(content)
            tmp.flush()
            return inference(tmp.name)

    started = time.time()
    try:
        emb_a = infer_file(fileA)
        emb_b = infer_file(fileB)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"{exc.__class__.__name__}: {exc}") from exc
    duration_ms = int((time.time() - started) * 1000)

    list_a = emb_a.tolist()
    list_b = emb_b.tolist()
    dim = min(len(list_a), len(list_b))
    sim = _cosine_similarity(list_a[:dim], list_b[:dim])

    return {
        "meta": {"processing_ms": duration_ms, "dim": dim},
        "similarity": sim,
    }


@app.post("/asr_diarize")
async def asr_diarize(file: UploadFile = File(...), language: str = Form("auto")):
    if not file.filename:
        raise HTTPException(status_code=400, detail="File is required")

    asr_model = load_asr_model()
    diar_pipeline = load_diarization()
    if _diar_init_error:
        raise HTTPException(status_code=500, detail=f"Pipeline init failed: {_diar_init_error}")
    if diar_pipeline is None:
        raise HTTPException(status_code=500, detail="Diarization pipeline unavailable")

    with tempfile.NamedTemporaryFile(suffix=file.filename, delete=True) as tmp:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Empty file")
        tmp.write(content)
        tmp.flush()

        started = time.time()
        try:
            diarization = diar_pipeline(tmp.name)
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=500, detail=f"{exc.__class__.__name__}: {exc}") from exc

        try:
            asr_result: Dict[str, Any] = asr_model.transcribe(
                tmp.name,
                language=None if language == "auto" else language,
            )
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=500, detail=f"{exc.__class__.__name__}: {exc}") from exc
        duration_ms = int((time.time() - started) * 1000)

    diar_segments = []
    for turn, _, speaker in diarization.itertracks(yield_label=True):
        diar_segments.append(
            {
                "speaker": speaker,
                "start": round(turn.start, 3),
                "end": round(turn.end, 3),
            }
        )

    asr_segments_raw = asr_result.get("segments") or []
    asr_segments = [
        {"start": float(s.get("start", 0.0)), "end": float(s.get("end", 0.0)), "text": s.get("text", "").strip()}
        for s in asr_segments_raw
    ]
    assigned = _assign_speakers(asr_segments, diar_segments)

    transcript = asr_result.get("text", "").strip()
    meta: Dict[str, Any] = {
        "processing_ms": duration_ms,
        "language": asr_result.get("language"),
        "model": MODEL_NAME,
        "speakers_count": len({d["speaker"] for d in diar_segments}),
    }

    return {
        "meta": meta,
        "segments": assigned,
        "transcript": transcript,
    }


@app.post("/choreo/pose")
async def choreo_pose(
    file: UploadFile = File(...),
    sample_fps: float = Form(10),
    max_seconds: float = Form(30),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="File is required")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        result = _process_pose_bytes(content, sample_fps, max_seconds)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"{exc.__class__.__name__}: {exc}") from exc

    return {
        "meta": result["meta"],
        "summary": result["summary"],
        "features": result["features"],
        "pose_frames": result["pose_frames"],
        "vectors": result.get("vectors") or [],
    }


@app.post("/choreo/compare")
async def choreo_compare(
    fileA: UploadFile = File(...),
    fileB: UploadFile = File(...),
    sample_fps: float = Form(10),
    max_seconds: float = Form(30),
):
    if not fileA.filename or not fileB.filename:
        raise HTTPException(status_code=400, detail="fileA and fileB are required")

    content_a = await fileA.read()
    content_b = await fileB.read()
    if not content_a or not content_b:
        raise HTTPException(status_code=400, detail="Empty fileA or fileB")

    started = time.time()
    try:
        result_a = _process_pose_bytes(content_a, sample_fps, max_seconds)
        result_b = _process_pose_bytes(content_b, sample_fps, max_seconds)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"{exc.__class__.__name__}: {exc}") from exc
    duration_ms = int((time.time() - started) * 1000)

    vec_a = _pool_vectors(result_a.get("vectors") or [])
    vec_b = _pool_vectors(result_b.get("vectors") or [])
    similarity = _cosine_similarity(vec_a, vec_b) if vec_a and vec_b else 0.0
    similarity = max(0.0, min(1.0, similarity))

    meta = {
        "processing_ms": duration_ms,
        "framesA": len(result_a.get("vectors") or []),
        "framesB": len(result_b.get("vectors") or []),
        "sample_fps": sample_fps,
        "seconds_used": min(
            result_a.get("seconds_used") or 0.0,
            result_b.get("seconds_used") or 0.0,
        ),
    }

    return {
        "meta": meta,
        "similarity": similarity,
    }


@app.post("/choreo/compare_dtw")
async def choreo_compare_dtw(
    fileA: UploadFile = File(...),
    fileB: UploadFile = File(...),
    sample_fps: float = Form(10),
    max_seconds: float = Form(30),
    band: int = Form(10),
):
    if not fileA.filename or not fileB.filename:
        raise HTTPException(status_code=400, detail="fileA and fileB are required")

    content_a = await fileA.read()
    content_b = await fileB.read()
    if not content_a or not content_b:
        raise HTTPException(status_code=400, detail="Empty fileA or fileB")

    started = time.time()
    try:
        result_a = _process_pose_bytes(content_a, sample_fps, max_seconds)
        result_b = _process_pose_bytes(content_b, sample_fps, max_seconds)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"{exc.__class__.__name__}: {exc}") from exc
    duration_ms = int((time.time() - started) * 1000)

    seq_a = _downsample_vectors(result_a.get("vectors") or [], 300)
    seq_b = _downsample_vectors(result_b.get("vectors") or [], 300)
    if not seq_a or not seq_b:
        raise HTTPException(status_code=400, detail="Pose landmarks not found in one of the videos")

    cost = _dtw_cost(seq_a, seq_b, band)
    norm = max(len(seq_a), len(seq_b))
    similarity = math.exp(-cost / norm) if norm > 0 else 0.0
    similarity = max(0.0, min(1.0, similarity))

    meta = {
        "processing_ms": duration_ms,
        "framesA": len(seq_a),
        "framesB": len(seq_b),
        "band": band,
        "sample_fps": sample_fps,
        "seconds_used": min(result_a.get("seconds_used") or 0.0, result_b.get("seconds_used") or 0.0),
        "dtw_cost": cost,
    }

    return {
        "meta": meta,
        "similarity": similarity,
        "dtw_cost": cost,
    }


@app.post("/choreo/segment")
async def choreo_segment(
    file: UploadFile = File(...),
    sample_fps: float = Form(10),
    max_seconds: float = Form(30),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="File is required")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")

    started = time.time()
    try:
        result = _process_pose_bytes(content, sample_fps, max_seconds)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"{exc.__class__.__name__}: {exc}") from exc
    duration_ms = int((time.time() - started) * 1000)

    vectors = result.get("vectors") or []
    if len(vectors) < 2:
        raise HTTPException(status_code=400, detail="Pose landmarks not found or too short")

    energies = []
    for i in range(1, len(vectors)):
        diff = [a - b for a, b in zip(vectors[i], vectors[i - 1])]
        norm = sum(d * d for d in diff) ** 0.5
        energies.append(norm / max(len(diff), 1))
    smooth = _moving_average(energies, 5)

    fps = result.get("meta", {}).get("sample_fps") or sample_fps or 10
    min_seg_frames = max(1, int(2.0 * fps))
    mean_energy = sum(smooth) / len(smooth)
    low_thresh = 0.5 * mean_energy if mean_energy > 0 else 0.0
    high_thresh = 1.2 * mean_energy if mean_energy > 0 else 0.0

    segments = []
    last_cut = 0
    reason = "init"
    for idx, val in enumerate(smooth):
        if idx - last_cut < min_seg_frames:
            continue
        if val < low_thresh:
            reason = "low_energy"
            segments.append((last_cut, idx, reason))
            last_cut = idx
        elif val > high_thresh and idx + 1 < len(smooth) and smooth[idx + 1] < val * 0.6:
            reason = "peak_drop"
            segments.append((last_cut, idx, reason))
            last_cut = idx
    if last_cut < len(smooth):
        segments.append((last_cut, len(smooth), "tail"))

    segment_secs = []
    for start, end, why in segments:
        if end - start < min_seg_frames:
            continue
        segment_secs.append(
            {
                "start": round(start / fps, 3),
                "end": round(end / fps, 3),
                "reason": why,
            }
        )

    energy_preview = smooth[:200]
    meta = {
        "processing_ms": duration_ms,
        "frames": len(vectors),
        "sample_fps": sample_fps,
        "duration_sec": result.get("seconds_used"),
    }

    return {
        "segments": segment_secs,
        "energy_preview": energy_preview,
        "meta": meta,
    }


def _segment_from_vectors(vectors, fps):
    segments, _ = _segment_with_energy(vectors, fps)
    return segments


def _segment_with_energy(vectors, fps):
    energies = []
    for i in range(1, len(vectors)):
        diff = [a - b for a, b in zip(vectors[i], vectors[i - 1])]
        norm = sum(d * d for d in diff) ** 0.5
        energies.append(norm / max(len(diff), 1))
    smooth = _moving_average(energies, 5)

    min_seg_frames = max(1, int(2.0 * fps))
    mean_energy = sum(smooth) / len(smooth)
    low_thresh = 0.5 * mean_energy if mean_energy > 0 else 0.0
    high_thresh = 1.2 * mean_energy if mean_energy > 0 else 0.0

    segments = []
    last_cut = 0
    for idx, val in enumerate(smooth):
        if idx - last_cut < min_seg_frames:
            continue
        if val < low_thresh:
            segments.append((last_cut, idx, "low_energy"))
            last_cut = idx
        elif val > high_thresh and idx + 1 < len(smooth) and smooth[idx + 1] < val * 0.6:
            segments.append((last_cut, idx, "peak_drop"))
            last_cut = idx
    if last_cut < len(smooth):
        segments.append((last_cut, len(smooth), "tail"))

    segment_secs = []
    for start, end, why in segments:
        if end - start < min_seg_frames:
            continue
        segment_secs.append(
            {
                "start": round(start / fps, 3),
                "end": round(end / fps, 3),
                "reason": why,
            }
        )

    return segment_secs, smooth


def _load_pose_json(url: str):
    try:
        with urllib.request.urlopen(url) as resp:
            data = resp.read()
        return json.loads(data.decode("utf-8"))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Failed to fetch pose json: {exc}") from exc


def _detect_peaks(series, min_distance=3, max_peaks=200):
    if not series:
        return []
    mean = sum(series) / len(series)
    var = sum((x - mean) ** 2 for x in series) / max(len(series), 1)
    std = var**0.5
    thresh = mean + 0.5 * std

    peaks = []
    last = -10**9
    for i in range(1, len(series) - 1):
        if i - last < min_distance:
            continue
        if series[i] > thresh and series[i] >= series[i - 1] and series[i] >= series[i + 1]:
            peaks.append(i)
            last = i
            if len(peaks) >= max_peaks:
                break
    return peaks


def _audio_peaks_from_video_bytes(video_bytes: bytes, max_seconds: float, max_peaks: int = 200):
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=True) as tmp_video:
        tmp_video.write(video_bytes)
        tmp_video.flush()
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=True) as tmp_wav:
            cmd = [
                "ffmpeg",
                "-y",
                "-i",
                tmp_video.name,
                "-t",
                str(max_seconds),
                "-vn",
                "-ac",
                "1",
                "-ar",
                "16000",
                tmp_wav.name,
            ]
            try:
                subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            except Exception as exc:  # noqa: BLE001
                raise HTTPException(status_code=500, detail=f"ffmpeg_failed: {exc}") from exc

            try:
                with wave.open(tmp_wav.name, "rb") as wf:
                    sr = wf.getframerate()
                    n = wf.getnframes()
                    raw = wf.readframes(n)
            except Exception as exc:  # noqa: BLE001
                raise HTTPException(status_code=500, detail=f"wav_read_failed: {exc}") from exc

    if not raw:
        return {"peaks_ms": [], "duration_ms": 0}

    samples = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
    duration_ms = int(len(samples) / max(sr, 1) * 1000)

    win = int(sr * 0.05)
    hop = int(sr * 0.025)
    if win <= 0 or hop <= 0 or len(samples) < win:
        return {"peaks_ms": [], "duration_ms": duration_ms}

    rms = []
    for start in range(0, len(samples) - win, hop):
        chunk = samples[start : start + win]
        rms.append(float(np.sqrt(np.mean(chunk * chunk))))

    peak_idxs = _detect_peaks(rms, min_distance=3, max_peaks=max_peaks)
    peaks_ms = [int(i * (hop / sr) * 1000) for i in peak_idxs]
    return {"peaks_ms": peaks_ms, "duration_ms": duration_ms}


def _motion_peaks_from_video_bytes(video_bytes: bytes, max_seconds: float, max_peaks: int = 200, sample_fps: float = 10):
    result = _process_pose_bytes(video_bytes, sample_fps, max_seconds)
    vectors = result.get("vectors") or []
    if len(vectors) < 2:
        return {"peaks_ms": [], "frames": len(vectors), "sample_fps": sample_fps, "duration_ms": int((result.get("seconds_used") or 0) * 1000)}

    energies = []
    for i in range(1, len(vectors)):
        prev = vectors[i - 1]
        cur = vectors[i]
        per_lm = []
        for lm in range(33):
            b = lm * 3
            dx = cur[b] - prev[b]
            dy = cur[b + 1] - prev[b + 1]
            dz = cur[b + 2] - prev[b + 2]
            per_lm.append((dx * dx + dy * dy + dz * dz) ** 0.5)
        energies.append(sum(per_lm) / len(per_lm))

    smoothed = _moving_average(energies, 5)
    peak_idxs = _detect_peaks(smoothed, min_distance=2, max_peaks=max_peaks)
    peaks_ms = [int(i / max(sample_fps, 1e-6) * 1000) for i in peak_idxs]
    duration_ms = int((result.get("seconds_used") or 0) * 1000)
    return {"peaks_ms": peaks_ms, "frames": len(vectors), "sample_fps": sample_fps, "duration_ms": duration_ms}


def _mode_lag_ms(audio_peaks_ms, motion_peaks_ms):
    if not audio_peaks_ms or not motion_peaks_ms:
        return 0
    diffs = []
    for ta in audio_peaks_ms[:200]:
        for tm in motion_peaks_ms[:200]:
            d = tm - ta
            if abs(d) <= 2000:
                diffs.append(d)
    if not diffs:
        return 0
    bin_ms = 50
    buckets = {}
    for d in diffs:
        k = int(round(d / bin_ms))
        buckets[k] = buckets.get(k, 0) + 1
    best_k = max(buckets.items(), key=lambda x: x[1])[0]
    return int(best_k * bin_ms)


def _match_rate(a_ms, b_ms, tolerance_ms, lag_ms=0):
    if not a_ms or not b_ms:
        return 0.0
    b_used = [False] * len(b_ms)
    matches = 0
    for ta in a_ms:
        best_j = None
        best_dt = None
        for j, tb in enumerate(b_ms):
            if b_used[j]:
                continue
            dt = abs((tb - lag_ms) - ta)
            if dt <= tolerance_ms and (best_dt is None or dt < best_dt):
                best_dt = dt
                best_j = j
        if best_j is not None:
            b_used[best_j] = True
            matches += 1
    return matches / max(len(a_ms), len(b_ms), 1)


@app.post("/choreo/phrase_compare")
async def choreo_phrase_compare(
    fileA: UploadFile = File(...),
    fileB: UploadFile = File(...),
    sample_fps: float = Form(10),
    max_seconds: float = Form(60),
    top_k: int = Form(3),
):
    if not fileA.filename or not fileB.filename:
        raise HTTPException(status_code=400, detail="fileA and fileB are required")

    content_a = await fileA.read()
    content_b = await fileB.read()
    if not content_a or not content_b:
        raise HTTPException(status_code=400, detail="Empty fileA or fileB")

    started = time.time()
    try:
        result_a = _process_pose_bytes(content_a, sample_fps, max_seconds)
        result_b = _process_pose_bytes(content_b, sample_fps, max_seconds)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"{exc.__class__.__name__}: {exc}") from exc
    duration_ms = int((time.time() - started) * 1000)

    vectors_a = result_a.get("vectors") or []
    vectors_b = result_b.get("vectors") or []
    if len(vectors_a) < 2 or len(vectors_b) < 2:
        raise HTTPException(status_code=400, detail="Pose landmarks not found or too short")

    fps_a = result_a.get("meta", {}).get("sample_fps") or sample_fps or 10
    fps_b = result_b.get("meta", {}).get("sample_fps") or sample_fps or 10

    segs_a = _segment_from_vectors(vectors_a, fps_a)
    segs_b = _segment_from_vectors(vectors_b, fps_b)

    def pool_segment(vecs, start_sec, end_sec, fps_val):
        start_idx = int(start_sec * fps_val)
        end_idx = int(end_sec * fps_val)
        clip = vecs[start_idx:end_idx] if end_idx > start_idx else []
        return _pool_vectors(clip) if clip else []

    emb_a = [pool_segment(vectors_a, s["start"], s["end"], fps_a) for s in segs_a]
    emb_b = [pool_segment(vectors_b, s["start"], s["end"], fps_b) for s in segs_b]

    matches = []
    for seg, vec in zip(segs_a, emb_a):
        cands = []
        mid_a = (float(seg.get("start", 0.0)) + float(seg.get("end", 0.0))) / 2
        for seg_b, vec_b in zip(segs_b, emb_b):
            sim = _cosine_similarity(vec, vec_b) if vec and vec_b else 0.0
            parts = _part_similarity(vec, vec_b) if vec and vec_b else {"upper": 0.0, "core": 0.0, "lower": 0.0}
            sorted_parts_desc = sorted(parts.items(), key=lambda x: x[1], reverse=True)
            dominant = [name for name, _ in sorted_parts_desc[:2]]
            best = _PART_LABELS_JA.get(sorted_parts_desc[0][0], "上半身")
            worst = _PART_LABELS_JA.get(sorted_parts_desc[-1][0], "下半身")
            note = f"{best}の一致が強く、{worst}は差分あり（参考値）"
            mid_b = (float(seg_b.get("start", 0.0)) + float(seg_b.get("end", 0.0))) / 2
            not_similar = _not_similar_explain(parts, mid_a, mid_b)
            cands.append(
                {
                    **seg_b,
                    "similarity": sim,
                    "parts": parts,
                    "explain": {"dominant_parts": dominant, "note": note},
                    "not_similar": not_similar,
                }
            )
        cands_sorted = sorted(cands, key=lambda x: x["similarity"], reverse=True)[: (top_k or 3)]
        matches.append({**seg, "candidates": cands_sorted})

    meta = {
        "processing_ms": duration_ms,
        "segmentsA": len(segs_a),
        "segmentsB": len(segs_b),
    }

    return {
        "matches": matches,
        "meta": meta,
    }


@app.post("/choreo/compute")
async def choreo_compute(payload: Dict[str, Any] = Body(...)):
    mode = payload.get("mode")
    poseA_url = payload.get("poseA_url")
    poseB_url = payload.get("poseB_url")
    top_k = int(payload.get("top_k", 3))
    band = int(payload.get("band", 10))

    if mode not in {"compare", "compare_dtw", "segment", "phrase_compare"}:
        raise HTTPException(status_code=400, detail="Invalid mode")

    pose_a = _load_pose_json(poseA_url) if poseA_url else None
    pose_b = _load_pose_json(poseB_url) if poseB_url else None

    start_ts = time.time()
    try:
        vectors_a = pose_a.get("vectors") if pose_a else None
        vectors_b = pose_b.get("vectors") if pose_b else None

        if mode in {"compare", "compare_dtw", "phrase_compare"}:
            if not vectors_a or not vectors_b:
                raise HTTPException(status_code=400, detail="Pose vectors missing")
        if mode == "segment" and not vectors_a:
            raise HTTPException(status_code=400, detail="Pose vectors missing")

        if mode == "compare":
            vec_a = _pool_vectors(vectors_a)
            vec_b = _pool_vectors(vectors_b)
            similarity = _cosine_similarity(vec_a, vec_b) if vec_a and vec_b else 0.0
            meta = {
                "processing_ms": int((time.time() - start_ts) * 1000),
                "framesA": len(vectors_a),
                "framesB": len(vectors_b),
            }
            return {"meta": meta, "similarity": similarity}

        if mode == "compare_dtw":
            seq_a = _downsample_vectors(vectors_a, 300)
            seq_b = _downsample_vectors(vectors_b, 300)
            cost = _dtw_cost(seq_a, seq_b, band)
            norm = max(len(seq_a), len(seq_b))
            similarity = math.exp(-cost / norm) if norm > 0 else 0.0
            similarity = max(0.0, min(1.0, similarity))
            meta = {
                "processing_ms": int((time.time() - start_ts) * 1000),
                "framesA": len(seq_a),
                "framesB": len(seq_b),
                "band": band,
            }
            return {"meta": meta, "similarity": similarity, "dtw_cost": cost}

        if mode == "segment":
            fps_a = pose_a.get("meta", {}).get("sample_fps") or 10
            segments, energy = _segment_with_energy(vectors_a, fps_a)
            meta = {
                "processing_ms": int((time.time() - start_ts) * 1000),
                "frames": len(vectors_a),
                "sample_fps": fps_a,
                "duration_sec": pose_a.get("seconds_used") or pose_a.get("meta", {}).get("max_seconds"),
            }
            return {
                "segments": segments,
                "energy_preview": energy[:200],
                "meta": meta,
            }

        if mode == "phrase_compare":
            fps_a = pose_a.get("meta", {}).get("sample_fps") or 10
            fps_b = pose_b.get("meta", {}).get("sample_fps") or 10
            segs_a = _segment_from_vectors(vectors_a, fps_a)
            segs_b = _segment_from_vectors(vectors_b, fps_b)

            def pool_segment(vecs, start_sec, end_sec, fps_val):
                start_idx = int(start_sec * fps_val)
                end_idx = int(end_sec * fps_val)
                clip = vecs[start_idx:end_idx] if end_idx > start_idx else []
                return _pool_vectors(clip) if clip else []

            emb_a = [pool_segment(vectors_a, s["start"], s["end"], fps_a) for s in segs_a]
            emb_b = [pool_segment(vectors_b, s["start"], s["end"], fps_b) for s in segs_b]

            matches = []
            for seg, vec in zip(segs_a, emb_a):
                cands = []
                mid_a = (float(seg.get("start", 0.0)) + float(seg.get("end", 0.0))) / 2
                for seg_b, vec_b in zip(segs_b, emb_b):
                    sim = _cosine_similarity(vec, vec_b) if vec and vec_b else 0.0
                    parts = _part_similarity(vec, vec_b) if vec and vec_b else {"upper": 0.0, "core": 0.0, "lower": 0.0}
                    sorted_parts = sorted(parts.items(), key=lambda x: x[1], reverse=True)
                    dominant = [name for name, _ in sorted_parts[:2]]
                    best = _PART_LABELS_JA.get(sorted_parts[0][0], "上半身")
                    worst = _PART_LABELS_JA.get(sorted_parts[-1][0], "下半身")
                    note = f"{best}の一致が強く、{worst}は差分あり（参考値）"
                    mid_b = (float(seg_b.get("start", 0.0)) + float(seg_b.get("end", 0.0))) / 2
                    not_similar = _not_similar_explain(parts, mid_a, mid_b)
                    cands.append(
                        {
                            **seg_b,
                            "similarity": sim,
                            "parts": parts,
                            "explain": {"dominant_parts": dominant, "note": note},
                            "not_similar": not_similar,
                        }
                    )
                cands_sorted = sorted(cands, key=lambda x: x["similarity"], reverse=True)[: (top_k or 3)]
                matches.append({**seg, "candidates": cands_sorted})

            meta = {
                "processing_ms": int((time.time() - start_ts) * 1000),
                "segmentsA": len(segs_a),
                "segmentsB": len(segs_b),
            }
            return {"matches": matches, "meta": meta}
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"{exc.__class__.__name__}: {exc}") from exc


@app.post("/multimodal/align")
async def multimodal_align(
    file: UploadFile = File(...),
    max_seconds: float = Form(60),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="File is required")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")

    max_seconds = float(max_seconds) if max_seconds and max_seconds > 0 else 60.0
    tolerance_ms = 150

    started = time.time()
    try:
        audio = _audio_peaks_from_video_bytes(content, max_seconds, 200)
        motion = _motion_peaks_from_video_bytes(content, max_seconds, 200, 10)
        lag_ms = _mode_lag_ms(audio["peaks_ms"], motion["peaks_ms"])
        sync_score = _match_rate(audio["peaks_ms"], motion["peaks_ms"], tolerance_ms, lag_ms)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"{exc.__class__.__name__}: {exc}") from exc

    processing_ms = int((time.time() - started) * 1000)
    meta = {
        "processing_ms": processing_ms,
        "frames": motion.get("frames"),
        "sample_fps": motion.get("sample_fps"),
        "duration_sec": round(min(max_seconds, (motion.get("duration_ms") or 0) / 1000), 3),
        "max_seconds": max_seconds,
        "tolerance_ms": tolerance_ms,
    }

    return {
        "meta": meta,
        "audio_peaks": audio["peaks_ms"][:200],
        "motion_peaks": motion["peaks_ms"][:200],
        "sync_score": round(sync_score, 4),
        "lag_ms": lag_ms,
    }


@app.post("/multimodal/compare")
async def multimodal_compare(
    fileA: UploadFile = File(...),
    fileB: UploadFile = File(...),
    max_seconds: float = Form(60),
):
    if not fileA.filename or not fileB.filename:
        raise HTTPException(status_code=400, detail="fileA and fileB are required")

    content_a = await fileA.read()
    content_b = await fileB.read()
    if not content_a or not content_b:
        raise HTTPException(status_code=400, detail="Empty fileA or fileB")

    max_seconds = float(max_seconds) if max_seconds and max_seconds > 0 else 60.0
    tolerance_ms = 150

    started = time.time()
    try:
        audio_a = _audio_peaks_from_video_bytes(content_a, max_seconds, 200)
        motion_a = _motion_peaks_from_video_bytes(content_a, max_seconds, 200, 10)
        lag_a = _mode_lag_ms(audio_a["peaks_ms"], motion_a["peaks_ms"])
        sync_a = _match_rate(audio_a["peaks_ms"], motion_a["peaks_ms"], tolerance_ms, lag_a)

        audio_b = _audio_peaks_from_video_bytes(content_b, max_seconds, 200)
        motion_b = _motion_peaks_from_video_bytes(content_b, max_seconds, 200, 10)
        lag_b = _mode_lag_ms(audio_b["peaks_ms"], motion_b["peaks_ms"])
        sync_b = _match_rate(audio_b["peaks_ms"], motion_b["peaks_ms"], tolerance_ms, lag_b)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"{exc.__class__.__name__}: {exc}") from exc

    # Similarity via near-match ratio on normalized peaks.
    def _norm(peaks_ms, duration_ms):
        denom = max(duration_ms, 1)
        return [p / denom for p in peaks_ms]

    def _match_norm(a_norm, b_norm, tol):
        if not a_norm or not b_norm:
            return 0.0
        used = [False] * len(b_norm)
        matches = 0
        for x in a_norm:
            best_j = None
            best_dt = None
            for j, y in enumerate(b_norm):
                if used[j]:
                    continue
                dt = abs(y - x)
                if dt <= tol and (best_dt is None or dt < best_dt):
                    best_dt = dt
                    best_j = j
            if best_j is not None:
                used[best_j] = True
                matches += 1
        return matches / max(len(a_norm), len(b_norm), 1)

    audio_similarity = _match_norm(
        _norm(audio_a["peaks_ms"], audio_a["duration_ms"]),
        _norm(audio_b["peaks_ms"], audio_b["duration_ms"]),
        0.02,
    )
    motion_similarity = _match_norm(
        _norm(motion_a["peaks_ms"], motion_a["duration_ms"]),
        _norm(motion_b["peaks_ms"], motion_b["duration_ms"]),
        0.03,
    )

    if audio_similarity >= 0.7 and motion_similarity >= 0.7:
        interpretation = "音声と動きのピークパターンが近い可能性があります（参考値）"
    elif audio_similarity >= 0.7:
        interpretation = "音声のピークパターンは近い一方、動きのピークは差分がある可能性があります（参考値）"
    elif motion_similarity >= 0.7:
        interpretation = "動きのピークパターンは近い一方、音声ピークは差分がある可能性があります（参考値）"
    else:
        interpretation = "音声/動きのピークパターンに差分がある可能性があります（参考値）"

    processing_ms = int((time.time() - started) * 1000)
    meta = {"processing_ms": processing_ms, "max_seconds": max_seconds, "tolerance_ms": tolerance_ms}

    return {
        "meta": meta,
        "audio_similarity": round(audio_similarity, 4),
        "motion_similarity": round(motion_similarity, 4),
        "interpretation": interpretation,
        "A": {"audio_peaks": audio_a["peaks_ms"][:200], "motion_peaks": motion_a["peaks_ms"][:200], "sync_score": round(sync_a, 4), "lag_ms": lag_a},
        "B": {"audio_peaks": audio_b["peaks_ms"][:200], "motion_peaks": motion_b["peaks_ms"][:200], "sync_score": round(sync_b, 4), "lag_ms": lag_b},
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
