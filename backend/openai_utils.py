import os
import openai
import requests
import whisper

client = openai.OpenAI(api_key="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")

def transcribe_audio_with_whisper(audio_path: str, language: str = None, progress_callback=None) -> dict:
    """
    Transcribe audio using local Whisper model. Returns a dict with 'text' and 'segments'.
    """
    if progress_callback:
        progress_callback("Loading Whisper model (base)...")
    # Use GPU if available
    import torch
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = whisper.load_model("base", device=device)
    if progress_callback:
        progress_callback(f"Transcribing audio with Whisper on {device.upper()}...")
    result = model.transcribe(audio_path, language=language)
    if progress_callback:
        progress_callback("Transcription completed!")
    return {
        "text": result["text"],
        "segments": result.get("segments")
    }

async def summarize_text_with_gpt(text: str, prompt: str = "Summarize this:") -> str:
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": text},
        ],
        max_tokens=256,
    )
    return response["choices"][0]["message"]["content"].strip()

def summarize_text_with_gpt4(text: str, language: str = "English") -> str:
    prompt = (
        f"Summarize the following transcript in about 5 sentences in {language}. "
        "Focus on the main points and keep it concise.\n\nTranscript:\n" + text
    )
    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": f"You are a helpful assistant that summarizes transcripts in {language}."},
            {"role": "user", "content": prompt},
        ],
        max_tokens=512,
        temperature=0.4,
    )
    return response["choices"][0]["message"]["content"].strip()

def generate_srt_from_segments(segments: list) -> str:
    """
    segments: list of dicts with 'start', 'end', 'text' (as returned by Whisper)
    Returns SRT file content as string.
    """
    def format_time(seconds: float) -> str:
        h = int(seconds // 3600)
        m = int((seconds % 3600) // 60)
        s = int(seconds % 60)
        ms = int((seconds - int(seconds)) * 1000)
        return f"{h:02}:{m:02}:{s:02},{ms:03}"

    srt_lines = []
    for idx, seg in enumerate(segments, 1):
        start = format_time(seg['start'])
        end = format_time(seg['end'])
        text = seg['text'].strip()
        srt_lines.append(f"{idx}\n{start} --> {end}\n{text}\n")
    return "\n".join(srt_lines) 