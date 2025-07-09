export async function submitTranscriptionRequest(videoUrl: string, transcriptType: string, force: boolean = false) {
  const apiUrl = "http://localhost:8000";

  // YouTube URL validation
  const isValidYouTubeUrl = (url: string): boolean => {
    const youtubeRegex = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return youtubeRegex.test(url);
  };

  if (!isValidYouTubeUrl(videoUrl)) {
    return {
      job_id: null,
      status: "error",
      message: "Please enter a valid YouTube URL",
    };
  }

  try {
    const url = `${apiUrl}/transcribe${force ? '?force=true' : ''}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ youtube_url: videoUrl, transcript_type: transcriptType }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.detail || error.message || `HTTP ${res.status}: ${res.statusText}`);
    }

    return await res.json();
  } catch (err: unknown) {
    if (err instanceof TypeError && (err as Error).message.includes('fetch')) {
      return {
        job_id: null,
        status: "error",
        message: "Cannot connect to server. Please check if the API is running.",
      };
    }
    return {
      job_id: null,
      status: "error",
      message: (err as Error).message || "Unknown error occurred",
    };
  }
}