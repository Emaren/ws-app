// src/app/admin/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Article = {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  createdAt: string;
};

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    const fetchDrafts = async () => {
      const res = await fetch("/api/articles");
      const data = await res.json();
      setArticles(data);
    };
    if (session?.user?.role === "ADMIN") {
      fetchDrafts();
    }
  }, [session]);

  if (session?.user?.role !== "ADMIN") {
    return <p className="p-8">You do not have permission to view this page.</p>;
  }

  return (
    <main className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      <button
        onClick={() => router.push("/admin/new")}
        className="mb-6 bg-black text-white px-4 py-2 rounded cursor-pointer"
      >
        + New Article
      </button>

      <ul className="space-y-4">
        {articles.map((article) => (
          <li
            key={article.id}
            className="p-4 border rounded shadow flex justify-between items-center"
          >
            <div>
              <h2 className="font-semibold">{article.title}</h2>
              <p className="text-sm opacity-60">
                {article.published ? "Published" : "Draft"} ·{" "}
                {new Date(article.createdAt).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={() => router.push(`/admin/edit/${article.slug}`)}
              className="text-blue-500 underline"
            >
              Edit
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
