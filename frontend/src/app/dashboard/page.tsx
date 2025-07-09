"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL;

type DashboardTranscription = {
  _id: string;
  video_title: string;
  status: string;
  created_at: string;
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardTranscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${BACKEND_URL}/transcriptions`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="max-w-3xl mx-auto p-4 sm:p-8">
      <h1 className="text-2xl font-bold mb-6">My Transcriptions</h1>
      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : data.length === 0 ? (
        <div className="text-gray-500">No transcriptions found.</div>
      ) : (
        <ul className="space-y-4">
          {data.map((t) => (
            <li key={t._id} className="border rounded p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white dark:bg-gray-900">
              <div>
                <div className="font-semibold text-lg">{t.video_title}</div>
                <div className="text-xs text-gray-400">Created: {new Date(t.created_at).toLocaleString()}</div>
                <div className="text-xs">Status: <span className={t.status === 'done' ? 'text-green-600' : t.status === 'failed' ? 'text-red-600' : 'text-yellow-600'}>{t.status}</span></div>
              </div>
              <Link href={`/transcription/${t._id}`} className="btn w-full sm:w-auto mt-2 sm:mt-0">View</Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
} 