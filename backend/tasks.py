from youtube_utils import download_youtube_audio_limited, AudioTooLongError
from openai_utils import transcribe_audio_with_whisper, summarize_text_with_gpt4, generate_srt_from_segments
from db import get_db
from models import TranscriptModel
import traceback
import datetime
import shutil
import os

def run_transcription_job(job_id, user_id, video_url, video_title, plan_level):
    db = get_db()
    # Fallback/defaults for user_id and video_title
    if not user_id:
        user_id = "anonymous"
        print(f"Warning: user_id is None for job_id {job_id}, defaulting to 'anonymous'.")
    if not video_title:
        video_title = "Untitled Video"
        print(f"Warning: video_title is None for job_id {job_id}, defaulting to 'Untitled Video'.")
    log = {"job_id": job_id, "user_id": user_id, "video_url": video_url, "status": "processing", "logs": [], "created_at": datetime.datetime.utcnow()}
    try:
        # 1. Download audio
        log["logs"].append("Downloading audio...")
        audio_path = download_youtube_audio_limited(video_url, max_duration_minutes=30 if plan_level=="free" else 240)
        log["logs"].append(f"Audio downloaded: {audio_path}")
        # Copy audio to static/audio for public serving
        static_dir = os.path.join(os.path.dirname(__file__), "static", "audio")
        os.makedirs(static_dir, exist_ok=True)
        ext = os.path.splitext(audio_path)[1]
        audio_filename = f"{job_id}{ext}"
        public_audio_path = os.path.join(static_dir, audio_filename)
        shutil.copy(audio_path, public_audio_path)
        audio_url = f"/static/audio/{audio_filename}"
        # 2. Transcribe
        log["logs"].append("Transcribing audio...")
        db.job_logs.update_one({"job_id": job_id}, {"$set": log}, upsert=True)
        # AssemblyAI progress logging
        import time
        from openai_utils import transcribe_audio_with_whisper
        def progress_callback(status_msg):
            log["logs"].append(status_msg)
            db.job_logs.update_one({"job_id": job_id}, {"$set": log}, upsert=True)
        whisper_result = transcribe_audio_with_whisper(audio_path, progress_callback=progress_callback)
        transcript = whisper_result["text"]
        segments = whisper_result.get("segments")
        log["logs"].append("Transcription complete.")
        db.job_logs.update_one({"job_id": job_id}, {"$set": log}, upsert=True)
        # 3. Summarize (if premium)
        summary = None
        if plan_level == "premium":
            log["logs"].append("Summarizing transcript...")
            summary = summarize_text_with_gpt4(transcript)
            log["logs"].append("Summary complete.")
        # 4. SRT (if premium)
        srt = None
        if plan_level == "premium" and segments:
            srt = generate_srt_from_segments(segments)
            log["logs"].append("SRT generated.")
        # 5. Store in DB
        doc = TranscriptModel(
            user_id=user_id,
            video_url=video_url,
            video_title=video_title,
            transcript=transcript,
            summary=summary,
            subtitle_srt=srt,
            created_at=datetime.datetime.utcnow(),
            duration=None,  # You can extract from yt-dlp info if needed
            status="done",
            job_id=job_id,
            audio_url=audio_url
        ).dict()
        print("Preparing to insert transcript into MongoDB...")
        print(f"Transcript doc: {doc}")
        db.transcriptions.insert_one(doc)
        print("Transcript inserted successfully.")
        log["status"] = "done"
    except AudioTooLongError as e:
        log["status"] = "failed"
        log["logs"].append(f"Audio too long: {str(e)}")
        print(f"Transcription error (AudioTooLongError): {e}\n{traceback.format_exc()}")
    except Exception as e:
        log["status"] = "failed"
        log["logs"].append(f"Error: {str(e)}\n{traceback.format_exc()}")
        print(f"Transcription error (Exception): {e}\n{traceback.format_exc()}")
    finally:
        db.job_logs.update_one({"job_id": job_id}, {"$set": log}, upsert=True)
    return log["status"] 