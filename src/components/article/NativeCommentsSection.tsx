"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import type {
  ArticleCommentRewardOutcome,
  PublicArticleComment,
} from "@/lib/articleCommentsShared";
import {
  appendPublicArticleComment,
  ARTICLE_COMMENT_AUTHOR_MAX_LENGTH,
  ARTICLE_COMMENT_BODY_MAX_LENGTH,
  ARTICLE_COMMENT_BODY_MIN_LENGTH,
  countPublicArticleComments,
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

function commentIdentityLabel(input: {
  isSignedIn: boolean;
  memberName: string;
  authorName: string;
}): string {
  if (input.isSignedIn) {
    return `Posting as ${input.memberName}`;
  }

  const guestName = input.authorName.trim();
  if (guestName) {
    return `Posting as ${guestName}`;
  }

  return "Posting as Anonymous Reader";
}

function commentInitial(label: string): string {
  const trimmed = label.trim();
  return trimmed ? trimmed.slice(0, 1).toUpperCase() : "W";
}

function resizeTextarea(element: HTMLTextAreaElement) {
  element.style.height = "0px";
  element.style.height = `${Math.min(element.scrollHeight, 132)}px`;
}

function SendIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-4.5 w-4.5"
    >
      <path d="M21 3 10 14" />
      <path d="m21 3-7 18-4-7-7-4 18-7Z" />
    </svg>
  );
}

