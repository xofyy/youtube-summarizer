import yt_dlp
import tempfile
import os

class AudioTooLongError(Exception):
    pass

def download_youtube_audio_limited(youtube_url: str, max_duration_minutes: int = 30, audio_format: str = "mp3") -> str:
    temp_dir = tempfile.mkdtemp()
    output_path = os.path.join(temp_dir, f'%(id)s.%(ext)s')
    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': output_path,
        'quiet': True,
        'noplaylist': True,
        'extractaudio': True,
        'audioformat': audio_format,
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(youtube_url, download=False)
        duration = info.get('duration', 0)
        if duration > max_duration_minutes * 60:
            raise AudioTooLongError(f"Audio is too long: {duration/60:.1f} min (max {max_duration_minutes} min)")
        # Now actually download
        info = ydl.extract_info(youtube_url, download=True)
        filename = ydl.prepare_filename(info)
        # If not mp3/wav, convert (yt-dlp usually handles this)
        if not filename.endswith(f'.{audio_format}'):
            base = os.path.splitext(filename)[0]
            new_filename = f"{base}.{audio_format}"
            if os.path.exists(new_filename):
                return new_filename
        return filename 