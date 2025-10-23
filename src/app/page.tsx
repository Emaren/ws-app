'use client';

import { useSession } from 'next-auth/react';

export default function HomePage() {
  const { data: session } = useSession();

  return (
    <main className="flex items-center justify-center min-h-[80vh] px-6 text-center">
      <div className="max-w-xl">
        
      </div>
    </main>
  );
}
