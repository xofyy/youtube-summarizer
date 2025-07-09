from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File, Form, Depends, Request, Body, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import uuid4
from bson import ObjectId
from datetime import datetime, timedelta

from db import get_db
from models import TranscriptModel
from youtube_utils import download_youtube_audio_limited
from openai_utils import transcribe_audio_with_whisper, summarize_text_with_gpt
import asyncio
from tasks import run_transcription_job

app = FastAPI()
jobs = {}

# Allow CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static/audio for serving audio files
static_audio_path = os.path.join(os.path.dirname(__file__), "static", "audio")
os.makedirs(static_audio_path, exist_ok=True)
app.mount("/static/audio", StaticFiles(directory=static_audio_path), name="static-audio")

# --- Models ---
class TranscriptionRequest(BaseModel):
    youtube_url: str
    transcript_type: str  # "transcript", "summary", "subtitles"
    user_id: Optional[str] = None
    video_title: Optional[str] = None
    plan_level: Optional[str] = None

class SummarizeRequest(BaseModel):
    transcription_id: str
    prompt: Optional[str] = None

class Transcription(BaseModel):
    user_id: str
    video_url: str
    video_title: str
    transcript: str
    summary: Optional[str] = None
    subtitle_srt: Optional[str] = None
    created_at: str
    duration: Optional[float] = None
    status: str
    public_token: Optional[str] = None
    public_expires: Optional[str] = None
    public_views: int = 0
    job_id: str = ""
    audio_url: Optional[str] = None
    id: str

# --- Routes ---
async def process_transcription_job(job_id, req: TranscriptionRequest, db):
    try:
        jobs[job_id] = "downloading"
        audio_path = await download_youtube_audio_limited(req.youtube_url)
        jobs[job_id] = "transcribing"
        text = await transcribe_audio_with_whisper(audio_path)
        doc = TranscriptModel(
            youtube_url=req.youtube_url,
            transcript_type=req.transcript_type,
            text=text,
            created_at=datetime.utcnow(),
            status="completed",
            user_id=req.user_id
        ).dict(by_alias=True)
        result = await db.transcriptions.insert_one(doc)
        jobs[job_id] = "completed"
        return str(result.inserted_id)
    except Exception as e:
        jobs[job_id] = f"error: {e}"
        raise

@app.post("/transcribe")
async def transcribe(
    req: TranscriptionRequest,
    background_tasks: BackgroundTasks,
    db=Depends(get_db),
    force: bool = Query(default=False)
):
    # If not force, check for existing transcript
    if not force:
        existing = await db.transcriptions.find_one({"video_url": req.youtube_url})
        if existing:
            return {
                "already_exists": True,
                "job_id": existing.get("job_id", str(existing.get("_id"))),
                "status": existing.get("status", "done"),
                "transcription_id": str(existing.get("_id")),
                "transcript": existing.get("transcript"),
                "video_title": existing.get("video_title"),
                # Add more fields as needed
            }
    job_id = str(uuid4())
    db.job_logs.insert_one({"job_id": job_id, "status": "processing", "logs": [], "created_at": datetime.utcnow()})
    from tasks import run_transcription_job
    background_tasks.add_task(run_transcription_job, job_id, req.user_id, req.youtube_url, req.video_title, req.plan_level)
    return {"job_id": job_id, "status": "processing", "already_exists": False}

@app.get("/status/{job_id}")
async def get_status(job_id: str, db=Depends(get_db)):
    log = await db.job_logs.find_one({"job_id": job_id})
    if not log:
        return {"job_id": job_id, "status": "unknown"}
    # If job is done, find the corresponding transcript
    transcription_id = None
    if log["status"] == "done":
        doc = await db.transcriptions.find_one({"job_id": job_id})
        if doc:
            transcription_id = str(doc["_id"])
    return {
        "job_id": job_id,
        "status": log["status"],
        "logs": log.get("logs", []),
        "transcription_id": transcription_id
    }

@app.get("/transcriptions", response_model=List[Transcription])
async def list_transcriptions(user_id: Optional[str] = None, db=Depends(get_db)):
    query = {"user_id": user_id} if user_id else {}
    docs = await db.transcriptions.find(query).to_list(100)
    return [Transcription(**doc, id=str(doc["_id"])) for doc in docs]

@app.get("/transcriptions/{id}", response_model=Transcription)
async def get_transcription(id: str, db=Depends(get_db)):
    doc = await db.transcriptions.find_one({"_id": ObjectId(id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    # Convert created_at to ISO string if it's a datetime
    if isinstance(doc.get("created_at"), datetime):
        doc["created_at"] = doc["created_at"].isoformat()
    return Transcription(**doc, id=str(doc["_id"]))

@app.post("/summarize")
async def summarize(req: SummarizeRequest, db=Depends(get_db)):
    doc = await db.transcriptions.find_one({"_id": ObjectId(req.transcription_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    summary = await summarize_text_with_gpt(doc["text"], req.prompt or "Summarize this:")
    await db.transcriptions.update_one({"_id": ObjectId(req.transcription_id)}, {"$set": {"summary": summary}})
    return {"summary": summary}

@app.post("/transcriptions/{id}/share")
async def share_transcription(id: str, expires_in_hours: int = Body(default=0), db=Depends(get_db)):
    token = str(uuid4())[:8]
    update = {"public_token": token, "public_views": 0}
    if expires_in_hours > 0:
        update["public_expires"] = datetime.utcnow() + timedelta(hours=expires_in_hours)
    await db.transcriptions.update_one({"_id": ObjectId(id)}, {"$set": update})
    return {"public_token": token}

@app.get("/public/{token}")
async def public_transcript(token: str, db=Depends(get_db)):
    doc = await db.transcriptions.find_one({"public_token": token})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    # Check expiry
    expires = doc.get("public_expires")
    if expires and datetime.utcnow() > expires:
        raise HTTPException(status_code=410, detail="Link expired")
    # Increment view counter
    await db.transcriptions.update_one({"_id": doc["_id"]}, {"$inc": {"public_views": 1}})
    return {
        "video_title": doc["video_title"],
        "transcript": doc["transcript"],
        "summary": doc.get("summary"),
        "created_at": doc["created_at"],
        "public_views": doc.get("public_views", 0) + 1
    } 