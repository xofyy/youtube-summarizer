import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function AdminPage() {
  const { userId } = auth();
  if (!userId) redirect('/auth');
  const user = await currentUser();
  if (user?.publicMetadata?.role !== 'admin') redirect('/');
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-4">Admin Panel</h1>
      <p className="text-gray-500 dark:text-gray-400">(Admin only) Usage stats and controls will be shown here.</p>
    </main>
  );
} 