export default function NativeCommentsSection({
  articleSlug,
  articleTitle: _articleTitle,
  initialComments,
}: Props) {
  const { data: session } = useSession();
  const [comments, setComments] = useState(initialComments);
  const [authorName, setAuthorName] = useState("");
  const [body, setBody] = useState("");
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [sendingTarget, setSendingTarget] = useState<"root" | string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const endpoint = useMemo(
    () => `/api/articles/${encodeURIComponent(articleSlug)}/comments`,
    [articleSlug],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedName = window.localStorage.getItem("ws-guest-comment-name")?.trim() || "";
    if (storedName) {
      setAuthorName(storedName.slice(0, ARTICLE_COMMENT_AUTHOR_MAX_LENGTH));
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const normalized = authorName.trim();
    if (normalized) {
      window.localStorage.setItem(
        "ws-guest-comment-name",
        normalized.slice(0, ARTICLE_COMMENT_AUTHOR_MAX_LENGTH),
      );
      return;
    }

    window.localStorage.removeItem("ws-guest-comment-name");
  }, [authorName]);

  const isSignedIn = Boolean(session?.user?.id);
  const memberName = viewerDisplayName(session?.user?.name, session?.user?.email);
  const totalComments = countPublicArticleComments(comments);
  const trimmedBody = body.trim();
  const trimmedReplyBody = replyBody.trim();
  const canSubmitRoot =
    trimmedBody.length >= ARTICLE_COMMENT_BODY_MIN_LENGTH && sendingTarget === null;
  const canSubmitReply =
    Boolean(replyTargetId) &&
    trimmedReplyBody.length >= ARTICLE_COMMENT_BODY_MIN_LENGTH &&
    sendingTarget === null;
  const identityLabel = commentIdentityLabel({
    isSignedIn,
    memberName,
    authorName,
  });
  function handleRootBodyChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setBody(event.target.value);
    resizeTextarea(event.currentTarget);
  }

  function handleReplyBodyChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setReplyBody(event.target.value);
    resizeTextarea(event.currentTarget);
  }

  async function submitComment(input: { bodyText: string; parentId: string | null }) {
    const trimmed = input.bodyText.trim();

    setSendingTarget(input.parentId ?? "root");
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
          body: trimmed,
          parentId: input.parentId,
        }),
        cache: "no-store",
      });

      const payload = (await response.json().catch(() => null)) as
        | CreateCommentResponse
        | { error?: string }
        | null;

      if (!response.ok || !payload || !("comment" in payload)) {
        throw new Error(
          payload && "error" in payload && typeof payload.error === "string"
            ? payload.error
            : "Could not post comment right now.",
        );
      }

      setComments((current) => appendPublicArticleComment(current, payload.comment));
      window.dispatchEvent(new Event("ws-refresh-token-balances"));

      if (input.parentId) {
        setReplyBody("");
        setReplyTargetId(null);
      } else {
        setBody("");
      }

      if (!isSignedIn) {
        setAuthorName((current) => current.trim());
      }

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
      setSendingTarget(null);
    }
  }

  async function handleRootSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmitRoot) {
      setError(`Comments need at least ${ARTICLE_COMMENT_BODY_MIN_LENGTH} characters.`);
      return;
    }

    await submitComment({ bodyText: body, parentId: null });
  }

  async function handleReplySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!replyTargetId || !canSubmitReply) {
      setError(`Replies need at least ${ARTICLE_COMMENT_BODY_MIN_LENGTH} characters.`);
      return;
    }

    await submitComment({ bodyText: replyBody, parentId: replyTargetId });
  }

  const renderComment = (comment: PublicArticleComment, depth = 0): React.ReactNode => {
    const isReply = depth > 0;
    const replyCount = comment.replies.length;
    const replyComposerOpen = replyTargetId === comment.id;

    return (
      <article key={comment.id} className={isReply ? "mt-2.5 md:mt-3" : "py-3.5 first:pt-0 last:pb-0 md:py-4"}>
        <div className="flex gap-2.5 md:gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-xs font-semibold text-white md:h-9 md:w-9 md:text-sm">
            {commentInitial(comment.authorName)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="truncate text-[13px] font-semibold text-white md:text-sm">
                {comment.authorName}
              </span>
              <span
                className={`hidden items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] md:inline-flex ${
                  comment.authorKind === "member"
                    ? "border-amber-300/28 bg-amber-300/10 text-amber-100"
                    : "border-white/10 bg-white/[0.04] text-neutral-300"
                }`}
              >
                {comment.authorKind === "member" ? "Member" : "Guest"}
              </span>
              <time
                dateTime={comment.createdAtISOString}
                className="text-[11px] text-neutral-500 md:uppercase md:tracking-[0.12em]"
              >
                {comment.createdAtLabel}
              </time>
            </div>

            <p className="mt-1 whitespace-pre-wrap text-[14px] leading-6 text-neutral-100 md:mt-1.5 md:text-[15px]">
              {comment.body}
            </p>

            {!isReply ? (
              <div className="mt-1.5 flex items-center gap-3 text-[11px] font-medium tracking-[0.12em] md:mt-2 md:gap-4 md:uppercase md:tracking-[0.18em]">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setFeedback(null);
                    setReplyTargetId((current) => (current === comment.id ? null : comment.id));
                    setReplyBody("");
                  }}
                  className="text-neutral-300 transition hover:text-white"
                >
                  {replyComposerOpen ? "Cancel reply" : "Reply"}
                </button>
                {replyCount > 0 ? (
                  <span className="text-neutral-500">
                    {replyCount} {replyCount === 1 ? "reply" : "replies"}
                  </span>
                ) : null}
              </div>
            ) : null}

            {replyComposerOpen ? (
              <form onSubmit={handleReplySubmit} className="mt-2 space-y-2 md:mt-3">
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/15 px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] md:rounded-[1.2rem] md:px-3 md:bg-black/35">
                  <div className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-[11px] font-semibold text-white md:h-8 md:w-8 md:text-xs">
                    {commentInitial(isSignedIn ? memberName : authorName || "Anonymous")}
                  </div>
                  <textarea
                    rows={1}
                    maxLength={ARTICLE_COMMENT_BODY_MAX_LENGTH}
                    value={replyBody}
                    onChange={handleReplyBodyChange}
                    placeholder={`Reply to ${comment.authorName}...`}
                    className="min-h-[20px] max-h-[132px] flex-1 resize-none overflow-y-auto bg-transparent py-0.5 text-[14px] leading-6 text-white outline-none placeholder:text-neutral-500 md:min-h-[22px] md:py-1 md:text-sm"
                  />
                  <button
                    type="submit"
                    disabled={!canSubmitReply}
                    aria-label="Send reply"
                    className="inline-flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full border border-amber-300/35 bg-amber-300/12 text-amber-50 transition hover:bg-amber-300/20 disabled:cursor-not-allowed disabled:opacity-45 md:h-9 md:w-9"
                  >
                    {sendingTarget === comment.id ? "..." : <SendIcon />}
                  </button>
                </div>
                <div className="hidden items-center justify-between gap-3 text-[11px] text-neutral-400 md:flex">
                  <span className="min-w-0 truncate">{identityLabel}</span>
                  <span className="shrink-0">{trimmedReplyBody.length}/{ARTICLE_COMMENT_BODY_MAX_LENGTH}</span>
                </div>
              </form>
            ) : null}

            {replyCount > 0 ? (
              <div className="mt-2.5 border-l border-white/8 pl-3 md:mt-3 md:pl-4">
                {comment.replies.map((reply) => renderComment(reply, depth + 1))}
              </div>
            ) : null}
          </div>
        </div>
      </article>
    );
  };

  return (
    <section className="pt-4 md:pt-6">
      <div className="md:overflow-hidden md:rounded-[2rem] md:border md:border-white/10 md:bg-[radial-gradient(circle_at_top,_rgba(194,149,74,0.15),_rgba(8,8,8,0.97)_58%)] md:shadow-[0_30px_110px_rgba(0,0,0,0.42)]">
        <div className="flex items-center justify-between gap-3 border-t border-white/10 px-0 pb-1.5 pt-2.5 md:px-0 md:pb-2.5 md:pt-4">
          <div className="text-[11px] font-medium uppercase tracking-[0.24em] text-amber-100/75">
            Comments
          </div>
          <div className="inline-flex shrink-0 items-center rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-neutral-200">
            {totalComments} {totalComments === 1 ? "comment" : "comments"}
          </div>
        </div>

        <div className="px-0 py-1.5 md:px-0 md:py-2">
          <form onSubmit={handleRootSubmit} className="space-y-2.5">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/15 px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] md:rounded-[1.25rem] md:px-3 md:py-2.5 md:bg-black/35">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-xs font-semibold text-white md:h-9 md:w-9 md:text-sm">
                {commentInitial(isSignedIn ? memberName : authorName || "Anonymous")}
              </div>
              <textarea
                rows={1}
                maxLength={ARTICLE_COMMENT_BODY_MAX_LENGTH}
                value={body}
                onChange={handleRootBodyChange}
                placeholder="Add a comment..."
                className="min-h-[20px] max-h-[132px] flex-1 resize-none overflow-y-auto bg-transparent py-0.5 text-[14px] leading-6 text-white outline-none placeholder:text-neutral-500 md:min-h-[24px] md:py-1 md:text-[15px]"
              />
              <button
                type="submit"
                disabled={!canSubmitRoot}
                aria-label="Send comment"
                className="inline-flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full border border-amber-300/35 bg-amber-300/12 text-amber-50 transition hover:bg-amber-300/20 disabled:cursor-not-allowed disabled:opacity-45 md:h-10 md:w-10"
              >
                {sendingTarget === "root" ? "..." : <SendIcon />}
              </button>
            </div>

            <div className="hidden items-center justify-between gap-3 text-[11px] text-neutral-400 md:flex">
              <span className="min-w-0 truncate">{identityLabel}</span>
              <span className="shrink-0">{trimmedBody.length}/{ARTICLE_COMMENT_BODY_MAX_LENGTH}</span>
            </div>

            {!isSignedIn ? (
              <div className="hidden items-center gap-3 md:flex">
                <label
                  className="text-[11px] uppercase tracking-[0.18em] text-neutral-400"
                  htmlFor="comment-author"
                >
                  Display name
                </label>
                <input
                  id="comment-author"
                  type="text"
                  maxLength={ARTICLE_COMMENT_AUTHOR_MAX_LENGTH}
                  value={authorName}
                  onChange={(event) => setAuthorName(event.target.value)}
                  placeholder="Anonymous Reader"
                  className="w-full max-w-xs rounded-full border border-white/10 bg-black/35 px-4 py-2 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-amber-300/45 focus:bg-black/55"
                />
                <span className="text-xs text-neutral-500">Optional.</span>
              </div>
            ) : null}

            {error ? (
              <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-100 md:rounded-2xl md:px-4 md:py-3 md:text-sm">
                {error}
              </div>
            ) : null}

            {feedback ? (
              <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-[12px] text-emerald-100 md:rounded-2xl md:px-4 md:py-3 md:text-sm">
                {feedback}
              </div>
            ) : null}
          </form>
        </div>

        <div className="px-0 pb-1 md:px-6 md:pb-6">
          {comments.length > 0 ? (
            <div className="divide-y divide-white/6">{comments.map((comment) => renderComment(comment))}</div>
          ) : (
            <div className="py-5 text-center md:py-6">
              <div className="text-sm font-medium text-white">No comments yet.</div>
              <p className="mt-2 text-sm leading-6 text-neutral-400">
                Be the first to add a grounded note to this review.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
