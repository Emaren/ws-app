// src/app/admin/edit/[slug]/Editor.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ArticleStatus } from "@prisma/client";

type EditableArticle = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverUrl: string | null;
  content: string;
  status: ArticleStatus;      // "DRAFT" | "PUBLISHED"
  publishedAt: string | null; // ISO string from the server component
};

function normalizeSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\- ]/g, "") // strip disallowed chars
    .replace(/\s+/g, "-")         // spaces -> hyphens
    .replace(/-+/g, "-")          // collapse hyphens
    .replace(/^-|-$/g, "");       // trim leading/trailing hyphens
}

export default function Editor({ initialArticle }: { initialArticle: EditableArticle }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState(initialArticle.title ?? "");
  const [slug, setSlug] = useState(initialArticle.slug);
  const [excerpt, setExcerpt] = useState(initialArticle.excerpt ?? "");
  const [coverUrl, setCoverUrl] = useState(initialArticle.coverUrl ?? "");
  const [content, setContent] = useState(initialArticle.content ?? "");
  const [status, setStatus] = useState<ArticleStatus>(initialArticle.status);

  async function save(e?: React.FormEvent) {
    e?.preventDefault();
    if (isPending) return;

    const nextSlug = normalizeSlug(slug);
    if (!nextSlug) {
      alert("Please provide a valid slug (lowercase letters, numbers, and hyphens).");
      return;
    }

    const res = await fetch(`/api/articles/${encodeURIComponent(initialArticle.slug)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        slug: nextSlug,
        excerpt: excerpt || null,
        coverUrl: coverUrl || null,
        content,
        status,
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      alert(`Save failed: ${res.status}${txt ? ` — ${txt}` : ""}`);
      return;
    }

    if (nextSlug !== initialArticle.slug) {
      startTransition(() => router.replace(`/admin/edit/${encodeURIComponent(nextSlug)}`));
    } else {
      startTransition(() => router.refresh());
    }
  }

  async function publish() {
    if (isPending) return;
    const res = await fetch(`/api/articles/${encodeURIComponent(initialArticle.slug)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PUBLISHED" as ArticleStatus }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      alert(`Publish failed: ${res.status}${txt ? ` — ${txt}` : ""}`);
      return;
    }
    setStatus("PUBLISHED");
    startTransition(() => router.refresh());
  }

  async function unpublish() {
    if (isPending) return;
    const res = await fetch(`/api/articles/${encodeURIComponent(initialArticle.slug)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "DRAFT" as ArticleStatus }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      alert(`Unpublish failed: ${res.status}${txt ? ` — ${txt}` : ""}`);
      return;
    }
    setStatus("DRAFT");
    startTransition(() => router.refresh());
  }

  async function destroy() {
    if (isPending) return;
    if (!confirm("Delete this article? This cannot be undone.")) return;

    const res = await fetch(`/api/articles/${encodeURIComponent(initialArticle.slug)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      alert(`Delete failed: ${res.status}${txt ? ` — ${txt}` : ""}`);
      return;
    }
    startTransition(() => router.push("/admin"));
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Title</span>
          <input
            className="border rounded-xl px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Post title"
            required
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Slug</span>
          <input
            className="border rounded-xl px-3 py-2"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="my-article-slug"
            pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
            title="lowercase letters, numbers, and hyphens only"
            required
          />
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">Excerpt</span>
        <textarea
          className="border rounded-xl px-3 py-2 min-h-[80px]"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="Short summary for listings and previews"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">Cover URL</span>
        <input
          className="border rounded-xl px-3 py-2"
          value={coverUrl}
          onChange={(e) => setCoverUrl(e.target.value)}
          placeholder="https://…"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">Content (HTML)</span>
        <textarea
          className="border rounded-xl px-3 py-2 min-h-[300px] font-mono"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="<p>Your article HTML…</p>"
          required
        />
      </label>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Status:</span>
        <select
          className="border rounded-xl px-3 py-2"
          value={status}
          onChange={(e) => setStatus(e.target.value as ArticleStatus)}
        >
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="submit"
          className="rounded-xl px-4 py-2 bg-black text-white dark:bg-white dark:text-black disabled:opacity-60"
          disabled={isPending}
        >
          {isPending ? "Saving…" : "Save"}
        </button>

        {status === "PUBLISHED" ? (
          <button
            type="button"
            onClick={unpublish}
            className="rounded-xl px-4 py-2 border"
            disabled={isPending}
          >
            Unpublish
          </button>
        ) : (
          <button
            type="button"
            onClick={publish}
            className="rounded-xl px-4 py-2 border"
            disabled={isPending}
          >
            Publish
          </button>
        )}

        <button
          type="button"
          onClick={destroy}
          className="rounded-xl px-4 py-2 border border-red-500 text-red-600"
          disabled={isPending}
        >
          Delete
        </button>
      </div>
    </form>
  );
}
