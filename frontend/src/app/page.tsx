"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitTranscriptionRequest } from "../../lib/api"; // Fixed: Added space

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  type ExistingTranscript = {
    transcription_id: string;
    transcript: string;
    video_title: string;
    job_id: string;
    status: string;
  } | null;
  const [existing, setExisting] = useState<ExistingTranscript>(null);
  const router = useRouter();

  const handleSubmit = async (mode: string, force = false) => {
    setLoading(true);
    setError(null);
    setExisting(null);
    try {
      const res = await submitTranscriptionRequest(url, mode, force);
      if (res.already_exists) {
        setExisting({
          transcription_id: res.transcription_id,
          transcript: res.transcript,
          video_title: res.video_title,
          job_id: res.job_id,
          status: res.status,
        });
        setLoading(false);
        return;
      }
      if (res.job_id) {
        router.push(`/transcription/${res.job_id}`);
      } else {
        setError(res.message || "An error occurred");
      }
    } catch (err: unknown) {
      setError((err as Error).message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex flex-1 flex-col items-center justify-center p-8 gap-8">
        <h1 className="text-4xl font-bold mb-2 text-center">YouTube Summarizer</h1>
        <p className="text-lg text-gray-500 dark:text-gray-400 mb-6 text-center max-w-xl">
          Paste a YouTube URL below and choose what you want: transcript, summary, or subtitles.
        </p>
        
        {/* Loading overlay */}
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <span>Processing your request...</span>
            </div>
          </div>
        )}

        <form className="w-full max-w-md flex flex-col gap-4 items-center" onSubmit={e => e.preventDefault()}>
          <input
            type="url"
            placeholder="Enter YouTube URL (e.g., https://youtube.com/watch?v=...)"
            value={url}
            onChange={e => setUrl(e.target.value)}
            className="w-full px-4 py-3 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
            required
            disabled={loading}
          />
          
          <div className="flex gap-2 w-full justify-center">
            <button 
              type="button" 
              className="btn w-full sm:w-auto" 
              onClick={() => handleSubmit("transcript")} 
              disabled={loading || !url.trim()}
            >
              {loading ? "Processing..." : "Transcript"}
            </button>
            <button 
              type="button" 
              className="btn w-full sm:w-auto" 
              onClick={() => handleSubmit("summary")} 
              disabled={loading || !url.trim()}
            >
              {loading ? "Processing..." : "Summary"}
            </button>
            <button 
              type="button" 
              className="btn w-full sm:w-auto" 
              onClick={() => handleSubmit("subtitles")} 
              disabled={loading || !url.trim()}
            >
              {loading ? "Processing..." : "Subtitles"}
            </button>
          </div>
          
          {existing && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-4 mt-4 w-full text-center">
              <div className="font-semibold mb-2">A transcript for this video already exists.</div>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <button
                  className="btn btn-primary"
                  onClick={() => router.push(`/transcription/${existing.transcription_id}`)}
                  type="button"
                >
                  View Existing Transcript
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleSubmit("transcript", true)}
                  type="button"
                >
                  Generate New Transcript Anyway
                </button>
              </div>
            </div>
          )}
          {error && (
            <div className="text-red-600 text-sm mt-2 p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}
        </form>
      </main>
    </div>
  );
}