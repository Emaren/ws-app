"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import type {
  ArticleCommentRewardOutcome,
  PublicArticleComment,
} from "@/lib/articleCommentsShared";
import {
  ARTICLE_COMMENT_AUTHOR_MAX_LENGTH,
  ARTICLE_COMMENT_BODY_MAX_LENGTH,
  ARTICLE_COMMENT_BODY_MIN_LENGTH,
} from "@/lib/articleCommentsShared";

type Props = {
  articleSlug: string;
  articleTitle: string;
  initialComments: PublicArticleComment[];
};

type CreateCommentResponse = {
  comment: PublicArticleComment;
  reward: ArticleCommentRewardOutcome;
};

function viewerDisplayName(name: string | null | undefined, email: string | null | undefined): string {
  const trimmedName = name?.trim();
  if (trimmedName) {
    return trimmedName;
  }

  const trimmedEmail = email?.trim();
  if (trimmedEmail) {
    return trimmedEmail.split("@")[0] || "Member";
  }

  return "Member";
}

export default function NativeCommentsSection({
  articleSlug,
  articleTitle,
  initialComments,
}: Props) {
  const { data: session } = useSession();
  const [comments, setComments] = useState(initialComments);
  const [authorName, setAuthorName] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const endpoint = useMemo(
    () => `/api/articles/${encodeURIComponent(articleSlug)}/comments`,
    [articleSlug],
  );

  const isSignedIn = Boolean(session?.user?.id);
  const memberName = viewerDisplayName(session?.user?.name, session?.user?.email);
  const trimmedBody = body.trim();
  const canSubmit = trimmedBody.length >= ARTICLE_COMMENT_BODY_MIN_LENGTH && !sending;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      setError(`Comments need at least ${ARTICLE_COMMENT_BODY_MIN_LENGTH} characters.`);
      return;
    }

    setSending(true);
    setError(null);
    setFeedback(null);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          authorName: isSignedIn ? null : authorName,
          body: trimmedBody,
        }),
        cache: "no-store",
      });

      const payload = (await response.json().catch(() => null)) as CreateCommentResponse | { error?: string } | null;
      if (!response.ok || !payload || !("comment" in payload)) {
        throw new Error(
          payload && "error" in payload && typeof payload.error === "string"
            ? payload.error
            : "Could not post comment right now.",
        );
      }

      setComments((current) => [payload.comment, ...current].slice(0, 40));
      setBody("");
      if (!isSignedIn) {
        setAuthorName((current) => current.trim());
      }
      window.dispatchEvent(new Event("ws-refresh-token-balances"));

      if (payload.reward.granted) {
        setFeedback("Comment posted. 1 STONE landed for today.");
      } else if (payload.reward.dailyLimitReached) {
        setFeedback("Comment posted. Today's 1 STONE comment credit was already claimed.");
      } else {
        setFeedback("Comment posted.");
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not post comment right now.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="pt-4 md:pt-6">
      <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(194,149,74,0.15),_rgba(8,8,8,0.97)_58%)] shadow-[0_30px_110px_rgba(0,0,0,0.42)]">
        <div className="border-b border-white/10 px-5 py-4 md:px-6 md:py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.28em] text-amber-100/70">
                Native Discussion
              </div>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white md:text-[2rem]">
                Journal Comments
              </h2>
            </div>
            <div className="inline-flex items-center rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-xs font-medium text-neutral-200">
              {comments.length} {comments.length === 1 ? "comment" : "comments"}
            </div>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-300 md:text-[15px]">
            Keep it sharp, local, and useful. Anonymous comments are welcome, and signed-in readers earn 1 $STONE
            on one comment per day.
          </p>
        </div>

        <div className="grid gap-5 px-5 py-5 md:px-6 md:py-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          <form
            onSubmit={handleSubmit}
            className="rounded-[1.6rem] border border-white/10 bg-black/35 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] md:p-5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-100">
                {isSignedIn ? "Member Comment" : "Open Commenting"}
              </span>
              {isSignedIn ? (
                <span className="text-sm text-neutral-300">Posting as {memberName}</span>
              ) : (
                <span className="text-sm text-neutral-300">No sign-in required.</span>
              )}
            </div>

            {!isSignedIn ? (
              <div className="mt-4">
                <label className="text-[11px] uppercase tracking-[0.24em] text-neutral-400" htmlFor="comment-author">
                  Name
                </label>
                <input
                  id="comment-author"
                  type="text"
                  maxLength={ARTICLE_COMMENT_AUTHOR_MAX_LENGTH}
                  value={authorName}
                  onChange={(event) => setAuthorName(event.target.value)}
                  placeholder="Anonymous Reader"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-amber-300/45 focus:bg-black/55"
                />
              </div>
            ) : null}

            <div className="mt-4">
              <label className="text-[11px] uppercase tracking-[0.24em] text-neutral-400" htmlFor="comment-body">
                Comment
              </label>
              <textarea
                id="comment-body"
                rows={6}
                maxLength={ARTICLE_COMMENT_BODY_MAX_LENGTH}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder={`Share your take on ${articleTitle}...`}
                className="mt-2 min-h-[170px] w-full resize-y rounded-[1.6rem] border border-white/10 bg-black/35 px-4 py-3 text-base leading-7 text-white outline-none transition placeholder:text-neutral-500 focus:border-amber-300/45 focus:bg-black/55"
              />
              <div className="mt-2 flex items-center justify-between gap-3 text-xs text-neutral-400">
                <span>Signed-in members can claim 1 $STONE once per day by commenting.</span>
                <span>{trimmedBody.length}/{ARTICLE_COMMENT_BODY_MAX_LENGTH}</span>
              </div>
            </div>

            {error ? (
              <div className="mt-4 rounded-2xl border border-red-400/35 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            ) : null}

            {feedback ? (
              <div className="mt-4 rounded-2xl border border-emerald-400/35 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                {feedback}
              </div>
            ) : null}

            <div className="mt-5 flex items-center justify-between gap-3">
              <p className="text-xs leading-5 text-neutral-400">
                Keep it respectful and useful. Plain text only for now.
              </p>
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex items-center rounded-full border border-amber-300/40 bg-amber-300/12 px-4 py-2.5 text-sm font-semibold text-amber-50 transition hover:bg-amber-300/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? "Posting..." : "Post Comment"}
              </button>
            </div>
          </form>

          <div className="space-y-3 md:space-y-4">
            {comments.length > 0 ? (
              comments.map((comment) => (
                <article
                  key={comment.id}
                  className="rounded-[1.55rem] border border-white/10 bg-black/30 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] md:p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-base font-semibold text-white">{comment.authorName}</span>
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                          comment.authorKind === "member"
                            ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
                            : "border-white/12 bg-white/[0.04] text-neutral-300"
                        }`}
                      >
                        {comment.authorKind === "member" ? "Member" : "Guest"}
                      </span>
                    </div>
                    <time
                      dateTime={comment.createdAtISOString}
                      className="text-xs uppercase tracking-[0.16em] text-neutral-400"
                    >
                      {comment.createdAtLabel}
                    </time>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-[15px] leading-7 text-neutral-100 md:text-base">
                    {comment.body}
                  </p>
                </article>
              ))
            ) : (
              <div className="rounded-[1.6rem] border border-dashed border-white/12 bg-black/20 px-5 py-8 text-center">
                <div className="text-sm uppercase tracking-[0.24em] text-neutral-400">First Notes</div>
                <p className="mt-3 text-lg font-medium text-white">No journal comments yet.</p>
                <p className="mt-2 text-sm leading-6 text-neutral-300">
                  Be the first to add a grounded take on this review.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
