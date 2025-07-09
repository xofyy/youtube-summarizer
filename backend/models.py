from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime

class TranscriptModel(BaseModel):
    user_id: str
    video_url: str
    video_title: str
    transcript: str
    summary: Optional[str] = None
    subtitle_srt: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    duration: Optional[float] = None  # seconds
    status: Literal['processing', 'done', 'failed'] = 'processing'
    public_token: Optional[str] = None
    public_expires: Optional[datetime] = None
    public_views: int = 0
    job_id: str = ""
    audio_url: Optional[str] = None

    class Config:
        arbitrary_types_allowed = True
        json_encoders = {datetime: lambda v: v.isoformat()}
        schema_extra = {
            "example": {
                "user_id": "user_123",
                "video_url": "https://youtube.com/watch?v=abc123",
                "video_title": "Sample Video",
                "transcript": "...",
                "summary": "...",
                "subtitle_srt": "...",
                "created_at": "2024-01-01T00:00:00Z",
                "duration": 1234.5,
                "status": "done",
                "public_token": "abc123xyz",
                "public_expires": "2024-01-31T00:00:00Z",
                "public_views": 0
            }
        } 