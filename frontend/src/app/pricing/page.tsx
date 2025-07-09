"use client";
import { loadStripe } from "@stripe/stripe-js";
import { useState } from "react";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function PricingPage() {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    const res = await fetch("/api/stripe/checkout", { method: "POST" });
    const { sessionId } = await res.json();
    const stripe = await stripePromise;
    await stripe?.redirectToCheckout({ sessionId });
    setLoading(false);
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-8">Pricing</h1>
      <div className="flex flex-col sm:flex-row gap-8 w-full max-w-3xl">
        <div className="flex-1 border rounded-lg p-6 bg-white dark:bg-gray-900 shadow">
          <h2 className="text-xl font-bold mb-2">Free</h2>
          <p className="mb-4 text-gray-500 dark:text-gray-400">Max 5 transcriptions/month. No summary or SRT export.</p>
          <ul className="mb-6 list-disc list-inside text-gray-700 dark:text-gray-200">
            <li>5 transcriptions/month</li>
            <li>Transcript only</li>
            <li>Basic support</li>
          </ul>
          <button className="btn opacity-60 cursor-not-allowed" disabled>Current Plan</button>
        </div>
        <div className="flex-1 border-2 border-blue-600 rounded-lg p-6 bg-white dark:bg-gray-900 shadow-lg">
          <h2 className="text-xl font-bold mb-2 text-blue-600">Premium</h2>
          <p className="mb-4 text-gray-500 dark:text-gray-400">Unlimited transcriptions, summary & SRT export, priority support.</p>
          <ul className="mb-6 list-disc list-inside text-gray-700 dark:text-gray-200">
            <li>Unlimited transcriptions</li>
            <li>Summary & SRT export</li>
            <li>Priority support</li>
          </ul>
          <button className="btn bg-blue-600 hover:bg-blue-700 text-white w-full" onClick={handleCheckout} disabled={loading}>
            {loading ? "Redirecting..." : "Upgrade to Premium"}
          </button>
        </div>
      </div>
    </main>
  );
} 