"use client";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { DocumentTextIcon, ClipboardIcon, CheckCircleIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { jsPDF } from "jspdf";
import { useRouter } from "next/navigation";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

type TranscriptionData = {
  video_title: string;
  transcript: string;
  summary?: string;
  subtitle_srt?: string;
  status: 'processing' | 'done' | 'failed';
  audio_url?: string;
  // add other fields as needed
};

export default function TranscriptionDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState<TranscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("transcript");
  const [copied, setCopied] = useState(false);
  const [publicLink, setPublicLink] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  useEffect(() => {
    // If id is not a valid Mongo ObjectId, treat as job_id and poll status
    if (typeof id === "string" && id.length !== 24) {
      let interval: NodeJS.Timeout;
      let stopped = false;
      const poll = async () => {
        const res = await fetch(`${BACKEND_URL}/status/${id}`);
        const statusData = await res.json();
        setLogs(statusData.logs || []);
        if (statusData.status === "done" && statusData.transcription_id) {
          stopped = true;
          router.replace(`/transcription/${statusData.transcription_id}`);
        } else if (statusData.status === "failed") {
          setError("Transcription failed.");
          setLoading(false);
          stopped = true;
        }
      };
      setLoading(true);
      poll();
      interval = setInterval(() => {
        if (!stopped) poll();
      }, 2000);
      return () => clearInterval(interval);
    } else {
      setLoading(true);
      fetch(`${BACKEND_URL}/transcriptions/${id}`)
        .then((res) => {
          if (!res.ok) throw new Error("Not found");
          return res.json();
        })
        .then(setData)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }
  }, [id, router]);

  const handleCopy = () => {
    if (!data) return;
    navigator.clipboard.writeText(tab === "transcript" ? data.transcript : data.summary || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  function exportAsTxt(filename: string, text: string) {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportAsJson(filename: string, data: any) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportAsSrt(filename: string, srt: string) {
    const blob = new Blob([srt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportAsPdf(filename: string, text: string, title?: string) {
    const doc = new jsPDF();
    if (title) {
      doc.setFontSize(16);
      doc.text(title, 10, 15);
      doc.setFontSize(12);
      doc.text("\n", 10, 25);
    }
    doc.setFontSize(12);
    doc.text(text, 10, title ? 30 : 10, { maxWidth: 180 });
    doc.save(filename);
  }

  const handleDownload = (type: string) => {
    if (!data) return;
    if (type === "txt") {
      exportAsTxt("transcription.txt", data.transcript);
    } else if (type === "json") {
      exportAsJson("transcription.json", data);
    } else if (type === "srt") {
      exportAsSrt("transcription.srt", data.subtitle_srt || "");
    } else if (type === "pdf") {
      exportAsPdf("transcription.pdf", data.transcript, data.video_title);
    }
  };

  const handleShare = async () => {
    if (!data) return;
    const res = await fetch(`${BACKEND_URL}/transcriptions/${id}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const result = await res.json();
    if (result.public_token) {
      setPublicLink(`${window.location.origin}/public/${result.public_token}`);
    }
  };

  return (
    <main className="max-w-3xl mx-auto p-4 sm:p-8">
      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      ) : error ? (
        <div className="text-red-600 text-sm mt-2">
          {error}
        </div>
      ) : null}

      {/* Always show logs if present and job is processing */}
      {logs && logs.length > 0 && (
        <div className="mt-2 bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs max-h-40 overflow-auto border border-gray-200 dark:border-gray-700" style={{ position: 'relative' }}>
          <strong>Progress:</strong>
          <pre className="whitespace-pre-wrap break-words">{logs.join('\n')}</pre>
          <div ref={logsEndRef} />
        </div>
      )}

      {data && (
        <>
          {data.audio_url && (
            <div className="mb-4">
              <audio controls src={`${BACKEND_URL}${data.audio_url}`} className="w-full">
                Your browser does not support the audio element.
              </audio>
            </div>
          )}
          <div className="flex items-center gap-2 mb-2">
            <DocumentTextIcon className="w-7 h-7 text-blue-500" />
            <h1 className="text-2xl font-bold flex-1">{data.video_title}</h1>
            {data.status === "done" && <CheckCircleIcon className="w-6 h-6 text-green-500" title="Done" />}
            {data.status === "processing" && <span className="text-yellow-500">Loading...</span>}
            {data.status === "failed" && <ExclamationCircleIcon className="w-6 h-6 text-red-500" title="Error" />}
          </div>
          <div className="flex gap-2 mb-4">
            <button
              className={`px-4 py-2 rounded-t ${tab === "transcript" ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200"}`}
              onClick={() => setTab("transcript")}
            >
              Transcript
            </button>
            {data.summary && (
              <button
                className={`px-4 py-2 rounded-t ${tab === "summary" ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200"}`}
                onClick={() => setTab("summary")}
              >
                Summary
              </button>
            )}
          </div>
          <div className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-b shadow p-4 max-h-96 overflow-y-auto mb-4">
            <button
              className="absolute top-2 right-2 p-2 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
              onClick={handleCopy}
              title="Copy to clipboard"
            >
              <ClipboardIcon className="w-5 h-5 inline" />
              {copied && <span className="ml-1 text-green-500">Copied!</span>}
            </button>
            <pre className="whitespace-pre-wrap break-words text-sm">
              {tab === "transcript" ? data.transcript : data.summary}
            </pre>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn" onClick={() => handleDownload("txt")}>Download TXT</button>
            <button className="btn" onClick={() => handleDownload("pdf")}>Download PDF</button>
            <button className="btn" onClick={() => handleDownload("srt")}>Download SRT</button>
            <button className="btn" onClick={() => handleDownload("json")}>Download JSON</button>
            <button className="btn bg-green-600 hover:bg-green-700 text-white" onClick={handleShare} type="button">Share</button>
          </div>
          {publicLink && (
            <div className="mt-4 p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm break-all">
              Public link: <a href={publicLink} className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">{publicLink}</a>
            </div>
          )}
        </>
      )}
    </main>
  );
} 