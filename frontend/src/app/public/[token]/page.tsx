"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { DocumentTextIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

type PublicTranscript = {
  video_title: string;
  transcript: string;
  summary?: string;
  created_at: string;
  public_views: number;
};

export default function PublicTranscriptPage() {
  const { token } = useParams();
  const [data, setData] = useState<PublicTranscript | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("transcript");

  useEffect(() => {
    setLoading(true);
    fetch(`${BACKEND_URL}/public/${token}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found or expired");
        return res.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <main className="max-w-3xl mx-auto p-4 sm:p-8">
      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <ExclamationCircleIcon className="w-6 h-6" />
          <span>{error}</span>
        </div>
      ) : (
        data && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <DocumentTextIcon className="w-7 h-7 text-blue-500" />
              <h1 className="text-2xl font-bold flex-1">{data.video_title}</h1>
              <span className="text-xs text-gray-400">Views: {data.public_views}</span>
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
              <pre className="whitespace-pre-wrap break-words text-sm">
                {tab === "transcript" ? data.transcript : data.summary}
              </pre>
            </div>
          </>
        )
      )}
    </main>
  );
} 