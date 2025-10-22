'use client';

import { useSession } from 'next-auth/react';

export default function HomePage() {
  const { data: session } = useSession();

  return (
    <main className="flex items-center justify-center min-h-[80vh] px-6 text-center">
      <div className="max-w-xl">
        <h1 className="text-3xl font-semibold mb-4 text-neutral-800 dark:text-white">
          “This site changed the way I think about food.”
        </h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-300">
          - A satisfied Stoneholder
        </p>
      </div>
    </main>
  );
}
