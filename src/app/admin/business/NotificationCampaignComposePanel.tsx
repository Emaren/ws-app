import type { Dispatch, FormEvent, SetStateAction } from "react";
import {
  createCampaignForm,
  shortAudienceToken,
  type CampaignFormState,
  type PushPermissionState,
  type SendMode,
  type NotificationChannel,
  type AudienceMode,
} from "./notificationCampaignSupport";

type NotificationCampaignComposePanelProps = {
  form: CampaignFormState;
  setForm: Dispatch<SetStateAction<CampaignFormState>>;
  selectedBusinessId: string;
  loadingBusinesses: boolean;
  loadingHistory: boolean;
  busyAction: string | null;
  pushBusy: boolean;
  pushPermission: PushPermissionState;
  pushAudienceToken: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onProcessQueueNow: () => void | Promise<void>;
  onSubscribeBrowserForPush: () => void | Promise<void>;
  onUnsubscribeBrowserPush: () => void | Promise<void>;
};

export function NotificationCampaignComposePanel({
  form,
  setForm,
  selectedBusinessId,
  loadingBusinesses,
  loadingHistory,
  busyAction,
  pushBusy,
  pushPermission,
  pushAudienceToken,
  onSubmit,
  onProcessQueueNow,
  onSubscribeBrowserForPush,
  onUnsubscribeBrowserPush,
}: NotificationCampaignComposePanelProps) {
  return (
    <form onSubmit={(event) => void onSubmit(event)} className="admin-card space-y-4 p-4 md:p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold">Compose Campaign</h3>
        <button
          type="button"
          onClick={() => setForm(createCampaignForm(selectedBusinessId))}
          className="rounded-xl border px-3 py-1.5 text-xs transition hover:bg-white/5"
        >
          Reset
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm sm:col-span-2">
          <span>Campaign name</span>
          <input
            value={form.campaignName}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, campaignName: event.target.value }))
            }
            className="admin-surface w-full rounded-xl px-3 py-2"
            placeholder="Avalon Friday Flash"
            required
          />
        </label>

        <label className="space-y-1 text-sm">
          <span>Channel</span>
          <select
            value={form.channel}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                channel: event.target.value as NotificationChannel,
              }))
            }
            className="admin-surface w-full rounded-xl px-3 py-2"
          >
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="push">Push</option>
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span>Audience mode</span>
          <select
            value={form.audienceMode}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                audienceMode: event.target.value as AudienceMode,
              }))
            }
            className="admin-surface w-full rounded-xl px-3 py-2"
          >
            <option value="all">All recipients</option>
            <option value="segment">Segment tag</option>
            <option value="direct">Direct target</option>
          </select>
        </label>

        {form.audienceMode === "all" ? (
          <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs opacity-80 sm:col-span-2">
            Audience resolves to all recipients for this business.
          </p>
        ) : (
          <label className="space-y-1 text-sm sm:col-span-2">
            <span>{form.audienceMode === "segment" ? "Segment" : "Direct target"}</span>
            <input
              value={form.audienceValue}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, audienceValue: event.target.value }))
              }
              className="admin-surface w-full rounded-xl px-3 py-2"
              placeholder={
                form.audienceMode === "segment"
                  ? "vip-east"
                  : form.channel === "push"
                    ? "webpush:<subscription-token>"
                    : "email, phone, or push token"
              }
              required
            />
          </label>
        )}

        {form.channel === "push" ? (
          <div className="rounded-xl border border-blue-300/20 bg-blue-500/10 p-3 text-sm sm:col-span-2">
            <p className="text-xs uppercase tracking-wide text-blue-200/80">
              Browser Push Subscription
            </p>
            <p className="mt-1 text-xs text-blue-100/90">
              Permission:{" "}
              <span className="font-medium uppercase">
                {pushPermission === "unsupported" ? "UNSUPPORTED" : pushPermission}
              </span>
            </p>
            <p className="mt-1 text-xs text-blue-100/80">
              Captured token:{" "}
              {pushAudienceToken ? (
                <span className="font-mono">{shortAudienceToken(pushAudienceToken)}</span>
              ) : (
                "none"
              )}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void onSubscribeBrowserForPush()}
                disabled={pushBusy || busyAction !== null}
                className="rounded-lg border border-blue-300/40 bg-blue-400/20 px-3 py-1.5 text-xs font-medium transition hover:bg-blue-400/30 disabled:opacity-60"
              >
                {pushBusy ? "Working..." : "Use this browser subscription"}
              </button>
              <button
                type="button"
                onClick={() => void onUnsubscribeBrowserPush()}
                disabled={pushBusy || !pushAudienceToken || busyAction !== null}
                className="rounded-lg border border-white/25 px-3 py-1.5 text-xs font-medium transition hover:bg-white/10 disabled:opacity-60"
              >
                Unsubscribe browser
              </button>
            </div>

            <p className="mt-2 text-[11px] text-blue-100/75">
              For direct push sends, this fills the audience with a webpush token the API can
              deliver to.
            </p>
          </div>
        ) : null}

        {form.channel === "email" ? (
          <label className="space-y-1 text-sm sm:col-span-2">
            <span>Email subject</span>
            <input
              value={form.subject}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, subject: event.target.value }))
              }
              className="admin-surface w-full rounded-xl px-3 py-2"
              placeholder="Optional, falls back to campaign name"
            />
          </label>
        ) : null}

        {form.channel === "push" ? (
          <>
            <label className="space-y-1 text-sm sm:col-span-2">
              <span>Fallback email audience (optional)</span>
              <input
                value={form.fallbackEmailAudience}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    fallbackEmailAudience: event.target.value,
                  }))
                }
                className="admin-surface w-full rounded-xl px-3 py-2"
                placeholder="alerts@example.com"
              />
            </label>
            <label className="space-y-1 text-sm sm:col-span-2">
              <span>Fallback SMS audience (optional)</span>
              <input
                value={form.fallbackSmsAudience}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    fallbackSmsAudience: event.target.value,
                  }))
                }
                className="admin-surface w-full rounded-xl px-3 py-2"
                placeholder="+17801230000"
              />
            </label>
            <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs opacity-80 sm:col-span-2">
              If push cannot be delivered, ws-api will queue fallback email/SMS jobs from these
              targets.
            </p>
          </>
        ) : null}

        <label className="space-y-1 text-sm sm:col-span-2">
          <span>Message</span>
          <textarea
            value={form.message}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, message: event.target.value }))
            }
            className="admin-surface min-h-[100px] w-full rounded-xl px-3 py-2"
            placeholder="Fresh markdown-style or plain text message"
            required
          />
        </label>

        <label className="space-y-1 text-sm">
          <span>Send mode</span>
          <select
            value={form.sendMode}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, sendMode: event.target.value as SendMode }))
            }
            className="admin-surface w-full rounded-xl px-3 py-2"
          >
            <option value="send_now">Send now</option>
            <option value="scheduled">Scheduled</option>
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span>Max attempts</span>
          <input
            inputMode="numeric"
            value={form.maxAttempts}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, maxAttempts: event.target.value }))
            }
            className="admin-surface w-full rounded-xl px-3 py-2"
            placeholder="3"
          />
        </label>

        {form.sendMode === "scheduled" ? (
          <label className="space-y-1 text-sm sm:col-span-2">
            <span>Scheduled for</span>
            <input
              type="datetime-local"
              value={form.scheduledFor}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, scheduledFor: event.target.value }))
              }
              className="admin-surface w-full rounded-xl px-3 py-2"
              required
            />
          </label>
        ) : null}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="submit"
          disabled={busyAction !== null || loadingBusinesses || loadingHistory}
          className="rounded-xl border border-amber-300/40 bg-amber-200/20 px-4 py-2 text-sm font-medium transition hover:bg-amber-200/30 disabled:opacity-60"
        >
          {busyAction === "campaign-submit" ? "Saving..." : "Queue Campaign"}
        </button>
        <button
          type="button"
          onClick={() => void onProcessQueueNow()}
          disabled={busyAction !== null || loadingHistory}
          className="rounded-xl border px-4 py-2 text-sm transition hover:bg-white/5 disabled:opacity-60"
        >
          {busyAction === "process-queue" ? "Processing..." : "Process Queue Now"}
        </button>
      </div>

      {form.sendMode === "scheduled" ? (
        <p className="text-xs opacity-65">
          Scheduled timestamp is recorded in campaign metadata; queue processing should run at/after
          that time.
        </p>
      ) : null}
    </form>
  );
}
