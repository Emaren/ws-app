"use client";

import type { AdminUsersPayload } from "./adminUsersControlTowerSupport";
import { formatDateTime } from "./adminUsersControlTowerSupport";

type AdminUsersActivityPanelsProps = {
  payload: AdminUsersPayload | null;
};

export function AdminUsersActivityPanels({ payload }: AdminUsersActivityPanelsProps) {
  return (
    <section className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <article className="admin-card min-w-0 p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] opacity-65">Signup attempts</p>
              <h4 className="mt-1 text-lg font-semibold">Recent registration history</h4>
            </div>
            <span className="text-xs opacity-70">
              {payload?.totals.registrationAttempts ?? 0} attempts ·{" "}
              {payload?.totals.registrationFailures ?? 0} failures
            </span>
          </div>
          <div className="mt-4 space-y-2">
            {payload?.recentRegistrationAttempts.length ? (
              payload.recentRegistrationAttempts.map((event) => (
                <div
                  key={event.id}
                  className={`rounded-xl border px-3 py-3 text-sm ${
                    event.status === "FAILURE"
                      ? "border-rose-500/25 bg-rose-500/10"
                      : "border-emerald-500/20 bg-emerald-500/5"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">
                      {event.email || "Unknown email"} · {event.method}
                    </p>
                    <span className="text-xs opacity-65">{formatDateTime(event.createdAt)}</span>
                  </div>
                  <p className="mt-1 opacity-75">
                    {event.status}
                    {event.failureCode ? ` · ${event.failureCode}` : ""}
                    {event.failureMessage ? ` · ${event.failureMessage}` : ""}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-sm opacity-75">
                No registration attempts are in view yet.
              </div>
            )}
          </div>
        </article>

        <article className="admin-card min-w-0 p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] opacity-65">Member activity</p>
              <h4 className="mt-1 text-lg font-semibold">Signed-in event feed</h4>
            </div>
            <span className="text-xs opacity-70">
              {payload?.recentMemberActivity.length ?? 0} recent events
            </span>
          </div>
          <div className="mt-4 space-y-2">
            {payload?.recentMemberActivity.map((event) => (
              <div key={event.id} className="rounded-xl border border-white/10 px-3 py-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">
                    {event.user?.name || event.user?.email || "Member"} ·{" "}
                    {event.eventType.replaceAll("_", " ")}
                  </p>
                  <span className="text-xs opacity-65">{formatDateTime(event.createdAt)}</span>
                </div>
                <p className="mt-1 opacity-75">{event.path || "No path recorded"}</p>
              </div>
            ))}
            {!payload?.recentMemberActivity.length ? (
              <div className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-sm opacity-75">
                No signed-in activity events yet.
              </div>
            ) : null}
          </div>
        </article>
      </div>

      <article className="admin-card min-w-0 p-4 md:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] opacity-65">Visitor stream</p>
            <h4 className="mt-1 text-lg font-semibold">Anonymous and unregistered behavior</h4>
          </div>
          <span className="text-xs opacity-70">
            {payload?.anonymousActivity.length ?? 0} recent events
          </span>
        </div>
        <div className="mt-4 space-y-2">
          {payload?.anonymousActivity.map((event) => (
            <div key={event.id} className="rounded-xl border border-white/10 px-3 py-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{event.eventType.replaceAll("_", " ")}</p>
                <span className="text-xs opacity-65">{formatDateTime(event.createdAt)}</span>
              </div>
              <p className="mt-1 opacity-75">{event.path || "No path recorded"}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.14em] opacity-60">
                {event.sessionId ? <span>session {event.sessionId.slice(0, 8)}</span> : null}
                {event.ipHash ? <span>ip {event.ipHash.slice(0, 8)}</span> : null}
                {event.article?.title ? <span>{event.article.title}</span> : null}
                {event.business?.name ? <span>{event.business.name}</span> : null}
                {event.offer?.title ? <span>{event.offer.title}</span> : null}
              </div>
            </div>
          ))}
          {!payload?.anonymousActivity.length ? (
            <div className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-sm opacity-75">
              No anonymous activity events yet.
            </div>
          ) : null}
        </div>
      </article>
    </section>
  );
}
