'use client';
import { UserProfile } from '@clerk/nextjs';

export default function UserProfilePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="w-full max-w-md">
        <UserProfile />
      </div>
    </main>
  );
} 