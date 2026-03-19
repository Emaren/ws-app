// src/components/article/CommentsSection.tsx
"use client";

import React from "react";
import type { Article } from "@prisma/client";

type Props = { article: Article };

function buildCommentsSrc(
  href: string,
  widthPx: number,
  numPosts = 10,
  dark = false,
  useWebHost = false,
  appId?: string | null,
) {
  const width = String(Math.max(320, Math.min(widthPx, 1200)));
  const params = new URLSearchParams({
    href,
    numposts: String(numPosts),
    width,
    order_by: "reverse_time",
  });
  if (dark) params.set("colorscheme", "dark");
  if (appId?.trim()) {
    params.set("app_id", appId.trim());
  }
  const host = useWebHost ? "https://web.facebook.com" : "https://www.facebook.com";
  return `${host}/plugins/comments.php?${params.toString()}`;
}

// Prefer a public origin Facebook can fetch; ignore localhost/127.0.0.1/.local
function getPublicOrigin() {
  let env = process.env.NEXT_PUBLIC_SITE_ORIGIN?.trim();
  try {
    if (env) {
      const u = new URL(env);
      const host = u.hostname;
      const isLocal = host === "localhost" || host === "127.0.0.1" || host.endsWith(".local");
      if (!isLocal && (u.protocol === "https:" || u.protocol === "http:")) return u.origin;
    }
  } catch {
    /* ignore */
  }
  return "https://wheatandstone.ca";
}

function getRuntimeOrigin() {
  if (typeof window !== "undefined") {
    try {
      const url = new URL(window.location.href);
      const host = url.hostname.toLowerCase();
      const isLocal =
        host === "localhost" ||
        host === "127.0.0.1" ||
        host.endsWith(".local");
      if (!isLocal) {
        return url.origin;
      }
    } catch {
      // ignore
    }
  }
  return getPublicOrigin();
}

