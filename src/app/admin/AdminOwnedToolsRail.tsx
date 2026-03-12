"use client";

import type { SystemSnapshot } from "./adminDashboardTypes";
import { feedBadgeClass } from "./adminDashboardPresentation";
import { buildOwnedToolsRail } from "./adminOwnedToolsSupport";

type Props = {
  systemSnapshot: SystemSnapshot;
};

export function AdminOwnedToolsRail({ systemSnapshot }: Props) {
  const tools = buildOwnedToolsRail(systemSnapshot);

  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-white/10 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Owned Tools Rail</p>
          <p className="text-xs opacity-75">
            Wheat &amp; Stone, WS-API, TMail, Pulse, and the public surface as one operator stack.
          </p>
        </div>
        <span className="text-[11px] opacity-60">{tools.length} rails tracked</span>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
        {tools.map((tool) => (
          <article key={tool.id} className="min-w-0 rounded-lg border border-white/10 bg-black/20 p-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="min-w-0 text-xs font-semibold uppercase tracking-wide opacity-80">
                {tool.label}
              </p>
              <span className={feedBadgeClass(tool.tone)}>{tool.status}</span>
            </div>
            <p className="mt-2 break-words text-sm font-semibold">{tool.summary}</p>
            <p className="mt-1 break-words text-[11px] opacity-75">{tool.detail}</p>
            {tool.href && tool.ctaLabel ? (
              <div className="mt-2">
                <a
                  href={tool.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex rounded border border-white/20 px-2 py-1 text-[11px] hover:bg-white/10"
                >
                  {tool.ctaLabel}
                </a>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
