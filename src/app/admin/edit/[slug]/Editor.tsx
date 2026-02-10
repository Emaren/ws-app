// src/app/admin/edit/[slug]/Editor.tsx
"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ArticleStatus } from "@prisma/client";
import RichEditor from "@/components/editor/RichEditor";

type EditableArticle = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverUrl: string | null;
  content: string;
  status: ArticleStatus;
  publishedAt: string | null; // ISO string
};

// ----- utils

function normalizeSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\- ]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function stripHtmlToText(html: string) {
  return html
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function excerptFromContent(content: string, max = 220) {
  const plain = stripHtmlToText(content);
  if (!plain) return "";
  if (plain.length <= max) return plain;
  return `${plain.slice(0, max).trimEnd()}…`;
}

function articleUrlFromSlug(slug: string) {
  const origin = (process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://wheatandstone.ca").replace(
    /\/+$/,
    ""
  );
  return `${origin}/articles/${encodeURIComponent(slug)}`;
}

// ----- component

export default function Editor({ initialArticle }: { initialArticle: EditableArticle }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState(initialArticle.title ?? "");
  const [slug, setSlug] = useState(initialArticle.slug);
  const [excerpt, setExcerpt] = useState(
    initialArticle.excerpt?.trim() || excerptFromContent(initialArticle.content)
  );
  const [coverUrl, setCoverUrl] = useState(initialArticle.coverUrl ?? "");
  const [content, setContent] = useState(initialArticle.content ?? "");
  const [status, setStatus] = useState<ArticleStatus>(initialArticle.status);

  // Prevent rapid double-submits
  const submittingRef = useRef(false);

  const normalizedSlug = normalizeSlug(slug) || initialArticle.slug;
  const publishedUrl = articleUrlFromSlug(normalizedSlug);

  useEffect(() => {
    setTitle(initialArticle.title ?? "");
    setSlug(initialArticle.slug);
    setExcerpt(initialArticle.excerpt?.trim() || excerptFromContent(initialArticle.content));
    setCoverUrl(initialArticle.coverUrl ?? "");
    setContent(initialArticle.content ?? "");
    setStatus(initialArticle.status);
  }, [
    initialArticle.id,
    initialArticle.slug,
    initialArticle.title,
    initialArticle.excerpt,
    initialArticle.coverUrl,
    initialArticle.content,
    initialArticle.status,
  ]);

  // Cmd/Ctrl+S to save
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isSave = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s";
      if (isSave) {
        e.preventDefault();
        void save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [title, slug, excerpt, coverUrl, content, status]);

  async function save(e?: React.FormEvent) {
    e?.preventDefault();
    if (isPending || submittingRef.current) return;

    const nextSlug = normalizeSlug(slug);
    if (!nextSlug) {
      alert("Please provide a valid slug (lowercase letters, numbers, and hyphens).");
      return;
    }

    submittingRef.current = true;
    try {
      const res = await fetch(`/api/articles/${encodeURIComponent(initialArticle.slug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug: nextSlug,
          excerpt: excerpt || null,
          coverUrl: coverUrl || null,
          content, // full HTML from RichField (TinyMCE)
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
    } finally {
      submittingRef.current = false;
    }
  }

  async function destroy() {
    if (isPending || submittingRef.current) return;
    if (!confirm("Delete this article? This cannot be undone.")) return;

    submittingRef.current = true;
    try {
      const res = await fetch(`/api/articles/${encodeURIComponent(initialArticle.slug)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        alert(`Delete failed: ${res.status}${txt ? ` — ${txt}` : ""}`);
        return;
      }
      startTransition(() => router.push("/admin"));
    } finally {
      submittingRef.current = false;
    }
  }

  return (
    <form onSubmit={save} className="admin-card space-y-5 p-4 md:p-6">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">Title</span>
        <input
          className="admin-surface rounded-xl px-3 py-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Post title"
          required
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">Slug</span>
        <input
          className="admin-surface rounded-xl px-3 py-2"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="my-article-slug"
          pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
          title="lowercase letters, numbers, and hyphens only"
          required
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">Excerpt</span>
        <textarea
          className="admin-surface min-h-[80px] rounded-xl px-3 py-2"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="Short summary for listings and previews"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">Cover Image URL</span>
        <input
          className="admin-surface rounded-xl px-3 py-2"
          value={coverUrl}
          onChange={(e) => setCoverUrl(e.target.value)}
          placeholder="https://…"
          inputMode="url"
        />
        <span className="text-xs opacity-70">
          Optional image shown in listings and article header.
        </span>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">Published URL</span>
        <input
          className="admin-surface rounded-xl px-3 py-2 opacity-85"
          value={publishedUrl}
          readOnly
        />
      </label>

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Content</span>
        <span className="text-xs opacity-60">Rich text: headings, lists, tables, links</span>
      </div>

      <div className="border rounded-xl overflow-hidden">
        <RichEditor value={content} onChange={setContent} />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Status:</span>
        <select
          className="admin-surface rounded-xl px-3 py-2"
          value={status}
          onChange={(e) => setStatus(e.target.value as ArticleStatus)}
        >
          <option value="DRAFT">Draft</option>
          <option value="REVIEW">In Review</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="submit"
          className="rounded-xl border border-amber-300/40 bg-amber-200/20 px-4 py-2 text-sm font-medium transition hover:bg-amber-200/30 disabled:opacity-60"
          disabled={isPending}
          aria-label="Save article"
        >
          {isPending ? "Saving…" : "Save"}
        </button>

        <button
          type="button"
          onClick={destroy}
          className="rounded-xl px-4 py-2 border border-red-500 text-red-600 disabled:opacity-60"
          disabled={isPending}
          aria-label="Delete article"
        >
          Delete
        </button>
      </div>
    </form>
  );
}