export default function CommentsSection({
  article,
  facebookAppId = null,
}: Props & {
  facebookAppId?: string | null;
}) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const iframeRef = React.useRef<HTMLIFrameElement | null>(null);
  const [origin, setOrigin] = React.useState(() => getPublicOrigin());
  const [w, setW] = React.useState(680);
  const [embedRequested, setEmbedRequested] = React.useState(false);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [showFallback, setShowFallback] = React.useState(false);
  const [showNoCommentsHint, setShowNoCommentsHint] = React.useState(false);
  const [sawFacebookMessage, setSawFacebookMessage] = React.useState(false);
  const [useWebHost, setUseWebHost] = React.useState(false);
  const articleUrl = `${origin}/articles/${encodeURIComponent(article.slug)}`;

  React.useEffect(() => {
    setOrigin(getRuntimeOrigin());
  }, []);

  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const set = () => setW(Math.round(el.clientWidth));
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    addEventListener("resize", set);
    return () => {
      ro.disconnect();
      removeEventListener("resize", set);
    };
  }, []);

  const commentsSrc = buildCommentsSrc(articleUrl, w, 10, true, useWebHost, facebookAppId);
  const commentsPopup = buildCommentsSrc(articleUrl, 980, 10, true, false, facebookAppId);

  React.useEffect(() => {
    setIsLoaded(false);
    setShowFallback(false);
    setShowNoCommentsHint(false);
    setSawFacebookMessage(false);
  }, [commentsSrc, embedRequested]);

  React.useEffect(() => {
    setUseWebHost(false);
  }, [articleUrl, embedRequested]);

  React.useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (typeof event.origin !== "string" || !event.origin) {
        return;
      }

      const frameWindow = iframeRef.current?.contentWindow;
      if (!frameWindow || event.source !== frameWindow) {
        return;
      }

      try {
        const hostname = new URL(event.origin).hostname;
        if (hostname === "www.facebook.com" || hostname === "web.facebook.com") {
          setSawFacebookMessage(true);
          setShowFallback(false);
        }
      } catch {
        // ignore malformed origin values
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  React.useEffect(() => {
    if (!embedRequested) {
      return;
    }

    const delayMs = isLoaded ? 2200 : 5000;
    const timer = window.setTimeout(() => {
      if (sawFacebookMessage) {
        return;
      }

      // First failure path: retry with web.facebook.com host.
      if (!useWebHost) {
        setUseWebHost(true);
        return;
      }

      setShowFallback(true);
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [embedRequested, isLoaded, sawFacebookMessage, useWebHost, commentsSrc]);

  React.useEffect(() => {
    if (!embedRequested || !isLoaded || showFallback) {
      setShowNoCommentsHint(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setShowNoCommentsHint(true);
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [embedRequested, isLoaded, showFallback, commentsSrc]);

  function handleIframeLoad(event: React.SyntheticEvent<HTMLIFrameElement>) {
    const frame = event.currentTarget;
    let isAboutBlank = false;

    // If privacy shields block third-party embeds, iframe can "load" but stay about:blank.
    try {
      const loadedHref = frame.contentWindow?.location?.href;
      isAboutBlank = loadedHref === "about:blank";
    } catch {
      // Cross-origin access throws when Facebook actually loaded, which is expected.
      isAboutBlank = false;
    }

    if (isAboutBlank) {
      setIsLoaded(false);
      if (!useWebHost) {
        setUseWebHost(true);
      } else {
        setShowFallback(true);
      }
      return;
    }

    setIsLoaded(true);
  }

  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log("[FB comments] href =", articleUrl);
  }

  // no bottom margin here — ActionLinks owns the symmetric spacing
  return (
    <section className="pt-6 md:pt-8 relative z-10 isolation-isolate">
      <div
        ref={wrapRef}
        className="relative bg-black/70 dark:bg-black border border-neutral-800 p-4 md:p-5 rounded-2xl shadow-sm overflow-hidden"
      >
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            onClick={() => setEmbedRequested(true)}
            disabled={embedRequested}
            className="mr-2 inline-flex items-center rounded-md border border-neutral-600 bg-neutral-900/80 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-neutral-100 hover:bg-neutral-800 disabled:opacity-65 disabled:cursor-default"
          >
            {embedRequested ? "Embed Loading..." : "Load Comments In Page"}
          </button>
          <a
            href={commentsPopup}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-md border border-neutral-600 bg-neutral-900/80 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-neutral-100 hover:bg-neutral-800"
          >
            Open Comments In Facebook
          </a>
        </div>

        {!embedRequested ? (
          <div className="rounded-xl border border-neutral-700 bg-neutral-950/75 px-4 py-4 text-sm text-neutral-200">
            <p className="font-semibold">Facebook comments are click-to-load.</p>
            <p className="mt-1 text-neutral-300">
              This avoids broken white embeds when privacy shields block third-party frames.
            </p>
            {facebookAppId ? null : (
              <p className="mt-2 text-neutral-300">
                The public Facebook app id is not wired into this build yet, so the plugin may fail more often than it should.
              </p>
            )}
            <p className="mt-2 text-neutral-300">
              If there are no comments yet, use{" "}
              <span className="font-semibold text-neutral-100">Open Comments In Facebook</span> to be first.
            </p>
          </div>
        ) : null}

        {embedRequested && !isLoaded && !showFallback && (
          <div className="absolute inset-x-4 md:inset-x-5 top-4 md:top-5 z-10 rounded-xl border border-neutral-700 bg-neutral-950/80 px-3 py-2 text-[12px] text-neutral-300">
            Loading Facebook comments...
          </div>
        )}

        {embedRequested && showFallback && !isLoaded && (
          <div className="absolute inset-0 z-20 bg-neutral-950/92 backdrop-blur-[1px] p-4 md:p-5 flex items-center justify-center">
            <div className="w-full max-w-[620px] rounded-2xl border border-neutral-700 bg-neutral-900/95 p-4 md:p-5 text-neutral-100">
              <p className="text-sm md:text-base font-semibold">Facebook embed is blocked in this browser session.</p>
              <p className="mt-2 text-xs md:text-sm text-neutral-300">
                This is usually caused by privacy shields, tracker blocking, or third-party cookie restrictions.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={commentsPopup}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-lg border border-amber-300/50 bg-amber-300/10 px-3 py-2 text-xs md:text-sm font-semibold text-amber-100 hover:bg-amber-300/20"
                >
                  Open Comments In New Tab
                </a>
                <a
                  href={articleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-lg border border-neutral-500/70 bg-neutral-800/80 px-3 py-2 text-xs md:text-sm font-semibold text-neutral-100 hover:bg-neutral-700/90"
                >
                  Open Article URL (FB target)
                </a>
              </div>
            </div>
          </div>
        )}

        {embedRequested && isLoaded && showNoCommentsHint && !showFallback ? (
          <div className="pointer-events-none absolute inset-x-4 top-16 z-10 flex justify-center md:inset-x-5 md:top-20">
            <div className="pointer-events-auto w-full max-w-[620px] rounded-xl border border-amber-300/40 bg-black/80 px-3 py-2 text-xs text-amber-100 shadow-lg backdrop-blur-sm md:text-sm">
              <p className="font-semibold">Facebook may be returning a blank embed here.</p>
              <p className="mt-1 text-amber-100/90">
                This usually means browser privacy shielding, third-party cookie blocking,
                or a Facebook-side embed failure. Use{" "}
                <a
                  href={commentsPopup}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                >
                  Open Comments In Facebook
                </a>{" "}
                to confirm the thread directly.
              </p>
            </div>
          </div>
        ) : null}

        {embedRequested ? (
          <iframe
            ref={iframeRef}
            key={commentsSrc}
            title="Facebook Comments"
            src={commentsSrc}
            style={{ width: "100%", minHeight: 420, border: "none", overflow: "hidden" }}
            scrolling="no"
            loading="lazy"
            allow="clipboard-write; encrypted-media; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            onLoad={handleIframeLoad}
            onError={() => setShowFallback(true)}
          />
        ) : null}
        {embedRequested && isLoaded && !showFallback ? (
          <p className="mt-2 text-[12px] text-neutral-300">
            If the embed area looks empty, there may be no comments yet or your browser may be suppressing third-party widgets.
            Use <span className="font-semibold text-neutral-100">Open Comments In Facebook</span> to confirm and post the first comment.
          </p>
        ) : null}
        {showNoCommentsHint ? (
          <div className="mt-2 rounded-xl border border-amber-300/35 bg-amber-300/10 px-3 py-2 text-[12px] text-amber-100">
            The Facebook iframe loaded, but the browser session still may be suppressing the
            visible thread. Use <span className="font-semibold">Open Comments In Facebook</span>{" "}
            to confirm the thread directly.
          </div>
        ) : null}
        <p className={`mt-2 text-[12px] text-neutral-300 ${embedRequested ? "" : "mb-1"}`}>
          {embedRequested ? (
            <>
              If this comments panel stays white or empty, Facebook is blocking or failing the
              inline widget in this browser session.{" "}
              <a
                href={commentsPopup}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 cursor-pointer"
              >
                Open comments in a new tab
              </a>
              .
            </>
          ) : (
            <>
              If you don’t see comments, a privacy extension or browser setting may be blocking
              Facebook embeds{" "}
              <a
                href={commentsPopup}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 cursor-pointer"
              >
                — open comments in a new tab
              </a>
              .
            </>
          )}
        </p>
      </div>
    </section>
  );
}
