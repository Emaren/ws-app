// src/app/admin/new/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import RichField from "@/components/editor/RichField";

export default function NewArticle() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState(""); // HTML from the rich editor
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    });

    setLoading(false);
    if (!res.ok) {
      alert("Error creating article.");
      return;
    }

    const data = await res.json();
    if (data?.slug) {
      router.push(`/admin/edit/${data.slug}`);
    } else {
      alert("Created, but missing slug. Open /admin to find it.");
      router.push("/admin");
    }
  };

  return (
    <main className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">New Article</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Title</span>
          <input
            type="text"
            className="w-full px-4 py-2 border rounded mt-1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </label>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Content</span>
          <span className="text-xs opacity-70">Rich text: headings, lists, tables, links</span>
        </div>

        {/* Rich WYSIWYG field */}
        <div className="border rounded">
          <RichField value={content} onChange={setContent} height={440} />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 rounded cursor-pointer disabled:opacity-60 bg-white text-black hover:bg-neutral-100 border"
        >
          {loading ? "Saving..." : "Create Article"}
        </button>
      </form>
    </main>
  );
}
