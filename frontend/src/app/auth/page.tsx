'use client';
import { SignIn, SignUp } from '@clerk/nextjs';
import { useState } from 'react';

export default function AuthPage() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="flex gap-4 mb-6">
        <button
          className={`btn ${mode === 'sign-in' ? '' : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
          onClick={() => setMode('sign-in')}
        >
          Login
        </button>
        <button
          className={`btn ${mode === 'sign-up' ? '' : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
          onClick={() => setMode('sign-up')}
        >
          Sign Up
        </button>
      </div>
      <div className="w-full max-w-md">
        {mode === 'sign-in' ? <SignIn /> : <SignUp />}
      </div>
    </main>
  );
} 