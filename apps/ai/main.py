import os
import tempfile
import time
from typing import Any, Dict, Optional

import whisper
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


def _cosine_similarity(a, b):
    import math

    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
