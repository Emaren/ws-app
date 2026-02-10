// src/app/admin/new/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import RichEditor from "@/components/editor/RichEditor";

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
    <section className="space-y-4">
      <div className="admin-card p-4 md:p-6">
        <h2 className="text-xl font-semibold md:text-2xl">New Article</h2>
        <p className="mt-1 text-sm opacity-75">
          Write rich review content for mobile and desktop readers.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="admin-card space-y-4 p-4 md:p-6">
        <label className="block">
          <span className="text-sm font-medium">Title</span>
          <input
            type="text"
            className="admin-surface mt-1 w-full rounded-xl px-4 py-2"
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
        <div className="overflow-hidden rounded-xl border">
          <RichEditor value={content} onChange={setContent} />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl border border-amber-300/40 bg-amber-200/20 px-6 py-2 text-sm font-medium transition hover:bg-amber-200/30 disabled:opacity-60"
        >
          {loading ? "Saving..." : "Create Article"}
        </button>
      </form>
    </section>
  );
}
